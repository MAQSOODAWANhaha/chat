import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/useAppStore";
import { ConversationItem } from "./ConversationItem";
export function ConversationList({ activeConversationId }) {
    const { conversations, switchConversation } = useAppStore();
    const sorted = [...conversations].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return (_jsx(ScrollArea, { className: "h-full", children: _jsxs("div", { className: "flex flex-col gap-2 pr-2", children: [sorted.map((conversation) => (_jsx(ConversationItem, { id: conversation.id, title: conversation.title || "新对话", roleId: conversation.roleId, updatedAt: format(conversation.updatedAt, "MM-dd HH:mm"), active: conversation.id === activeConversationId, onSelect: () => switchConversation(conversation.id) }, conversation.id))), sorted.length === 0 ? (_jsx("p", { className: "px-2 text-sm text-muted-foreground", children: "\u6682\u65E0\u4F1A\u8BDD\uFF0C\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u65B0\u5EFA" })) : null] }) }));
}
