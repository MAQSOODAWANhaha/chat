// 基础类型定义
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// 用户相关类型
export interface User extends BaseEntity {
  name: string
  email: string
  avatar?: string
  settings: UserSettings
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'zh-CN' | 'en-US'
  notifications: boolean
  audio: AudioSettings
  video: VideoSettings
}

export interface AudioSettings {
  inputDevice?: string
  outputDevice?: string
  volume: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

export interface VideoSettings {
  inputDevice?: string
  resolution: '360p' | '720p' | '1080p' | '4K'
  frameRate: 15 | 30 | 60
  quality: 'low' | 'medium' | 'high'
}

// 音视频通话相关类型
export interface CallSession extends BaseEntity {
  type: 'audio' | 'video' | 'screen'
  status: 'idle' | 'connecting' | 'connected' | 'ended' | 'error'
  participants: Participant[]
  startTime?: Date
  endTime?: Date
  duration?: number
}

export interface Participant {
  id: string
  name: string
  avatar?: string
  isLocal: boolean
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  audioStream?: MediaStream
  videoStream?: MediaStream
}

// 消息相关类型
export interface Message extends BaseEntity {
  content: string
  type: 'text' | 'audio' | 'image' | 'file'
  sender: 'user' | 'assistant'
  isRead: boolean
  metadata?: MessageMetadata
}

export interface MessageMetadata {
  audioUrl?: string
  audioDuration?: number
  imageUrl?: string
  fileName?: string
  fileSize?: number
  fileType?: string
}

// AI相关类型
export interface AIModel {
  id: string
  name: string
  description: string
  maxTokens: number
  temperature: number
  topP: number
  systemPrompt?: string
}

export interface ConversationContext {
  id: string
  messages: Message[]
  model: AIModel
  settings: ConversationSettings
}

export interface ConversationSettings {
  voiceEnabled: boolean
  voiceId?: string
  autoResponse: boolean
  responseDelay: number
  language: string
}

// WebSocket相关类型
export interface WebSocketMessage {
  type: string
  data: any
  timestamp: Date
  sessionId?: string
}

export interface RealtimeEvent {
  type: 'audio' | 'video' | 'message' | 'error' | 'status'
  data: any
  timestamp: Date
}

// 设备相关类型
export interface MediaDeviceInfo {
  deviceId: string
  kind: MediaDeviceKind
  label: string
  groupId: string
}

export interface DevicePermissions {
  camera: boolean
  microphone: boolean
  screenShare: boolean
}

// 状态管理相关类型
export interface AppState {
  user: User | null
  currentCall: CallSession | null
  conversations: ConversationContext[]
  activeConversation: ConversationContext | null
  devices: {
    audioInputs: MediaDeviceInfo[]
    audioOutputs: MediaDeviceInfo[]
    videoInputs: MediaDeviceInfo[]
  }
  permissions: DevicePermissions
  ui: {
    sidebarOpen: boolean
    theme: 'light' | 'dark' | 'system'
    loading: boolean
    error: string | null
  }
}

// API相关类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// 配置相关类型
export interface AppConfig {
  apiBaseUrl: string
  wsUrl: string
  maxFileSize: number
  supportedFileTypes: string[]
  defaultModel: string
  features: {
    screenShare: boolean
    fileUpload: boolean
    voiceRecording: boolean
  }
}

// 错误类型
export interface AppError {
  code: string
  message: string
  details?: any
  stack?: string
}

// 事件类型
export interface CustomEvent {
  type: string
  payload?: any
  timestamp: Date
}

// 工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}