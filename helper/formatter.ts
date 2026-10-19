import { toIntlLocale } from "@/helper/locale";

/** Formats an IDR amount; the number format follows `locale` ("id" | "en"). */
export const formatIdr = (amount: number, locale: string = "id") => {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency: "IDR",
    currencyDisplay: "narrowSymbol",
  }).format(amount);
};
