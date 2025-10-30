// WebSocket连接状态枚举
export enum SocketStatus {
  CONNECTING = 'CONNECTING',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  ERROR = 'ERROR'
}

// 消息类型枚举
export enum MessageType {
  // 会话管理
  SESSION_CREATE = 'session.create',
  SESSION_UPDATE = 'session.update',
  SESSION_CREATED = 'session.created',
  SESSION_UPDATED = 'session.updated',

  // 音频相关
  AUDIO_APPEND = 'input_audio_buffer.append',
  AUDIO_COMMIT = 'input_audio_buffer.commit',
  AUDIO_COMMITTED = 'input_audio_buffer.committed',
  AUDIO_CLEAR = 'input_audio_buffer.clear',
  AUDIO_CLEARED = 'input_audio_buffer.cleared',
  VIDEO_APPEND = 'input_audio_buffer.append_video_frame',

  // 文本相关
  TEXT_APPEND = 'input_text_buffer.append',

  // 响应相关
  RESPONSE_CREATE = 'response.create',
  RESPONSE_CREATED = 'response.created',
  RESPONSE_CANCEL = 'response.cancel',
  RESPONSE_CANCELLED = 'response.cancelled',
  RESPONSE_OUTPUT_ITEM_ADDED = 'response.output_item.added',
  RESPONSE_OUTPUT_ITEM_DONE = 'response.output_item.done',
  RESPONSE_CONTENT_PART_ADDED = 'response.content_part.added',
  RESPONSE_AUDIO_TRANSCRIPT_DELTA = 'response.audio_transcript.delta',
  RESPONSE_AUDIO_TRANSCRIPT_DONE = 'response.audio_transcript.done',
  RESPONSE_AUDIO_DELTA = 'response.audio.delta',
  RESPONSE_AUDIO_DONE = 'response.audio.done',
  RESPONSE_TEXT_DELTA = 'response.text.delta',
  RESPONSE_TEXT_DONE = 'response.text.done',
  RESPONSE_DONE = 'response.done',

  // 对话相关
  CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED = 'conversation.item.input_audio_transcription.completed',
  CONVERSATION_ITEM_CREATE = 'conversation.item.create',
  CONVERSATION_ITEM_DELETE = 'conversation.item.delete',
  CONVERSATION_ITEM_RETRIEVE = 'conversation.item.retrieve',
  CONVERSATION_ITEM_CREATED = 'conversation.item.created',
  CONVERSATION_ITEM_DELETED = 'conversation.item.deleted',

  // 其他
  ERROR = 'error',
  SPEECH_STARTED = 'speech_started',
  SPEECH_STOPPED = 'speech_stopped',
  HEARTBEAT = 'heartbeat',
}

export interface RealtimeMessage {
  type: MessageType
  client_timestamp?: number
  [key: string]: any
}

export interface ConnectionConfig {
  apiKey: string;
  domain?: string;
  proxyPath?: string;
  model?: string;
  modalities?: string[];
  turn_detection?: {
    type: string;
  };
  instructions?: string;
  beta_fields?: {
    chat_mode: string;
    tts_source: string;
    auto_search: boolean;
    greeting_config: {
      enable: boolean;
      content: string;
    };
  };
  voice?: string;
  output_audio_format?: string;
  input_audio_format?: string;
  tools?: any[];
  input_audio_noise_reduction?: {
    type: string;
  };
}

export interface RealtimeContentPart {
  type: string
  text?: string
  audio?: string
  transcript?: string
}

export interface RealtimeConversationItem {
  id?: string
  type: string
  object: string
  status?: string
  role?: string
  content?: RealtimeContentPart[]
  name?: string
  arguments?: string
  output?: string
}

export interface RealtimeResponse {
  id: string
  object: string
  status: string
  usage?: Record<string, unknown>
  [key: string]: any
}

export class ZhipuRealtimeService {
  private ws: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000

  // 状态管理
  private isConnected = false
  private isConnecting = false

  // 配置
  private config: ConnectionConfig
  private toast: any
  private addMessage: any
  private setAiResponseStatus: any

  // 会话相关
  private currentResponseId: string | null = null
  private responseId: string | null = null
  private activeResponseItemId: string | null = null
  private processedConversationItemIds: Set<string> = new Set()
  private serverSessionModel: string | null = null

  // 事件回调
  private onMessageCallbacks: Map<string, ((data: any) => void)[]> = new Map()
  private onConnectionChangeCallbacks: ((connected: boolean) => void)[] = []

  constructor(config: ConnectionConfig, dependencies: { toast: any, addMessage: any, setAiResponseStatus: any }) {
    this.config = {
      domain: 'wss://open.bigmodel.cn',
      proxyPath: '/api/paas/v4/realtime',
      model: 'glm-realtime',
      modalities: ['audio', 'text'],
      turn_detection: {
        type: 'client_vad',
      },
      instructions: '你是一个智能助手，请用简洁明了的语言回答问题。',
      beta_fields: {
        chat_mode: 'audio',
        tts_source: 'e2e',
        auto_search: false,
        greeting_config: {
          enable: false,
          content: '您好！我是智能助理彤彤，请问有什么可以帮您？',
        },
      },
      voice: 'tongtong',
      output_audio_format: 'pcm',
      input_audio_format: 'wav',
      tools: [],
      input_audio_noise_reduction: {
        type: 'near_field',
      },
      ...config
    }

    this.toast = dependencies.toast
    this.addMessage = dependencies.addMessage
    this.setAiResponseStatus = dependencies.setAiResponseStatus
  }

  private buildWebSocketUrl() {
    try {
      const domain = this.config.domain ?? 'wss://open.bigmodel.cn'
      const proxyPath = this.config.proxyPath ?? ''

      const baseUrl = proxyPath
        ? new URL(proxyPath, domain)
        : new URL(domain)

      const url = new URL(baseUrl.toString())
      url.searchParams.set('Authorization', this.config.apiKey)
      return url.toString()
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`无效的WebSocket地址: ${reason}`)
    }
  }

  // 建立WebSocket连接
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.apiKey) {
        reject(new Error('API密钥未设置'))
        return
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        reject(new Error('连接正在建立中'))
        return
      }

      this.isConnecting = true
      this.updateConnectionState(false)

      const url = this.buildWebSocketUrl()

      try {
        this.ws = new WebSocket(url)

        // 设置WebSocket二进制类型
        this.ws.binaryType = 'blob'

        this.ws.onopen = () => {
          this.isConnecting = false
          this.isConnected = true
          this.reconnectAttempts = 0
          this.clearReconnectTimer()
          this.startHeartbeat()
          this.updateConnectionState(true)

          console.log('%c WebSocket连接已建立', 'color: #4ade80')
          this.toast({
            title: '连接成功',
            description: '智谱AI实时服务已连接',
          })
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = (event) => {
          this.isConnecting = false
          this.isConnected = false
          this.stopHeartbeat()
          this.updateConnectionState(false)

          console.log(`%c WebSocket连接已关闭: ${event.code} ${event.reason}`, 'color: #ef4444')
          this.toast({
            title: '连接已断开',
            description: '智谱AI实时服务连接已断开',
            variant: 'destructive',
          })

          // 自动重连
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          this.isConnecting = false
          this.updateConnectionState(false)

          console.error('%c WebSocket连接错误:', 'color: #ef4444', error)
          console.error('连接URL:', url)
          console.error('WebSocket状态:', this.ws?.readyState)
          console.error('WebSocket协议:', this.ws?.protocol)

          this.toast({
            title: '连接错误',
            description: '智谱AI实时服务连接失败',
            variant: 'destructive',
          })

          reject(new Error('WebSocket连接失败'))
        }

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  // 断开连接
  disconnect() {
    this.clearReconnectTimer()
    this.stopHeartbeat()

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Normal closure')
      }
      this.ws = null
    }

    this.isConnected = false
    this.isConnecting = false
    this.updateConnectionState(false)
  }

  // 发送消息
  sendMessage(message: RealtimeMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket连接未建立')
    }

    const fullMessage: RealtimeMessage = {
      client_timestamp: Date.now(),
      ...message
    }

    try {
      const messageStr = JSON.stringify(fullMessage)
      console.log('发送消息:', fullMessage.type, messageStr)
      this.ws.send(messageStr)
    } catch (error) {
      console.error('发送消息失败:', error, fullMessage)
      throw error
    }
  }

  // 发送音频数据
  sendAudioData(audioBase64: string) {
    this.sendMessage({
      type: MessageType.AUDIO_APPEND,
      audio: audioBase64
    })
  }

  // 上传视频帧
  sendVideoFrame(frameBase64: string) {
    this.sendMessage({
      type: MessageType.VIDEO_APPEND,
      video_frame: frameBase64
    })
  }

  // 提交音频数据
  commitAudioData() {
    this.sendMessage({
      type: MessageType.AUDIO_COMMIT
    })
  }

  // 清空音频缓冲区
  clearAudioBuffer() {
    this.sendMessage({
      type: MessageType.AUDIO_CLEAR
    })
  }

  // 发送文本消息
  sendTextMessage(text: string) {
    const itemId = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `item-${Date.now()}`

    this.processedConversationItemIds.add(itemId)

    this.sendMessage({
      type: MessageType.CONVERSATION_ITEM_CREATE,
      item: {
        id: itemId,
        type: 'message',
        object: 'realtime.item',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    })

    this.sendMessage({
      type: MessageType.RESPONSE_CREATE
    })
  }

  // 通用：创建对话项
  createConversationItem(item: RealtimeConversationItem) {
    this.sendMessage({
      type: MessageType.CONVERSATION_ITEM_CREATE,
      item
    })
  }

  // 删除对话项
  deleteConversationItem(itemId: string) {
    this.sendMessage({
      type: MessageType.CONVERSATION_ITEM_DELETE,
      item_id: itemId
    })
  }

  // 查询对话项
  retrieveConversationItem(itemId: string) {
    this.sendMessage({
      type: MessageType.CONVERSATION_ITEM_RETRIEVE,
      item_id: itemId
    })
  }

  // 取消当前响应
  cancelResponse() {
    this.sendMessage({
      type: MessageType.RESPONSE_CANCEL
    })
  }

  // 创建会话
  private createSession() {
    this.sendMessage({
      type: MessageType.SESSION_CREATE,
      model: this.config.model || 'glm-realtime',
      voice: this.config.voice,
      instructions: this.config.instructions,
      input_audio_format: this.config.input_audio_format,
      output_audio_format: this.config.output_audio_format,
    })
  }

  // 处理接收到的消息
  private handleMessage(data: string) {
    try {
      const message: RealtimeMessage = JSON.parse(data)
      console.log('收到消息:', message.type, message)

      // 调用注册的回调函数
      const callbacks = this.onMessageCallbacks.get(message.type) || []
      callbacks.forEach(callback => callback(message))

      // 处理特定类型的消息
      switch (message.type) {
        case MessageType.SESSION_CREATED:
          this.handleSessionCreated(message)
          break
        case MessageType.SESSION_UPDATED:
          this.handleSessionUpdated(message)
          break
        case MessageType.ERROR:
          this.handleError(message)
          break
        case MessageType.AUDIO_COMMITTED:
          this.handleAudioCommitted(message)
          break
        case MessageType.RESPONSE_CREATED:
          this.handleResponseCreated(message)
          break
        case MessageType.RESPONSE_OUTPUT_ITEM_ADDED:
          this.handleResponseOutputItemAdded(message)
          break
        case MessageType.RESPONSE_OUTPUT_ITEM_DONE:
          this.handleResponseOutputItemDone(message)
          break
        case MessageType.RESPONSE_CONTENT_PART_ADDED:
          this.handleResponseContentPartAdded(message)
          break
        case MessageType.RESPONSE_AUDIO_TRANSCRIPT_DELTA:
          this.handleResponseAudioTranscript(message)
          break
        case MessageType.RESPONSE_AUDIO_TRANSCRIPT_DONE:
          this.handleResponseAudioTranscriptDone()
          break
        case MessageType.RESPONSE_AUDIO_DELTA:
          this.handleResponseAudio(message)
          break
        case MessageType.RESPONSE_AUDIO_DONE:
          this.handleResponseAudioDone()
          break
        case MessageType.RESPONSE_TEXT_DELTA:
          this.handleTextDelta(message)
          break
        case MessageType.RESPONSE_TEXT_DONE:
          this.handleResponseTextDone()
          break
        case MessageType.RESPONSE_DONE:
          this.handleResponseDone(message)
          break
        case MessageType.RESPONSE_CANCELLED:
          this.handleResponseCancelled(message)
          break
        case MessageType.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED:
          this.handleInputAudioTranscriptionCompleted(message)
          break
        case MessageType.CONVERSATION_ITEM_CREATED:
          this.handleConversationItemCreated(message)
          break
        case MessageType.CONVERSATION_ITEM_DELETED:
          this.handleConversationItemDeleted(message)
          break
        case MessageType.SPEECH_STARTED:
          this.handleSpeechStarted()
          break
        case MessageType.SPEECH_STOPPED:
          this.handleSpeechStopped()
          break
      }
    } catch (error) {
      console.error('解析消息失败:', error, data)
    }
  }

  private appendResponseText(delta?: string) {
    if (!delta) return
    this.currentResponse += delta
    console.log('收到AI文本:', delta)
  }

  private extractTextFromContent(content?: RealtimeContentPart[]) {
    if (!content || !Array.isArray(content)) {
      return ''
    }

    return content.reduce((acc, part) => {
      if (!part) return acc
      if (typeof part.text === 'string' && part.text.length) {
        return acc + part.text
      }
      if (typeof part.transcript === 'string' && part.transcript.length) {
        return acc + part.transcript
      }
      return acc
    }, '')
  }

  private mapRoleToSender(role?: string): 'user' | 'assistant' | 'system' {
    switch (role) {
      case 'assistant':
        return 'assistant'
      case 'system':
        return 'system'
      default:
        return 'user'
    }
  }

  // 处理会话创建成功
  private handleSessionCreated(message: any) {
    console.log('会话创建成功:', message)
    this.serverSessionModel = message.session?.model ?? null
    setTimeout(() => {
      this.updateSession()
    }, 100)
  }

  // 更新会话参数
  private updateSession() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('跳过会话更新：WebSocket未连接')
      return
    }

    const model = this.config.model || this.serverSessionModel || 'glm-realtime'

    this.sendMessage({
      type: MessageType.SESSION_UPDATE,
      event_id: `evt_${Date.now()}`,
      session: {
        model,
        modalities: this.config.modalities,
        turn_detection: this.config.turn_detection,
        instructions: this.config.instructions,
        beta_fields: this.config.beta_fields,
        voice: this.config.voice,
        output_audio_format: this.config.output_audio_format,
        input_audio_format: this.config.input_audio_format,
        tools: this.config.tools,
        input_audio_noise_reduction: this.config.input_audio_noise_reduction,
      }
    })
  }

  // 处理会话更新成功
  private handleSessionUpdated(message: any) {
    console.log('会话更新成功:', message)
  }

  // 处理音频提交成功
  private handleAudioCommitted(message: any) {
    console.log('音频提交成功:', message)
    if (message.item_id) {
      this.currentResponseId = message.item_id
    }
  }

  // 处理响应创建
  private handleResponseCreated(message: any) {
    console.log('响应创建:', message)
    if (message.response?.id) {
      this.responseId = message.response.id
    }
    this.activeResponseItemId = null
    this.currentResponse = ''
    this.setAiResponseStatus('thinking')
  }

  private handleResponseOutputItemAdded(message: any) {
    const item = message.item as RealtimeConversationItem | undefined
    if (item?.id) {
      this.activeResponseItemId = item.id
    }

    if (item?.content?.length) {
      const text = this.extractTextFromContent(item.content)
      this.appendResponseText(text)
    }
  }

  private handleResponseOutputItemDone(message: any) {
    const item = message.item as RealtimeConversationItem | undefined
    if (item?.id && item.id === this.activeResponseItemId) {
      this.activeResponseItemId = null
    }
    if (item?.content?.length) {
      const text = this.extractTextFromContent(item.content)
      this.appendResponseText(text)
    }
  }

  private handleResponseContentPartAdded(message: any) {
    const content: RealtimeContentPart[] | undefined = message.content_part?.content
      || message.content
      || message.item?.content

    const text = this.extractTextFromContent(content)
    this.appendResponseText(text)
  }

  // 处理AI回复文本
  private handleResponseAudioTranscript(message: any) {
    const delta = message.delta ?? message.transcript ?? message.text
    this.appendResponseText(delta)
  }

  // 处理AI回复音频
  private handleResponseAudio(message: any) {
    const audioData = message.delta ?? message.audio
    if (audioData) {
      console.log('收到AI音频:', audioData.length, '字符')
      // 这里可以播放音频数据
    }
  }

  private handleResponseAudioTranscriptDone() {
    // 暂无额外逻辑，预留扩展能力
  }

  private handleResponseAudioDone() {
    // 暂无额外逻辑，预留扩展能力
  }

  private handleResponseCancelled(message: any) {
    console.log('响应已取消:', message)
    this.currentResponse = ''
    this.activeResponseItemId = null
    this.setAiResponseStatus('idle')
  }

  private handleConversationItemCreated(message: any) {
    const item = message.item as RealtimeConversationItem | undefined
    if (!item?.id || this.processedConversationItemIds.has(item.id)) {
      return
    }

    this.processedConversationItemIds.add(item.id)

    if (item.type === 'message' && item.role === 'assistant' && item.content?.length) {
      const text = this.extractTextFromContent(item.content)
      if (text) {
        this.addMessage({
          id: item.id,
          content: text,
          sender: this.mapRoleToSender(item.role),
          type: 'text',
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }
  }

  private handleConversationItemDeleted(message: any) {
    const item = message.item as RealtimeConversationItem | undefined
    if (item?.id) {
      this.processedConversationItemIds.delete(item.id)
    }
  }

  private handleResponseTextDone() {
    // 暂无额外逻辑，预留扩展能力
  }

  // 处理用户音频转录完成
  private handleInputAudioTranscriptionCompleted(message: any) {
    if (message.transcript) {
      console.log('用户音频转录:', message.transcript)
      const messageId = message.item_id || `user-${Date.now()}`
      if (typeof message.item_id === 'string') {
        this.processedConversationItemIds.add(message.item_id)
      }
      this.addMessage({
        id: messageId,
        content: message.transcript,
        sender: 'user',
        type: 'text',
        isRead: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }

  // 处理错误消息
  private handleError(message: any) {
    console.error('智谱AI错误:', message)
    this.toast({
      title: 'AI服务错误',
      description: message.error?.message || '未知错误',
      variant: 'destructive',
    })
  }

  // 处理音频数据
  private handleAudioDelta(message: any) {
    if (message.data?.audio) {
      // 这里可以播放音频数据
      console.log('收到音频数据:', message.data.audio.length, '字符')
    }
  }

  // 处理文本数据
  private currentResponse = ''
  private handleTextDelta(message: any) {
    const delta = message.delta ?? message.text ?? message.data?.text
    this.appendResponseText(delta)
  }

  // 处理响应完成
  private handleResponseDone(message: any) {
    const response: RealtimeResponse | undefined = message.response
    const status = response?.status || message.status

    if (status && status !== 'completed') {
      this.currentResponse = ''
      this.activeResponseItemId = null
      this.setAiResponseStatus('idle')
      return
    }

    if (this.currentResponse) {
      const messageId = this.activeResponseItemId || response?.id || `assistant-${Date.now()}`
      if (!this.processedConversationItemIds.has(messageId)) {
        this.addMessage({
          id: messageId,
          content: this.currentResponse,
          sender: 'assistant',
          type: 'text',
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        this.processedConversationItemIds.add(messageId)
      }
      this.currentResponse = ''
    }

    this.activeResponseItemId = null
    this.setAiResponseStatus('idle')
  }

  // 处理语音开始
  private handleSpeechStarted() {
    console.log('检测到语音开始')
    // 可以在这里停止播放当前音频
  }

  // 处理语音结束
  private handleSpeechStopped() {
    console.log('检测到语音结束')
    this.commitAudioData()
  }

  // 开始心跳
  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.sendMessage({
        type: MessageType.HEARTBEAT,
        timestamp: Date.now()
      })
    }, 30000) // 30秒心跳
  }

  // 停止心跳
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 安排重连
  private scheduleReconnect() {
    this.clearReconnectTimer()

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      this.connect().catch(error => {
        console.error('重连失败:', error)
      })
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  // 清除重连定时器
  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // 更新连接状态
  private updateConnectionState(connected: boolean) {
    this.isConnected = connected
    this.onConnectionChangeCallbacks.forEach(callback => callback(connected))
  }

  // 注册消息回调
  onMessage(type: MessageType, callback: (data: any) => void) {
    if (!this.onMessageCallbacks.has(type)) {
      this.onMessageCallbacks.set(type, [])
    }
    this.onMessageCallbacks.get(type)!.push(callback)
  }

  // 移除消息回调
  offMessage(type: MessageType, callback: (data: any) => void) {
    const callbacks = this.onMessageCallbacks.get(type)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  // 注册连接状态变化回调
  onConnectionChange(callback: (connected: boolean) => void) {
    this.onConnectionChangeCallbacks.push(callback)
  }

  // 移除连接状态变化回调
  offConnectionChange(callback: (connected: boolean) => void) {
    const index = this.onConnectionChangeCallbacks.indexOf(callback)
    if (index > -1) {
      this.onConnectionChangeCallbacks.splice(index, 1)
    }
  }

  // 手动创建会话（供外部调用）
  public createSessionManually() {
    if (this.isConnected) {
      this.createSession()
    } else {
      throw new Error('WebSocket未连接，无法创建会话')
    }
  }

  // 获取连接状态
  getConnectionState() {
    if (this.isConnecting) return SocketStatus.CONNECTING
    if (this.isConnected) return SocketStatus.OPEN
    if (this.ws) {
      switch (this.ws.readyState) {
        case WebSocket.CONNECTING: return SocketStatus.CONNECTING
        case WebSocket.OPEN: return SocketStatus.OPEN
        case WebSocket.CLOSING: return SocketStatus.CLOSING
        case WebSocket.CLOSED: return SocketStatus.CLOSED
      }
    }
    return SocketStatus.CLOSED
  }
}
