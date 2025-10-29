use anyhow::{Result, anyhow};
use reqwest::{Client, multipart};

/// 语音转文字服务
pub struct STTService {
    api_key: String,
    client: Client,
}

impl STTService {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            client: Client::new(),
        }
    }

    pub async fn transcribe(&self, audio_data: Vec<u8>) -> Result<String> {
        let part = multipart::Part::bytes(audio_data)
            .file_name("audio.webm")
            .mime_str("audio/webm")?;

        let form = multipart::Form::new()
            .part("file", part)
            .text("model", "whisper-1");

        let response = self
            .client
            .post("https://api.openai.com/v1/audio/transcriptions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .multipart(form)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Whisper API error: {error_text}"));
        }

        let json: serde_json::Value = response.json().await?;
        let text = json["text"]
            .as_str()
            .ok_or_else(|| anyhow!("Invalid response format"))?;

        Ok(text.to_string())
    }
}
