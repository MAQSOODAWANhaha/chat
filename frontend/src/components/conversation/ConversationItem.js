import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
export function ConversationItem({ title, roleId, updatedAt, active, onSelect, }) {
    const { getRole } = useAppStore();
    const role = getRole(roleId);
    return (_jsxs("button", { onClick: onSelect, className: cn("flex w-full items-center justify-between rounded-xl border border-transparent bg-card px-3 py-3 text-left transition hover:border-primary/60 hover:bg-primary/5", active && "border-primary bg-primary/10"), children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-sm font-semibold text-foreground", children: title }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [role?.avatar, " ", role?.name || "未知角色"] })] }), _jsx("span", { className: "text-xs text-muted-foreground", children: updatedAt })] }));
}
