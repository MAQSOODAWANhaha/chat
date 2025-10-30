import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AudioVisualizerProps {
  stream?: MediaStream | null
  className?: string
  height?: number
  color?: string
  barCount?: number
}

export function AudioVisualizer({
  stream,
  className,
  height = 100,
  color = '#3b82f6',
  barCount = 32,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !stream) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let source: MediaStreamAudioSourceNode | null = null

    const initialize = async () => {
      try {
        // 创建音频上下文
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        analyser = audioContext.createAnalyser()
        source = audioContext.createMediaStreamSource(stream)

        // 配置分析器
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8

        // 连接音频节点
        source.connect(analyser)
        // 不连接到输出，避免播放原始音频

        setIsInitialized(true)
      } catch (error) {
        console.error('AudioVisualizer初始化失败:', error)
      }
    }

    const draw = () => {
      if (!ctx || !analyser || !canvas) return

      animationRef.current = requestAnimationFrame(draw)

      // 创建频率数据数组
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyser.getByteFrequencyData(dataArray)

      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制频率条
      const barWidth = canvas.width / barCount
      const barGap = 2
      const barActualWidth = barWidth - barGap

      // 计算每个条形代表的频率范围
      const samplesPerBar = Math.floor(bufferLength / barCount)

      for (let i = 0; i < barCount; i++) {
        // 计算该条形的平均振幅
        let sum = 0
        for (let j = 0; j < samplesPerBar; j++) {
          sum += dataArray[i * samplesPerBar + j]
        }
        const average = sum / samplesPerBar

        // 计算条形高度
        const barHeight = (average / 255) * canvas.height * 0.8

        // 计算条形位置
        const x = i * barWidth + barGap / 2
        const y = canvas.height - barHeight

        // 绘制条形
        ctx.fillStyle = color
        ctx.fillRect(x, y, barActualWidth, barHeight)

        // 添加渐变效果（顶部更亮）
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height)
        gradient.addColorStop(0, color)
        gradient.addColorStop(1, color + '20')
        ctx.fillStyle = gradient
        ctx.fillRect(x, y, barActualWidth, barHeight)
      }

      // 如果没有音频，绘制静态基线
      if (dataArray.every(value => value === 0)) {
        ctx.strokeStyle = color + '40'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, canvas.height - 2)
        ctx.lineTo(canvas.width, canvas.height - 2)
        ctx.stroke()
      }
    }

    // 开始绘制
    draw()

    // 清理函数
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (source) {
        source.disconnect()
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
      }
    }
  }, [stream, barCount, color])

  // 处理画布尺寸
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = height * window.devicePixelRatio
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      }
    }

    updateCanvasSize()

    const resizeObserver = new ResizeObserver(updateCanvasSize)
    resizeObserver.observe(canvas)

    return () => {
      resizeObserver.disconnect()
    }
  }, [height])

  return (
    <div className={cn('relative w-full', className)}>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
          <p className="text-sm text-muted-foreground">等待音频流...</p>
        </div>
      )}
      {stream && !isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
          <p className="text-sm text-muted-foreground">初始化音频分析器...</p>
        </div>
      )}
    </div>
  )
}

// 音频活动指示器组件
export function AudioActivityIndicator({
  isActive,
  className,
}: {
  isActive: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className={cn(
            'w-1 h-4 rounded-full transition-all duration-150',
            isActive
              ? 'bg-primary animate-pulse'
              : 'bg-muted-foreground/30'
          )}
          style={{
            animationDelay: isActive ? `${index * 100}ms` : undefined,
          }}
        />
      ))}
    </div>
  )
}

// 语音活动检测(VAD)组件
export function VoiceActivityDetector({
  stream,
  threshold = 0.1,
  onActivityStart,
  onActivityEnd,
  className,
}: {
  stream?: MediaStream | null
  threshold?: number
  onActivityStart?: () => void
  onActivityEnd?: () => void
  className?: string
}) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const previousTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!stream) return

    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let source: MediaStreamAudioSourceNode | null = null

    const initialize = async () => {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        analyser = audioContext.createAnalyser()
        source = audioContext.createMediaStreamSource(stream)

        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.3

        source.connect(analyser)

        const checkVoiceActivity = () => {
          if (!analyser) return

          const dataArray = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(dataArray)

          // 计算平均能量
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          const normalizedValue = average / 255

          // 检测语音活动
          if (normalizedValue > threshold) {
            if (!isSpeaking) {
              setIsSpeaking(true)
              onActivityStart?.()
            }

            // 清除之前的超时
            if (previousTimeoutRef.current) {
              clearTimeout(previousTimeoutRef.current)
            }

            // 设置新的超时
            previousTimeoutRef.current = setTimeout(() => {
              setIsSpeaking(false)
              onActivityEnd?.()
            }, 500)
          }

          requestAnimationFrame(checkVoiceActivity)
        }

        checkVoiceActivity()
      } catch (error) {
        console.error('VAD初始化失败:', error)
      }
    }

    initialize()

    return () => {
      if (previousTimeoutRef.current) {
        clearTimeout(previousTimeoutRef.current)
      }
      if (source) {
        source.disconnect()
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
      }
    }
  }, [stream, threshold, onActivityStart, onActivityEnd])

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div
        className={cn(
          'w-3 h-3 rounded-full transition-colors duration-200',
          isSpeaking ? 'bg-green-500' : 'bg-gray-300'
        )}
      />
      <span className="text-sm text-muted-foreground">
        {isSpeaking ? '正在说话' : '静音'}
      </span>
    </div>
  )
}