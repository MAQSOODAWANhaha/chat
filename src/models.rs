use serde::{Deserialize, Serialize};

/// 聊天消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "user" | "assistant" | "system"
    pub content: String,
}

/// 聊天请求
#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub message: String,           // 用户消息
    pub history: Vec<ChatMessage>, // 对话历史
    pub role_id: String,           // 角色 ID
    pub language: String,          // 输出语言
    pub enable_audio: bool,        // 是否生成音频
}

/// 聊天响应
#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub message: String, // AI 回复文字
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>, // 音频 URL（可选）
}

/// 语音转文字响应
#[derive(Debug, Serialize)]
pub struct STTResponse {
    pub text: String,
}

/// 错误响应
#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}
