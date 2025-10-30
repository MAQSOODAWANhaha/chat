import { useState, useEffect, useRef } from 'react'
import { Monitor, MonitorOff, Volume2, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCallStore } from '@/stores/useCallStore'
import { cn } from '@/lib/utils'

interface VideoOutputProps {
  className?: string
  remoteStream?: MediaStream | null
}

export function VideoOutput({
  className,
  remoteStream,
}: VideoOutputProps) {
  const {
    isScreenSharing,
    screenStream,
    toggleScreenShare,
  } = useCallStore()

  const { toast } = useToast()

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoStats, setVideoStats] = useState({
    width: 0,
    height: 0,
    frameRate: 0,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 获取音频输出设备列表（用于视频音量控制）
  const getAudioDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const audioOutputs = allDevices.filter(device => device.kind === 'audiooutput')
      setDevices(audioOutputs)

      if (!selectedDevice && audioOutputs.length > 0) {
        setSelectedDevice(audioOutputs[0].deviceId)
      }
    } catch (error) {
      console.error('获取音频输出设备失败:', error)
    }
  }

  // 切换音频输出设备
  const handleDeviceChange = async (deviceId: string) => {
    const actualDeviceId = deviceId === 'default' ? '' : deviceId
    setSelectedDevice(deviceId)

    // 应用到视频元素
    if (videoRef.current && 'setSinkId' in videoRef.current) {
      await (videoRef.current as any).setSinkId(actualDeviceId)
    }
    if (screenVideoRef.current && 'setSinkId' in screenVideoRef.current) {
      await (screenVideoRef.current as any).setSinkId(actualDeviceId)
    }
  }

  // 开始屏幕共享
  const startScreenShare = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true,
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints)

      // 设置到屏幕视频元素
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream
      }

      // 监听屏幕共享结束
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        toggleScreenShare()
        toast({
          title: '屏幕共享已结束',
          description: '用户停止了屏幕共享',
        })
      })

      toast({
        title: '屏幕共享已开始',
        description: '正在共享您的屏幕',
      })
    } catch (error) {
      console.error('启动屏幕共享失败:', error)
      toast({
        title: '屏幕共享失败',
        description: error instanceof Error ? error.message : '无法共享屏幕',
        variant: 'destructive',
      })
    }
  }

  // 停止屏幕共享
  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null
    }
  }

  // 切换屏幕共享
  const handleScreenShareToggle = async () => {
    if (isScreenSharing) {
      stopScreenShare()
      toggleScreenShare()
    } else {
      await startScreenShare()
      toggleScreenShare()
    }
  }

  // 切换全屏
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // 开始视频统计监控
  const startStatsMonitoring = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
    }

    statsIntervalRef.current = setInterval(() => {
      // 监控远程视频流
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        const videoTrack = stream.getVideoTracks()[0]

        if (videoTrack && videoTrack.getSettings) {
          const settings = videoTrack.getSettings()
          setVideoStats({
            width: settings.width || 0,
            height: settings.height || 0,
            frameRate: settings.frameRate || 0,
          })
        }
      }
    }, 1000)
  }

  // 停止视频统计监控
  const stopStatsMonitoring = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }
  }

  // 处理视频流变化
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = remoteStream || null
    }

    if (remoteStream) {
      startStatsMonitoring()
    } else {
      stopStatsMonitoring()
    }
  }, [remoteStream])

  // 组件挂载时获取设备列表
  useEffect(() => {
    getAudioDevices()

    const handleDeviceChange = () => {
      getAudioDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    // 监听全屏变化
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      stopStatsMonitoring()
      stopScreenShare()
    }
  }, [])

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          视频输出
          {remoteStream && <Badge variant="default">接收中</Badge>}
          {isScreenSharing && <Badge variant="secondary">屏幕共享</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 主视频显示区域 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">远程视频</h4>
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {remoteStream ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {videoStats.width > 0 && (
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs p-2 rounded">
                    <div>{videoStats.width}×{videoStats.height}</div>
                    <div>{videoStats.frameRate} fps</div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <MonitorOff className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">等待远程视频...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 屏幕共享区域 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">屏幕共享</h4>
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {isScreenSharing && screenStream ? (
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">屏幕共享未启用</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 音频输出设备选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            音频输出设备
          </label>
          <Select
            value={selectedDevice || ''}
            onValueChange={handleDeviceChange}
            disabled={devices.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择音频输出设备">
                {selectedDevice ? (
                  devices.find(d => d.deviceId === selectedDevice)?.label ||
                  `扬声器 ${selectedDevice.slice(0, 8)}`
                ) : '选择音频输出设备'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId || 'default'}>
                  {device.label || `扬声器 ${device.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 控制按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={handleScreenShareToggle}
            variant={isScreenSharing ? 'destructive' : 'secondary'}
            className="flex-1"
          >
            {isScreenSharing ? (
              <>
                <MonitorOff className="h-4 w-4 mr-2" />
                停止共享
              </>
            ) : (
              <>
                <Monitor className="h-4 w-4 mr-2" />
                共享屏幕
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={toggleFullscreen}
            size="sm"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* 状态信息 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 支持屏幕共享和远程视频显示</p>
          <p>• 可调整音频输出设备</p>
          <p>• 支持全屏模式观看</p>
          <p>• 自动适配视频分辨率</p>
        </div>

        {/* 设备数量指示 */}
        {devices.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Volume2 className="h-3 w-3" />
            <span>发现 {devices.length} 个音频输出设备</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}