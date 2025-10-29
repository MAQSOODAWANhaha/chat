use anyhow::{Result, anyhow};
use reqwest::Client;
use std::path::PathBuf;
use tokio::{fs::File, io::AsyncWriteExt};
use uuid::Uuid;

/// 语音合成服务
pub struct TTSService {
    api_key: String,
    client: Client,
}

impl TTSService {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            client: Client::new(),
        }
    }

    pub async fn generate_speech(&self, text: &str, language: &str) -> Result<String> {
        let voice = match language {
            "zh" => "nova",
            _ => "alloy",
        };

        let response = self
            .client
            .post("https://api.openai.com/v1/audio/speech")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&serde_json::json!({
                "model": "tts-1",
                "input": text,
                "voice": voice,
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("TTS API error: {error_text}"));
        }

        let filename = format!("{}.mp3", Uuid::new_v4());
        let filepath = PathBuf::from("audio").join(&filename);

        tokio::fs::create_dir_all("audio").await?;

        let bytes = response.bytes().await?;
        let mut file = File::create(&filepath).await?;
        file.write_all(&bytes).await?;

        Ok(filename)
    }
}
