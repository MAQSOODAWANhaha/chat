import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Loader2,
  Brain
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCallStore } from '@/stores/useCallStore'
import { useChatStore } from '@/stores/useChatStore'
import { useZhipuRealtime } from '@/hooks/useZhipuRealtime'
import {
  AudioInput,
  AudioOutput,
  AudioVisualizer,
} from '@/components/audio'
import {
  VideoInput,
  VideoOutput,
  VideoGrid,
} from '@/components/video'
import {
  ChatArea,
} from '@/components/chat'
import {
  ZhipuConnectionStatus,
} from '@/components/zhipu'

export default function AudioVideoCall() {
  const {
    localStream,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    startCall,
    endCall,
  } = useCallStore()
  const { messages, aiResponseStatus } = useChatStore()
  const { toast } = useToast()

  // 智谱AI实时功能
  const {
    isConnected: aiConnected,
    isConnecting: aiConnecting,
    error: aiError,
    connect: connectAI,
    disconnect: disconnectAI,
    startAudioInput,
    stopAudioInput,
    cancelResponse,
    sendTextMessage,
  } = useZhipuRealtime()

  const [activeTab, setActiveTab] = useState('ai')
  const [isCallConnected, setIsCallConnected] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const handleStartCall = async () => {
    try {
      await startCall('audio')
      setIsCallConnected(true)
      toast({
        title: '通话已连接',
        description: '音视频通话已成功建立',
      })
    } catch (error) {
      toast({
        title: '连接失败',
        description: '无法建立音视频连接',
        variant: 'destructive',
      })
    }
  }

  const handleEndCall = () => {
    endCall()
    setIsCallConnected(false)
    if (isVoiceEnabled) {
      stopVoiceInput()
    }
    toast({
      title: '通话已结束',
      description: '音视频通话已断开',
    })
  }

  // 连接智谱AI
  const handleConnectAI = async () => {
    try {
      await connectAI()
      toast({
        title: 'AI连接成功',
        description: '智谱AI已连接，可以开始语音对话',
      })
    } catch (error) {
      toast({
        title: 'AI连接失败',
        description: error instanceof Error ? error.message : '无法连接智谱AI',
        variant: 'destructive',
      })
    }
  }

  // 断开智谱AI连接
  const handleDisconnectAI = () => {
    if (isVoiceEnabled) {
      stopVoiceInput()
    }
    disconnectAI()
    toast({
      title: 'AI连接已断开',
      description: '智谱AI连接已断开',
    })
  }

  // 开始语音输入
  const startVoiceInput = async () => {
    try {
      await startAudioInput()
      setIsVoiceEnabled(true)
      toast({
        title: '语音输入已启动',
        description: '正在监听您的语音，可以开始对话了',
      })
    } catch (error) {
      toast({
        title: '语音输入失败',
        description: error instanceof Error ? error.message : '无法启动语音输入',
        variant: 'destructive',
      })
    }
  }

  // 停止语音输入
  const stopVoiceInput = () => {
    stopAudioInput()
    setIsVoiceEnabled(false)
    toast({
      title: '语音输入已停止',
      description: '语音输入已关闭',
    })
  }

  // 发送文本消息
  const handleSendMessage = async (text: string) => {
    try {
      await sendTextMessage(text)
    } catch (error) {
      toast({
        title: '发送失败',
        description: error instanceof Error ? error.message : '无法发送消息',
        variant: 'destructive',
      })
    }
  }

  // 取消AI响应
  const handleCancelResponse = () => {
    cancelResponse()
    toast({
      title: '响应已取消',
      description: 'AI响应已被取消',
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
      {/* 顶部状态栏 */}
      <div className="bg-card border rounded-lg p-3 lg:p-4 mb-4 lg:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            <h1 className="text-xl lg:text-2xl font-bold">智谱AI实时对话</h1>
            <div className="flex flex-wrap items-center gap-2">
              {isCallConnected ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  通话中
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <PhoneOff className="h-3 w-3" />
                  未连接
                </Badge>
              )}

              {aiConnected ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  AI已连接
                </Badge>
              ) : aiConnecting ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  连接中
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  AI未连接
                </Badge>
              )}

              {isVoiceEnabled && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3" />
                  语音输入中
                </Badge>
              )}
            </div>
          </div>

          {/* AI状态指示器 */}
          <div className="flex items-center gap-2">
            {aiResponseStatus === 'thinking' && (
              <div className="flex items-center gap-2 text-blue-600">
                <Brain className="h-4 w-4 animate-pulse" />
                <span className="text-sm hidden sm:inline">AI思考中...</span>
              </div>
            )}
            {aiResponseStatus === 'speaking' && (
              <div className="flex items-center gap-2 text-green-600">
                <Volume2 className="h-4 w-4 animate-pulse" />
                <span className="text-sm hidden sm:inline">AI说话中...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 mb-6">
        {/* 主要内容区域 */}
        <div className="flex-1">
          <div className="h-full flex flex-col space-y-4 lg:space-y-6">
            {/* 视频网格显示 */}
            <Card className="flex-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    视频通话
                  </CardTitle>
                  <ZhipuConnectionStatus compact />
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <VideoGrid
                  streams={[
                    {
                      id: 'local',
                      name: '我',
                      stream: localStream,
                      type: 'local',
                      isMuted: isMuted,
                      isVideoEnabled: isVideoEnabled,
                    },
                    ...(remoteStream ? [{
                      id: 'remote',
                      name: '对方',
                      stream: remoteStream,
                      type: 'remote' as const,
                      isMuted: false,
                      isVideoEnabled: true,
                    }] : [])
                  ]}
                  layout="grid"
                  showControls={true}
                />
              </CardContent>
            </Card>

            {/* 控制面板标签页 */}
            <Card className="flex-shrink-0">
              <CardHeader>
                <CardTitle>控制面板</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="ai">AI对话</TabsTrigger>
                    <TabsTrigger value="audio">音频</TabsTrigger>
                    <TabsTrigger value="video">视频</TabsTrigger>
                    <TabsTrigger value="chat">对话历史</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ai" className="space-y-4 mt-4">
                    {/* AI控制面板 */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Brain className="h-5 w-5 text-blue-600" />
                          <div>
                            <h4 className="font-medium">智谱AI实时对话</h4>
                            <p className="text-sm text-muted-foreground">
                              {aiConnected ? 'AI已连接，可以开始对话' : '请先连接AI服务'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!aiConnected ? (
                            <Button
                              onClick={handleConnectAI}
                              disabled={aiConnecting}
                              className="h-8"
                            >
                              {aiConnecting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Wifi className="h-4 w-4 mr-1" />
                              )}
                              连接AI
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              onClick={handleDisconnectAI}
                              className="h-8"
                            >
                              <WifiOff className="h-4 w-4 mr-1" />
                              断开AI
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 语音输入控制 */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {isVoiceEnabled ? (
                            <Volume2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <VolumeX className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <h4 className="font-medium">语音输入</h4>
                            <p className="text-sm text-muted-foreground">
                              {isVoiceEnabled ? '正在监听您的语音...' : '点击开始语音输入'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isVoiceEnabled ? (
                            <Button
                              onClick={startVoiceInput}
                              disabled={!aiConnected}
                              className="h-8"
                            >
                              <Mic className="h-4 w-4 mr-1" />
                              开始语音
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              onClick={stopVoiceInput}
                              className="h-8"
                            >
                              <MicOff className="h-4 w-4 mr-1" />
                              停止语音
                            </Button>
                          )}

                          {aiResponseStatus === 'thinking' || aiResponseStatus === 'speaking' ? (
                            <Button
                              variant="outline"
                              onClick={handleCancelResponse}
                              className="h-8"
                            >
                              取消响应
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {/* 语音可视化 */}
                      {isVoiceEnabled && (
                        <div className="p-4 border rounded-lg">
                          <AudioVisualizer />
                        </div>
                      )}

                      {/* 错误提示 */}
                      {aiError && (
                        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-600">连接错误: {aiError}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="audio" className="space-y-4 mt-4">
                    <AudioInput onStreamReady={(stream) => console.log('音频流已准备:', stream)} />
                    <AudioOutput />
                  </TabsContent>

                  <TabsContent value="video" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <VideoInput onStreamReady={(stream) => console.log('视频流已准备:', stream)} />
                      <VideoOutput remoteStream={remoteStream} />
                    </div>
                  </TabsContent>

                  <TabsContent value="chat" className="h-[500px] mt-4">
                    <ChatArea
                      showHeader={true}
                      showInput={aiConnected}
                      maxHeight="500px"
                      onSendMessage={handleSendMessage}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 底部控制栏 */}
      <div className="bg-card border rounded-lg p-3 lg:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* 音视频控制按钮 */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="sm"
              onClick={toggleMute}
              disabled={!isCallConnected}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              variant={!isVideoEnabled ? 'destructive' : 'secondary'}
              size="sm"
              onClick={toggleVideo}
              disabled={!isCallConnected}
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button
              variant={isScreenSharing ? 'default' : 'secondary'}
              size="sm"
              onClick={toggleScreenShare}
              disabled={!isCallConnected}
            >
              {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* AI连接状态快速操作 */}
            <div className="flex items-center gap-2">
              {!aiConnected ? (
                <Button
                  onClick={handleConnectAI}
                  disabled={aiConnecting}
                  variant="outline"
                  size="sm"
                  className="w-full lg:w-auto"
                >
                  {aiConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Brain className="h-4 w-4 mr-1" />
                  )}
                  <span className="hidden sm:inline">连接AI</span>
                  <span className="sm:hidden">AI</span>
                </Button>
              ) : (
                <Button
                  onClick={isVoiceEnabled ? stopVoiceInput : startVoiceInput}
                  variant={isVoiceEnabled ? "default" : "outline"}
                  size="sm"
                  className="w-full lg:w-auto"
                >
                  {isVoiceEnabled ? (
                    <MicOff className="h-4 w-4 mr-1" />
                  ) : (
                    <Mic className="h-4 w-4 mr-1" />
                  )}
                  <span className="hidden sm:inline">{isVoiceEnabled ? '停止语音' : '开始语音'}</span>
                  <span className="sm:hidden">{isVoiceEnabled ? '停止' : '开始'}</span>
                </Button>
              )}
            </div>

            {/* 通话控制 */}
            {!isCallConnected ? (
              <Button
                size="lg"
                onClick={handleStartCall}
                className="h-12 px-6 lg:px-8 w-full lg:w-auto"
              >
                <Phone className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">开始通话</span>
                <span className="sm:hidden">通话</span>
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="lg"
                onClick={handleEndCall}
                className="h-12 px-6 lg:px-8 w-full lg:w-auto"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">结束通话</span>
                <span className="sm:hidden">结束</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}