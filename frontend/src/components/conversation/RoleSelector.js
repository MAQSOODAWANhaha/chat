import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { ROLES } from "@/config/defaults";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
export function RoleSelector({ conversationId, currentRoleId, onSelectRole }) {
    const { updateConversationRole } = useAppStore();
    const handleSelect = (roleId) => {
        if (onSelectRole) {
            onSelectRole(roleId);
        }
        else if (conversationId) {
            updateConversationRole(conversationId, roleId);
        }
    };
    return (_jsx("div", { className: "grid gap-3", children: ROLES.map((role) => (_jsxs("button", { className: cn("flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition", currentRoleId === role.id && "border-primary bg-primary/10"), onClick: () => handleSelect(role.id), children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold text-foreground", children: [role.avatar, " ", role.name] }), _jsx("p", { className: "text-xs text-muted-foreground", children: role.description })] }), _jsx("div", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: role.tags.map((tag) => (_jsx("span", { className: "rounded-full bg-muted px-2 py-0.5", children: tag }, tag))) })] }, role.id))) }));
}
