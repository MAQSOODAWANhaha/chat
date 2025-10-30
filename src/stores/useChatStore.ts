import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Message, ConversationContext } from '@/types'

interface ChatState {
  // 当前对话
  currentConversation: ConversationContext | null
  messages: Message[]
  isLoading: boolean
  error: string | null

  // 输入状态
  inputValue: string
  isRecording: boolean
  recordingDuration: number

  // AI状态
  isTyping: boolean
  aiResponseStatus: 'idle' | 'thinking' | 'responding' | 'error'

  // 历史对话
  conversationHistory: ConversationContext[]
  historyLoading: boolean

  // Actions
  setCurrentConversation: (conversation: ConversationContext | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  deleteMessage: (messageId: string) => void

  setInputValue: (value: string) => void
  setIsRecording: (recording: boolean) => void
  setRecordingDuration: (duration: number) => void

  setIsTyping: (typing: boolean) => void
  setAiResponseStatus: (status: ChatState['aiResponseStatus']) => void

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // 消息操作
  sendMessage: (content: string, type?: Message['type']) => Promise<void>
  sendAudioMessage: (audioBlob: Blob) => Promise<void>
  resendMessage: (messageId: string) => Promise<void>

  // 对话操作
  createNewConversation: () => ConversationContext
  loadConversationHistory: () => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>

  // 录音操作
  startRecording: () => void
  stopRecording: () => void
  cancelRecording: () => void

  // 清理
  clearCurrentConversation: () => void
  reset: () => void
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      currentConversation: null,
      messages: [],
      isLoading: false,
      error: null,

      inputValue: '',
      isRecording: false,
      recordingDuration: 0,

      isTyping: false,
      aiResponseStatus: 'idle',

      conversationHistory: [],
      historyLoading: false,

      // Actions
      setCurrentConversation: (currentConversation) => set({ currentConversation }),

      setMessages: (messages) => set({ messages }),

      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
      })),

      updateMessage: (messageId, updates) => set((state) => ({
        messages: state.messages.map(msg =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      })),

      deleteMessage: (messageId) => set((state) => ({
        messages: state.messages.filter(msg => msg.id !== messageId)
      })),

      setInputValue: (inputValue) => set({ inputValue }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setRecordingDuration: (recordingDuration) => set({ recordingDuration }),

      setIsTyping: (isTyping) => set({ isTyping }),
      setAiResponseStatus: (aiResponseStatus) => set({ aiResponseStatus }),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // 消息操作
      sendMessage: async (content, type = 'text') => {
        const { addMessage, setIsTyping, setAiResponseStatus } = get()

        try {
          // 创建用户消息
          const userMessage: Message = {
            id: `msg-${Date.now()}`,
            content,
            type,
            sender: 'user',
            isRead: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          addMessage(userMessage)
          set({ inputValue: '' })

          // 设置AI响应状态
          setIsTyping(true)
          setAiResponseStatus('thinking')

          // 这里将实现实际的AI响应逻辑
          // 包括发送消息到智谱AI Realtime API

          // 模拟AI响应延迟
          await new Promise(resolve => setTimeout(resolve, 1500))

          setAiResponseStatus('responding')

          // 模拟AI响应
          await new Promise(resolve => setTimeout(resolve, 1000))

          // 创建AI响应消息
          const aiMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            content: `我收到了您的消息："${content}"。这是AI助手的回复。`,
            type: 'text',
            sender: 'assistant',
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          addMessage(aiMessage)
          setAiResponseStatus('idle')
          setIsTyping(false)

        } catch (error) {
          console.error('发送消息失败:', error)
          set({ error: error instanceof Error ? error.message : '发送消息失败' })
          setAiResponseStatus('error')
          setIsTyping(false)
        }
      },

      sendAudioMessage: async (audioBlob) => {
        const { addMessage, setIsTyping, setAiResponseStatus } = get()

        try {
          // 创建音频消息
          const audioMessage: Message = {
            id: `msg-${Date.now()}`,
            content: '语音消息',
            type: 'audio',
            sender: 'user',
            isRead: true,
            metadata: {
              audioUrl: URL.createObjectURL(audioBlob),
              audioDuration: audioBlob.size / 1000, // 简化计算
              fileSize: audioBlob.size,
              fileType: audioBlob.type,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          addMessage(audioMessage)

          // 设置AI响应状态
          setIsTyping(true)
          setAiResponseStatus('thinking')

          // 这里将实现语音识别和AI响应逻辑

          setAiResponseStatus('idle')
          setIsTyping(false)

        } catch (error) {
          console.error('发送语音消息失败:', error)
          set({ error: error instanceof Error ? error.message : '发送语音消息失败' })
          setAiResponseStatus('error')
          setIsTyping(false)
        }
      },

      resendMessage: async (messageId) => {
        const { messages, sendMessage } = get()
        const message = messages.find(msg => msg.id === messageId)

        if (message && message.sender === 'user') {
          // 删除原消息
          set(state => ({
            messages: state.messages.filter(msg => msg.id !== messageId)
          }))

          // 重新发送
          await sendMessage(message.content, message.type)
        }
      },

      // 对话操作
      createNewConversation: () => {
        const conversation: ConversationContext = {
          id: `conv-${Date.now()}`,
          messages: [],
          model: {
            id: 'zhipu-realtime',
            name: '智谱Realtime',
            description: '智谱AI实时对话模型',
            maxTokens: 4096,
            temperature: 0.7,
            topP: 0.9,
          },
          settings: {
            voiceEnabled: true,
            autoResponse: true,
            responseDelay: 0,
            language: 'zh-CN',
          },
        }

        set({ currentConversation: conversation, messages: [] })
        return conversation
      },

      loadConversationHistory: async () => {
        set({ historyLoading: true })

        try {
          // 这里将实现从本地存储或服务器加载对话历史
          const mockHistory: ConversationContext[] = []

          set({ conversationHistory: mockHistory })
        } catch (error) {
          console.error('加载对话历史失败:', error)
          set({ error: '加载对话历史失败' })
        } finally {
          set({ historyLoading: false })
        }
      },

      deleteConversation: async (conversationId) => {
        try {
          set(state => ({
            conversationHistory: state.conversationHistory.filter(conv => conv.id !== conversationId)
          }))
        } catch (error) {
          console.error('删除对话失败:', error)
          set({ error: '删除对话失败' })
        }
      },

      // 录音操作
      startRecording: () => {
        set({ isRecording: true, recordingDuration: 0 })

        // 开始计时
        const interval = setInterval(() => {
          const { recordingDuration, isRecording } = get()
          if (isRecording && recordingDuration < 60000) { // 最多60秒
            set(state => ({ recordingDuration: state.recordingDuration + 100 }))
          } else {
            clearInterval(interval)
            set({ isRecording: false })
          }
        }, 100)
      },

      stopRecording: () => {
        set({ isRecording: false })
        // 这里将实现录音停止后的处理逻辑
      },

      cancelRecording: () => {
        set({ isRecording: false, recordingDuration: 0 })
      },

      clearCurrentConversation: () => {
        set({
          currentConversation: null,
          messages: [],
          inputValue: '',
          isTyping: false,
          aiResponseStatus: 'idle',
          error: null,
        })
      },

      reset: () => set({
        currentConversation: null,
        messages: [],
        isLoading: false,
        error: null,
        inputValue: '',
        isRecording: false,
        recordingDuration: 0,
        isTyping: false,
        aiResponseStatus: 'idle',
        conversationHistory: [],
        historyLoading: false,
      }),
    }),
    {
      name: 'chat-store',
    }
  )
)