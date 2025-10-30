import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, Settings, Trash2, Download, Search } from 'lucide-react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useChatStore } from '@/stores/useChatStore'
import { cn } from '@/lib/utils'
import type { Message } from './MessageBubble'

interface ChatAreaProps {
  className?: string
  showHeader?: boolean
  showInput?: boolean
  maxHeight?: string
}

export function ChatArea({
  className,
  showHeader = true,
  showInput = true,
  maxHeight = '600px',
}: ChatAreaProps) {
  const {
    messages,
    aiResponseStatus,
    clearMessages,
    exportMessages,
  } = useChatStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // 过滤消息
  const displayMessages = messages.filter(msg => msg.sender !== 'system')

  const filteredMessages = searchQuery
    ? displayMessages.filter(msg =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayMessages

  // 获取AI状态显示
  const getAIStatusBadge = () => {
    switch (aiResponseStatus) {
      case 'thinking':
        return <Badge variant="secondary">AI思考中...</Badge>
      case 'responding':
        return <Badge variant="default">AI回复中...</Badge>
      case 'error':
        return <Badge variant="destructive">AI出错</Badge>
      default:
        return null
    }
  }

  // 处理导出消息
  const handleExport = () => {
    try {
      exportMessages()
    } catch (error) {
      console.error('导出消息失败:', error)
    }
  }

  // 处理清空消息
  const handleClear = () => {
    if (window.confirm('确定要清空所有消息吗？此操作不可恢复。')) {
      clearMessages()
    }
  }

  return (
    <Card className={cn('flex flex-col h-full', className)} style={{ maxHeight }}>
      {/* 头部 */}
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle className="text-lg">对话</CardTitle>
              {getAIStatusBadge()}
            </div>

            <div className="flex items-center gap-1">
              {/* 搜索按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
                className="h-8 w-8 p-0"
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* 导出按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                disabled={messages.length === 0}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* 清空按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={messages.length === 0}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 搜索栏 */}
          {showSearch && (
            <div className="mt-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索消息内容..."
                className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          )}
        </CardHeader>
      )}

      {/* 消息列表 */}
      <CardContent className="flex-1 flex flex-col p-0 pt-0">
        <div className="flex-1 min-h-0">
          <MessageList
            messages={filteredMessages}
            autoScroll={true}
            showAvatars={true}
            showTimestamps={true}
            className="h-full"
          />
        </div>

        {/* 输入区域 */}
        {showInput && (
          <>
            <Separator />
            <div className="p-4">
              <ChatInput
                enableVoice={true}
                enableFile={true}
                enableEmoji={false}
              />
            </div>
          </>
        )}
      </CardContent>

      {/* 状态栏 */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>共 {messages.length} 条消息</span>
            {searchQuery && (
              <span>搜索结果: {filteredMessages.length} 条</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {aiResponseStatus !== 'idle' && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span>
                  {aiResponseStatus === 'thinking' && 'AI正在思考'}
                  {aiResponseStatus === 'responding' && 'AI正在回复'}
                  {aiResponseStatus === 'error' && 'AI回复出错'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}