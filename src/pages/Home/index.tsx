import { useNavigate } from 'react-router-dom'
import { Phone, MessageSquare, Settings, BarChart3, Zap, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: Phone,
    title: '音视频通话',
    description: '支持高质量的实时音视频通话，以及屏幕共享功能',
  },
  {
    icon: MessageSquare,
    title: 'AI智能对话',
    description: '集成智谱AI Realtime API，实现自然流畅的AI对话体验',
  },
  {
    icon: BarChart3,
    title: '实时监控',
    description: '实时显示音视频质量指标，确保最佳的通话体验',
  },
  {
    icon: Zap,
    title: '极速连接',
    description: '基于WebRTC技术，实现低延迟的实时通信',
  },
  {
    icon: Shield,
    title: '安全可靠',
    description: '端到端加密，保护您的隐私和数据安全',
  },
]

export default function Home() {
  const navigate = useNavigate()

  const handleStartCall = () => {
    navigate('/call')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* 头部标题区域 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Realtime React
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            基于React和智谱AI Realtime API的现代化实时通信应用
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleStartCall}
              className="text-lg px-8 py-6 h-auto"
            >
              <Phone className="mr-2 h-5 w-5" />
              开始通话
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/settings')}
              className="text-lg px-8 py-6 h-auto"
            >
              <Settings className="mr-2 h-5 w-5" />
              设置
            </Button>
          </div>
        </div>

        {/* 功能特性网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 快速开始指南 */}
        <div className="bg-card rounded-lg border p-8 mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">快速开始</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">配置设备</h3>
              <p className="text-muted-foreground text-sm">
                在设置页面配置您的音频和视频设备
              </p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">开始通话</h3>
              <p className="text-muted-foreground text-sm">
                点击"开始通话"按钮，选择通话类型
              </p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">享受对话</h3>
              <p className="text-muted-foreground text-sm">
                与AI助手进行实时音视频对话
              </p>
            </div>
          </div>
        </div>

        {/* 页脚 */}
        <footer className="text-center text-muted-foreground">
          <p>© 2024 Realtime React. Powered by 智谱AI</p>
        </footer>
      </div>
    </div>
  )
}