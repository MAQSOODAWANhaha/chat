import { useState, useEffect, useRef } from 'react'
import { Video, VideoOff, Camera, Settings, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCallStore } from '@/stores/useCallStore'
import { cn } from '@/lib/utils'

interface VideoInputProps {
  className?: string
  onStreamReady?: (stream: MediaStream) => void
  onStreamError?: (error: Error) => void
}

export function VideoInput({
  className,
  onStreamReady,
  onStreamError,
}: VideoInputProps) {
  const {
    localStream,
    isVideoEnabled,
    videoDevice,
    setVideoDevice,
    toggleVideo,
  } = useCallStore()

  const { toast } = useToast()

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [videoStats, setVideoStats] = useState({
    width: 0,
    height: 0,
    frameRate: 0,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 获取视频输入设备列表
  const getVideoDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = allDevices.filter(device => device.kind === 'videoinput')
      setDevices(videoInputs)

      // 如果没有选择设备但有可用设备，选择第一个
      if (!videoDevice && videoInputs.length > 0) {
        const defaultDevice = videoInputs[0].deviceId
        setVideoDevice(defaultDevice)
      }
    } catch (error) {
      console.error('获取视频设备失败:', error)
      toast({
        title: '设备获取失败',
        description: '无法获取视频输入设备列表',
        variant: 'destructive',
      })
    }
  }

  // 启动视频流
  const startVideoStream = async (deviceId?: string) => {
    if (!isVideoEnabled) return

    setIsLoading(true)
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // 设置到视频元素
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // 获取视频流统计信息
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        const settings = videoTrack.getSettings()
        setVideoStats({
          width: settings.width || 0,
          height: settings.height || 0,
          frameRate: settings.frameRate || 0,
        })
      }

      onStreamReady?.(stream)

      toast({
        title: '视频已启用',
        description: `分辨率: ${videoStats.width}x${videoStats.height}`,
      })
    } catch (error) {
      console.error('启动视频流失败:', error)
      onStreamError?.(error as Error)
      toast({
        title: '视频启动失败',
        description: error instanceof Error ? error.message : '无法访问摄像头',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 切换视频设备
  const handleDeviceChange = async (deviceId: string) => {
    setVideoDevice(deviceId)

    // 如果当前视频已启用，重新启动视频流
    if (isVideoEnabled) {
      await startVideoStream(deviceId)
    }
  }

  // 刷新设备列表
  const refreshDevices = async () => {
    await getVideoDevices()
    toast({
      title: '设备列表已刷新',
      description: `找到 ${devices.length} 个视频设备`,
    })
  }

  // 开始视频统计监控
  const startStatsMonitoring = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
    }

    statsIntervalRef.current = setInterval(() => {
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

  // 组件挂载时获取设备列表
  useEffect(() => {
    getVideoDevices()

    // 监听设备变化
    const handleDeviceChange = () => {
      getVideoDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      stopStatsMonitoring()
    }
  }, [])

  // 视频状态变化时处理
  useEffect(() => {
    if (isVideoEnabled && videoDevice) {
      startVideoStream(videoDevice)
      startStatsMonitoring()
    } else {
      stopStatsMonitoring()
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [isVideoEnabled, videoDevice])

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          视频输入
          {isVideoEnabled && <Badge variant="default">已启用</Badge>}
          {isLoading && <Badge variant="secondary">连接中...</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 视频预览 */}
        <div className="relative">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {isVideoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <VideoOff className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">摄像头未开启</p>
                </div>
              </div>
            )}
          </div>

          {/* 视频统计信息 */}
          {isVideoEnabled && videoStats.width > 0 && (
            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs p-2 rounded">
              <div>{videoStats.width}×{videoStats.height}</div>
              <div>{videoStats.frameRate} fps</div>
            </div>
          )}
        </div>

        {/* 设备选择 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">摄像头设备</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshDevices}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
          <Select
            value={videoDevice || ''}
            onValueChange={handleDeviceChange}
            disabled={devices.length === 0 || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择摄像头设备">
                {videoDevice ? (
                  devices.find(d => d.deviceId === videoDevice)?.label ||
                  `摄像头 ${videoDevice.slice(0, 8)}`
                ) : '选择摄像头设备'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `摄像头 ${device.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 控制按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? 'destructive' : 'default'}
            className="flex-1"
            disabled={isLoading}
          >
            {isVideoEnabled ? (
              <>
                <VideoOff className="h-4 w-4 mr-2" />
                关闭视频
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                开启视频
              </>
            )}
          </Button>
        </div>

        {/* 状态信息 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 支持多种分辨率和帧率</p>
          <p>• 自动选择最佳视频质量</p>
          <p>• 支持热插拔设备切换</p>
          {devices.length === 0 && (
            <p className="text-destructive">• 未检测到摄像头设备</p>
          )}
        </div>

        {/* 设备数量指示 */}
        {devices.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Camera className="h-3 w-3" />
            <span>发现 {devices.length} 个视频设备</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}