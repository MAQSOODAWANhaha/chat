import { AlertCircle, CheckCircle, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/useToastStore";

const variantStyles = {
  default: "border-border bg-card text-foreground",
  success: "border-emerald-500/40 bg-emerald-500 text-white",
  destructive: "border-red-500/50 bg-red-500 text-white",
} as const;

const iconMap = {
  default: Info,
  success: CheckCircle,
  destructive: AlertCircle,
} as const;

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return (
    <div className="pointer-events-none fixed top-6 right-6 z-[9999] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.variant];
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 shadow-xl",
              variantStyles[toast.variant]
            )}
            role="status"
            aria-live="polite"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-xs opacity-80">{toast.description}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-black/10 text-current hover:bg-black/20"
              onClick={() => dismissToast(toast.id)}
              aria-label="关闭通知"
            >
              ✕
            </Button>
          </div>
        );
      })}
    </div>
  );
}
