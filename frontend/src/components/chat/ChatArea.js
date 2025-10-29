import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MessageList } from "@/components/chat/MessageList";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useAppStore } from "@/store/useAppStore";
export function ChatArea() {
    const { getActiveConversation, isLoading } = useAppStore();
    const conversation = getActiveConversation();
    if (!conversation) {
        return (_jsxs("div", { className: "flex flex-1 flex-col items-center justify-center gap-2", children: [_jsx("h2", { className: "text-lg font-semibold", children: "\u6B22\u8FCE\u4F7F\u7528\u8BED\u8A00\u5BF9\u8BDD\u5E73\u53F0" }), _jsx("p", { className: "max-w-md text-center text-sm text-muted-foreground", children: "\u521B\u5EFA\u4E00\u4E2A\u65B0\u7684\u4F1A\u8BDD\u6216\u4ECE\u5217\u8868\u4E2D\u9009\u62E9\u5DF2\u6709\u4F1A\u8BDD\uFF0C\u5F00\u59CB\u4E0E AI \u89D2\u8272\u7684\u591A\u8BED\u8A00\u4EA4\u6D41\u3002" })] }));
    }
    return (_jsxs("div", { className: "flex flex-1 flex-col overflow-hidden", children: [_jsx("div", { className: "flex items-center justify-between border-b border-border bg-card px-6 py-4", children: _jsxs("div", { children: [_jsx("p", { className: "text-base font-semibold", children: conversation.title || "新对话" }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["\u5F53\u524D\u89D2\u8272\uFF1A", conversation.roleId.toUpperCase(), " \u00B7 \u8F93\u51FA\u8BED\u8A00\uFF1A", conversation.settings.language.toUpperCase()] })] }) }), _jsx(MessageList, { conversation: conversation }), isLoading ? _jsx(TypingIndicator, {}) : null] }));
}
