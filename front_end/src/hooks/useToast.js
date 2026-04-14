import { useUiStore } from "../store/uiStore";

function useToast() {
  const toasts = useUiStore((state) => state.toasts);
  const pushToast = useUiStore((state) => state.pushToast);
  const removeToast = useUiStore((state) => state.removeToast);
  const clearToasts = useUiStore((state) => state.clearToasts);

  return {
    toasts,
    showToast: pushToast,
    removeToast,
    clearToasts,
    success: (description, options = {}) =>
      pushToast({
        type: "success",
        title: options.title || "Thanh cong",
        description,
        duration: options.duration,
      }),
    error: (description, options = {}) =>
      pushToast({
        type: "error",
        title: options.title || "Co loi xay ra",
        description,
        duration: options.duration,
      }),
    info: (description, options = {}) =>
      pushToast({
        type: "info",
        title: options.title || "Thong bao",
        description,
        duration: options.duration,
      }),
    warning: (description, options = {}) =>
      pushToast({
        type: "warning",
        title: options.title || "Luu y",
        description,
        duration: options.duration,
      }),
  };
}

export { useToast };
