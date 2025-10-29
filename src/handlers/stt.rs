use anyhow::{Error as AnyhowError, anyhow};
use axum::{
    Json,
    extract::{Multipart, State},
};
use bytes::BufMut;

use crate::{AppState, error::AppError, models::STTResponse};

/// 处理语音转文字请求
pub async fn stt_handler(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<STTResponse>, AppError> {
    let mut audio_bytes: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.map_err(AnyhowError::from)? {
        if let Some(name) = field.name() {
            if name == "audio" || name == "file" {
                let data = field.bytes().await.map_err(AnyhowError::from)?;
                let mut buffer = Vec::with_capacity(data.len());
                buffer.put(data);
                audio_bytes = Some(buffer);
                break;
            }
        }
    }

    let audio_bytes = audio_bytes.ok_or_else(|| anyhow!("No audio file provided"))?;

    let text = state.stt_service.transcribe(audio_bytes).await?;

    Ok(Json(STTResponse { text }))
}
