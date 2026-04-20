import { toast } from "sonner";
import { AxiosError } from "axios";

type ToastType = "success" | "error" | "warning" | "info";

// Client-side version for React components
export const showToast = (type: ToastType, message: unknown, t?: (key: string) => string) => {
  let messageString = message;
  if (typeof message === "string") {
    messageString = message;
  } else if (message instanceof AxiosError) {
    messageString =
      message.response?.data.responseMessage ||
      (t ? t("toast.defaultError") : "Terjadi kesalahan saat memproses data");
  } else if (message instanceof Error) {
    messageString = message.message || (t ? t("toast.defaultError") : "Terjadi kesalahan saat memproses data");
  }
  switch (type) {
    case "success":
      toast.success(message as string, {
        duration: 3000,
      });
      break;
    case "error":
      toast.error(messageString as string, {
        duration: 3000,
      });
      break;
    case "warning":
      toast.warning(message as string, {
        duration: 3000,
      });
      break;
    case "info":
      toast.info(message as string, {
        duration: 3000,
      });
      break;
  }
};
