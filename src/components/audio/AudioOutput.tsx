import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX, Speaker } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/stores/useAppStore'
import { useChatStore } from '@/stores/useChatStore'
import { cn } from '@/lib/utils'

interface AudioOutputProps {
  className?: string
}

export function AudioOutput({ className }: AudioOutputProps) {
  const { settings, updateSettings } = useAppStore()
  const { aiResponseStatus, messages } = useChatStore()
  const { toast } = useToast()

  const [volume, setVolume] = useState(settings.audio.volume)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState(settings.audio.outputDevice || '')
  const [isPlaying, setIsPlaying] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const testAudioRef = useRef<HTMLAudioElement | null>(null)

  // 获取音频输出设备列表
  const getAudioDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const audioOutputs = allDevices.filter(device => device.kind === 'audiooutput')
      setDevices(audioOutputs)

      // 如果没有选择设备但有可用设备，选择第一个
      if (!selectedDevice && audioOutputs.length > 0) {
        const defaultDevice = audioOutputs[0].deviceId
        setSelectedDevice(defaultDevice)
        updateSettings({
          audio: { ...settings.audio, outputDevice: defaultDevice }
        })
      }
    } catch (error) {
      console.error('获取音频输出设备失败:', error)
      toast({
        title: '设备获取失败',
        description: '无法获取音频输出设备列表',
        variant: 'destructive',
      })
    }
  }

  // 测试音频播放
  const testAudio = () => {
    try {
      // 创建测试音频（简单的音频数据）
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 440 // A音符
      gainNode.gain.value = volume / 100 * 0.1 // 较小的音量用于测试

      oscillator.start()
      setIsPlaying(true)

      // 播放1秒后停止
      setTimeout(() => {
        oscillator.stop()
        setIsPlaying(false)
      }, 1000)

      toast({
        title: '音频测试',
        description: '正在播放测试音频',
      })
    } catch (error) {
      console.error('音频测试失败:', error)
      toast({
        title: '音频测试失败',
        description: '无法播放测试音频',
        variant: 'destructive',
      })
    }
  }

  // 切换输出设备
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId)
    updateSettings({
      audio: { ...settings.audio, outputDevice: deviceId }
    })

    // 应用到音频元素
    if (audioRef.current && 'setSinkId' in audioRef.current) {
      (audioRef.current as any).setSinkId(deviceId)
    }
  }

  // 调整音量
  const handleVolumeChange = (newVolume: number[]) => {
    const volumeValue = newVolume[0]
    setVolume(volumeValue)
    updateSettings({
      audio: { ...settings.audio, volume: volumeValue }
    })

    // 应用到所有音频元素
    if (audioRef.current) {
      audioRef.current.volume = volumeValue / 100
    }
    if (testAudioRef.current) {
      testAudioRef.current.volume = volumeValue / 100
    }
  }

  // 播放AI音频消息
  const playAIMessage = async (audioUrl: string) => {
    try {
      if (testAudioRef.current) {
        testAudioRef.current.pause()
      }

      testAudioRef.current = new Audio(audioUrl)
      testAudioRef.current.volume = volume / 100

      // 设置输出设备（如果支持）
      if (selectedDevice && 'setSinkId' in testAudioRef.current) {
        await (testAudioRef.current as any).setSinkId(selectedDevice)
      }

      testAudioRef.current.play()
      setIsPlaying(true)

      testAudioRef.current.onended = () => {
        setIsPlaying(false)
        testAudioRef.current = null
      }

      testAudioRef.current.onerror = () => {
        setIsPlaying(false)
        testAudioRef.current = null
        toast({
          title: '播放失败',
          description: '无法播放AI音频消息',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('播放AI音频失败:', error)
      toast({
        title: '播放失败',
        description: '无法播放AI音频消息',
        variant: 'destructive',
      })
    }
  }

  // 检查是否有音频消息可播放
  const hasAudioMessages = messages.some(msg => msg.type === 'audio' && msg.metadata?.audioUrl)

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
      if (testAudioRef.current) {
        testAudioRef.current.pause()
        testAudioRef.current = null
      }
    }
  }, [])

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Speaker className="h-5 w-5" />
          音频输出
          {isPlaying && <Badge variant="default">播放中</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 输出设备选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">输出设备</label>
          <select
            value={selectedDevice}
            onChange={(e) => handleDeviceChange(e.target.value)}
            disabled={devices.length === 0}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">选择音频输出设备</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `扬声器 ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* 音量控制 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              输出音量
            </span>
            <span className="text-sm text-muted-foreground">{volume}%</span>
          </div>
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="w-full"
          />
        </div>

        {/* 控制按钮 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={testAudio}
            disabled={isPlaying}
            className="flex-1"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            测试音频
          </Button>
          {hasAudioMessages && (
            <Button
              variant="default"
              onClick={() => {
                const lastAudioMessage = messages.findLast(msg => msg.type === 'audio' && msg.metadata?.audioUrl)
                if (lastAudioMessage?.metadata?.audioUrl) {
                  playAIMessage(lastAudioMessage.metadata.audioUrl)
                }
              }}
              disabled={isPlaying}
            >
              <Speaker className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 状态指示 */}
        <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-2',
              isPlaying ? 'bg-primary animate-pulse' : 'bg-muted'
            )}>
              <Speaker className={cn(
                'h-6 w-6',
                isPlaying ? 'text-primary-foreground' : 'text-muted-foreground'
              )} />
            </div>
            <p className="text-sm text-muted-foreground">
              {isPlaying ? '正在播放音频' : '音频输出就绪'}
            </p>
            {volume === 0 && (
              <p className="text-xs text-destructive mt-1">
                <VolumeX className="inline h-3 w-3 mr-1" />
                已静音
              </p>
            )}
          </div>
        </div>

        {/* 设置提示 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 音量设置将保存到用户偏好</p>
          <p>• 支持多音频输出设备切换</p>
          <p>• AI语音消息自动使用当前输出设备</p>
        </div>
      </CardContent>

      {/* 隐藏的音频元素用于播放 */}
      <audio ref={audioRef} className="hidden" />
    </Card>
  )
}