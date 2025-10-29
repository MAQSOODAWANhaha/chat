export type MessageRole = "user" | "assistant" | "system";

export type Language = "en" | "zh";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  audioUrl?: string;
  timestamp: Date;
}

export interface OutputSettings {
  language: Language;
  showText: boolean;
  playAudio: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  roleId: string;
  messages: Message[];
  settings: OutputSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  avatar: string;
  description: string;
  personality: string;
  systemPrompt: string;
  tags: string[];
}

export interface AppState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  isRecording: boolean;
  playingMessageId: string | null;
}
