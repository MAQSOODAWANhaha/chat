import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  AppState,
  Conversation,
  Message,
  OutputSettings,
  Role,
} from "@/types/conversation";
import { DEFAULT_OUTPUT_SETTINGS, ROLES } from "@/config/defaults";

interface AppStore extends AppState {
  createConversation: (roleId: string, settings?: OutputSettings) => string;
  switchConversation: (conversationId: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateConversationSettings: (
    conversationId: string,
    settings: Partial<OutputSettings>
  ) => void;
  updateConversationRole: (conversationId: string, roleId: string) => void;
  toggleSidebar: () => void;
  toggleSettings: () => void;
  setLoading: (loading: boolean) => void;
  setRecording: (recording: boolean) => void;
  setPlayingMessage: (messageId: string | null) => void;
  getActiveConversation: () => Conversation | null;
  getRole: (roleId: string) => Role | undefined;
}

const withTimestamps = (conversation: Conversation): Conversation => ({
  ...conversation,
  createdAt: new Date(conversation.createdAt),
  updatedAt: new Date(conversation.updatedAt),
  messages: conversation.messages.map((message) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  })),
});

export const useAppStore = create<AppStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  isSidebarOpen: true,
  isSettingsOpen: false,
  isRecording: false,
  playingMessageId: null,

  createConversation: (roleId, settings = DEFAULT_OUTPUT_SETTINGS) => {
    let newConversationId = "";
    set((state) => {
      const now = new Date();
      const configuredSettings: OutputSettings = {
        ...DEFAULT_OUTPUT_SETTINGS,
        ...settings,
      };

      const newConversation: Conversation = {
        id: uuidv4(),
        title: "新对话",
        roleId,
        messages: [],
        settings: configuredSettings,
        createdAt: now,
        updatedAt: now,
      };

      newConversationId = newConversation.id;

      return {
        conversations: [...state.conversations, newConversation],
        activeConversationId: newConversation.id,
      };
    });
    return newConversationId;
  },

  switchConversation: (conversationId) => set({ activeConversationId: conversationId }),

  addMessage: (conversationId, message) => {
    set((state) => ({
      conversations: state.conversations.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        const messages = [...conversation.messages, message];
        const title =
          conversation.messages.length === 0 && message.role === "user"
            ? message.content.slice(0, 30) || "新对话"
            : conversation.title;

        return {
          ...conversation,
          title,
          messages,
          updatedAt: new Date(),
        };
      }),
    }));
  },

  updateConversationSettings: (conversationId, settings) => {
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              settings: { ...conversation.settings, ...settings },
              updatedAt: new Date(),
            }
          : conversation
      ),
    }));
  },

  updateConversationRole: (conversationId, roleId) => {
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              roleId,
              updatedAt: new Date(),
            }
          : conversation
      ),
    }));
  },

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  setLoading: (loading) => set({ isLoading: loading }),

  setRecording: (recording) => set({ isRecording: recording }),

  setPlayingMessage: (messageId) => set({ playingMessageId: messageId }),

  getActiveConversation: () => {
    const state = get();
    const active = state.conversations.find(
      (conversation) => conversation.id === state.activeConversationId
    );
    return active ? withTimestamps(active) : null;
  },

  getRole: (roleId) => ROLES.find((role) => role.id === roleId),
}));
