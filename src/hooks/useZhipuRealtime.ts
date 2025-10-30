import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from './use-toast'
import { useAppStore } from '@/stores/useAppStore'
import { useChatStore } from '@/stores/useChatStore'
import { ZhipuRealtimeService, MessageType, type ConnectionConfig } from '@/services/zhipu-websocket'
import { VoiceProcessor } from '@/services/voice-processor'

interface UseZhipuRealtimeOptions {
  autoConnect?: boolean
  config?: Partial<ConnectionConfig>
}

export function useZhipuRealtime(options: UseZhipuRealtimeOptions = {}) {
  const { autoConnect = false, config = {} } = options
  const toast = useToast().toast
  const { settings } = useAppStore()
  const {
    messages,
    addMessage,
    aiResponseStatus,
    setAiResponseStatus
  } = useChatStore()

  // 状态管理
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // 服务实例
  const zhipuServiceRef = useRef<ZhipuRealtimeService | null>(null)
  const voiceProcessorRef = useRef<VoiceProcessor | null>(null)
  const currentResponseRef = useRef<string>('')

  // 初始化服务
  const initializeService = useCallback(async () => {
    if (!settings?.api?.apiKey) {
      throw new Error('未设置API密钥，请在设置中配置智谱API密钥')
    }

    try {
      const connectionConfig: ConnectionConfig = {
        apiKey: settings?.api?.apiKey || '',
        domain: settings?.api?.wsUrl || 'wss://open.bigmodel.cn/api/paas/v4/realtime',
        ...config
      }

      const service = new ZhipuRealtimeService(connectionConfig, {
        toast,
        addMessage,
        setAiResponseStatus
      })
      zhipuServiceRef.current = service

      // 初始化语音处理器
      voiceProcessorRef.current = new VoiceProcessor()

      // 设置消息处理器
      setupMessageHandlers(service)

      return service
    } catch (error) {
      console.error('智谱服务初始化失败:', error)
      throw error
    }
  }, [settings.api, config])

  // 设置消息处理器
  const setupMessageHandlers = useCallback((service: ZhipuRealtimeService) => {
    // 会话创建成功
    service.onMessage(MessageType.SESSION_CREATED, (message) => {
      // 智谱返回的会话信息在 session 字段内
      const sessionInfo = message.session ?? message.data ?? null
      console.log('会话已创建:', sessionInfo)
      if (sessionInfo?.id) {
        setSessionId(sessionInfo.id)
      }
      setIsConnected(true)
      setError(null)
    })

    // 错误处理
    service.onMessage(MessageType.ERROR, (message) => {
      console.error('智谱API错误:', message)
      setError(message.error?.message || '未知错误')
    })

    // 音频响应开始
    service.onMessage(MessageType.RESPONSE_AUDIO_DELTA, (message) => {
      if (message.data?.audio) {
        console.log('收到音频数据:', message.data.audio.length, '字符')
        // 这里可以播放音频数据
      }
    })

    // 文本响应开始
    service.onMessage(MessageType.RESPONSE_TEXT_DELTA, (message) => {
      if (message.data?.text) {
        currentResponseRef.current += message.data.text
      }
    })

    // 响应完成
    service.onMessage(MessageType.RESPONSE_DONE, () => {
      if (currentResponseRef.current) {
        addMessage({
          id: Date.now().toString(),
          content: currentResponseRef.current,
          sender: 'assistant',
          type: 'text',
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        currentResponseRef.current = ''
      }
      setAiResponseStatus('idle')
    })

    // 语音开始检测
    service.onMessage(MessageType.SPEECH_STARTED, () => {
      console.log('检测到语音开始')
      // 可以在这里停止播放当前音频
    })

    // 语音结束检测
    service.onMessage(MessageType.SPEECH_STOPPED, () => {
      console.log('检测到语音结束')
      // 服务端VAD模式下，语音结束会自动提交
    })

    // 连接状态变化
    service.onConnectionChange((connected) => {
      setIsConnected(connected)
      if (connected) {
        toast({
          title: '连接成功',
          description: '智谱AI已连接',
        })
        // 连接成功后不再自动创建会話，等待用户手动触发
        // setTimeout(() => {
        //   try {
        //     service.createSessionManually()
        //   } catch (error) {
        //     console.error('创建会话失败:', error)
        //   }
        // }, 500)
      }
    })
  }, [addMessage, setAiResponseStatus, toast])

  // 连接智谱API
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return

    setIsConnecting(true)
    setError(null)

    try {
      const service = await initializeService()
      await service.connect()
    } catch (error) {
      console.error('连接智谱API失败:', error)
      const errorMessage = error instanceof Error ? error.message : '连接失败'
      setError(errorMessage)
      toast({
        title: '连接失败',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting, isConnected, initializeService, toast])

  // 断开连接
  const disconnect = useCallback(async () => {
    try {
      if (zhipuServiceRef.current) {
        zhipuServiceRef.current.disconnect()
        zhipuServiceRef.current = null
      }

      if (voiceProcessorRef.current) {
        voiceProcessorRef.current.dispose()
        voiceProcessorRef.current = null
      }

      setIsConnected(false)
      setSessionId(null)
      currentResponseRef.current = ''

      toast({
        title: '连接已断开',
        description: '智谱AI连接已断开',
      })
    } catch (error) {
      console.error('断开连接失败:', error)
    }
  }, [toast])

  // 发送文本消息
  const sendTextMessage = useCallback(async (text: string) => {
    if (!zhipuServiceRef.current || !isConnected) {
      throw new Error('未连接到智谱API')
    }

    try {
      // 添加用户消息到聊天记录
      addMessage({
        id: Date.now().toString(),
        content: text,
        sender: 'user',
        type: 'text',
        isRead: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // 设置AI状态为思考中
      setAiResponseStatus('thinking')

      // 发送消息到智谱API
      zhipuServiceRef.current.sendTextMessage(text)
    } catch (error) {
      console.error('发送文本消息失败:', error)
      setAiResponseStatus('error')
      throw error
    }
  }, [isConnected, addMessage, setAiResponseStatus])

  // 发送音频消息
  const sendAudioMessage = useCallback(async (audioBase64: string) => {
    if (!zhipuServiceRef.current || !isConnected) {
      throw new Error('未连接到智谱API')
    }

    try {
      // 设置AI状态为思考中
      setAiResponseStatus('thinking')

      // 发送音频数据
      zhipuServiceRef.current.sendAudioData(audioBase64)
    } catch (error) {
      console.error('发送音频消息失败:', error)
      setAiResponseStatus('error')
      throw error
    }
  }, [isConnected, setAiResponseStatus])

  // 开始音频输入和自动语音检测
  const startAudioInput = useCallback(async () => {
    if (!voiceProcessorRef.current) {
      voiceProcessorRef.current = new VoiceProcessor()
    }

    try {
      // 设置音频数据回调
      voiceProcessorRef.current.onAudioDataCallback(async (audioBase64: string) => {
        if (isConnected && zhipuServiceRef.current) {
          try {
            await sendAudioMessage(audioBase64)
          } catch (error) {
            console.error('发送音频数据失败:', error)
          }
        }
      })

      // 设置VAD状态变化回调
      voiceProcessorRef.current.onVADChangeCallback((isSpeaking: boolean) => {
        console.log('VAD状态变化:', isSpeaking ? '开始说话' : '停止说话')

        if (isSpeaking && isConnected && zhipuServiceRef.current) {
          // 开始说话时，如果有AI正在响应，取消当前响应
          if (aiResponseStatus === 'speaking') {
            try {
              zhipuServiceRef.current.cancelResponse()
            } catch (error) {
              console.error('取消响应失败:', error)
            }
          }
        }
      })

      // 设置错误回调
      voiceProcessorRef.current.onErrorCallback((error: Error) => {
        console.error('语音处理错误:', error)
        toast({
          title: '语音处理错误',
          description: error.message,
          variant: 'destructive',
        })
      })

      // 开始语音监听
      await voiceProcessorRef.current.startListening()

      toast({
        title: '音频输入已启动',
        description: '可以开始语音对话了',
      })
    } catch (error) {
      console.error('启动音频输入失败:', error)
      toast({
        title: '音频输入失败',
        description: error instanceof Error ? error.message : '无法访问麦克风',
        variant: 'destructive',
      })
      throw error
    }
  }, [isConnected, sendAudioMessage, aiResponseStatus, toast])

  // 停止音频输入
  const stopAudioInput = useCallback(() => {
    if (voiceProcessorRef.current) {
      voiceProcessorRef.current.stopListening()
    }

    toast({
      title: '音频输入已停止',
      description: '语音输入已关闭',
    })
  }, [toast])

  // 手动提交音频数据
  const commitAudioData = useCallback(() => {
    if (zhipuServiceRef.current && isConnected) {
      try {
        zhipuServiceRef.current.commitAudioData()
      } catch (error) {
        console.error('提交音频数据失败:', error)
      }
    }
  }, [isConnected])

  // 取消当前响应
  const cancelResponse = useCallback(() => {
    if (zhipuServiceRef.current && isConnected) {
      try {
        zhipuServiceRef.current.cancelResponse()
        setAiResponseStatus('idle')
      } catch (error) {
        console.error('取消响应失败:', error)
      }
    }
  }, [isConnected, setAiResponseStatus])

  // 自动连接
  useEffect(() => {
    if (autoConnect && settings?.api?.apiKey && !isConnected && !isConnecting) {
      connect()
    }

    return () => {
      if (isConnected) {
        disconnect()
      }
    }
  }, [autoConnect, settings?.api?.apiKey, isConnected, isConnecting, connect, disconnect])

  // 清理资源
  useEffect(() => {
    return () => {
      if (voiceProcessorRef.current) {
        voiceProcessorRef.current.dispose()
      }
      if (zhipuServiceRef.current) {
        zhipuServiceRef.current.disconnect()
      }
    }
  }, [])

  return {
    // 状态
    isConnected,
    isConnecting,
    error,
    sessionId,
    aiResponseStatus,

    // 方法
    connect,
    disconnect,
    sendTextMessage,
    sendAudioMessage,
    startAudioInput,
    stopAudioInput,
    commitAudioData,
    cancelResponse,
    createSession: () => {
      if (zhipuServiceRef.current) {
        zhipuServiceRef.current.createSessionManually()
      }
    },
  }
}
