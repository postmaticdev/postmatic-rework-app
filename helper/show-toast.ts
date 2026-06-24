import { toast } from "sonner";
import { AxiosError } from "axios";
import { getToastLocale, translateApiResponseMessage } from "@/helper/api-response-message";

type ToastType = "success" | "error" | "warning" | "info";

// Client-side version for React components
export const showToast = (type: ToastType, message: unknown, t?: (key: string) => string) => {
  const locale = getToastLocale();
  const defaultError =
    t?.("toast.defaultError") ||
    (locale === "en"
      ? "An error occurred while processing your request."
      : "Terjadi kesalahan saat memproses permintaan Anda.");

  const translateIfNeeded = (value: string) => translateApiResponseMessage(value, locale);

  let messageString = defaultError;
  if (typeof message === "string") {
    messageString = translateIfNeeded(message);
  } else if (message instanceof AxiosError) {
    const responseMessage = message.response?.data?.responseMessage;
    const fallbackMessage =
      message.response?.data?.metaData?.message || message.message || defaultError;
    messageString = translateIfNeeded(responseMessage || fallbackMessage);
  } else if (message instanceof Error) {
    messageString = translateIfNeeded(message.message || defaultError);
  } else if (typeof message === "object" && message !== null) {
    const responseMessage =
      (
        message as {
          response?: { data?: { responseMessage?: string; metaData?: { message?: string } } };
          message?: string;
        }
      ).response?.data?.responseMessage;
    const fallbackMessage =
      (
        message as {
          response?: { data?: { responseMessage?: string; metaData?: { message?: string } } };
          message?: string;
        }
      ).response?.data?.metaData?.message ||
      (message as { message?: string }).message ||
      defaultError;
    messageString = translateIfNeeded(responseMessage || fallbackMessage);
  }

  switch (type) {
    case "success":
      toast.success(messageString, {
        duration: 3000,
      });
      break;
    case "error":
      toast.error(messageString, {
        duration: 3000,
      });
      break;
    case "warning":
      toast.warning(messageString, {
        duration: 3000,
      });
      break;
    case "info":
      toast.info(messageString, {
        duration: 3000,
      });
      break;
  }
};
