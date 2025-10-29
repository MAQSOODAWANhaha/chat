use axum::{Json, extract::State};

use crate::{
    AppState,
    error::AppError,
    models::{ChatRequest, ChatResponse},
    services::get_role_system_prompt,
};

/// 处理聊天请求
pub async fn chat_handler(
    State(state): State<AppState>,
    Json(payload): Json<ChatRequest>,
) -> Result<Json<ChatResponse>, AppError> {
    tracing::info!(
        "Chat request: role_id={}, language={}",
        payload.role_id,
        payload.language
    );

    let system_prompt = get_role_system_prompt(&payload.role_id);

    let message = state
        .llm_service
        .generate_response(&payload.message, &payload.history, &system_prompt)
        .await?;

    let audio_url = if payload.enable_audio {
        let filename = state
            .tts_service
            .generate_speech(&message, &payload.language)
            .await?;
        Some(format!("/audio/{filename}"))
    } else {
        None
    };

    Ok(Json(ChatResponse { message, audio_url }))
}
