import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export default function TestConnection() {
  const [apiKey, setApiKey] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const { toast } = useToast()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const testConnection = () => {
    if (!apiKey) {
      toast({
        title: '错误',
        description: '请输入API密钥',
        variant: 'destructive',
      })
      return
    }

    addLog('开始测试连接...')

    try {
      const url = `wss://open.bigmodel.cn/api/paas/v4/realtime?Authorization=${encodeURIComponent(apiKey)}`
      addLog(`连接URL: ${url}`)

      const newWs = new WebSocket(url)
      setWs(newWs)

      newWs.onopen = () => {
        addLog('✅ WebSocket连接成功')
        toast({
          title: '连接成功',
          description: 'WebSocket已建立连接',
        })
      }

      newWs.onmessage = (event) => {
        addLog(`📨 收到消息: ${event.data}`)
        try {
          const data = JSON.parse(event.data)
          addLog(`📊 解析消息: ${JSON.stringify(data, null, 2)}`)
        } catch (error) {
          addLog(`❌ 消息解析失败: ${error}`)
        }
      }

      newWs.onclose = (event) => {
        addLog(`🔌 连接关闭: 代码=${event.code}, 原因=${event.reason}`)
        setWs(null)

        if (event.code === 1002) {
          addLog('❌ 协议错误 (1002) - 服务器端协议不匹配')
          toast({
            title: '协议错误',
            description: 'WebSocket协议错误，请检查API配置',
            variant: 'destructive',
          })
        }
      }

      newWs.onerror = (error) => {
        addLog(`❌ WebSocket错误: ${error}`)
        toast({
          title: '连接错误',
          description: 'WebSocket连接失败',
          variant: 'destructive',
        })
      }

    } catch (error) {
      addLog(`❌ 创建WebSocket失败: ${error}`)
      toast({
        title: '创建失败',
        description: '无法创建WebSocket连接',
        variant: 'destructive',
      })
    }
  }

  const sendMessage = (messageType: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast({
        title: '错误',
        description: 'WebSocket未连接',
        variant: 'destructive',
      })
      return
    }

    const message = {
      type: messageType,
      client_timestamp: Date.now(),
      ...(messageType === 'session.create' && {
        model: 'glm-realtime',
        voice: 'alloy',
        instructions: '你是一个智能助手，请用简洁明了的语言回答问题。',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        temperature: 0.7,
      })
    }

    try {
      ws.send(JSON.stringify(message))
      addLog(`📤 发送消息: ${messageType}`)
    } catch (error) {
      addLog(`❌ 发送失败: ${error}`)
    }
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
      setWs(null)
      addLog('🔌 手动断开连接')
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket连接测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API密钥输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API密钥</label>
            <form onSubmit={(e) => e.preventDefault()}>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="请输入智谱AI API密钥"
                className="w-full"
                formNoValidate
              />
            </form>
          </div>

          {/* 连接控制 */}
          <div className="flex gap-2">
            <Button
              onClick={testConnection}
              disabled={ws?.readyState === WebSocket.OPEN}
              className="flex-1"
            >
              {ws?.readyState === WebSocket.OPEN ? '已连接' : '测试连接'}
            </Button>
            <Button
              onClick={disconnect}
              disabled={!ws || ws.readyState !== WebSocket.OPEN}
              variant="outline"
            >
              断开
            </Button>
            <Button
              onClick={clearLogs}
              variant="outline"
            >
              清空日志
            </Button>
          </div>

          {/* 消息发送 */}
          {ws?.readyState === WebSocket.OPEN && (
            <div className="space-y-2">
              <label className="text-sm font-medium">发送测试消息</label>
              <div className="flex gap-2">
                <Button
                  onClick={() => sendMessage('session.create')}
                  variant="outline"
                  size="sm"
                >
                  创建会话
                </Button>
                <Button
                  onClick={() => sendMessage('session.update')}
                  variant="outline"
                  size="sm"
                >
                  更新会话
                </Button>
                <Button
                  onClick={() => sendMessage('response.create')}
                  variant="outline"
                  size="sm"
                >
                  请求回复
                </Button>
              </div>
            </div>
          )}

          {/* 连接状态 */}
          <div className="p-3 border rounded-lg">
            <div className="text-sm font-medium mb-1">连接状态:</div>
            <div className="text-sm">
              {ws ? `状态: ${ws.readyState} (${WebSocket.CONNECTING === ws.readyState ? '连接中' : WebSocket.OPEN === ws.readyState ? '已连接' : WebSocket.CLOSING === ws.readyState ? '关闭中' : '已关闭'})` : '未初始化'}
            </div>
          </div>

          {/* 日志输出 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">连接日志</label>
            <div className="p-3 border rounded-lg h-96 overflow-y-auto bg-muted">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {logs.length === 0 ? '暂无日志' : logs.join('\n')}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
