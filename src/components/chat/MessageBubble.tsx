import { useState } from 'react'
import { User, Bot, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  type: 'text' | 'audio' | 'image' | 'file'
  createdAt: Date
  metadata?: {
    audioUrl?: string
    duration?: number
    fileName?: string
    fileSize?: number
  }
  status?: 'sending' | 'sent' | 'delivered' | 'failed'
  isThinking?: boolean
}

interface MessageBubbleProps {
  message: Message
  showAvatar?: boolean
  showTimestamp?: boolean
  className?: string
}

export function MessageBubble({
  message,
  showAvatar = true,
  showTimestamp = true,
  className,
}: MessageBubbleProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      toast({
        title: '已复制',
        description: '消息内容已复制到剪贴板',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: '复制失败',
        description: '无法复制消息内容',
        variant: 'destructive',
      })
    }
  }

  const renderMessageContent = () => {
    switch (message.type) {
      case 'audio':
        return (
          <div className="space-y-2">
            <p className="text-sm">{message.content}</p>
            {message.metadata?.audioUrl && (
              <audio
                controls
                src={message.metadata.audioUrl}
                className="w-full max-w-sm"
              />
            )}
            {message.metadata?.duration && (
              <p className="text-xs text-muted-foreground">
                时长: {Math.floor(message.metadata.duration / 60)}:
                {(message.metadata.duration % 60).toString().padStart(2, '0')}
              </p>
            )}
          </div>
        )

      case 'image':
        return (
          <div className="space-y-2">
            <img
              src={message.metadata?.audioUrl || ''}
              alt="发送的图片"
              className="max-w-sm rounded-lg"
            />
            <p className="text-sm">{message.content}</p>
          </div>
        )

      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">
                  {message.metadata?.fileName?.split('.').pop()?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {message.metadata?.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {message.metadata?.fileSize
                    ? `${(message.metadata.fileSize / 1024).toFixed(1)} KB`
                    : '未知大小'
                  }
                </p>
              </div>
            </div>
            <p className="text-sm">{message.content}</p>
          </div>
        )

      case 'text':
      default:
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>
    }
  }

  const isUser = message.sender === 'user'
  const isThinking = message.isThinking

  return (
    <div
      className={cn(
        'flex gap-3 max-w-full',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* 头像 */}
      {showAvatar && (
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-primary' : 'bg-secondary'
        )}>
          {isUser ? (
            <User className="w-5 h-5 text-primary-foreground" />
          ) : (
            <Bot className="w-5 h-5 text-secondary-foreground" />
          )}
        </div>
      )}

      {/* 消息内容 */}
      <div className={cn(
        'flex flex-col gap-1 min-w-0',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* 消息气泡 */}
        <Card className={cn(
          'max-w-[80%] sm:max-w-[70%]',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
          isThinking && 'border-dashed'
        )}>
          <CardContent className="p-3">
            {isThinking ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
                <span className="text-sm">AI正在思考...</span>
              </div>
            ) : (
              renderMessageContent()
            )}
          </CardContent>
        </Card>

        {/* 状态和时间戳 */}
        <div className={cn(
          'flex items-center gap-2 px-1',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}>
          {message.status && (
            <Badge variant={message.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
              {message.status === 'sending' && '发送中'}
              {message.status === 'sent' && '已发送'}
              {message.status === 'delivered' && '已送达'}
              {message.status === 'failed' && '发送失败'}
            </Badge>
          )}

          {showTimestamp && (
            <span className="text-xs text-muted-foreground">
              {message.createdAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}

          {/* 复制按钮 */}
          {message.type === 'text' && !isThinking && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0 opacity-0 hover:opacity-100 transition-opacity"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}