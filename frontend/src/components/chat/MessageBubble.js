import { jsx as _jsx } from "react/jsx-runtime";
import { AssistantMessage } from "@/components/chat/AssistantMessage";
import { UserMessage } from "@/components/chat/UserMessage";
export function MessageBubble({ message, showText, playAudio }) {
    if (message.role === "assistant") {
        return _jsx(AssistantMessage, { message: message, showText: showText, playAudio: playAudio });
    }
    if (message.role === "user") {
        return _jsx(UserMessage, { message: message });
    }
    return null;
}
