import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
export const useToastStore = create((set) => ({
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
