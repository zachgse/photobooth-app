import { toast as toastify, type ToastOptions } from "react-toastify";

type ToastConfig = {
    toastId?: ToastOptions["toastId"];
    autoClose?: ToastOptions["autoClose"];
};

export const customToast = {
    success: (message: string, config?: ToastConfig) =>
        toastify.success(message, config),

    error: (message: string, config?: ToastConfig) =>
        toastify.error(message, config),

    info: (message: string, config?: ToastConfig) =>
        toastify.info(message, config),

    warning: (message: string, config?: ToastConfig) =>
        toastify.warning(message, config),

    loading: (message: string, config?: ToastConfig) =>
        toastify.loading(message, {
            autoClose: false,
            ...config,
        }),

    dismiss: (id?: string | number) => toastify.dismiss(id),
};