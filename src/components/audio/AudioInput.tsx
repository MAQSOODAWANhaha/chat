import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCallStore } from '@/stores/useCallStore'
import { useAppStore } from '@/stores/useAppStore'
import { cn } from '@/lib/utils'

interface AudioInputProps {
  className?: string
  onStreamReady?: (stream: MediaStream) => void
}

export function AudioInput({ className, onStreamReady }: AudioInputProps) {
  const {
    localStream,
    isMuted,
    toggleMute,
    setLocalStream,
    setAvailableDevices
  } = useCallStore()
  const { settings, updateSettings } = useAppStore()
  const { toast } = useToast()

  const [volume, setVolume] = useState(50)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [isGettingDevices, setIsGettingDevices] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 获取音频设备列表
  const getAudioDevices = async () => {
    setIsGettingDevices(true)
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput')
      setDevices(audioInputs)

      // 更新store中的设备信息
      setAvailableDevices(prev => ({
        ...prev,
        audioInputs
      }))

      // 如果没有选择设备但有可用设备，选择第一个
      if (!selectedDevice && audioInputs.length > 0) {
        const defaultDevice = audioInputs[0].deviceId
        setSelectedDevice(defaultDevice)
        updateSettings({
          audio: { ...settings.audio, inputDevice: defaultDevice }
        })
      }
    } catch (error) {
      console.error('获取音频设备失败:', error)
      toast({
        title: '设备获取失败',
        description: '无法获取音频设备列表',
        variant: 'destructive',
      })
    } finally {
      setIsGettingDevices(false)
    }
  }

  // 开始音频输入
  const startAudioInput = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          echoCancellation: settings.audio.echoCancellation,
          noiseSuppression: settings.audio.noiseSuppression,
          autoGainControl: settings.audio.autoGainControl,
        },
        video: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setLocalStream(stream)

      // 设置音频分析
      setupAudioAnalysis(stream)

      // 通知父组件
      onStreamReady?.(stream)

      toast({
        title: '音频输入已开启',
        description: '麦克风已成功连接',
      })
    } catch (error) {
      console.error('启动音频输入失败:', error)
      toast({
        title: '音频输入失败',
        description: error instanceof Error ? error.message : '无法访问麦克风',
        variant: 'destructive',
      })
    }
  }

  // 停止音频输入
  const stopAudioInput = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)

      // 清理音频分析
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }

      toast({
        title: '音频输入已关闭',
        description: '麦克风已断开连接',
      })
    }
  }

  // 设置音频分析
  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()

      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      analyserRef.current.fftSize = 256

      // 定期测量音量
      volumeIntervalRef.current = setInterval(() => {
        if (analyserRef.current && !isMuted) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)

          // 计算平均音量
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          const normalizedVolume = Math.min(100, (average / 255) * 100 * 2)
          setVolume(Math.round(normalizedVolume))
        }
      }, 100)
    } catch (error) {
      console.error('音频分析设置失败:', error)
    }
  }

  // 切换设备
  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDevice(deviceId)
    updateSettings({
      audio: { ...settings.audio, inputDevice: deviceId }
    })

    // 如果当前有音频流，重新启动
    if (localStream) {
      stopAudioInput()
      setTimeout(() => startAudioInput(), 100)
    }
  }

  // 组件挂载时获取设备列表
  useEffect(() => {
    getAudioDevices()

    // 监听设备变化
    const handleDeviceChange = () => {
      getAudioDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          音频输入
          {localStream && <Badge variant="default">已连接</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 设备选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">音频设备</label>
          <select
            value={selectedDevice}
            onChange={(e) => handleDeviceChange(e.target.value)}
            disabled={isGettingDevices || devices.length === 0}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">选择麦克风设备</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `麦克风 ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* 音量指示器 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              音量级别
            </span>
            <span className="text-sm text-muted-foreground">{volume}%</span>
          </div>
          <div className="relative">
            <Slider
              value={[volume]}
              max={100}
              step={1}
              disabled={!localStream}
              className="w-full"
            />
            <div
              className="absolute top-0 left-0 h-full bg-primary/20 rounded-md pointer-events-none"
              style={{ width: `${volume}%` }}
            />
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex gap-2">
          {!localStream ? (
            <Button
              onClick={startAudioInput}
              disabled={!selectedDevice && devices.length === 0}
              className="flex-1"
            >
              <Mic className="h-4 w-4 mr-2" />
              开启麦克风
            </Button>
          ) : (
            <>
              <Button
                variant={isMuted ? 'destructive' : 'secondary'}
                onClick={toggleMute}
                className="flex-1"
              >
                {isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {isMuted ? '取消静音' : '静音'}
              </Button>
              <Button
                variant="outline"
                onClick={stopAudioInput}
              >
                <MicOff className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* 音频设置提示 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 音频质量设置可在设置页面中调整</p>
          <p>• 支持回声消除和噪声抑制</p>
          <p>• 实时音量监测和静音控制</p>
        </div>
      </CardContent>
    </Card>
  )
}