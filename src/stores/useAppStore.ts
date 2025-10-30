import { create } from 'zustand'
import type { User, UserSettings, CallSession, ConversationContext } from '@/types'

interface AppState {
  // 用户状态
  user: User | null
  setUser: (user: User | null) => void

  // 主题和UI状态
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // 用户设置
  settings: UserSettings
  updateSettings: (settings: Partial<UserSettings>) => void
  resetSettings: () => void

  // 通话状态
  currentCall: CallSession | null
  setCurrentCall: (call: CallSession | null) => void

  // 对话状态
  conversations: ConversationContext[]
  activeConversation: ConversationContext | null
  setActiveConversation: (conversation: ConversationContext | null) => void
  addConversation: (conversation: ConversationContext) => void
  updateConversation: (id: string, updates: Partial<ConversationContext>) => void

  // UI状态
  loading: boolean
  setLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void

  // 清除所有数据
  clearAll: () => void
}

const defaultSettings: UserSettings = {
  theme: 'system',
  language: 'zh-CN',
  notifications: true,
  api: {
    apiKey: '',
    baseUrl: 'https://open.bigmodel.cn',
    wsUrl: 'wss://open.bigmodel.cn/api/paas/v4/realtime',
  },
  audio: {
    inputDevice: undefined,
    outputDevice: undefined,
    volume: 50,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    inputDevice: undefined,
    resolution: '720p',
    frameRate: 30,
    quality: 'medium',
  },
}

const mockUser: User = {
  id: '1',
  name: '用户',
  email: 'user@example.com',
  avatar: undefined,
  settings: defaultSettings,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const useAppStore = create<AppState>((set, get) => ({
  // 用户状态
  user: mockUser,
  setUser: (user) => set({ user }),

  // 主题和UI状态
  theme: 'system',
  setTheme: (theme) => {
    set({ theme })
    // 应用主题到document
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }

    // 更新设置中的主题
    const { settings } = get()
    set({
      settings: { ...settings, theme }
    })
  },

  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // 用户设置
  settings: defaultSettings,
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
  resetSettings: () => set({ settings: defaultSettings }),

  // 通话状态
  currentCall: null,
  setCurrentCall: (call) => set({ currentCall: call }),

  // 对话状态
  conversations: [],
  activeConversation: null,
  setActiveConversation: (conversation) => set({ activeConversation: conversation }),
  addConversation: (conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations]
  })),
  updateConversation: (id, updates) => set((state) => ({
    conversations: state.conversations.map(conv =>
      conv.id === id ? { ...conv, ...updates } : conv
    ),
    activeConversation: state.activeConversation?.id === id
      ? { ...state.activeConversation, ...updates }
      : state.activeConversation
  })),

  // UI状态
  loading: false,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),

  // 清除所有数据
  clearAll: () => set({
    user: null,
    currentCall: null,
    conversations: [],
    activeConversation: null,
    loading: false,
    error: null,
  }),
}))

// 初始化主题
const initializeTheme = () => {
  const { theme } = useAppStore.getState()
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

// 在客户端初始化主题
if (typeof window !== 'undefined') {
  initializeTheme()

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    const { theme } = useAppStore.getState()
    if (theme === 'system') {
      initializeTheme()
    }
  })
}