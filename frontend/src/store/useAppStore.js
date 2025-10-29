import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_OUTPUT_SETTINGS, ROLES } from "@/config/defaults";
const withTimestamps = (conversation) => ({
    ...conversation,
    createdAt: new Date(conversation.createdAt),
    updatedAt: new Date(conversation.updatedAt),
    messages: conversation.messages.map((message) => ({
        ...message,
        timestamp: new Date(message.timestamp),
    })),
});
export const useAppStore = create((set, get) => ({
    conversations: [],
    activeConversationId: null,
    isLoading: false,
    isSidebarOpen: false,
    isSettingsOpen: false,
    isRecording: false,
    playingMessageId: null,
    draftRoleId: ROLES[0]?.id ?? "general",
    draftSettings: { ...DEFAULT_OUTPUT_SETTINGS },
    createConversation: (roleId, settings) => {
        let newConversationId = "";
        set((state) => {
            const now = new Date();
            const resolvedRoleId = roleId ?? get().draftRoleId;
            const configuredSettings = {
                ...DEFAULT_OUTPUT_SETTINGS,
                ...get().draftSettings,
                ...settings,
            };
            const newConversation = {
                id: uuidv4(),
                title: "新对话",
                roleId: resolvedRoleId,
                messages: [],
                settings: configuredSettings,
                createdAt: now,
                updatedAt: now,
            };
            newConversationId = newConversation.id;
            return {
                conversations: [...state.conversations, newConversation],
                activeConversationId: newConversation.id,
                draftRoleId: resolvedRoleId,
                draftSettings: configuredSettings,
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
                const title = conversation.messages.length === 0 && message.role === "user"
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
            conversations: state.conversations.map((conversation) => conversation.id === conversationId
                ? {
                    ...conversation,
                    settings: { ...conversation.settings, ...settings },
                    updatedAt: new Date(),
                }
                : conversation),
        }));
    },
    updateConversationRole: (conversationId, roleId) => {
        set((state) => ({
            conversations: state.conversations.map((conversation) => conversation.id === conversationId
                ? {
                    ...conversation,
                    roleId,
                    updatedAt: new Date(),
                }
                : conversation),
        }));
    },
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (open) => set({ isSidebarOpen: open }),
    toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
    setSettingsOpen: (open) => set({ isSettingsOpen: open }),
    setLoading: (loading) => set({ isLoading: loading }),
    setRecording: (recording) => set({ isRecording: recording }),
    setPlayingMessage: (messageId) => set({ playingMessageId: messageId }),
    getActiveConversation: () => {
        const state = get();
        const active = state.conversations.find((conversation) => conversation.id === state.activeConversationId);
        return active ? withTimestamps(active) : null;
    },
    getRole: (roleId) => ROLES.find((role) => role.id === roleId),
    setDraftRole: (roleId) => set({ draftRoleId: roleId }),
    setDraftSettings: (settings) => set((state) => ({
        draftSettings: { ...state.draftSettings, ...settings },
    })),
}));
