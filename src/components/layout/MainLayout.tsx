import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAppStore } from '@/stores/useAppStore'
import { cn } from '@/lib/utils'

export function MainLayout() {
  const { theme } = useAppStore()

  return (
    <div className={cn('min-h-screen bg-background', theme)}>
      <div className="flex h-screen overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar />

        {/* 主内容区域 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* 顶部导航栏 */}
          <Header />

          {/* 主要内容 */}
          <main className="flex-1 overflow-auto">
            <div className="h-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}