import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Settings,
  Volume2,
  Mic,
  Video,
  Save,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/stores/useAppStore'
import { useCallStore } from '@/stores/useCallStore'
import { cn } from '@/lib/utils'

interface SettingsPanelProps {
  className?: string
  onClose?: () => void
}

export function SettingsPanel({ className, onClose }: SettingsPanelProps) {
  const { settings, updateSettings, resetSettings } = useAppStore()
  const { isMuted, isVideoEnabled, toggleMute, toggleVideo } = useCallStore()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('audio')
  const [tempSettings, setTempSettings] = useState(settings)

  // 更新临时设置
  const updateTempSetting = (category: string, key: string, value: any) => {
    setTempSettings(prev => {
      const categoryKey = category as keyof typeof prev
      const categoryValue = prev[categoryKey]
      if (typeof categoryValue === 'object' && categoryValue !== null) {
        return {
          ...prev,
          [category]: {
            ...categoryValue,
            [key]: value
          }
        }
      }
      return prev
    })
  }

  // 更新根级设置
  const updateRootSetting = (key: string, value: any) => {
    setTempSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 保存设置
  const handleSave = () => {
    updateSettings(tempSettings)
    toast({
      title: '设置已保存',
      description: '所有设置已成功保存',
    })
    onClose?.()
  }

  // 重置设置
  const handleReset = () => {
    if (window.confirm('确定要重置所有设置吗？此操作不可恢复。')) {
      resetSettings()
      setTempSettings(settings)
      toast({
        title: '设置已重置',
        description: '所有设置已恢复到默认值',
      })
    }
  }

  const tabs = [
    { id: 'audio', label: '音频', icon: Mic },
    { id: 'video', label: '视频', icon: Video },
    { id: 'api', label: '智谱AI', icon: Settings },
  ]

  return (
    <Card className={cn('w-full h-full flex flex-col', className)}>
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Settings className="h-5 w-5" />
            设置面板
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">重置</span>
              <span className="sm:hidden">重置</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 overflow-hidden flex flex-col">
        {/* 标签导航 */}
        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 mb-6 flex-shrink-0">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        <Separator className="mb-6 flex-shrink-0" />

        {/* 内容区域 */}
        <div className="space-y-6 flex-1 overflow-y-auto">
          {/* 音频设置 */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <h3 className="text-lg font-medium">音频设置</h3>
              </div>

              <div className="space-y-6">
                {/* 输入设置 */}
                <div className="space-y-4">
                  <h4 className="font-medium text-base sm:text-lg">输入设置</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label className="text-sm">回声消除</Label>
                      <Switch
                        checked={tempSettings.audio?.echoCancellation || false}
                        onCheckedChange={(checked) =>
                          updateTempSetting('audio', 'echoCancellation', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label className="text-sm">噪声抑制</Label>
                      <Switch
                        checked={tempSettings.audio?.noiseSuppression || false}
                        onCheckedChange={(checked) =>
                          updateTempSetting('audio', 'noiseSuppression', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label className="text-sm">自动增益控制</Label>
                      <Switch
                        checked={tempSettings.audio?.autoGainControl || false}
                        onCheckedChange={(checked) =>
                          updateTempSetting('audio', 'autoGainControl', checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* 输出设置 */}
                <div className="space-y-4">
                  <h4 className="font-medium text-base sm:text-lg">输出设置</h4>

                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">音量</Label>
                      <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                        {tempSettings.audio?.volume || 50}%
                      </span>
                    </div>
                    <Slider
                      value={[tempSettings.audio?.volume || 50]}
                      onValueChange={([value]) =>
                        updateTempSetting('audio', 'volume', value)
                      }
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 视频设置 */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <h3 className="text-lg font-medium">视频设置</h3>
              </div>

              <div className="space-y-6">
                {/* 分辨率设置 */}
                <div className="space-y-4">
                  <h4 className="font-medium text-base sm:text-lg">分辨率设置</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">分辨率</Label>
                      <Select
                        value={tempSettings.video?.resolution || '720p'}
                        onValueChange={(value) =>
                          updateTempSetting('video', 'resolution', value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="360p">360p (640x360)</SelectItem>
                          <SelectItem value="720p">720p (1280x720)</SelectItem>
                          <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                          <SelectItem value="4K">4K (3840x2160)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">帧率</Label>
                      <Select
                        value={String(tempSettings.video?.frameRate || 30)}
                        onValueChange={(value) =>
                          updateTempSetting('video', 'frameRate', parseInt(value))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 FPS</SelectItem>
                          <SelectItem value="30">30 FPS</SelectItem>
                          <SelectItem value="60">60 FPS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">质量</Label>
                      <Select
                        value={tempSettings.video?.quality || 'medium'}
                        onValueChange={(value) =>
                          updateTempSetting('video', 'quality', value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">低质量 (节省带宽)</SelectItem>
                          <SelectItem value="medium">中等质量 (平衡)</SelectItem>
                          <SelectItem value="high">高质量 (最佳体验)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API设置 */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <h3 className="text-lg font-medium">智谱AI配置</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">API密钥</Label>
                  <form onSubmit={(e) => e.preventDefault()}>
                    <Input
                      type="password"
                      value={tempSettings.api?.apiKey || ''}
                      onChange={(e) =>
                        updateTempSetting('api', 'apiKey', e.target.value)
                      }
                      placeholder="请输入智谱AI API密钥"
                      className="text-base"
                      formNoValidate
                    />
                  </form>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">基础URL</Label>
                    <Input
                      value={tempSettings.api?.baseUrl || ''}
                      disabled
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">WebSocket URL</Label>
                    <Input
                      value={tempSettings.api?.wsUrl || ''}
                      disabled
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 保存按钮 */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t flex-shrink-0">
          <Button
            onClick={handleSave}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            保存设置
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}