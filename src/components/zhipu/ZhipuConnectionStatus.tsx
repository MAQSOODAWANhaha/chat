import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useZhipuRealtime } from '@/hooks/useZhipuRealtime'
import { cn } from '@/lib/utils'

interface ZhipuConnectionStatusProps {
  className?: string
  showDetails?: boolean
  compact?: boolean
}

export function ZhipuConnectionStatus({
  className,
  showDetails = true,
  compact = false
}: ZhipuConnectionStatusProps) {
  const { toast } = useToast()

  const {
    isConnected,
    isConnecting,
    error,
    sessionId,
    connect,
    disconnect
  } = useZhipuRealtime({
    autoConnect: false // 不自动连接，避免在没有API密钥时出错
  })

  // 处理连接操作
  const handleConnect = async () => {
    try {
      await connect()
    } catch (error) {
      console.error('连接失败:', error)
    }
  }

  // 处理断开操作
  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (error) {
      console.error('断开失败:', error)
    }
  }

  // 获取状态信息
  const getStatusInfo = () => {
    if (isConnecting) {
      return {
        icon: Loader2,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        badgeVariant: 'secondary' as const,
        text: '连接中',
        description: '正在连接智谱AI...'
      }
    }

    if (isConnected) {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        badgeVariant: 'default' as const,
        text: '已连接',
        description: '智谱AI连接正常'
      }
    }

    if (error) {
      return {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        badgeVariant: 'destructive' as const,
        text: '连接失败',
        description: error
      }
    }

    return {
      icon: WifiOff,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      badgeVariant: 'outline' as const,
      text: '未连接',
      description: '智谱AI未连接'
    }
  }

  const statusInfo = getStatusInfo()
  const Icon = statusInfo.icon

  // 紧凑模式
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Icon className={cn('h-4 w-4', statusInfo.color, isConnecting && 'animate-spin')} />
        <Badge variant={statusInfo.badgeVariant} className="text-xs">
          {statusInfo.text}
        </Badge>
      </div>
    )
  }

  // 详细模式
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={cn('h-5 w-5', statusInfo.color, isConnecting && 'animate-spin')} />
            智谱AI连接状态
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={isConnected ? handleDisconnect : handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isConnected ? (
                '断开'
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 状态指示器 */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'w-3 h-3 rounded-full',
            isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-gray-300'
          )} />

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={statusInfo.badgeVariant}>
                {statusInfo.text}
              </Badge>
              {isConnected && (
                <span className="text-xs text-muted-foreground">
                  会话ID: {sessionId?.slice(0, 8)}...
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-1">
              {statusInfo.description}
            </p>
          </div>
        </div>

        {/* 详细信息 */}
        {showDetails && (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">连接状态:</span>
                <div className="font-medium mt-1">
                  {isConnected ? '在线' : isConnecting ? '连接中' : '离线'}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">会话ID:</span>
                <div className="font-medium mt-1 font-mono text-xs">
                  {sessionId || '无'}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">错误信息</span>
                </div>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• 智谱AI提供实时语音对话功能</p>
              <p>• 支持文本和语音两种输入方式</p>
              <p>• 自动断线重连，保障服务稳定性</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}