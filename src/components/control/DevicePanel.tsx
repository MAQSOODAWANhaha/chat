import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Mic,
  MicOff,
  Volume2,
  Video,
  VideoOff,
  Monitor,
  RefreshCw,
  Settings,
  Check,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/stores/useAppStore'
import { useCallStore } from '@/stores/useCallStore'
import { cn } from '@/lib/utils'

interface Device {
  deviceId: string
  kind: MediaDeviceKind
  label: string
  groupId?: string
}

interface DevicePanelProps {
  className?: string
  onClose?: () => void
}

export function DevicePanel({ className, onClose }: DevicePanelProps) {
  const { settings, updateSettings } = useAppStore()
  const {
    audioDevice,
    videoDevice,
    setAudioDevice,
    setVideoDevice,
    testDevice,
  } = useCallStore()

  const { toast } = useToast()

  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [testingDevice, setTestingDevice] = useState<string | null>(null)

  // 获取设备列表
  const getDevices = async () => {
    setIsLoading(true)
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      setDevices(allDevices.filter(device => device.label))
    } catch (error) {
      console.error('获取设备列表失败:', error)
      toast({
        title: '设备获取失败',
        description: '无法获取媒体设备列表',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 请求设备权限并刷新列表
  const requestPermissions = async () => {
    try {
      // 请求音频权限
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => stream.getTracks().forEach(track => track.stop()))

      // 请求视频权限
      await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        .then(stream => stream.getTracks().forEach(track => track.stop()))

      await getDevices()
      toast({
        title: '权限已获取',
        description: '设备权限请求成功',
      })
    } catch (error) {
      console.error('请求权限失败:', error)
      toast({
        title: '权限请求失败',
        description: '无法获取媒体设备权限',
        variant: 'destructive',
      })
    }
  }

  // 测试设备
  const handleTestDevice = async (deviceId: string, kind: MediaDeviceKind) => {
    setTestingDevice(deviceId)
    try {
      await testDevice(deviceId, kind)
      toast({
        title: '测试成功',
        description: `${kind === 'audioinput' ? '麦克风' : kind === 'audiooutput' ? '扬声器' : '摄像头'}工作正常`,
      })
    } catch (error) {
      console.error('设备测试失败:', error)
      toast({
        title: '测试失败',
        description: '设备测试失败，请检查设备连接',
        variant: 'destructive',
      })
    } finally {
      setTestingDevice(null)
    }
  }

  // 设置默认设备
  const handleSetDefaultDevice = (deviceId: string, kind: MediaDeviceKind) => {
    if (kind === 'audioinput') {
      setAudioDevice(deviceId)
      updateSettings({
        audio: { ...settings.audio, inputDevice: deviceId }
      })
    } else if (kind === 'audiooutput') {
      updateSettings({
        audio: { ...settings.audio, outputDevice: deviceId }
      })
    } else if (kind === 'videoinput') {
      setVideoDevice(deviceId)
      updateSettings({
        video: { ...settings.video, device: deviceId }
      })
    }

    toast({
      title: '设备已更新',
      description: '默认设备已更新',
    })
  }

  // 获取设备图标
  const getDeviceIcon = (kind: MediaDeviceKind) => {
    switch (kind) {
      case 'audioinput':
        return Mic
      case 'audiooutput':
        return Volume2
      case 'videoinput':
        return Video
      default:
        return Settings
    }
  }

  // 获取设备类型名称
  const getDeviceTypeName = (kind: MediaDeviceKind) => {
    switch (kind) {
      case 'audioinput':
        return '麦克风'
      case 'audiooutput':
        return '扬声器'
      case 'videoinput':
        return '摄像头'
      default:
        return '未知设备'
    }
  }

  // 过滤设备
  const audioInputs = devices.filter(d => d.kind === 'audioinput')
  const audioOutputs = devices.filter(d => d.kind === 'audiooutput')
  const videoInputs = devices.filter(d => d.kind === 'videoinput')

  useEffect(() => {
    getDevices()

    // 监听设备变化
    const handleDeviceChange = () => {
      getDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [])

  const renderDeviceList = (deviceList: Device[], kind: MediaDeviceKind, currentDevice?: string) => {
    const Icon = getDeviceIcon(kind)
    const typeName = getDeviceTypeName(kind)

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {typeName}
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTestDevice(currentDevice || '', kind)}
            disabled={!currentDevice || testingDevice !== null}
          >
            {testingDevice === currentDevice ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              '测试'
            )}
          </Button>
        </div>

        {deviceList.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">未找到{typeName}设备</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deviceList.map((device) => (
              <div
                key={device.deviceId}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  currentDevice === device.deviceId && "bg-primary/10 border-primary"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <div>
                    <p className="font-medium">{device.label || '未知设备'}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.deviceId.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentDevice === device.deviceId && (
                    <Badge variant="default" className="text-xs">
                      当前使用
                    </Badge>
                  )}
                  <Button
                    variant={currentDevice === device.deviceId ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleSetDefaultDevice(device.deviceId, kind)}
                  >
                    {currentDevice === device.deviceId ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      '设为默认'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            设备管理
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={getDevices} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              刷新
            </Button>
            <Button variant="outline" size="sm" onClick={requestPermissions}>
              请求权限
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                关闭
              </Button>
            )}
          </div>
        </div>

        {/* 设备统计 */}
        <div className="flex gap-4">
          <Badge variant="secondary">
            {audioInputs.length} 个麦克风
          </Badge>
          <Badge variant="secondary">
            {audioOutputs.length} 个扬声器
          </Badge>
          <Badge variant="secondary">
            {videoInputs.length} 个摄像头
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">未找到媒体设备</h3>
            <p className="text-muted-foreground mb-4">
              请确保已连接麦克风、摄像头或扬声器，然后点击"请求权限"按钮
            </p>
            <Button onClick={requestPermissions}>
              请求设备权限
            </Button>
          </div>
        ) : (
          <>
            {/* 音频输入设备 */}
            {renderDeviceList(audioInputs, 'audioinput', audioDevice)}

            <Separator />

            {/* 音频输出设备 */}
            {renderDeviceList(audioOutputs, 'audiooutput', settings.audio.outputDevice)}

            <Separator />

            {/* 视频输入设备 */}
            {renderDeviceList(videoInputs, 'videoinput', videoDevice)}
          </>
        )}

        {/* 提示信息 */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p>• 首次使用需要授予浏览器设备权限</p>
          <p>• 如果设备未显示，请检查设备连接并刷新列表</p>
          <p>• 可以通过测试按钮验证设备是否正常工作</p>
        </div>
      </CardContent>
    </Card>
  )
}