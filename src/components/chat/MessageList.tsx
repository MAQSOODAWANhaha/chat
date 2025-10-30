import { useEffect, useRef, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ChevronDown, MessageSquare } from 'lucide-react'
import { MessageBubble, Message } from './MessageBubble'
import { cn } from '@/lib/utils'

interface MessageListProps {
  messages: Message[]
  className?: string
  showAvatars?: boolean
  showTimestamps?: boolean
  autoScroll?: boolean
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
}

export function MessageList({
  messages,
  className,
  showAvatars = true,
  showTimestamps = true,
  autoScroll = true,
  loading = false,
  onLoadMore,
  hasMore = false,
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)

  // 自动滚动到底部
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 检查是否在底部
  const checkIfAtBottom = () => {
    if (!scrollAreaRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
    const atBottom = scrollTop + clientHeight >= scrollHeight - 100
    setIsAtBottom(atBottom)
    setShowScrollButton(!atBottom)
  }

  // 处理滚动事件
  const handleScroll = () => {
    checkIfAtBottom()
  }

  // 加载更多消息
  const handleLoadMore = () => {
    if (onLoadMore && !loading) {
      onLoadMore()
    }
  }

  // 监听消息变化，自动滚动
  useEffect(() => {
    if (autoScroll && isAtBottom) {
      scrollToBottom()
    }
  }, [messages, autoScroll, isAtBottom])

  // 监听思考状态变化，自动滚动
  useEffect(() => {
    const hasThinkingMessage = messages.some(msg => msg.isThinking)
    if (hasThinkingMessage && autoScroll) {
      scrollToBottom()
    }
  }, [messages, autoScroll])

  // 初始化检查
  useEffect(() => {
    checkIfAtBottom()
  }, [])

  return (
    <div className={cn('relative h-full flex flex-col', className)}>
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1"
        onScroll={handleScroll}
      >
        <div className="space-y-4 p-4">
          {/* 加载更多按钮 */}
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? '加载中...' : '加载更多'}
              </Button>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              showAvatar={showAvatars}
              showTimestamp={showTimestamps}
            />
          ))}

          {/* 空状态 */}
          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">暂无消息</p>
                <p className="text-sm text-muted-foreground mt-1">
                  发送第一条消息开始对话
                </p>
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {loading && messages.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>加载消息中...</span>
              </div>
            </div>
          )}

          {/* 底部锚点 */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* 滚动到底部按钮 */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-4">
          <Button
            size="sm"
            onClick={scrollToBottom}
            className="h-8 w-8 rounded-full p-0 shadow-lg"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}