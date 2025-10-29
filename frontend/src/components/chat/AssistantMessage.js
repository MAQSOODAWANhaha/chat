import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AudioPlayer } from "@/components/chat/AudioPlayer";
import { useAppStore } from "@/store/useAppStore";
export function AssistantMessage({ message, showText, playAudio }) {
    const { getActiveConversation, getRole } = useAppStore();
    const conversation = getActiveConversation();
    const role = conversation ? getRole(conversation.roleId) : null;
    return (_jsxs("div", { className: "flex max-w-[80%] items-start gap-3", children: [_jsx(Avatar, { className: "mt-1 h-8 w-8", children: _jsx(AvatarFallback, { children: role?.avatar || "🤖" }) }), _jsxs("div", { className: "flex flex-1 flex-col gap-2", children: [_jsxs("div", { className: "rounded-2xl bg-card px-4 py-3 text-sm text-foreground shadow", children: [playAudio && message.audioUrl ? (_jsx(AudioPlayer, { messageId: message.id, audioUrl: message.audioUrl })) : null, showText ? _jsx("p", { className: "whitespace-pre-wrap", children: message.content }) : null, !showText && !playAudio ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "\u8F93\u51FA\u5DF2\u7981\u7528\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u542F\u7528\u6587\u5B57\u6216\u8BED\u97F3\u3002" })) : null] }), _jsx("span", { className: "text-xs text-muted-foreground", children: format(message.timestamp, "HH:mm") })] })] }));
}
