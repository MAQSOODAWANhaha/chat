import { z } from 'zod'
import { ApiClient, ApiError } from './client'

// 智谱API相关类型定义

// 模型配置
export const ModelConfigSchema = z.object({
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(1).max(4096).default(1024),
  top_p: z.number().min(0).max(1).default(0.9),
  stream: z.boolean().default(true),
})

export type ModelConfig = z.infer<typeof ModelConfigSchema>

// 实时会话配置
export const RealtimeSessionConfigSchema = z.object({
  model: z.string().default('glm-4-realtime'),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  instructions: z.string().optional(),
  input_audio_format: z.enum(['pcm16', 'g711_ulaw', 'g711_alaw']).default('pcm16'),
  output_audio_format: z.enum(['pcm16', 'g711_ulaw', 'g711_alaw']).default('pcm16'),
  input_audio_transcription: z.enum(['verbatim', 'truncated']).default('verbatim'),
  turn_detection: z.object({
    type: z.enum(['server_vad']).default('server_vad'),
    threshold: z.number().min(0).max(1).default(0.5),
    prefix_padding_ms: z.number().default(300),
    silence_duration_ms: z.number().default(500),
  }).optional(),
  tools: z.array(z.any()).optional(),
  tool_choice: z.enum(['auto', 'none', 'required']).default('auto'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_response_output_tokens: z.number().min(1).default(4096),
})

export type RealtimeSessionConfig = z.infer<typeof RealtimeSessionConfigSchema>

// 实时消息类型
export const RealtimeMessageSchema = z.object({
  id: z.string(),
  object: z.literal('realtime.event'),
  type: z.enum([
    'error',
    'session.created',
    'session.updated',
    'input_audio_buffer.committed',
    'input_audio_buffer.appended',
    'input_audio_buffer.cleared',
    'conversation.item.created',
    'conversation.item.truncated',
    'conversation.item.deleted',
    'conversation.item.input_audio_transcription.completed',
    'conversation.item.input_audio_transcription.failed',
    'response.audio.delta',
    'response.audio.done',
    'response.audio_transcript.delta',
    'response.audio_transcript.done',
    'response.content_part.added',
    'response.content_part.done',
    'response.created',
    'response.done',
    'response.output_item.added',
    'response.output_item.done',
    'response.text.delta',
    'response.text.done',
    'response.tool_call.created',
    'response.tool_call.done',
    'text.done',
  ]),
  timestamp: z.number(),
  session_id: z.string(),
  data: z.any(),
})

export type RealtimeMessage = z.infer<typeof RealtimeMessageSchema>

// 智谱API服务类
export class ZhipuService {
  private client: ApiClient
  private sessionId: string | null = null
  private messageHandlers = new Map<string, (message: RealtimeMessage) => void>()

  constructor(client: ApiClient) {
    this.client = client
    this.setupWebSocketHandlers()
  }

  // 设置WebSocket消息处理器
  private setupWebSocketHandlers() {
    this.client.onWebSocketMessage('realtime.event', (data) => {
      try {
        const message = RealtimeMessageSchema.parse(data)
        const handler = this.messageHandlers.get(message.type)
        if (handler) {
          handler(message)
        }

        // 通用消息处理器
        const generalHandler = this.messageHandlers.get('*')
        if (generalHandler) {
          generalHandler(message)
        }
      } catch (error) {
        console.error('智谱API消息解析失败:', error)
      }
    })
  }

  // 创建实时会话
  async createRealtimeSession(config: Partial<RealtimeSessionConfig> = {}) {
    try {
      const sessionConfig = RealtimeSessionConfigSchema.parse(config)

      const response = await this.client.post<{ session_id: string }>(
        '/realtime/sessions',
        sessionConfig
      )

      this.sessionId = response.session_id
      return response
    } catch (error) {
      console.error('创建实时会话失败:', error)
      throw error
    }
  }

  // 更新实时会话
  async updateRealtimeSession(sessionId: string, config: Partial<RealtimeSessionConfig>) {
    try {
      return await this.client.post(
        `/realtime/sessions/${sessionId}`,
        config
      )
    } catch (error) {
      console.error('更新实时会话失败:', error)
      throw error
    }
  }

  // 删除实时会话
  async deleteRealtimeSession(sessionId: string) {
    try {
      return await this.client.delete(`/realtime/sessions/${sessionId}`)
    } catch (error) {
      console.error('删除实时会话失败:', error)
      throw error
    }
  }

  // 发送音频数据
  sendAudioData(audioData: ArrayBuffer, sessionId?: string) {
    const targetSessionId = sessionId || this.sessionId
    if (!targetSessionId) {
      throw new ApiError('未找到会话ID')
    }

    this.client.sendWebSocketMessage('input_audio_buffer.append', {
      session_id: targetSessionId,
      audio: this.arrayBufferToBase64(audioData),
    })
  }

  // 提交音频缓冲区
  commitAudioBuffer(sessionId?: string) {
    const targetSessionId = sessionId || this.sessionId
    if (!targetSessionId) {
      throw new ApiError('未找到会话ID')
    }

    this.client.sendWebSocketMessage('input_audio_buffer.commit', {
      session_id: targetSessionId,
    })
  }

  // 清除音频缓冲区
  clearAudioBuffer(sessionId?: string) {
    const targetSessionId = sessionId || this.sessionId
    if (!targetSessionId) {
      throw new ApiError('未找到会话ID')
    }

    this.client.sendWebSocketMessage('input_audio_buffer.clear', {
      session_id: targetSessionId,
    })
  }

  // 发送文本消息
  sendTextMessage(text: string, sessionId?: string) {
    const targetSessionId = sessionId || this.sessionId
    if (!targetSessionId) {
      throw new ApiError('未找到会话ID')
    }

    this.client.sendWebSocketMessage('conversation.item.create', {
      session_id: targetSessionId,
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: text,
        }],
      },
    })

    // 触发响应生成
    this.client.sendWebSocketMessage('response.create', {
      session_id: targetSessionId,
    })
  }

  // 创建响应
  createResponse(sessionId?: string) {
    const targetSessionId = sessionId || this.sessionId
    if (!targetSessionId) {
      throw new ApiError('未找到会话ID')
    }

    this.client.sendWebSocketMessage('response.create', {
      session_id: targetSessionId,
    })
  }

  // 取消响应
  cancelResponse(sessionId?: string) {
    const targetSessionId = sessionId || this.sessionId
    if (!targetSessionId) {
      throw new ApiError('未找到会话ID')
    }

    this.client.sendWebSocketMessage('response.cancel', {
      session_id: targetSessionId,
    })
  }

  // 注册消息处理器
  onMessage(type: string, handler: (message: RealtimeMessage) => void) {
    this.messageHandlers.set(type, handler)
  }

  // 移除消息处理器
  offMessage(type: string) {
    this.messageHandlers.delete(type)
  }

  // ArrayBuffer转Base64
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  // Base64转ArrayBuffer
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  // 解码音频数据
  decodeAudioData(base64Audio: string): ArrayBuffer {
    return this.base64ToArrayBuffer(base64Audio)
  }

  // 获取当前会话ID
  getSessionId(): string | null {
    return this.sessionId
  }

  // 设置会话ID
  setSessionId(sessionId: string) {
    this.sessionId = sessionId
  }

  // 清除会话ID
  clearSessionId() {
    this.sessionId = null
  }
}

// 创建智谱API服务实例的工厂函数
export function createZhipuService(config: {
  apiKey: string
  baseUrl?: string
  wsUrl?: string
}): ZhipuService {
  const client = new ApiClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4',
    wsUrl: config.wsUrl || 'wss://open.bigmodel.cn/api/paas/v4/realtime',
    timeout: 30000,
    retries: 3,
  })

  return new ZhipuService(client)
}