use std::{collections::VecDeque, path::PathBuf, time::Duration};

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
    sequence: i32,
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
            sequence: 1,
        }
    }

    async fn send_frame(&mut self, frame: Vec<u8>) -> Result<()> {
        self.stream.send(Message::Binary(frame)).await?;
        Ok(())
    }

    async fn read_message(&mut self) -> Result<DecodedMessage> {
        while let Some(msg) = self.stream.next().await {
            let msg = msg?;
            match msg {
                Message::Binary(data) => {
                    if let Some(decoded) = decode_message(&data)? {
                        return Ok(decoded);
                    }
                }
                Message::Text(text) => {
                    tracing::debug!("text frame: {}", text);
                }
                Message::Close(_) => return Err(anyhow!("connection closed")),
                Message::Ping(_) | Message::Pong(_) | Message::Frame(_) => {}
            }
        }
        Err(anyhow!("connection closed"))
    }

    async fn init_session(&mut self, input_mode: &str) -> Result<()> {
        // StartConnection
        let frame = encode_message(
            MessageType::FullClient,
            MsgFlag::with_event(MsgFlag::last_no_seq()),
            Some(Event::StartConnection),
            None,
            None,
            &[],
        )?;
        self.send_frame(frame).await?;

        loop {
            let msg = self.read_message().await?;
            if matches!(msg.event, Some(Event::ConnectionStarted)) {
                break;
            }
        }

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
        let payload_bytes = payload.to_string().into_bytes();

        let frame = encode_message(
            MessageType::FullClient,
            MsgFlag::with_event(MsgFlag::last_no_seq()),
            Some(Event::StartSession),
            Some(&session_id),
            None,
            &payload_bytes,
        )?;
        self.send_frame(frame).await?;

        loop {
            let msg = self.read_message().await?;
            if matches!(msg.event, Some(Event::SessionStarted)) {
                break;
            }
        }
        Ok(())
    }

    async fn finalize_session(&mut self) -> Result<()> {
        let session_id = self.session_id.clone().unwrap_or_default();
        let frame = encode_message(
            MessageType::FullClient,
            MsgFlag::with_event(MsgFlag::last_no_seq()),
            Some(Event::FinishSession),
            Some(&session_id),
            None,
            b"{}",
        )?;
        self.send_frame(frame).await?;
        Ok(())
    }

    async fn receive_audio(&mut self) -> Result<Vec<u8>> {
        let mut audio_chunks = VecDeque::new();

        loop {
            let msg = self.read_message().await?;
            match msg.event {
                Some(Event::TTSSentenceEnd) => continue,
                Some(Event::TTSEnded) => break,
                Some(Event::SessionFailed) => {
                    let err = msg
                        .payload
                        .as_ref()
                        .map(|p| String::from_utf8_lossy(p).to_string())
                        .unwrap_or_else(|| "session failed".into());
                    return Err(anyhow!(err));
                }
                None => {
                    if matches!(msg.message_type, MessageType::AudioOnlyServer) {
                        if let Some(payload) = msg.payload {
                            audio_chunks.push_back(Bytes::from(payload));
                        }
                    }
                }
                _ => {}
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
        let session_id = self
            .session_id
            .clone()
            .ok_or_else(|| anyhow!("session id missing"))?;
        let payload = serde_json::json!({ "content": text })
            .to_string()
            .into_bytes();
        let frame = encode_message(
            MessageType::FullClient,
            MsgFlag::with_event(MsgFlag::positive_seq(self.sequence)),
            Some(Event::ChatTextQuery),
            Some(&session_id),
            None,
            &payload,
        )?;
        self.sequence += 1;
        self.send_frame(frame).await?;

        self.finalize_session().await?;
        self.receive_audio().await
    }

    async fn synthesize_audio(&mut self, pcm_data: &[u8]) -> Result<Vec<u8>> {
        self.init_session("audio_file").await?;
        let session_id = self
            .session_id
            .clone()
            .ok_or_else(|| anyhow!("session id missing"))?;
        let mut interval = IntervalStream::new(time::interval(Duration::from_millis(20)));
        let mut offset = 0usize;
        let frame_samples = 640usize;

        while offset < pcm_data.len() {
            let end = (offset + frame_samples).min(pcm_data.len());
            let chunk = &pcm_data[offset..end];
            let frame = encode_message(
                MessageType::AudioOnlyClient,
                MsgFlag::with_event(MsgFlag::positive_seq(self.sequence)),
                Some(Event::TaskRequest),
                Some(&session_id),
                None,
                chunk,
            )?;
            self.sequence += 1;
            self.send_frame(frame).await?;
            offset = end;
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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum MessageType {
    FullClient,
    AudioOnlyClient,
    FullServer,
    AudioOnlyServer,
    Error,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct MsgFlag(u8);

impl MsgFlag {
    fn with_event(flag: MsgFlag) -> MsgFlag {
        MsgFlag(flag.0 | 0b100)
    }

    fn positive_seq(seq: i32) -> MsgFlag {
        if seq >= 0 {
            MsgFlag(0b1)
        } else {
            MsgFlag(0b11)
        }
    }

    const fn last_no_seq() -> MsgFlag {
        MsgFlag(0b10)
    }

    fn bits(self) -> u8 {
        self.0 & 0x0f
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Event {
    StartConnection = 1,
    FinishConnection = 2,
    StartSession = 100,
    FinishSession = 102,
    TaskRequest = 200,
    SayHello = 300,
    ChatTTSText = 500,
    ChatTextQuery = 501,
    ChatRAGText = 502,
    ConnectionStarted = 50,
    ConnectionFinished = 52,
    SessionStarted = 150,
    SessionFinished = 152,
    SessionFailed = 153,
    Usage = 154,
    TTSSentenceStart = 350,
    TTSSentenceEnd = 351,
    TTSResponse = 352,
    TTSEnded = 359,
}

#[derive(Debug)]
struct DecodedMessage {
    message_type: MessageType,
    flags: MsgFlag,
    event: Option<Event>,
    session_id: Option<String>,
    payload: Option<Vec<u8>>,
}

fn encode_message(
    message_type: MessageType,
    flags: MsgFlag,
    event: Option<Event>,
    session_id: Option<&str>,
    connect_id: Option<&str>,
    payload: &[u8],
) -> Result<Vec<u8>> {
    let mut buf = Vec::new();
    let header = build_header(message_type, flags, payload.len());
    buf.extend_from_slice(&header);

    if let Some(event) = event {
        buf.extend_from_slice(&(event as u32).to_be_bytes());
    }

    if let Some(session_id) = session_id {
        let session_bytes = session_id.as_bytes();
        buf.extend_from_slice(&(session_bytes.len() as u32).to_be_bytes());
        buf.extend_from_slice(session_bytes);
    } else {
        buf.extend_from_slice(&0u32.to_be_bytes());
    }

    if let Some(connect_id) = connect_id {
        let connect_bytes = connect_id.as_bytes();
        buf.extend_from_slice(&(connect_bytes.len() as u32).to_be_bytes());
        buf.extend_from_slice(connect_bytes);
    }

    buf.extend_from_slice(&(payload.len() as u32).to_be_bytes());
    buf.extend_from_slice(payload);
    Ok(buf)
}

fn build_header(message_type: MessageType, flags: MsgFlag, _payload_size: usize) -> [u8; 4] {
    let version = 0b0001 << 4; // version 1
    let header_size = 0b0001; // 4 bytes
    let type_bits = match message_type {
        MessageType::FullClient => 0b0001 << 4,
        MessageType::AudioOnlyClient => 0b0010 << 4,
        MessageType::FullServer => 0b1001 << 4,
        MessageType::AudioOnlyServer => 0b1011 << 4,
        MessageType::Error => 0b1111 << 4,
    };
    let serialization = 0b0001 << 4; // JSON
    let compression = 0b0000; // none

    [
        version | header_size,
        type_bits | flags.bits(),
        serialization | compression,
        0,
    ]
}

fn decode_message(data: &[u8]) -> Result<Option<DecodedMessage>> {
    if data.len() < 12 {
        return Ok(None);
    }

    let version_header = data[0];
    let _version = version_header >> 4;
    let header_size_words = version_header & 0x0f;
    let header_bytes = (header_size_words as usize) * 4;
    if data.len() < header_bytes {
        return Ok(None);
    }

    let message_type_bits = data[1] & 0xf0;
    let flags = MsgFlag(data[1] & 0x0f);

    let message_type = match message_type_bits >> 4 {
        0b0001 => MessageType::FullClient,
        0b0010 => MessageType::AudioOnlyClient,
        0b1001 => MessageType::FullServer,
        0b1011 => MessageType::AudioOnlyServer,
        0b1111 => MessageType::Error,
        _ => return Ok(None),
    };

    let mut offset = header_bytes;
    let mut event = None;
    if flags.bits() & 0b100 != 0 {
        if data.len() < offset + 4 {
            return Ok(None);
        }
        let event_val = u32::from_be_bytes(data[offset..offset + 4].try_into()?);
        event = match event_val {
            1 => Some(Event::StartConnection),
            2 => Some(Event::FinishConnection),
            50 => Some(Event::ConnectionStarted),
            51 => Some(Event::ConnectionFinished),
            52 => Some(Event::ConnectionFinished),
            100 => Some(Event::StartSession),
            102 => Some(Event::FinishSession),
            150 => Some(Event::SessionStarted),
            152 => Some(Event::SessionFinished),
            153 => Some(Event::SessionFailed),
            154 => Some(Event::Usage),
            200 => Some(Event::TaskRequest),
            350 => Some(Event::TTSSentenceStart),
            351 => Some(Event::TTSSentenceEnd),
            352 => Some(Event::TTSResponse),
            359 => Some(Event::TTSEnded),
            500 => Some(Event::ChatTTSText),
            501 => Some(Event::ChatTextQuery),
            502 => Some(Event::ChatRAGText),
            _ => None,
        };
        offset += 4;
    }

    if data.len() < offset + 4 {
        return Ok(None);
    }
    let session_len = u32::from_be_bytes(data[offset..offset + 4].try_into()?);
    offset += 4;
    if data.len() < offset + session_len as usize {
        return Ok(None);
    }
    let session_id = if session_len > 0 {
        Some(String::from_utf8_lossy(&data[offset..offset + session_len as usize]).to_string())
    } else {
        None
    };
    offset += session_len as usize;

    if data.len() < offset + 4 {
        return Ok(None);
    }
    let payload_len = u32::from_be_bytes(data[offset..offset + 4].try_into()?);
    offset += 4;
    if data.len() < offset + payload_len as usize {
        return Ok(None);
    }
    let payload = if payload_len > 0 {
        Some(data[offset..offset + payload_len as usize].to_vec())
    } else {
        None
    };

    Ok(Some(DecodedMessage {
        message_type,
        flags,
        event,
        session_id,
        payload,
    }))
}
