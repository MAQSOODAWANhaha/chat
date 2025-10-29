import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Switch } from "@/components/ui/switch";
export function OutputToggle({ label, description, value, onChange }) {
    return (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border bg-background/80 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-foreground", children: label }), _jsx("p", { className: "text-xs text-muted-foreground", children: description })] }), _jsx(Switch, { checked: value, onCheckedChange: onChange })] }));
}
