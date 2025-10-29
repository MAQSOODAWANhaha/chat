import { useCallback } from "react";
import { useToastStore } from "@/store/useToastStore";
export function useToast() {
    const showToast = useToastStore((state) => state.showToast);
    const dismissToast = useToastStore((state) => state.dismissToast);
    const toast = useCallback(({ title, description, variant = "default", duration = 4000 }) => {
        const id = showToast({ title, description, variant });
        if (duration > 0) {
            setTimeout(() => dismissToast(id), duration);
        }
        if (variant === "destructive") {
            console.error(description ? `${title}: ${description}` : title);
        }
    }, [dismissToast, showToast]);
    return { toast, dismissToast };
}
export { useToastStore };
