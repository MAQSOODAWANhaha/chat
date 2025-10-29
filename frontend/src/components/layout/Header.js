import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Menu, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMobileBreakpoint } from "@/hooks/use-mobile";
import { useAppStore } from "@/store/useAppStore";
export function Header() {
    const isMobile = useMobileBreakpoint();
    const { toggleSidebar, toggleSettings, isLoading } = useAppStore();
    return (_jsxs("header", { className: "flex h-16 items-center justify-between border-b border-border bg-card px-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [isMobile ? (_jsx(Button, { variant: "ghost", size: "icon", onClick: toggleSidebar, "aria-label": "Toggle sidebar", children: _jsx(Menu, { className: "h-5 w-5" }) })) : null, _jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold", children: "\u8BED\u8A00\u5BF9\u8BDD\u5E73\u53F0" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "\u591A\u89D2\u8272\u591A\u8BED\u8A00\u7684\u5B9E\u65F6 AI \u5BF9\u8BDD\u4F53\u9A8C" })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [isLoading ? _jsx("span", { className: "text-sm text-muted-foreground", children: "\u5904\u7406\u4E2D..." }) : null, _jsx(Button, { variant: "outline", size: "icon", onClick: toggleSettings, "aria-label": "Open settings", children: _jsx(SettingsIcon, { className: "h-5 w-5" }) })] })] }));
}
