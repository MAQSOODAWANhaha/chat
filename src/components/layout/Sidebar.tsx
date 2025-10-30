import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Phone,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'

const navigation = [
  { name: '首页', href: '/', icon: Home },
  { name: '音视频通话', href: '/call', icon: Phone },
  { name: '设置', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useAppStore()

  return (
    <div className={cn(
      'flex flex-col bg-card border-r transition-all duration-300 ease-in-out',
      sidebarOpen ? 'w-64' : 'w-16'
    )}>
      {/* 侧边栏头部 */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {sidebarOpen && (
          <h1 className="text-lg font-semibold text-foreground">
            Realtime React
          </h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 flex-shrink-0',
                sidebarOpen ? 'mr-3' : 'mx-auto'
              )} />
              {sidebarOpen && item.name}
            </Link>
          )
        })}
      </nav>

      {/* 侧边栏底部 */}
      <div className="border-t p-4">
        {sidebarOpen && (
          <div className="text-xs text-muted-foreground">
            <p>智谱AI Realtime</p>
            <p>Version 1.0.0</p>
          </div>
        )}
      </div>
    </div>
  )
}