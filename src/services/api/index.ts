// API客户端和服务
export { ApiClient, ApiError, type ApiResponse, type ApiConfig, type WebSocketMessage } from './client'
export { ZhipuService, createZhipuService, type ModelConfig, type RealtimeSessionConfig, type RealtimeMessage } from './zhipu'
export { AudioProcessor, createAudioProcessor } from './audio'

// 默认配置
export const DEFAULT_API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
  wsUrl: import.meta.env.VITE_WS_BASE_URL || 'wss://open.bigmodel.cn/api/paas/v4/realtime',
  apiKey: import.meta.env.VITE_API_KEY || '',
  timeout: 30000,
  retries: 3,
}

// 默认模型配置
export const DEFAULT_MODEL_CONFIG = {
  model: 'glm-4-realtime',
  temperature: 0.7,
  max_tokens: 1024,
  top_p: 0.9,
  stream: true,
}

// 默认实时会话配置
export const DEFAULT_REALTIME_CONFIG = {
  model: 'glm-4-realtime',
  voice: 'alloy',
  input_audio_format: 'pcm16' as const,
  output_audio_format: 'pcm16' as const,
  input_audio_transcription: 'verbatim' as const,
  temperature: 0.7,
  max_response_output_tokens: 4096,
}