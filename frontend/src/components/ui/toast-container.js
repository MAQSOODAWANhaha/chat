import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/useToastStore";
const variantStyles = {
    default: "border-border bg-card text-foreground",
    success: "border-emerald-500/40 bg-emerald-500 text-white",
    destructive: "border-red-500/50 bg-red-500 text-white",
};
const iconMap = {
    default: Info,
    success: CheckCircle,
    destructive: AlertCircle,
};
export function ToastContainer() {
    const toasts = useToastStore((state) => state.toasts);
    const dismissToast = useToastStore((state) => state.dismissToast);
    return (_jsx("div", { className: "pointer-events-none fixed top-6 right-6 z-[9999] flex w-full max-w-sm flex-col gap-3", children: toasts.map((toast) => {
            const Icon = iconMap[toast.variant];
            return (_jsxs("div", { className: cn("pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 shadow-xl", variantStyles[toast.variant]), role: "status", "aria-live": "polite", children: [_jsx(Icon, { className: "mt-0.5 h-5 w-5 shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-semibold leading-tight", children: toast.title }), toast.description ? (_jsx("p", { className: "mt-1 text-xs opacity-80", children: toast.description })) : null] }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-7 w-7 rounded-full bg-black/10 text-current hover:bg-black/20", onClick: () => dismissToast(toast.id), "aria-label": "\u5173\u95ED\u901A\u77E5", children: "\u2715" })] }, toast.id));
        }) }));
}
