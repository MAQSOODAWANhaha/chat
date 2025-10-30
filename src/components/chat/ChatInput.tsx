import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Paperclip, Smile, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useChatStore } from '@/stores/useChatStore'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage?: (message: string, type: 'text' | 'audio') => void
  disabled?: boolean
  placeholder?: string
  className?: string
  enableVoice?: boolean
  enableFile?: boolean
  enableEmoji?: boolean
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = '输入消息...',
  className,
  enableVoice = true,
  enableFile = true,
  enableEmoji = true,
}: ChatInputProps) {
  const { sendTextMessage, sendAudioMessage, aiResponseStatus } = useChatStore()
  const { toast } = useToast()

  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  // 处理发送消息
  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || disabled) return

    try {
      // 发送文本消息
      if (message.trim()) {
        if (onSendMessage) {
          onSendMessage(message, 'text')
        } else {
          await sendTextMessage(message)
        }
      }

      // 发送文件（这里简化处理，实际项目中需要上传文件）
      if (selectedFile) {
        toast({
          title: '文件发送',
          description: `已发送文件: ${selectedFile.name}`,
        })
      }

      setMessage('')
      setSelectedFile(null)
      textareaRef.current?.focus()
    } catch (error) {
      console.error('发送消息失败:', error)
      toast({
        title: '发送失败',
        description: '无法发送消息，请重试',
        variant: 'destructive',
      })
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream
      chunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

        try {
          if (onSendMessage) {
            onSendMessage('', 'audio') // 在实际项目中这里需要传递blob
          } else {
            await sendAudioMessage(blob)
          }
        } catch (error) {
          console.error('发送语音失败:', error)
          toast({
            title: '语音发送失败',
            description: '无法发送语音消息',
            variant: 'destructive',
          })
        }

        // 清理
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('开始录音失败:', error)
      toast({
        title: '录音失败',
        description: '无法访问麦克风',
        variant: 'destructive',
      })
    }
  }

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 检查文件大小 (10MB 限制)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: '文件过大',
          description: '文件大小不能超过 10MB',
          variant: 'destructive',
        })
        return
      }

      setSelectedFile(file)
    }
  }

  // 移除选中的文件
  const removeSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isAIResponding = aiResponseStatus !== 'idle'

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4">
        {/* 选中的文件显示 */}
        {selectedFile && (
          <div className="mb-3 p-2 bg-muted rounded-lg flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">
                {selectedFile.name.split('.').pop()?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeSelectedFile}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 输入区域 */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={isAIResponding ? 'AI正在回复中...' : placeholder}
              disabled={disabled || isAIResponding}
              rows={1}
              className="resize-none pr-12 min-h-[40px] max-h-[120px]"
            />

            {/* 字符计数 */}
            {message.length > 100 && (
              <div className="absolute bottom-1 right-1 text-xs text-muted-foreground">
                {message.length}/2000
              </div>
            )}
          </div>

          {/* 功能按钮 */}
          <div className="flex items-center gap-1">
            {/* 文件按钮 */}
            {enableFile && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isAIResponding}
                  className="h-10 w-10 p-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* 语音按钮 */}
            {enableVoice && (
              <Button
                variant={isRecording ? 'destructive' : 'outline'}
                size="sm"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={disabled || isAIResponding}
                className="h-10 w-10 p-0"
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* 发送按钮 */}
            <Button
              onClick={handleSend}
              disabled={disabled || isAIResponding || (!message.trim() && !selectedFile)}
              size="sm"
              className="h-10 px-3"
            >
              {isAIResponding ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="mt-2 text-xs text-muted-foreground">
          {isRecording ? (
            <span className="text-destructive flex items-center gap-1">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              正在录音，松开停止
            </span>
          ) : (
            <span>
              按 Enter 发送，Shift+Enter 换行 • 支持语音和文件
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}