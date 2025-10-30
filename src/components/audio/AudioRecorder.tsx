import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useChatStore } from '@/stores/useChatStore'
import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AudioRecorderProps {
  className?: string
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void
  maxDuration?: number // 最大录制时长（秒）
}

export function AudioRecorder({
  className,
  onRecordingComplete,
  maxDuration = 60,
}: AudioRecorderProps) {
  const { sendAudioMessage } = useChatStore()
  const { toast } = useToast()

  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 开始录音
  const startRecording = async () => {
    try {
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      streamRef.current = stream
      chunksRef.current = []

      // 创建MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder

      // 处理录音数据
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // 录音停止处理
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        chunksRef.current = []

        // 停止所有音轨
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        // 通知外部
        onRecordingComplete?.(blob, duration)
      }

      // 开始录音
      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
      setDuration(0)

      // 开始计时
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            stopRecording()
          }
          return newDuration
        })
      }, 1000)

      toast({
        title: '开始录音',
        description: `最长录制时间: ${maxDuration}秒`,
      })
    } catch (error) {
      console.error('开始录音失败:', error)
      toast({
        title: '录音失败',
        description: error instanceof Error ? error.message : '无法访问麦克风',
        variant: 'destructive',
      })
    }
  }

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      // 清除计时器
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // 暂停/恢复录音
  const togglePause = () => {
    if (!mediaRecorderRef.current) return

    if (isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)

      // 恢复计时
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } else {
      mediaRecorderRef.current.pause()
      setIsPaused(true)

      // 暂停计时
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // 取消录音
  const cancelRecording = () => {
    stopRecording()
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)

    toast({
      title: '录音已取消',
      description: '录音内容已被删除',
    })
  }

  // 播放录音
  const playRecording = () => {
    if (!audioUrl || !audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // 发送录音
  const sendRecording = async () => {
    if (!audioBlob) return

    try {
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.pause()
      }

      await sendAudioMessage(audioBlob)

      // 清理
      setAudioBlob(null)
      setAudioUrl(null)
      setDuration(0)

      toast({
        title: '发送成功',
        description: '语音消息已发送',
      })
    } catch (error) {
      console.error('发送录音失败:', error)
      toast({
        title: '发送失败',
        description: '无法发送语音消息',
        variant: 'destructive',
      })
    }
  }

  // 重新录制
  const rerecord = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setIsPlaying(false)
    startRecording()
  }

  // 清理
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
  }, [isRecording, audioUrl])

  // 组件卸载时清理
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          语音录制
          {isRecording && (
            <Badge variant={isPaused ? 'secondary' : 'destructive'} className="animate-pulse">
              {isPaused ? '已暂停' : '录音中'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 录音时长显示 */}
        {(isRecording || duration > 0) && (
          <div className="text-center">
            <div className="text-2xl font-mono font-bold">
              {formatTime(duration)}
            </div>
            {isRecording && (
              <p className="text-sm text-muted-foreground">
                {isPaused ? '录音已暂停' : '正在录音...'}
              </p>
            )}
          </div>
        )}

        {/* 音频预览 */}
        {audioUrl && !isRecording && (
          <div className="space-y-2">
            <label className="text-sm font-medium">录音预览</label>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls={false}
              className="w-full"
              onEnded={() => setIsPlaying(false)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={playRecording}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                {isPlaying ? '暂停' : '播放'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={rerecord}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex gap-2">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={false}
              className="flex-1"
            >
              <Mic className="h-4 w-4 mr-2" />
              开始录音
            </Button>
          ) : (
            <>
              <Button
                variant="destructive"
                onClick={stopRecording}
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                停止录音
              </Button>
              <Button
                variant="outline"
                onClick={togglePause}
              >
                {isPaused ? '▶' : '⏸'}
              </Button>
              <Button
                variant="outline"
                onClick={cancelRecording}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* 发送按钮 */}
        {audioBlob && !isRecording && (
          <Button
            onClick={sendRecording}
            className="w-full"
          >
            发送语音消息
          </Button>
        )}

        {/* 提示信息 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 支持最长 {maxDuration} 秒录音</p>
          <p>• 支持暂停和继续录音</p>
          <p>• 录音格式：WebM (Opus编码)</p>
          <p>• 自动降噪和回声消除</p>
        </div>

        {/* 进度条 */}
        {isRecording && (
          <div className="relative">
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-destructive h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(duration / maxDuration) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {Math.max(0, maxDuration - duration)} 秒剩余
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}