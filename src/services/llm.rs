use anyhow::{Result, anyhow};
use reqwest::Client;
use serde_json::json;

use crate::models::ChatMessage;

/// 与 OpenAI 对话模型交互的服务
pub struct LLMService {
    api_key: String,
    client: Client,
}

impl LLMService {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            client: Client::new(),
        }
    }

    pub async fn generate_response(
        &self,
        user_message: &str,
        history: &[ChatMessage],
        system_prompt: &str,
    ) -> Result<String> {
        let mut messages = vec![json!({
            "role": "system",
            "content": system_prompt,
        })];

        // 限制历史消息数量，优先保留最新消息
        for msg in history.iter().rev().take(10).rev() {
            messages.push(json!({
                "role": msg.role,
                "content": msg.content,
            }));
        }

        messages.push(json!({
            "role": "user",
            "content": user_message,
        }));

        let response = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&json!({
                "model": "gpt-3.5-turbo",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500,
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("OpenAI API error: {error_text}"));
        }

        let json: serde_json::Value = response.json().await?;
        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| anyhow!("Invalid response format"))?;

        Ok(content.to_string())
    }
}
