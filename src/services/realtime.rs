use std::{collections::VecDeque, convert::TryInto, path::PathBuf, time::Duration};

use anyhow::{Context, Result, anyhow};
use async_trait::async_trait;
use bytes::Bytes;
use futures_util::{SinkExt, StreamExt};
use tokio::{fs::File, io::AsyncWriteExt, time};
use tokio_stream::wrappers::IntervalStream;
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream, connect_async,
    tungstenite::{client::IntoClientRequest, protocol::Message},
};
use uuid::Uuid;

use crate::config::Config;

const REALTIME_URL: &str = "wss://openspeech.bytedance.com/api/v3/realtime/dialogue";

const PROTOCOL_VERSION: u8 = 0b0001;
const HEADER_SIZE_WORDS: u8 = 0b0001; // 4 bytes
const MESSAGE_TYPE_FULL_CLIENT: u8 = 0b0001;
const MESSAGE_TYPE_AUDIO_ONLY: u8 = 0b0010;
const MESSAGE_TYPE_AUDIO_RESPONSE: u8 = 0b1011;
const MESSAGE_TYPE_ERROR: u8 = 0b1111;

const FLAG_EVENT: u8 = 0b0100;

const SERIALIZATION_JSON: u8 = 0b0001;
const SERIALIZATION_RAW: u8 = 0b0000;
const COMPRESSION_NONE: u8 = 0b0000;

const EVENT_START_CONNECTION: u32 = 1;
const EVENT_FINISH_SESSION: u32 = 102;
const EVENT_TEXT_QUERY: u32 = 501;
const EVENT_AUDIO_CHUNK: u32 = 200;

#[derive(Clone, Debug)]
pub struct RealtimeConfig {
    pub app_id: String,
    pub access_key: String,
    pub resource_id: String,
    pub app_key: String,
    pub default_speaker: String,
    pub model: String,
    pub audio_channel: u8,
    pub audio_format: String,
    pub audio_sample_rate: u32,
}

impl From<&Config> for RealtimeConfig {
    fn from(cfg: &Config) -> Self {
        Self {
            app_id: cfg.geekai_app_id.clone(),
            access_key: cfg.geekai_access_key.clone(),
            resource_id: cfg.geekai_resource_id.clone(),
            app_key: cfg.geekai_app_key.clone(),
            default_speaker: cfg.geekai_default_speaker.clone(),
            model: cfg.geekai_model.clone(),
            audio_channel: cfg.geekai_channel,
            audio_format: cfg.geekai_format.clone(),
            audio_sample_rate: cfg.geekai_sample_rate,
        }
    }
}

#[async_trait]
pub trait SpeechSession {
    async fn send_text(&mut self, text: &str) -> Result<SynthesisResult>;
    async fn send_audio(&mut self, pcm_data: &[u8]) -> Result<SynthesisResult>;
}

pub struct RealtimeClient {
    cfg: RealtimeConfig,
}

impl RealtimeClient {
    pub fn new(cfg: RealtimeConfig) -> Self {
        Self { cfg }
    }

    pub async fn start_session(&self) -> Result<RealtimeSession> {
        let mut request = REALTIME_URL
            .into_client_request()
            .context("failed to build client request")?;
        let headers = request.headers_mut();
        headers.insert("X-Api-App-ID", self.cfg.app_id.parse()?);
        headers.insert("X-Api-Access-Key", self.cfg.access_key.parse()?);
        headers.insert("X-Api-Resource-Id", self.cfg.resource_id.parse()?);
        headers.insert("X-Api-App-Key", self.cfg.app_key.parse()?);

        let (ws_stream, _) = connect_async(request)
            .await
            .context("failed to connect realtime ws")?;

        Ok(RealtimeSession::new(ws_stream, self.cfg.clone()))
    }
}

pub struct RealtimeSession {
    stream: WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
    cfg: RealtimeConfig,
    session_id: Option<String>,
}

impl RealtimeSession {
    fn new(
        stream: WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
        cfg: RealtimeConfig,
    ) -> Self {
        Self {
            stream,
            cfg,
            session_id: None,
        }
    }

    async fn send_frame(&mut self, frame: Vec<u8>) -> Result<()> {
        self.stream.send(Message::Binary(frame)).await?;
        Ok(())
    }

    async fn init_session(&mut self, input_mode: &str) -> Result<()> {
        // StartConnection
        let frame = encode_text_frame(EVENT_START_CONNECTION, None, Some("{}"))?;
        self.send_frame(frame).await?;

        // StartSession
        let session_id = Uuid::new_v4().to_string();
        self.session_id = Some(session_id.clone());

        let payload = serde_json::json!({
            "dialog": {
                "extra": {
                    "model": self.cfg.model,
                    "input_mod": input_mode,
                }
            },
            "tts": {
                "speaker": self.cfg.default_speaker,
                "audio_config": {
                    "channel": self.cfg.audio_channel,
                    "format": self.cfg.audio_format,
                    "sample_rate": self.cfg.audio_sample_rate,
                }
            }
        });

        let payload_str = payload.to_string();
        let frame = encode_text_frame(100, Some(&session_id), Some(&payload_str))?;
        self.send_frame(frame).await?;
        Ok(())
    }

    async fn finalize_session(&mut self) -> Result<()> {
        let frame =
            encode_text_frame(EVENT_FINISH_SESSION, self.session_id.as_deref(), Some("{}"))?;
        self.send_frame(frame).await
    }

    async fn receive_audio(&mut self) -> Result<Vec<u8>> {
        let mut audio_chunks: VecDeque<Bytes> = VecDeque::new();

        while let Some(msg) = self.stream.next().await {
            let msg = msg?;
            match msg {
                Message::Binary(data) => {
                    if let Some(frame) = decode_binary_frame(&data)? {
                        match frame.message_type {
                            MESSAGE_TYPE_AUDIO_RESPONSE => {
                                if let Some(event) = frame.event_id {
                                    if event == 352 {
                                        audio_chunks.push_back(Bytes::from(frame.payload));
                                    } else if event == 359 {
                                        break;
                                    }
                                }
                            }
                            MESSAGE_TYPE_ERROR => {
                                return Err(anyhow!("Realtime service error"));
                            }
                            _ => {}
                        }
                    } else {
                        audio_chunks.push_back(Bytes::from(data));
                    }
                }
                Message::Text(text) => {
                    let json: serde_json::Value = serde_json::from_str(&text)?;
                    if let Some(event_id) = json.get("event_id").and_then(|v| v.as_u64()) {
                        match event_id {
                            359 => break,
                            153 => {
                                let msg = json
                                    .get("payload")
                                    .and_then(|p| p.get("error"))
                                    .and_then(|s| s.as_str())
                                    .unwrap_or("session failed")
                                    .to_string();
                                return Err(anyhow!(msg));
                            }
                            _ => {}
                        }
                    }
                }
                Message::Close(_) => break,
                Message::Ping(_) | Message::Pong(_) | Message::Frame(_) => {}
            }
        }

        let mut buffer = Vec::new();
        for chunk in audio_chunks {
            buffer.extend_from_slice(&chunk);
        }
        Ok(buffer)
    }

    async fn synthesize_text(&mut self, text: &str) -> Result<Vec<u8>> {
        self.init_session("text").await?;

        let payload = serde_json::json!({ "content": text });
        let payload_str = payload.to_string();
        let frame = encode_text_frame(
            EVENT_TEXT_QUERY,
            self.session_id.as_deref(),
            Some(&payload_str),
        )?;
        self.send_frame(frame).await?;

        self.receive_audio().await
    }

    async fn synthesize_audio(&mut self, pcm_data: &[u8]) -> Result<Vec<u8>> {
        self.init_session("audio_file").await?;

        let mut interval = IntervalStream::new(time::interval(Duration::from_millis(20)));
        let mut offset = 0;
        let chunk_size = 640;

        while offset < pcm_data.len() {
            let end = (offset + chunk_size).min(pcm_data.len());
            let chunk = &pcm_data[offset..end];
            offset = end;

            let frame = encode_audio_frame(EVENT_AUDIO_CHUNK, self.session_id.as_deref(), chunk)?;
            self.send_frame(frame).await?;
            interval.next().await;
        }

        self.finalize_session().await?;
        self.receive_audio().await
    }
}

#[async_trait]
impl SpeechSession for RealtimeSession {
    async fn send_text(&mut self, text: &str) -> Result<SynthesisResult> {
        let audio_bytes = self.synthesize_text(text).await?;
        let filename = persist_audio(&audio_bytes, "ogg").await?;
        Ok(SynthesisResult {
            audio_url: filename,
            transcript: None,
        })
    }

    async fn send_audio(&mut self, pcm_data: &[u8]) -> Result<SynthesisResult> {
        let audio_bytes = self.synthesize_audio(pcm_data).await?;
        let filename = persist_audio(&audio_bytes, "ogg").await?;
        Ok(SynthesisResult {
            audio_url: filename,
            transcript: None,
        })
    }
}

#[allow(dead_code)]
pub struct SynthesisResult {
    pub audio_url: String,
    pub transcript: Option<String>,
}

async fn persist_audio(bytes: &[u8], extension: &str) -> Result<String> {
    tokio::fs::create_dir_all("audio").await?;
    let filename = format!("{}.{}", Uuid::new_v4(), extension);
    let path = PathBuf::from("audio").join(&filename);
    let mut file = File::create(&path).await?;
    file.write_all(bytes).await?;
    Ok(filename)
}

fn encode_text_frame(
    event_id: u32,
    session_id: Option<&str>,
    payload: Option<&str>,
) -> Result<Vec<u8>> {
    let payload_bytes = payload.unwrap_or("{}").as_bytes();
    let mut buf = Vec::with_capacity(16 + payload_bytes.len());

    let header = build_header(
        MESSAGE_TYPE_FULL_CLIENT,
        FLAG_EVENT,
        SERIALIZATION_JSON,
        COMPRESSION_NONE,
    );
    buf.extend_from_slice(&header);

    buf.extend_from_slice(&event_id.to_le_bytes());

    if let Some(id) = session_id {
        let id_bytes = id.as_bytes();
        buf.extend_from_slice(&(id_bytes.len() as u32).to_le_bytes());
        buf.extend_from_slice(id_bytes);
    } else {
        buf.extend_from_slice(&0u32.to_le_bytes());
    }

    buf.extend_from_slice(&(payload_bytes.len() as u32).to_le_bytes());
    buf.extend_from_slice(payload_bytes);

    Ok(buf)
}

fn encode_audio_frame(event_id: u32, session_id: Option<&str>, chunk: &[u8]) -> Result<Vec<u8>> {
    let mut buf = Vec::with_capacity(16 + chunk.len());
    let header = build_header(
        MESSAGE_TYPE_AUDIO_ONLY,
        FLAG_EVENT,
        SERIALIZATION_RAW,
        COMPRESSION_NONE,
    );
    buf.extend_from_slice(&header);
    buf.extend_from_slice(&event_id.to_le_bytes());

    if let Some(id) = session_id {
        let id_bytes = id.as_bytes();
        buf.extend_from_slice(&(id_bytes.len() as u32).to_le_bytes());
        buf.extend_from_slice(id_bytes);
    } else {
        buf.extend_from_slice(&0u32.to_le_bytes());
    }

    buf.extend_from_slice(&(chunk.len() as u32).to_le_bytes());
    buf.extend_from_slice(chunk);
    Ok(buf)
}

fn build_header(message_type: u8, flags: u8, serialization: u8, compression: u8) -> [u8; 4] {
    let b0 = (PROTOCOL_VERSION << 4) | HEADER_SIZE_WORDS;
    let b1 = (message_type << 4) | (flags & 0x0f);
    let b2 = (serialization << 4) | (compression & 0x0f);
    [b0, b1, b2, 0]
}

struct DecodedFrame {
    pub message_type: u8,
    pub event_id: Option<u32>,
    pub payload: Vec<u8>,
}

fn decode_binary_frame(data: &[u8]) -> Result<Option<DecodedFrame>> {
    if data.len() < 12 {
        return Ok(None);
    }

    let message_type = data[1] >> 4;
    let flags = data[1] & 0x0f;
    let mut offset = 4;

    let mut event_id = None;
    if flags & FLAG_EVENT != 0 {
        if data.len() < offset + 4 {
            return Ok(None);
        }
        let bytes: [u8; 4] = data[offset..offset + 4]
            .try_into()
            .map_err(|_| anyhow!("invalid event id"))?;
        event_id = Some(u32::from_le_bytes(bytes));
        offset += 4;
    }

    if data.len() < offset + 4 {
        return Ok(None);
    }
    let session_len_bytes: [u8; 4] = data[offset..offset + 4]
        .try_into()
        .map_err(|_| anyhow!("invalid session length"))?;
    let session_len = u32::from_le_bytes(session_len_bytes);
    offset += 4;
    if data.len() < offset + session_len as usize {
        return Ok(None);
    }
    offset += session_len as usize;

    if data.len() < offset + 4 {
        return Ok(None);
    }
    let payload_len_bytes: [u8; 4] = data[offset..offset + 4]
        .try_into()
        .map_err(|_| anyhow!("invalid payload length"))?;
    let payload_len = u32::from_le_bytes(payload_len_bytes);
    offset += 4;

    if data.len() < offset + payload_len as usize {
        return Ok(None);
    }

    let payload = data[offset..offset + payload_len as usize].to_vec();

    Ok(Some(DecodedFrame {
        message_type,
        event_id,
        payload,
    }))
}
