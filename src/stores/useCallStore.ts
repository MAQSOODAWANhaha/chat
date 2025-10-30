import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { CallSession, Participant, MediaDeviceInfo } from '@/types'

interface CallState {
  // 通话状态
  session: CallSession | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null

  // 本地状态
  localStream: MediaStream | null
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean

  // 远程状态
  remoteStream: MediaStream | null
  participants: Participant[]

  // 设备信息
  availableDevices: {
    audioInputs: MediaDeviceInfo[]
    audioOutputs: MediaDeviceInfo[]
    videoInputs: MediaDeviceInfo[]
  }

  // 通话质量指标
  connectionStats: {
    bandwidth: number
    latency: number
    packetLoss: number
  }

  // Actions
  setSession: (session: CallSession | null) => void
  setConnecting: (connecting: boolean) => void
  setConnected: (connected: boolean) => void
  setError: (error: string | null) => void

  setLocalStream: (stream: MediaStream | null) => void
  setRemoteStream: (stream: MediaStream | null) => void
  toggleMute: () => void
  toggleVideo: () => void
  toggleScreenShare: () => void

  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void

  setAvailableDevices: (devices: CallState['availableDevices']) => void
  updateConnectionStats: (stats: Partial<CallState['connectionStats']>) => void

  // 通话控制
  startCall: (type: 'audio' | 'video' | 'screen') => Promise<void>
  endCall: () => void

  // 清理状态
  reset: () => void
}

export const useCallStore = create<CallState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      session: null,
      isConnecting: false,
      isConnected: false,
      error: null,

      localStream: null,
      isMuted: false,
      isVideoEnabled: true,
      isScreenSharing: false,

      remoteStream: null,
      participants: [],

      availableDevices: {
        audioInputs: [],
        audioOutputs: [],
        videoInputs: [],
      },

      connectionStats: {
        bandwidth: 0,
        latency: 0,
        packetLoss: 0,
      },

      // Actions
      setSession: (session) => set({ session }),
      setConnecting: (isConnecting) => set({ isConnecting }),
      setConnected: (isConnected) => set({ isConnected }),
      setError: (error) => set({ error }),

      setLocalStream: (localStream) => set({ localStream }),
      setRemoteStream: (remoteStream) => set({ remoteStream }),

      toggleMute: () => {
        const { localStream, isMuted } = get()
        if (localStream) {
          const audioTracks = localStream.getAudioTracks()
          audioTracks.forEach((track) => {
            track.enabled = !isMuted
          })
          set({ isMuted: !isMuted })
        }
      },

      toggleVideo: () => {
        const { localStream, isVideoEnabled } = get()
        if (localStream) {
          const videoTracks = localStream.getVideoTracks()
          videoTracks.forEach((track) => {
            track.enabled = isVideoEnabled
          })
          set({ isVideoEnabled: !isVideoEnabled })
        }
      },

      toggleScreenShare: async () => {
        const { isScreenSharing } = get()

        if (!isScreenSharing) {
          try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            })

            // 这里应该将屏幕流添加到通话中
            // 实际实现需要与WebRTC逻辑结合

            set({ isScreenSharing: true })

            // 监听屏幕共享结束
            screenStream.getVideoTracks()[0].addEventListener('ended', () => {
              set({ isScreenSharing: false })
            })
          } catch (error) {
            console.error('屏幕共享失败:', error)
            set({ error: '屏幕共享失败' })
          }
        } else {
          // 停止屏幕共享
          set({ isScreenSharing: false })
        }
      },

      setParticipants: (participants) => set({ participants }),
      addParticipant: (participant) => set((state) => ({
        participants: [...state.participants, participant]
      })),
      removeParticipant: (participantId) => set((state) => ({
        participants: state.participants.filter(p => p.id !== participantId)
      })),
      updateParticipant: (participantId, updates) => set((state) => ({
        participants: state.participants.map(p =>
          p.id === participantId ? { ...p, ...updates } : p
        )
      })),

      setAvailableDevices: (availableDevices) => set({ availableDevices }),
      updateConnectionStats: (stats) => set((state) => ({
        connectionStats: { ...state.connectionStats, ...stats }
      })),

      // 通话控制
      startCall: async (type) => {
        const { setConnecting, setConnected, setError } = get()

        try {
          setConnecting(true)
          setError(null)

          // 创建新的通话会话
          const session: CallSession = {
            id: `call-${Date.now()}`,
            type,
            status: 'connecting',
            participants: [],
            startTime: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          set({ session })

          // 这里将实现实际的通话连接逻辑
          // 包括获取媒体流、建立WebRTC连接等

          // 模拟连接延迟
          await new Promise(resolve => setTimeout(resolve, 2000))

          setConnecting(false)
          setConnected(true)
          set(state => ({
            session: state.session ? { ...state.session, status: 'connected' } : null
          }))

        } catch (error) {
          setConnecting(false)
          setError(error instanceof Error ? error.message : '通话连接失败')
        }
      },

      endCall: () => {
        const { localStream, session } = get()

        // 停止本地流
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop())
        }

        // 更新会话状态
        if (session) {
          set(state => ({
            session: state.session ? {
              ...state.session,
              status: 'ended',
              endTime: new Date(),
              duration: state.session.startTime
                ? Date.now() - state.session.startTime.getTime()
                : undefined
            } : null
          }))
        }

        // 重置状态
        set({
          isConnected: false,
          isConnecting: false,
          localStream: null,
          remoteStream: null,
          participants: [],
          isMuted: false,
          isVideoEnabled: true,
          isScreenSharing: false,
        })
      },

      reset: () => set({
        session: null,
        isConnecting: false,
        isConnected: false,
        error: null,
        localStream: null,
        remoteStream: null,
        participants: [],
        isMuted: false,
        isVideoEnabled: true,
        isScreenSharing: false,
        connectionStats: {
          bandwidth: 0,
          latency: 0,
          packetLoss: 0,
        },
      }),
    }),
    {
      name: 'call-store',
    }
  )
)