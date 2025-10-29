import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { ConversationList } from "@/components/conversation/ConversationList";
import { NewConversationDialog } from "@/components/conversation/NewConversationDialog";
import { Separator } from "@/components/ui/separator";
import { useMobileBreakpoint } from "@/hooks/use-mobile";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
export function Sidebar() {
    const isMobile = useMobileBreakpoint();
    const { isSidebarOpen, toggleSidebar, setSidebarOpen, conversations, activeConversationId, } = useAppStore();
    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
        else {
            setSidebarOpen(true);
        }
    }, [isMobile, setSidebarOpen]);
    const sidebarContent = (_jsxs("aside", { className: "flex h-full w-full flex-col gap-4 overflow-hidden bg-card p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-base font-semibold", children: "\u4F1A\u8BDD\u5217\u8868" }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["\u5F53\u524D\u5171\u6709 ", conversations.length, " \u4E2A\u4F1A\u8BDD"] })] }), _jsx(NewConversationDialog, {})] }), _jsx(Separator, {}), _jsx(ConversationList, { activeConversationId: activeConversationId, onConversationSelect: isMobile ? () => setSidebarOpen(false) : undefined })] }));
    if (isMobile) {
        return (_jsxs(_Fragment, { children: [_jsx("div", { className: cn("fixed inset-y-0 left-0 z-40 w-full max-w-[85vw] sm:max-w-sm transform bg-card shadow-lg transition-transform duration-200", isSidebarOpen ? "translate-x-0" : "-translate-x-full"), children: sidebarContent }), isSidebarOpen ? (_jsx("div", { className: "fixed inset-0 z-30 bg-black/40", onClick: toggleSidebar, role: "presentation" })) : null] }));
    }
    return _jsx("div", { className: "hidden w-80 border-r border-border lg:flex", children: sidebarContent });
}
