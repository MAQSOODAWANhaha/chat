use axum::{Json, extract::State};

use crate::{
    AppState,
    error::AppError,
    models::{ChatRequest, ChatResponse},
    services::realtime::SpeechSession,
};

pub async fn chat_handler(
    State(state): State<AppState>,
    Json(payload): Json<ChatRequest>,
) -> Result<Json<ChatResponse>, AppError> {
    tracing::info!("Text synthesis request: role_id={}", payload.role_id);

    let mut session = state.realtime_client.start_session().await?;
    let result = session.send_text(&payload.message).await?;

    Ok(Json(ChatResponse {
        message: Some(payload.message),
        audio_url: Some(format!("/audio/{}", result.audio_url)),
    }))
}
