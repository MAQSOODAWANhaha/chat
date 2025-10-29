import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export type ToastVariant = "default" | "destructive" | "success";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id"> & { id?: string }) => string;
  dismissToast: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: ({ id = uuidv4(), title, description, variant }) => {
    set((state) => ({
      toasts: [...state.toasts, { id, title, description, variant }],
    }));
    return id;
  },
  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
  clear: () => set({ toasts: [] }),
}));
