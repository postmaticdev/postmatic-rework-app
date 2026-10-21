import { toast } from "sonner";
import { AxiosError } from "axios";
import { getToastLocale, translateApiResponseMessage } from "@/helper/api-response-message";
import { haptic, type HapticKind } from "@/lib/haptics";

type ToastType = "success" | "error" | "warning" | "info";

const TOAST_TITLES: Record<"id" | "en", Record<ToastType, string>> = {
  id: { success: "Berhasil", error: "Gagal", warning: "Perhatian", info: "Info" },
  en: { success: "Success", error: "Failed", warning: "Warning", info: "Info" },
};

// Pesan gagal/peringatan biasanya perlu dibaca lebih lama.
const TOAST_DURATION: Record<ToastType, number> = {
  success: 3500,
  error: 5500,
  warning: 5000,
  info: 4000,
};

const TOAST_HAPTIC: Record<ToastType, HapticKind> = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "notification",
};

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

  haptic(TOAST_HAPTIC[type]);

  // Judul menegaskan status ("Berhasil", "Gagal", ...); pesan API menjadi detailnya.
  const title = TOAST_TITLES[locale === "en" ? "en" : "id"][type];
  const options = { description: messageString, duration: TOAST_DURATION[type] };

  switch (type) {
    case "success":
      toast.success(title, options);
      break;
    case "error":
      toast.error(title, options);
      break;
    case "warning":
      toast.warning(title, options);
      break;
    case "info":
      toast.info(title, options);
      break;
  }
};
