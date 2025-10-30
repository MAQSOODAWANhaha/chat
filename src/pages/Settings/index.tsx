import { SettingsPanel } from '@/components/control'
import { ZhipuConnectionStatus } from '@/components/zhipu'

export default function Settings() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 h-screen flex flex-col">
      {/* 头部区域 */}
      <div className="bg-card border rounded-lg p-3 lg:p-4 mb-4 lg:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl lg:text-2xl font-bold">设置</h1>
            <p className="text-sm text-muted-foreground">管理您的应用设置和AI连接</p>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col gap-6 mb-6">
        {/* AI连接状态 - 最重要的配置，放在最上面 */}
        <div className="order-1">
          <ZhipuConnectionStatus />
        </div>

        {/* 设置面板 */}
        <div className="order-2 flex-1">
          <SettingsPanel />
        </div>
      </div>
    </div>
  )
}