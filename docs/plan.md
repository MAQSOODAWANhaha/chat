# 语言对话平台 - 详细设计文档

**版本：** v2.0  
**日期：** 2025-10-29  
**文档类型：** 详细设计文档（DDD）  
**基于需求：** PRD v2.0

---

## 目录

1. [技术架构](#1-技术架构)
2. [技术栈详解](#2-技术栈详解)
3. [数据模型设计](#3-数据模型设计)
4. [API 接口设计](#4-api-接口设计)
5. [前端设计](#5-前端设计)
6. [后端设计](#6-后端设计)
7. [项目结构](#7-项目结构)
8. [关键流程设计](#8-关键流程设计)
9. [部署方案](#9-部署方案)
10. [开发规范](#10-开发规范)

---

## 1. 技术架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层 (Frontend)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    React + TS + Zustand                              │   │
│  │    (管理UI状态, 处理WebSocket连接)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    ↓ ↑ WebSocket (实时双向通信)
┌─────────────────────────────────────────────────────────────┐
│                  后端网关层 (Backend Gateway)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Axum Web Server                         │   │
│  │  • 管理与客户端的 WebSocket 连接                     │   │
│  │  • 作为代理连接到第三方实时语音服务                  │   │
│  │  • 转发与转换消息                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    ↓ ↑ WebSocket (实时双向通信)
┌─────────────────────────────────────────────────────────────┐
│                   第三方实时语音服务层                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         豆包端到端实时语音大模型 API                 │   │
│  │         (处理 STT -> LLM -> TTS)                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 数据流向

整体交互基于持久化的 WebSocket 连接和异步事件驱动。

```
客户端                                后端 (Axum Gateway)                   豆包 Realtime API
   |                                       |
   | 1. 发起 WebSocket 连接到 /api/chat  |
   ├──────────────────────────────────────>|
   |                                       | 2. 验证通过, 建立与豆包API的WS连接
   |                                       ├───────────────────────────────────>
   |                                       |
   | <───────────────────────────────────┤ 3. 连接成功, 双向代理已就绪
   |                                       |
   | 4. 发送 StartSession 事件 (JSON)       |
   ├──────────────────────────────────────>| 5. 转发 StartSession
   |                                       ├───────────────────────────────────>
   |                                       |
   | <───────────────────────────────────┤ 6. 收到 SessionStarted, 转发给客户端
   | <─────────────────────────────────────┤
   |                                       |
   | 7. 发送音频流 (Binary)                 |
   ├──────────────────────────────────────>| 8. 转发音频流
   |                                       ├───────────────────────────────────>
   |                                       |
   |                                       |             +--------------------+
   |                                       |             |   ASR -> LLM -> TTS  |
   |                                       |             +--------------------+
   |                                       |
   | <───────────────────────────────────┤ 9. 收到 ASR/TTS/Chat 事件
   | <─────────────────────────────────────┤ 10. 转发事件给客户端 (JSON / Binary)
   |                                       |
   | 11. 客户端渲染识别文本、播放音频       |
   |                                       |

```

#### 1.2.3 对话管理流程
```
新建对话 → 前端创建 Conversation 对象 → 存入 State
切换对话 → 更新 activeConversationId → 渲染对应历史
刷新页面 → State 清空 → 重新初始化
```

---

## 2. 技术栈详解

### 2.1 前端技术栈

```json
{
  "核心框架": {
    "React": "^18.2.0",
    "TypeScript": "^5.3.0",
    "Vite": "^5.0.0"
  },
  "UI 框架": {
    "shadcn/ui": "latest",
    "Radix UI": "^1.0.0",
    "Tailwind CSS": "^3.4.0",
    "lucide-react": "^0.294.0"
  },
  "状态管理": {
    "Zustand": "^4.4.0"
  },
  "HTTP 客户端": {
    "axios": "^1.6.0"
  },
  "工具库": {
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "date-fns": "^2.30.0",
    "uuid": "^9.0.0"
  }
}
```

**shadcn/ui 组件使用清单**：
- `Button` - 按钮
- `Input` - 输入框
- `Textarea` - 多行输入
- `Select` - 下拉选择
- `Switch` - 开关
- `ScrollArea` - 滚动区域
- `Dialog` - 对话框
- `Sheet` - 侧边栏
- `Avatar` - 头像
- `Separator` - 分割线
- `DropdownMenu` - 下拉菜单
- `Tooltip` - 提示信息

### 2.2 后端技术栈

```toml
[dependencies]
# Web 框架与 WebSocket
axum = { version = "0.8", features = ["ws", "macros"] } # 启用 ws 特性
tokio = { version = "1", features = ["full"] }
tower = "0.5"
tower-http = { version = "0.6", features = ["cors", "trace", "fs"] }

# WebSocket 客户端
tokio-tungstenite = { version = "0.23", features = ["native-tls"] }

# 序列化
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# 工具库
uuid = { version = "1.18", features = ["v4", "serde"] }
futures = "0.3"

# 配置和环境变量
dotenvy = "0.15"

# 日志
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# 错误处理
thiserror = "2.0"
anyhow = "1.0"
```

---

## 3. 数据模型设计

### 3.1 前端数据模型

#### 3.1.1 核心类型定义

```typescript
// types/conversation.ts

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system';

/** 支持的语言 */
export type Language = 'en' | 'zh';

/** 消息对象 */
export interface Message {
  id: string;                    // UUID
  role: MessageRole;             // 消息角色
  content: string;               // 文字内容
  audioUrl?: string;             // 音频 URL（仅 assistant）
  timestamp: Date;               // 时间戳
}

/** 输出配置 */
export interface OutputSettings {
  language: Language;            // 输出语言
  showText: boolean;             // 是否显示文字
  playAudio: boolean;            // 是否播放语音
}

/** 对话会话 */
export interface Conversation {
  id: string;                    // UUID
  title: string;                 // 对话标题
  roleId: string;                // 当前角色 ID
  messages: Message[];           // 消息列表
  settings: OutputSettings;      // 输出配置
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 最后更新时间
}

/** AI 角色 */
export interface Role {
  id: string;                    // 角色 ID
  name: string;                  // 角色名称
  avatar: string;                // 头像 emoji
  description: string;           // 角色描述
  personality: string;           // 性格特点
  systemPrompt: string;          // 系统提示词
  tags: string[];                // 标签
}

/** 应用状态 */
export interface AppState {
  // 对话管理
  conversations: Conversation[];
  activeConversationId: string | null;
  
  // UI 状态
  isLoading: boolean;
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  
  // 录音状态
  isRecording: boolean;
  
  // 音频播放状态
  playingMessageId: string | null;
}
```

#### 3.1.2 默认配置

```typescript
// config/defaults.ts

export const DEFAULT_OUTPUT_SETTINGS: OutputSettings = {
  language: 'en',
  showText: true,
  playAudio: true,
};

export const ROLES: Role[] = [
  {
    id: 'general',
    name: 'Jordan',
    avatar: '🤖',
    description: '友好的通用对话助手',
    personality: '友好、耐心、乐于助人',
    systemPrompt: 'You are Jordan, a friendly and helpful AI assistant. You can communicate in multiple languages fluently. Be warm, patient, and adapt to the user\'s needs.',
    tags: ['通用', '友好'],
  },
  {
    id: 'teacher',
    name: 'Ms. Johnson',
    avatar: '👩‍🏫',
    description: '专业语言教师',
    personality: '专业、细致、鼓励型',
    systemPrompt: 'You are a professional language teacher. Correct grammar and pronunciation gently, provide explanations, and encourage learners. Give positive feedback.',
    tags: ['教学', '纠错'],
  },
  {
    id: 'business',
    name: 'Mr. Anderson',
    avatar: '👔',
    description: '商务对话专家',
    personality: '正式、专业、高效',
    systemPrompt: 'You are a business consultant. Use professional, formal language. Simulate business meetings, interviews, negotiations. Be concise and efficient.',
    tags: ['商务', '正式'],
  },
  {
    id: 'friend',
    name: 'Alex',
    avatar: '😊',
    description: '轻松的聊天伙伴',
    personality: '轻松、幽默、随和',
    systemPrompt: 'You are a friendly chat partner. Be casual, humorous, and relaxed. Use everyday language and make the conversation fun and engaging.',
    tags: ['聊天', '轻松'],
  },
  {
    id: 'travel',
    name: 'Marco',
    avatar: '🌍',
    description: '热情的旅游向导',
    personality: '热情、博学、实用',
    systemPrompt: 'You are an enthusiastic travel guide. Share practical travel tips, cultural insights, and useful phrases. Be energetic and helpful.',
    tags: ['旅游', '文化'],
  },
];
```

### 3.2 后端数据模型

由于核心交互变为 WebSocket，后端的 HTTP 数据模型将大幅简化，主要为 WebSocket 消息定义。

```rust
// src/models/realtime.rs

use serde::{Deserialize, Serialize};

/// 客户端通过 WebSocket 发送给后端的消息
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "event", content = "payload")]
pub enum ClientMessage {
    StartSession { role_id: String, language: String },
    AudioData(Vec<u8>), // 二进制音频数据将直接在WebSocket消息中传输
    TextInput { text: String },
    FinishSession,
}

/// 后端通过 WebSocket 发送给客户端的消息
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "event", content = "payload")]
pub enum ServerMessage {
    SessionStarted { session_id: String },
    SessionFailed { error: String },
    ASRResult { text: String, is_final: bool },
    LLMResponse { text: String },
    AudioData(Vec<u8>), // 二进制音频数据
    SessionFinished,
    Error { message: String },
}
```

---

## 4. API 接口设计

原有的 REST API 模式被新的实时 WebSocket API 取代。

### 4.1 核心接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/chat` | **WebSocket 升级点**。客户端通过此路径建立与后端网关的 WebSocket 连接。 |
| GET | `/health` | 健康检查 (保留) |

### 4.2 WebSocket 通信协议

一旦连接建立，前后端将通过 JSON 格式的文本消息和原始二进制消息进行通信。

#### 4.2.1 客户端 -> 后端

客户端发送 JSON 消息来控制会话和发送文本。

- **开始会话**: `{"event":"StartSession","payload":{"role_id":"general","language":"zh"}}`
- **发送文本**: `{"event":"TextInput","payload":{"text":"你好"}}`
- **结束会话**: `{"event":"FinishSession"}`
- **发送音频**: 客户端直接发送**二进制 (Binary)** 格式的音频数据帧。

#### 4.2.2 后端 -> 客户端

后端将第三方服务的事件转发或转换为统一格式发送给客户端。

- **会话成功**: `{"event":"SessionStarted","payload":{"session_id":"..."}}`
- **识别结果**: `{"event":"ASRResult","payload":{"text":"你好","is_final":false}}`
- **AI 回复文本**: `{"event":"LLMResponse","payload":{"text":"你好啊！"}}`
- **收到音频**: 后端直接转发**二进制 (Binary)** 格式的音频数据帧给客户端。
- **错误**: `{"event":"Error","payload":{"message":"..."}}`

---

## 5. 前端设计

### 5.1 状态管理（Zustand）

```typescript
// store/useAppStore.ts

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message, Role, OutputSettings } from '@/types';
import { DEFAULT_OUTPUT_SETTINGS, ROLES } from '@/config/defaults';

interface AppStore extends AppState {
  // Actions - 对话管理
  createConversation: (roleId: string, settings?: OutputSettings) => void;
  switchConversation: (conversationId: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateConversationRole: (conversationId: string, roleId: string) => void;
  
  // Actions - UI
  toggleSidebar: () => void;
  toggleSettings: () => void;
  setLoading: (loading: boolean) => void;
  setRecording: (recording: boolean) => void;
  setPlayingMessage: (messageId: string | null) => void;
  
  // Getters
  getActiveConversation: () => Conversation | null;
  getRole: (roleId: string) => Role | undefined;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial State
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  isSidebarOpen: true,
  isSettingsOpen: false,
  isRecording: false,
  playingMessageId: null,
  
  // Actions
  createConversation: (roleId, settings = DEFAULT_OUTPUT_SETTINGS) => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title: '新对话',
      roleId,
      messages: [],
      settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    set((state) => ({
      conversations: [...state.conversations, newConversation],
      activeConversationId: newConversation.id,
    }));
  },
  
  switchConversation: (conversationId) => {
    set({ activeConversationId: conversationId });
  },
  
  addMessage: (conversationId, message) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, message],
              updatedAt: new Date(),
              title: conv.messages.length === 0 
                ? message.content.slice(0, 30) 
                : conv.title,
            }
          : conv
      ),
    }));
  },
  
  updateConversationRole: (conversationId, roleId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, roleId, updatedAt: new Date() }
          : conv
      ),
    }));
  },
  
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  setLoading: (loading) => set({ isLoading: loading }),
  setRecording: (recording) => set({ isRecording: recording }),
  setPlayingMessage: (messageId) => set({ playingMessageId: messageId }),
  
  // Getters
  getActiveConversation: () => {
    const state = get();
    return state.conversations.find((c) => c.id === state.activeConversationId) || null;
  },
  
  getRole: (roleId) => {
    return ROLES.find((r) => r.id === roleId);
  },
}));
```

### 5.2 组件结构

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx              # 左侧对话列表
│   │   ├── Header.tsx               # 顶部导航栏
│   │   └── MainLayout.tsx           # 主布局
│   ├── conversation/
│   │   ├── ConversationList.tsx     # 对话列表
│   │   ├── ConversationItem.tsx     # 对话项
│   │   ├── NewConversationDialog.tsx # 新建对话对话框
│   │   └── RoleSelector.tsx         # 角色选择器
│   ├── chat/
│   │   ├── ChatArea.tsx             # 聊天区域容器
│   │   ├── MessageList.tsx          # 消息列表
│   │   ├── MessageBubble.tsx        # 消息气泡
│   │   ├── UserMessage.tsx          # 用户消息
│   │   ├── AssistantMessage.tsx     # AI 消息
│   │   ├── AudioPlayer.tsx          # 音频播放器
│   │   └── TypingIndicator.tsx      # 输入中指示器
│   ├── input/
│   │   ├── InputArea.tsx            # 输入区域容器
│   │   ├── TextInput.tsx            # 文字输入框
│   │   ├── VoiceButton.tsx          # 语音录制按钮
│   │   └── SendButton.tsx           # 发送按钮
│   ├── settings/
│   │   ├── SettingsPanel.tsx        # 设置面板
│   │   ├── LanguageSelector.tsx     # 语言选择
│   │   └── OutputToggle.tsx         # 输出开关
│   └── ui/
│       └── [shadcn components]      # shadcn/ui 组件
```

### 5.3 关键组件实现

#### 5.3.1 MessageBubble 组件

```typescript
// components/chat/MessageBubble.tsx

import { Message } from '@/types';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';

interface MessageBubbleProps {
  message: Message;
  showText: boolean;
  playAudio: boolean;
}

export function MessageBubble({ message, showText, playAudio }: MessageBubbleProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  }
  
  if (message.role === 'assistant') {
    return (
      <AssistantMessage 
        message={message}
        showText={showText}
        playAudio={playAudio}
      />
    );
  }
  
  return null;
}
```

#### 5.3.2 AssistantMessage 组件

```typescript
// components/chat/AssistantMessage.tsx

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AudioPlayer } from './AudioPlayer';
import { Message } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { format } from 'date-fns';

interface AssistantMessageProps {
  message: Message;
  showText: boolean;
  playAudio: boolean;
}

export function AssistantMessage({ 
  message, 
  showText, 
  playAudio 
}: AssistantMessageProps) {
  const { getActiveConversation, getRole } = useAppStore();
  const conversation = getActiveConversation();
  const role = conversation ? getRole(conversation.roleId) : null;
  
  return (
    <div className="flex items-start gap-3 max-w-[80%]">
      <Avatar className="h-8 w-8 mt-1">
        <AvatarFallback>{role?.avatar || '🤖'}</AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col gap-2 flex-1">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          {/* 音频播放器 */}
          {playAudio && message.audioUrl && (
            <AudioPlayer 
              messageId={message.id}
              audioUrl={message.audioUrl}
            />
          )}
          
          {/* 文字内容 */}
          {showText && (
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {message.content}
            </p>
          )}
        </div>
        
        <span className="text-xs text-gray-400 px-2">
          {format(message.timestamp, 'HH:mm')}
        </span>
      </div>
    </div>
  );
}
```

#### 5.3.3 AudioPlayer 组件

```typescript
// components/chat/AudioPlayer.tsx

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface AudioPlayerProps {
  messageId: string;
  audioUrl: string;
}

export function AudioPlayer({ messageId, audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { playingMessageId, setPlayingMessage } = useAppStore();
  
  useEffect(() => {
    // 如果其他音频正在播放，停止当前音频
    if (playingMessageId !== messageId && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [playingMessageId, messageId, isPlaying]);
  
  const togglePlayback = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlayingMessage(null);
      };
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setPlayingMessage(null);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      setPlayingMessage(messageId);
    }
  };
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 mb-2">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30"
        onClick={togglePlayback}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 text-white" />
        ) : (
          <Play className="h-4 w-4 text-white" />
        )}
      </Button>
      
      <div className="flex-1 flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-white/60 rounded-full transition-all ${
              isPlaying ? 'animate-pulse' : ''
            }`}
            style={{
              height: `${12 + Math.random() * 12}px`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

#### 5.3.4 VoiceButton 组件

```typescript
// components/input/VoiceButton.tsx

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface VoiceButtonProps {
  onTranscribed: (text: string) => void;
}

export function VoiceButton({ onTranscribed }: VoiceButtonProps) {
  const { isRecording, setRecording } = useAppStore();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: '录音失败',
        description: '请检查麦克风权限',
        variant: 'destructive',
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };
  
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await api.speechToText(formData);
      onTranscribed(response.text);
    } catch (error) {
      console.error('Transcription failed:', error);
      toast({
        title: '识别失败',
        description: '语音识别失败，请重试',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Button
      size="icon"
      variant={isRecording ? 'destructive' : 'ghost'}
      className={isRecording ? 'animate-pulse' : ''}
      onClick={isRecording ? stopRecording : startRecording}
    >
      {isRecording ? (
        <Square className="h-5 w-5" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}
```

### 5.4 API Service

```typescript
// services/api.ts

import axios, { AxiosInstance } from 'axios';
import { ChatRequest, ChatResponse, STTResponse } from '@/types/api';

class ApiService {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>('/api/chat', request);
    return response.data;
  }
  
  async speechToText(formData: FormData): Promise<STTResponse> {
    const response = await this.client.post<STTResponse>(
      '/api/speech-to-text',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }
}

export const api = new ApiService();
```

---

## 6. 后端设计 (WebSocket 网关)

原有的 RESTful 服务 (LLM, TTS, STT) 被统一的 WebSocket 网关取代。后端的核心职责是作为一个安全的、有状态的代理，连接前端客户端和后端的实时语音服务。

### 6.1 项目结构 (新)

```
backend/
├── src/
│   ├── main.rs                 # 入口文件
│   ├── config.rs               # 配置管理
│   ├── error.rs                # 错误处理
│   ├── models.rs               # 前后端 WebSocket 消息模型
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── health.rs           # 健康检查
│   │   └── websocket.rs        # WebSocket 网关核心逻辑
│   └── services/
│       ├── mod.rs
│       └── realtime_api.rs     # 封装与第三方实时语音服务的交互
├── .env
└── Cargo.toml
```

### 6.2 主文件实现 (main.rs)

`main.rs` 的职责是初始化配置、设置路由（包含 WebSocket 升级路由），并启动服务。

```rust
// src/main.rs

use axum::{
    routing::get,
    Router,
};
use std::sync::Arc;
use tower_http::{cors::{Any, CorsLayer}, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod error;
mod handlers;
mod models;
mod services;

use config::Config;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
}

#[tokio::main]
async fn main() {
    // 初始化日志和配置
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "backend=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();
    
    dotenvy::dotenv().ok();
    let config = Arc::new(Config::from_env());
    
    let state = AppState { config };

    // 静态文件服务 (如果存在)
    let static_service = // ... (省略，与之前相同)

    // 创建路由
    let mut app = Router::new()
        .route("/api/chat", get(handlers::websocket::websocket_handler)) // WebSocket 路由
        .route("/health", get(handlers::health::health_handler))
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    if let Some(service) = static_service {
        app = app.fallback_service(service);
    }
    
    // 启动服务器
    let addr = format!("{}:{}", "0.0.0.0", 3000);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    tracing::info!("Server running on http://{}", addr);
    axum::serve(listener, app).await.unwrap();
}
```

### 6.3 WebSocket 网关处理器

这是新架构的核心。它处理来自客户端的 WebSocket 连接，并作为代理与第三方实时语音服务进行双向通信。

```rust
// src/handlers/websocket.rs

use axum::{
    extract::{ws::{Message, WebSocket}, State, WebSocketUpgrade},
    response::IntoResponse,
};
use futures::{sink::SinkExt, stream::StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, tungstenite, MaybeTlsStream, WebSocketStream};

use crate::{AppState, services::realtime_api};

// 当客户端连接时，此函数被调用
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

// 核心代理逻辑
async fn handle_socket(client_socket: WebSocket, state: AppState) {
    // 1. 连接到后端的豆包实时语音服务
    let upstream_url = "wss://openspeech.bytedance.com/api/v3/realtime/dialogue";
    let (upstream_socket, _response) = match connect_async(upstream_url).await {
        Ok(connection) => connection,
        Err(e) => {
            tracing::error!("Failed to connect to upstream service: {}", e);
            return;
        }
    };

    let (mut client_sender, mut client_receiver) = client_socket.split();
    let (mut upstream_sender, mut upstream_receiver) = upstream_socket.split();

    // 2. 创建两个任务，实现双向数据转发

    // 任务1: 从客户端接收消息，转发到上游服务
    let client_to_upstream = async move {
        while let Some(Ok(msg)) = client_receiver.next().await {
            // 在这里可以对消息进行转换或检查
            // 例如，从自定义的 ClientMessage 枚举转换为第三方API要求的格式
            if upstream_sender.send(msg).await.is_err() {
                break;
            }
        }
    };

    // 任务2: 从上游服务接收消息，转发到客户端
    let upstream_to_client = async move {
        while let Some(Ok(msg)) = upstream_receiver.next().await {
            // 在这里可以对消息进行转换或解析
            // 例如，将第三方API的事件转换为 ServerMessage 枚举格式
            if client_sender.send(msg).await.is_err() {
                break;
            }
        }
    };

    // 3. 同时运行两个任务
    tokio::join!(client_to_upstream, upstream_to_client);

    tracing::info!("WebSocket connection closed.");
}
```

### 6.4 第三方服务封装

为了更好地管理与豆包 API 的交互细节（如鉴权、心跳、特定事件的构建），我们将这些逻辑封装在 `realtime_api` 服务中。

```rust
// src/services/realtime_api.rs

use anyhow::Result;
use tokio_tungstenite::tungstenite::Message;

/// 构建 StartSession 事件
pub fn build_start_session_message(session_id: &str, role_id: &str) -> Result<Message> {
    // 根据文档，构建包含角色、模型等信息的 JSON payload
    let payload = serde_json::json!({
        "asr": { /* ... */ },
        "dialog": {
            "dialog_id": session_id,
            "bot_name": "豆包", // 或根据 role_id 动态设置
            // ... 其他根据文档和 role_id 设置的参数
        },
        "extra": {
            "model": "O" // 或 "SC"
        }
    });

    // 根据文档的二进制协议，将 JSON 封装成一个 WebSocket Message
    // 此处为伪代码，实际需要操作字节来构建 header 和 payload
    let binary_frame = assemble_binary_frame(100, session_id, &payload.to_string())?;
    Ok(Message::Binary(binary_frame))
}

/// 解析从上游收到的消息
pub fn parse_upstream_message(msg: Message) {
    // 根据文档的二进制协议解析 header 和 payload
    // 将解析出的事件和数据转换为后端的 ServerMessage 枚举
    // ...
}

// ... 其他辅助函数
fn assemble_binary_frame(event_id: u32, session_id: &str, payload: &str) -> Result<Vec<u8>> {
    // 实现文档中描述的二进制帧封装逻辑
    // ...
    Ok(vec![])
}
```

---

## 7. 项目结构

### 7.1 完整目录结构

```
language-chat-platform/
├── frontend/
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── MainLayout.tsx
│   │   │   ├── conversation/
│   │   │   │   ├── ConversationList.tsx
│   │   │   │   ├── ConversationItem.tsx
│   │   │   │   ├── NewConversationDialog.tsx
│   │   │   │   └── RoleSelector.tsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatArea.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── UserMessage.tsx
│   │   │   │   ├── AssistantMessage.tsx
│   │   │   │   ├── AudioPlayer.tsx
│   │   │   │   └── TypingIndicator.tsx
│   │   │   ├── input/
│   │   │   │   ├── InputArea.tsx
│   │   │   │   ├── TextInput.tsx
│   │   │   │   ├── VoiceButton.tsx
│   │   │   │   └── SendButton.tsx
│   │   │   ├── settings/
│   │   │   │   ├── SettingsPanel.tsx
│   │   │   │   ├── LanguageSelector.tsx
│   │   │   │   └── OutputToggle.tsx
│   │   │   └── ui/
│   │   │       └── [shadcn components]
│   │   ├── store/
│   │   │   └── useAppStore.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   ├── conversation.ts
│   │   │   └── api.ts
│   │   ├── config/
│   │   │   └── defaults.ts
│   │   ├── hooks/
│   │   │   ├── use-toast.ts
│   │   │   └── use-mobile.ts
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── components.json
│   └── index.html
│
├── backend/
│   ├── src/
│   │   ├── main.rs
│   │   ├── models.rs
│   │   ├── config.rs
│   │   ├── error.rs
│   │   ├── utils.rs
│   │   ├── handlers/
│   │   │   ├── mod.rs
│   │   │   ├── chat.rs
│   │   │   ├── stt.rs
│   │   │   └── health.rs
│   │   └── services/
│   │       ├── mod.rs
│   │       ├── llm.rs
│   │       ├── tts.rs
│   │       ├── stt.rs
│   │       └── role.rs
│   ├── audio/
│   │   └── .gitkeep
│   ├── .env
│   ├── .env.example
│   ├── Cargo.toml
│   └── Cargo.lock
│
├── .gitignore
├── README.md
├── Dockerfile
└── docker-compose.yml
```

---

## 8. 关键流程设计

### 8.1 完整对话流程

```
┌──────┐                ┌──────────┐              ┌─────────┐
│ User │                │ Frontend │              │ Backend │
└──┬───┘                └────┬─────┘              └────┬────┘
   │                         │                         │
   │  1. 输入消息/录音        │                         │
   ├────────────────────────>│                         │
   │                         │  2. 如果是语音          │
   │                         ├────────────────────────>│
   │                         │  POST /api/speech-to-text
   │                         │                         │
   │                         │<────────────────────────┤
   │                         │  {text: "..."}          │
   │                         │                         │
   │                         │  3. 发送对话请求         │
   │                         ├────────────────────────>│
   │                         │  POST /api/chat         │
   │                         │  {                      │
   │                         │    message,             │
   │                         │    history,             │
   │                         │    role_id,             │
   │                         │    language,            │
   │                         │    enable_audio         │
   │                         │  }                      │
   │                         │                         │
   │                         │                    ┌────┴────┐
   │                         │                    │ LLM     │
   │                         │                    │ Service │
   │                         │                    └────┬────┘
   │                         │                         │
   │                         │                    ┌────┴────┐
   │                         │                    │ TTS     │
   │                         │                    │ Service │
   │                         │                    └────┬────┘
   │                         │                         │
   │                         │<────────────────────────┤
   │                         │  {                      │
   │                         │    message: "...",      │
   │                         │    audio_url: "..."     │
   │                         │  }                      │
   │                         │                         │
   │  4. 显示消息和播放音频   │                         │
   │<────────────────────────┤                         │
   │                         │                         │
```

### 8.2 新建对话流程

```
用户点击"新建对话"
    ↓
打开 NewConversationDialog
    ↓
用户选择角色（从 ROLES 列表）
    ↓
用户配置输出设置（可选）
    - 输出语言
    - 显示文字
    - 播放语音
    ↓
点击"创建"
    ↓
调用 createConversation(roleId, settings)
    - 生成 UUID
    - 创建 Conversation 对象
    - 添加到 conversations 数组
    - 设置为 activeConversationId
    ↓
自动切换到新对话界面
    ↓
显示空白对话区域
```

### 8.3 角色切换流程

```
对话进行中
    ↓
用户点击"切换角色"按钮
    ↓
打开角色选择面板（RoleSelector）
    ↓
显示所有可用角色
    - 角色头像
    - 角色名称
    - 角色描述
    ↓
用户选择新角色
    ↓
调用 updateConversationRole(conversationId, newRoleId)
    - 更新对话的 roleId
    - 更新 updatedAt
    ↓
在对话中插入系统消息（可选）
    "已切换到 [新角色名称]"
    ↓
后续对话使用新角色的 system_prompt
```

---

## 9. 部署方案

### 9.1 开发环境

#### 前端
```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:5173
```

#### 后端
```bash
cd backend
mkdir audio
cargo run
# 服务运行在 http://localhost:3000
```

### 9.2 环境变量配置

#### frontend/.env
```env
VITE_API_URL=http://localhost:3000
```

#### backend/.env
```env
OPENAI_API_KEY=sk-your-api-key-here
HOST=0.0.0.0
PORT=3000
RUST_LOG=debug
```

### 9.3 生产部署（Docker）

此方案将前后端合并到一个 Docker 镜像中，由 Axum 后端统一提供服务。

#### Dockerfile (Monolithic)

在项目根目录下创建一个 `Dockerfile`，它将分阶段构建前端和后端，并组装成一个最终的镜像。

```dockerfile
# /Dockerfile

# ---- Stage 1: Build Frontend ----
# 使用 Node 镜像构建前端静态文件
FROM node:18-alpine as frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
# VITE_API_URL 在单体部署中不是必需的，因为 API 请求将是相对路径
RUN npm run build

# ---- Stage 2: Build Backend ----
# 使用 Rust 镜像编译后端应用
FROM rust:1.75 as backend
WORKDIR /app
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src
RUN cargo build --release

# ---- Stage 3: Final Image ----
# 使用一个轻量的基础镜像来构建最终产物
FROM debian:bookworm-slim
LABEL maintainer="Gemini"
LABEL description="Single container for language-chat-platform"

# 安装必要的依赖
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从后端构建阶段复制编译好的二进制文件
COPY --from=backend /app/target/release/backend .

# 从前端构建阶段复制静态文件到 /app/static 目录
COPY --from=frontend /app/dist ./static

# 创建用于存储音频文件的目录
RUN mkdir -p /app/audio

# 暴露端口
EXPOSE 3000

# 设置后端运行所需的环境变量
ENV RUST_LOG=info
ENV HOST=0.0.0.0
ENV PORT=3000
# OPENAI_API_KEY 必须在容器运行时提供

# 启动后端服务
CMD ["./backend"]
```

#### docker-compose.yml

`docker-compose.yml` 也相应简化，只需管理一个服务。

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      # 将主机的 80 端口映射到容器的 3000 端口
      - "80:3000"
    environment:
      # 从 .env 文件或环境变量中读取 OpenAI API Key
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      # 如需开启调试日志，可取消下面的注释
      # - RUST_LOG=debug
    volumes:
      # 挂载一个卷来持久化存储音频文件
      # 请确保在主机上存在 ./audio 目录
      - ./audio:/app/audio
    restart: unless-stopped
```

---

## 10. 开发规范

### 10.1 代码规范

#### 前端
- 使用 ESLint + Prettier
- 组件使用函数式组件 + Hooks
- TypeScript 严格模式
- 使用 `clsx` 和 `tailwind-merge` 处理 className

#### 后端
- 使用 `rustfmt` 格式化代码
- 使用 `clippy` 进行代码检查
- 错误处理使用 `anyhow` 或 `thiserror`
- 添加适当的日志（tracing）

### 10.2 Git Commit 规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

### 10.3 测试策略

#### 前端
- 单元测试：Vitest
- 组件测试：React Testing Library
- E2E 测试：Playwright（可选）

#### 后端
- 单元测试：`#[cfg(test)]`
- 集成测试：`tests/` 目录

---

## 附录

### A. shadcn/ui 安装命令

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add select
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tooltip
```

### B. 参考资料

- **shadcn/ui 文档**: https://ui.shadcn.com/
- **Axum 文档**: https://docs.rs/axum
- **OpenAI API**: https://platform.openai.com/docs
- **Zustand**: https://github.com/pmndrs/zustand

---

**文档状态**: ✅ 完成  
**文档版本**: v2.0  
**最后更新**: 2025-10-29
