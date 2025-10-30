use serde::{Deserialize, Serialize};

/// 聊天消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "user" | "assistant" | "system"
    pub content: String,
}

#[allow(dead_code)]
/// 聊天请求
#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub message: String,           // 用户消息
    pub history: Vec<ChatMessage>, // 对话历史
    pub role_id: String,           // 角色 ID
    pub language: String,          // 输出语言
    pub enable_audio: bool,        // 是否生成音频
}

/// 音频响应
#[derive(Debug, Serialize)]
pub struct ChatResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,
}

/// 错误响应
#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}
