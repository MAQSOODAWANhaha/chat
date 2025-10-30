import { Language } from "./conversation";

export interface ChatHistoryMessage {
  role: string;
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatHistoryMessage[];
  role_id: string;
  language: Language;
  enable_audio: boolean;
}

export interface ChatResponse {
  message?: string;
  audio_url?: string;
}
