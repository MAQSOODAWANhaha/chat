use std::env;

/// 应用基础配置
#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub geekai_app_id: String,
    pub geekai_access_key: String,
    pub geekai_resource_id: String,
    pub geekai_app_key: String,
    pub geekai_default_speaker: String,
    pub geekai_model: String,
    pub geekai_channel: u8,
    pub geekai_format: String,
    pub geekai_sample_rate: u32,
}

impl Config {
    pub fn from_env() -> Self {
        let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let port = env::var("PORT")
            .ok()
            .and_then(|val| val.parse::<u16>().ok())
            .unwrap_or(3000);

        let geekai_app_id = env::var("GEEKAI_APP_ID").expect("GEEKAI_APP_ID must be set");
        let geekai_access_key =
            env::var("GEEKAI_ACCESS_KEY").expect("GEEKAI_ACCESS_KEY must be set");
        let geekai_resource_id =
            env::var("GEEKAI_RESOURCE_ID").unwrap_or_else(|_| "volc.speech.dialog".to_string());
        let geekai_app_key =
            env::var("GEEKAI_APP_KEY").unwrap_or_else(|_| "PlgvMymc7f3tQnJ6".to_string());
        let geekai_default_speaker = env::var("GEEKAI_DEFAULT_SPEAKER")
            .unwrap_or_else(|_| "zh_female_vv_jupiter_bigtts".to_string());
        let geekai_model = env::var("GEEKAI_MODEL").unwrap_or_else(|_| "O".to_string());
        let geekai_channel = env::var("GEEKAI_AUDIO_CHANNEL")
            .ok()
            .and_then(|v| v.parse::<u8>().ok())
            .unwrap_or(1);
        let geekai_format =
            env::var("GEEKAI_AUDIO_FORMAT").unwrap_or_else(|_| "pcm_s16le".to_string());
        let geekai_sample_rate = env::var("GEEKAI_AUDIO_SAMPLE_RATE")
            .ok()
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or(24000);

        Self {
            host,
            port,
            geekai_app_id,
            geekai_access_key,
            geekai_resource_id,
            geekai_app_key,
            geekai_default_speaker,
            geekai_model,
            geekai_channel,
            geekai_format,
            geekai_sample_rate,
        }
    }
}
