import { create } from "zustand";

const TOAST_LIMIT = 5;

function createToast(toast) {
  return {
    id: toast.id || `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: toast.title || "Thông báo",
    description: toast.description || "",
    type: toast.type || "info",
    duration: toast.duration ?? 3000,
  };
}

const useUiStore = create((set) => ({
  sidebarOpen: false,
  toasts: [],
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  pushToast: (toast) =>
    set((state) => {
      const nextToast = createToast(toast);

      return {
        toasts: [nextToast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    }),
  removeToast: (toastId) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== toastId),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

export { TOAST_LIMIT, useUiStore };
