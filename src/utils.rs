#![allow(dead_code)]

/// 通用工具函数模块，目前预留用于后续扩展。
pub mod time {
    use std::time::{SystemTime, UNIX_EPOCH};

    /// 返回当前 UNIX 时间戳（秒）。
    pub fn unix_timestamp() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    }
}
