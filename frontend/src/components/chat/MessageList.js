import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
export function MessageList({ conversation }) {
    const bottomRef = useRef(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversation.messages.length]);
    return (_jsxs("div", { className: "flex-1 space-y-4 overflow-y-auto px-6 py-6", children: [conversation.messages.map((message) => (_jsx(MessageBubble, { message: message, showText: conversation.settings.showText, playAudio: conversation.settings.playAudio }, message.id))), _jsx("div", { ref: bottomRef })] }));
}
