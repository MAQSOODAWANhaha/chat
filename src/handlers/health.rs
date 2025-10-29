use axum::response::IntoResponse;

pub async fn health_handler() -> impl IntoResponse {
    "OK"
}
