import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { VoiceButton } from "@/components/input/VoiceButton";
import { TextInput } from "@/components/input/TextInput";
import { SendButton } from "@/components/input/SendButton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { useAppStore } from "@/store/useAppStore";
export function InputArea() {
    const [value, setValue] = useState("");
    const { toast } = useToast();
    const { getActiveConversation, addMessage, setLoading, createConversation, } = useAppStore();
    const handleSubmit = async (event) => {
        event?.preventDefault();
        let conversation = getActiveConversation();
        const content = value.trim();
        if (!conversation || !content) {
            if (!content) {
                return;
            }
            const newConversationId = createConversation("general");
            conversation =
                useAppStore
                    .getState()
                    .conversations.find((item) => item.id === newConversationId) ?? null;
            if (!conversation) {
                toast({
                    title: "创建会话失败",
                    description: "请稍后再试",
                    variant: "destructive",
                });
                return;
            }
        }
        const userMessage = {
            id: uuidv4(),
            role: "user",
            content,
            timestamp: new Date(),
        };
        addMessage(conversation.id, userMessage);
        setValue("");
        setLoading(true);
        const history = [...conversation.messages, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
        }));
        try {
            const response = await api.chat({
                message: content,
                history,
                role_id: conversation.roleId,
                language: conversation.settings.language,
                enable_audio: conversation.settings.playAudio,
            });
            const assistantMessage = {
                id: uuidv4(),
                role: "assistant",
                content: response.message,
                audioUrl: response.audio_url,
                timestamp: new Date(),
            };
            addMessage(conversation.id, assistantMessage);
        }
        catch (error) {
            console.error(error);
            toast({
                title: "发送失败",
                description: "请检查网络或稍后重试",
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleTranscribed = (text) => {
        setValue((prev) => (prev ? `${prev} ${text}` : text));
    };
    return (_jsx("form", { onSubmit: handleSubmit, className: "border-t border-border bg-card px-6 py-4", children: _jsxs("div", { className: "flex items-end gap-3", children: [_jsx(VoiceButton, { onTranscribed: handleTranscribed }), _jsx(TextInput, { value: value, onChange: setValue, onSubmit: handleSubmit }), _jsx(SendButton, { disabled: !value.trim(), onClick: () => handleSubmit() })] }) }));
}
