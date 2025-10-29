use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")]
    Anyhow(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let message = self.to_string();

        tracing::error!("Handler error: {message}");

        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": "InternalError",
                "message": message,
            })),
        )
            .into_response()
    }
}
