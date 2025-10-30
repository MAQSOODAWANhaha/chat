import { z } from 'zod'

// API响应基础类型
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  code: z.number().optional(),
  message: z.string().optional(),
})

export type ApiResponse = z.infer<typeof ApiResponseSchema>

// WebSocket消息类型
export const WebSocketMessageSchema = z.object({
  type: z.string(),
  data: z.any().optional(),
  timestamp: z.number().optional(),
  id: z.string().optional(),
})

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>

// API配置
export interface ApiConfig {
  baseUrl: string
  wsUrl: string
  apiKey: string
  timeout: number
  retries: number
}

// API错误类
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public response?: Response
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 基础API客户端
export class ApiClient {
  private config: ApiConfig
  private ws: WebSocket | null = null
  private wsReconnectTimer: NodeJS.Timeout | null = null
  private wsReconnectAttempts = 0
  private maxReconnectAttempts = 5
  private wsMessageHandlers = new Map<string, (data: any) => void>()

  constructor(config: ApiConfig) {
    this.config = config
  }

  // HTTP请求方法
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.config.timeout),
    }

    try {
      const response = await fetch(url, {
        ...defaultOptions,
        ...options,
      })

      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response
        )
      }

      const data = await response.json()

      // 验证响应格式
      const validatedData = ApiResponseSchema.parse(data)

      if (!validatedData.success) {
        throw new ApiError(
          validatedData.error || '请求失败',
          validatedData.code
        )
      }

      return validatedData.data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('请求超时')
        }
        throw new ApiError(error.message)
      }

      throw new ApiError('未知错误')
    }
  }

  // GET请求
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  // POST请求
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PUT请求
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // DELETE请求
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // WebSocket连接
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket连接已建立')
          this.wsReconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            const validatedMessage = WebSocketMessageSchema.parse(message)

            const handler = this.wsMessageHandlers.get(validatedMessage.type)
            if (handler) {
              handler(validatedMessage.data)
            }
          } catch (error) {
            console.error('WebSocket消息解析失败:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket连接已关闭:', event.code, event.reason)
          this.handleWebSocketReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error)
          reject(new ApiError('WebSocket连接失败'))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // WebSocket重连逻辑
  private handleWebSocketReconnect() {
    if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
      this.wsReconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 30000)

      console.log(`${delay}ms后尝试WebSocket重连 (${this.wsReconnectAttempts}/${this.maxReconnectAttempts})`)

      this.wsReconnectTimer = setTimeout(() => {
        this.connectWebSocket().catch(error => {
          console.error('WebSocket重连失败:', error)
        })
      }, delay)
    } else {
      console.error('WebSocket重连次数已达上限')
    }
  }

  // 发送WebSocket消息
  sendWebSocketMessage(type: string, data?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9),
      }

      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket未连接，无法发送消息')
    }
  }

  // 注册WebSocket消息处理器
  onWebSocketMessage(type: string, handler: (data: any) => void) {
    this.wsMessageHandlers.set(type, handler)
  }

  // 移除WebSocket消息处理器
  offWebSocketMessage(type: string) {
    this.wsMessageHandlers.delete(type)
  }

  // 断开WebSocket连接
  disconnectWebSocket() {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer)
      this.wsReconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  // 获取WebSocket连接状态
  getWebSocketState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed'

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'open'
      case WebSocket.CLOSING:
        return 'closing'
      case WebSocket.CLOSED:
        return 'closed'
      default:
        return 'closed'
    }
  }

  // 更新配置
  updateConfig(config: Partial<ApiConfig>) {
    this.config = { ...this.config, ...config }
  }

  // 获取配置
  getConfig(): ApiConfig {
    return { ...this.config }
  }
}