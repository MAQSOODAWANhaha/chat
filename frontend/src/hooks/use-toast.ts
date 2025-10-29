import { useCallback } from "react";

import { ToastVariant, useToastStore } from "@/store/useToastStore";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export function useToast() {
  const showToast = useToastStore((state) => state.showToast);
  const dismissToast = useToastStore((state) => state.dismissToast);

  const toast = useCallback(
    ({ title, description, variant = "default", duration = 4000 }: ToastOptions) => {
      const id = showToast({ title, description, variant });
      if (duration > 0) {
        setTimeout(() => dismissToast(id), duration);
      }
      if (variant === "destructive") {
        console.error(description ? `${title}: ${description}` : title);
      }
    },
    [dismissToast, showToast]
  );

  return { toast, dismissToast };
}

export { useToastStore };
