import { BusinessCategoryRes } from "@/models/api/library/business-category.type";

// next-intl locale ("id" | "en") -> Intl locale tag.
export const toIntlLocale = (locale?: string | null) =>
  locale === "en" ? "en-US" : "id-ID";

/**
 * Returns the country list with names in the active locale (via Intl.DisplayNames),
 * falling back to the English name from the source list.
 */
export const localizeCountryNames = <T extends { name: string; code: string }>(
  countries: T[],
  locale?: string | null
): T[] => {
  let displayNames: Intl.DisplayNames | null = null;
  try {
    displayNames = new Intl.DisplayNames([toIntlLocale(locale)], { type: "region" });
  } catch {
    return countries;
  }
  return countries.map((country) => {
    let name: string | undefined;
    try {
      name = displayNames?.of(country.code.toUpperCase());
    } catch {
      name = undefined;
    }
    return name && name !== country.code ? { ...country, name } : country;
  });
};

// Business/product category label in the active locale; unknown values (free text) are shown as-is.
export const getCategoryLabel = (
  categories: BusinessCategoryRes[],
  code: string,
  locale?: string | null
) => {
  const category = categories.find((item) => item.code === code);
  if (!category) return code;
  return locale === "en" ? category.label.en : category.label.id;
};
