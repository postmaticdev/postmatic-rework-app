// Display helpers for product data coming from the API (raw enums / generated names).

// IDR formatter with explicit fraction digits. The shared `formatIdr` relies on the
// runtime's ICU default for IDR, which differs between Node ("Rp 0") and browsers
// ("Rp 0,00") and caused a hydration mismatch on SSR-rendered checkout prices.
const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const formatIdrStable = (amount: number) => idrFormatter.format(amount);

// "image_token" -> "Image Token", "token" -> "Token"
export const formatProductType = (type?: string | null) => {
  if (!type) return "-";
  return type
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// "Image Token x200000" -> "Image Token x200.000" (locale-formatted amount)
export const formatProductName = (name: string | null | undefined, locale: string) => {
  if (!name) return "";
  return name.replace(/x(\d{4,})\b/g, (_, amount: string) =>
    `x${Number(amount).toLocaleString(locale)}`
  );
};

// Token products are one-time purchases (validForInfo "unlimited" / productType "*token").
export const isOneTimeProduct = (
  validForInfo?: string | null,
  productType?: string | null
) =>
  validForInfo === "unlimited" ||
  (!validForInfo && !!productType && productType.toLowerCase().includes("token"));
