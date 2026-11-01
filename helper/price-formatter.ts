import { toIntlLocale } from "@/helper/locale";

/**
 * Format price with currency symbol
 * @param price - The price value
 * @param currency - The currency code (e.g., 'IDR', 'USD', 'EUR')
 * @param locale - Active app locale ("id" | "en"); drives the number format
 * @param freeLabel - Translated label for a zero price (defaults to the locale's "Free")
 * @returns Formatted price string with currency symbol
 */
export const formatPriceWithCurrency = (
  price: number,
  currency: string,
  locale: string = "id",
  freeLabel?: string
): string => {
  if (!price || price === 0) {
    return freeLabel ?? (locale === "en" ? "Free" : "Gratis");
  }

  // Currency symbols mapping
  const currencySymbols: Record<string, string> = {
    IDR: "Rp",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    SGD: "S$",
    MYR: "RM",
    THB: "฿",
    AUD: "A$",
    CAD: "C$",
    CHF: "CHF",
    CNY: "¥",
    HKD: "HK$",
    KRW: "₩",
    NZD: "NZ$",
    PHP: "₱",
    VND: "₫",
    INR: "₹",
    BRL: "R$",
    MXN: "$",
  };

  const symbol = currencySymbols[currency] || currency;
  
  // Format number with thousand separators
  const formattedNumber = new Intl.NumberFormat(toIntlLocale(locale)).format(price);
  
  return `${symbol} ${formattedNumber}`;
};
