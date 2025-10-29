use std::env;

/// 应用基础配置
#[derive(Debug, Clone)]
pub struct Config {
    pub openai_api_key: String,
    pub host: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        let openai_api_key = env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY must be set");

        let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

        let port = env::var("PORT")
            .ok()
            .and_then(|val| val.parse::<u16>().ok())
            .unwrap_or(3000);

        Self {
            openai_api_key,
            host,
            port,
        }
    }
}
