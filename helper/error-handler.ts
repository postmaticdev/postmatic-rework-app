import { AxiosError } from "axios";
import { getToastLocale, translateApiResponseMessage } from "@/helper/api-response-message";

export const errorString = (e: unknown): string => {
  const locale = getToastLocale();
  let errorMessage =
    locale === "en"
      ? "An error occurred while processing your request."
      : "Terjadi kesalahan saat memproses permintaan Anda.";
  if (e instanceof AxiosError) {
    errorMessage = translateApiResponseMessage(
      e.response?.data.responseMessage || e.response?.data?.metaData?.message || errorMessage,
      locale
    );
  } else if (e instanceof Error) {
    errorMessage = translateApiResponseMessage(e.message || errorMessage, locale);
  }
  return errorMessage;
};
