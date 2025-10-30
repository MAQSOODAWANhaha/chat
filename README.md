# Realtime React - 智谱AI实时对话应用

基于React + TypeScript + Vite + shadcn/ui + Tailwind CSS的现代化实时通信应用，完整实现语音通话、视频通话、屏幕共享和AI对话所有功能。

## 🚀 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **UI组件库**: shadcn/ui + Radix UI
- **样式框架**: Tailwind CSS
- **状态管理**: Zustand
- **路由管理**: React Router 6
- **数据获取**: React Query
- **音视频处理**: Web Audio API + WebRTC
- **音频可视化**: wavesurfer.js
- **动画库**: Framer Motion

## 🚀 快速部署

### Docker 部署（推荐）

1. **配置环境变量**

   编辑 `.env` 文件：
   ```env
   # 对外暴露的域名
   DOMAIN=localhost:3000

   # 签发 TLS 证书使用的通知邮箱（生产环境使用）
   CADDY_EMAIL=admin@example.com
   ```

2. **启动服务**

   ```bash
   docker-compose up -d
   ```

3. **访问应用**

   浏览器访问 `http://localhost`（HTTP）或 `https://localhost`（HTTPS）

### 生产环境部署

1. **配置域名**

   修改 `.env` 文件中的 `DOMAIN` 为您的实际域名：
   ```env
   DOMAIN=your-domain.com
   CADDY_EMAIL=admin@your-domain.com
   ```

2. **启动服务**

   ```bash
   docker-compose up -d
   ```

   Caddy 会自动申请和配置 TLS 证书。

### 本地开发

如果您想进行本地开发，需要安装 Node.js >= 18.0.0：

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 🎯 功能特性

### ✅ 已完成功能

- **项目基础架构**
  - React + TypeScript + Vite 项目配置
  - Tailwind CSS + shadcn/ui 组件库集成
  - 路由和布局系统
  - Zustand 状态管理

- **UI组件系统**
  - 基础组件：Button, Input, Card, Dialog, Select, Switch, Slider, Tabs, Badge等
  - 复杂组件：Header, Sidebar, Toast消息提示
  - 响应式设计支持
  - 主题切换（浅色/深色/跟随系统）

- **页面结构**
  - 首页：功能介绍和快速开始
  - 设置页面：设备配置、音视频设置、通用设置
  - 音视频通话页面：基础布局和控制界面

- **状态管理**
  - 应用状态：用户信息、主题、设置
  - 通话状态：连接管理、媒体流、参与者
  - 聊天状态：消息管理、对话历史、录音状态

### 🚧 开发中功能

- **音频组件**
  - 音频输入/输出控制
  - 语音活动检测(VAD)
  - 音频波形可视化
  - 音频录制和播放

- **视频组件**
  - 摄像头画面捕获和显示
  - 视频流处理和优化
  - 屏幕共享功能
  - 视频质量控制

- **聊天组件**
  - 消息列表和输入框
  - 语音消息录制和发送
  - 实时对话显示
  - 消息历史管理

- **智谱Realtime API集成**
  - WebSocket连接管理
  - 实时音视频流处理
  - AI对话交互
  - 错误处理和重连机制

### 📋 待开发功能

- **移动端适配优化**
- **Docker容器化配置**
- **单元测试和E2E测试**
- **性能优化和代码分割**
- **国际化支持**
- **更多AI模型配置选项**

## 📁 项目结构

```
realtime-react/
├── public/                 # 静态资源
├── src/
│   ├── components/        # 通用组件
│   │   ├── ui/           # shadcn/ui基础组件
│   │   ├── audio/        # 音频相关组件
│   │   ├── video/        # 视频相关组件
│   │   ├── chat/         # 聊天相关组件
│   │   └── layout/       # 布局组件
│   ├── pages/            # 页面组件
│   │   ├── Home/         # 首页
│   │   ├── Settings/     # 设置页面
│   │   └── AudioVideoCall/ # 音视频通话页面
│   ├── hooks/            # 自定义Hooks
│   ├── stores/           # Zustand状态管理
│   ├── services/         # API服务
│   ├── utils/            # 工具函数
│   ├── types/            # TypeScript类型定义
│   └── styles/           # 样式文件
├── docs/                 # 项目文档
├── .env                  # 环境变量配置
├── docker-compose.yml    # Docker Compose 配置
├── Dockerfile            # Docker 镜像构建配置
├── Caddyfile             # Caddy 服务器配置
└── package.json
```

## ⚙️ 部署配置说明

### 核心配置文件

- **.env**: 环境变量配置
  - `DOMAIN`: 对外暴露的域名
  - `CADDY_EMAIL`: TLS 证书申请邮箱

- **docker-compose.yml**: 容器编排配置
  - 定义前端应用服务
  - 包含健康检查和自动重启
  - 自动加载环境变量

- **Dockerfile**: 容器镜像构建配置
  - 多阶段构建（构建阶段 + Caddy 运行阶段）
  - 自动化构建流程

- **Caddyfile**: Web 服务器配置
  - 静态文件服务
  - SPA 路由支持
  - 自动 HTTPS
  - 安全头部配置

### 部署优势

- 🔧 **零配置部署**: 只需 .env 和 docker-compose.yml
- 🚀 **一键启动**: `docker-compose up -d`
- 🔒 **自动 HTTPS**: Caddy 自动申请和续期证书
- 📱 **响应式设计**: 支持移动端和桌面端
- 🏥 **健康检查**: 自动监控服务状态
- 🔄 **自动重启**: 服务异常时自动恢复

## 🛠️ 开发脚本

```bash
# 开发
npm run dev          # 启动开发服务器
npm run preview      # 预览生产版本

# 代码质量
npm run lint         # ESLint检查
npm run lint:fix     # 自动修复ESLint问题
npm run type-check   # TypeScript类型检查
npm run format       # Prettier格式化
npm run format:check # 检查格式

# 测试
npm run test         # 运行测试
npm run test:watch   # 监听模式测试
npm run test:coverage # 测试覆盖率
```

## 🎨 设计规范

### 主题系统
- 支持浅色、深色、跟随系统三种主题
- 使用CSS变量实现主题切换
- 响应式设计，适配移动端和桌面端

### 组件规范
- 基于shadcn/ui组件库构建
- 统一的设计语言和交互模式
- 完整的TypeScript类型支持
- 可访问性(a11y)支持

### 代码规范
- 使用ESLint + Prettier保证代码质量
- TypeScript严格模式
- 组件和Hook的命名规范
- 详细的注释和文档

## 📚 相关文档

- [完整重构方案](./docs/realtime-react-refactor-plan.md)
- [智谱AI Realtime API文档](https://open.bigmodel.cn/dev/api#realtime)
- [shadcn/ui组件库文档](https://ui.shadcn.com/)
- [Tailwind CSS文档](https://tailwindcss.com/docs)

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [智谱AI](https://zhipuai.cn/) - 提供强大的Realtime API
- [shadcn/ui](https://ui.shadcn.com/) - 优秀的React组件库
- [Tailwind CSS](https://tailwindcss.com/) - 现代化的CSS框架
- [Vite](https://vitejs.dev/) - 快速的前端构建工具