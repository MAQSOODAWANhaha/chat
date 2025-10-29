use std::sync::Arc;

use axum::{
    Router,
    routing::{get, post},
};
use tower_http::{
    cors::{Any, CorsLayer},
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod error;
mod handlers;
mod models;
mod services;
mod utils;

use config::Config;
use services::{LLMService, STTService, TTSService};

#[derive(Clone)]
pub struct AppState {
    pub llm_service: Arc<LLMService>,
    pub tts_service: Arc<TTSService>,
    pub stt_service: Arc<STTService>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "chat=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();
    let config = Config::from_env();

    let llm_service = Arc::new(LLMService::new(&config.openai_api_key));
    let tts_service = Arc::new(TTSService::new(&config.openai_api_key));
    let stt_service = Arc::new(STTService::new(&config.openai_api_key));

    let state = AppState {
        llm_service,
        tts_service,
        stt_service,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let audio_service = ServeDir::new("audio");

    let mut app = Router::new()
        .route("/api/chat", post(handlers::chat::chat_handler))
        .route("/api/speech-to-text", post(handlers::stt::stt_handler))
        .route("/health", get(handlers::health::health_handler))
        .nest_service("/audio", audio_service)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let static_dir = std::path::Path::new("/app/static");
    if static_dir.exists() {
        tracing::info!("Enabling static file service from {:?}", static_dir);
        let static_service =
            ServeDir::new(static_dir).not_found_service(ServeFile::new("/app/static/index.html"));
        app = app.fallback_service(static_service);
    } else {
        tracing::warn!(
            "Static directory {:?} not found, static files will not be served",
            static_dir
        );
    }

    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    tracing::info!("Server running on http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}
