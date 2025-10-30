import { useState, useRef, useCallback } from 'react'
import { Maximize2, Minimize2, Volume2, VolumeX, User, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface VideoStream {
  id: string
  name: string
  stream?: MediaStream | null
  type: 'local' | 'remote' | 'screen'
  isMuted?: boolean
  isVideoEnabled?: boolean
  avatar?: string
}

interface VideoGridProps {
  streams: VideoStream[]
  className?: string
  showControls?: boolean
  layout?: 'grid' | 'focus' | 'sidebar'
  mainStreamId?: string
}

export function VideoGrid({
  streams,
  className,
  showControls = true,
  layout = 'grid',
  mainStreamId,
}: VideoGridProps) {
  const [focusedStreamId, setFocusedStreamId] = useState<string | null>(mainStreamId || null)
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})

  // 计算网格布局
  const getGridLayoutClass = (streamCount: number) => {
    if (layout === 'focus' && focusedStreamId) {
      return 'grid-cols-1 lg:grid-cols-3'
    }

    switch (streamCount) {
      case 1:
        return 'grid-cols-1'
      case 2:
        return 'grid-cols-1 md:grid-cols-2'
      case 3:
      case 4:
        return 'grid-cols-2'
      case 5:
      case 6:
        return 'grid-cols-2 md:grid-cols-3'
      default:
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    }
  }

  // 获取流的图标
  const getStreamIcon = (stream: VideoStream) => {
    switch (stream.type) {
      case 'local':
        return <User className="h-4 w-4" />
      case 'remote':
        return <User className="h-4 w-4" />
      case 'screen':
        return <Monitor className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  // 获取流的背景色
  const getStreamBgColor = (stream: VideoStream) => {
    switch (stream.type) {
      case 'local':
        return 'bg-blue-500'
      case 'remote':
        return 'bg-green-500'
      case 'screen':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  // 处理音量变化
  const handleVolumeChange = (streamId: string, newVolume: number[]) => {
    setVolumes(prev => ({
      ...prev,
      [streamId]: newVolume[0]
    }))

    const videoElement = videoRefs.current[streamId]
    if (videoElement) {
      videoElement.volume = newVolume[0] / 100
    }
  }

  // 切换焦点流
  const handleFocusStream = (streamId: string) => {
    if (layout === 'focus') {
      setFocusedStreamId(focusedStreamId === streamId ? null : streamId)
    }
  }

  // 切换全屏
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // 渲染单个视频流
  const renderVideoStream = (stream: VideoStream, isMain = false) => {
    const isFocused = focusedStreamId === stream.id
    const volume = volumes[stream.id] || 50
    const videoRef = (el: HTMLVideoElement | null) => {
      videoRefs.current[stream.id] = el
      if (el && stream.stream) {
        el.srcObject = stream.stream
        el.volume = volume / 100
      }
    }

    return (
      <div
        key={stream.id}
        className={cn(
          'relative bg-muted rounded-lg overflow-hidden group',
          isMain && 'lg:col-span-2 lg:row-span-2',
          isFocused && 'ring-2 ring-primary',
          'aspect-video'
        )}
      >
        {stream.stream && stream.isVideoEnabled !== false ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={stream.type === 'local'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn(
            'w-full h-full flex items-center justify-center',
            getStreamBgColor(stream)
          )}>
            <div className="text-center text-white">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                {getStreamIcon(stream)}
              </div>
              <p className="text-sm font-medium">{stream.name}</p>
              {stream.isVideoEnabled === false && (
                <p className="text-xs opacity-75">摄像头已关闭</p>
              )}
            </div>
          </div>
        )}

        {/* 视频信息覆盖层 */}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <Badge variant={stream.type === 'local' ? 'default' : 'secondary'} className="text-xs">
            {stream.type === 'local' ? '我' : stream.type === 'screen' ? '屏幕' : '对方'}
          </Badge>
          {stream.isMuted && (
            <Badge variant="destructive" className="text-xs">
              <VolumeX className="h-3 w-3 mr-1" />
              静音
            </Badge>
          )}
        </div>

        {/* 控制覆盖层 */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium truncate">
                  {stream.name}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {stream.type !== 'local' && (
                  <div className="flex items-center gap-1 bg-black/50 rounded px-2 py-1">
                    <Volume2 className="h-3 w-3 text-white" />
                    <Slider
                      value={[volume]}
                      max={100}
                      step={1}
                      onValueChange={(value) => handleVolumeChange(stream.id, value)}
                      className="w-16"
                    />
                  </div>
                )}

                {layout === 'focus' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFocusStream(stream.id)}
                    className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  >
                    {isFocused ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const gridClass = getGridLayoutClass(streams.length)
  const hasMainStream = layout === 'focus' && focusedStreamId

  return (
    <div ref={containerRef} className={cn('w-full', className)}>
      {/* 顶部控制栏 */}
      {showControls && streams.length > 1 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              参与者: {streams.length}
            </span>
            <Badge variant="outline">
              {layout === 'grid' ? '网格视图' : layout === 'focus' ? '焦点视图' : '侧边栏视图'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 视频网格 */}
      <div className={cn(
        'grid gap-4 auto-rows-min',
        gridClass
      )}>
        {streams.map(stream => {
          const isMain = hasMainStream && stream.id === focusedStreamId
          return renderVideoStream(stream, isMain)
        })}
      </div>

      {/* 空状态 */}
      {streams.length === 0 && (
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">暂无视频流</p>
          </div>
        </div>
      )}

      {/* 视图切换提示 */}
      {showControls && streams.length > 1 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            {layout === 'grid'
              ? '点击视频可切换到焦点视图'
              : '点击视频或使用控制按钮切换焦点'
            }
          </p>
        </div>
      )}
    </div>
  )
}