import { useCallback } from "react";
import { useLocale } from "next-intl";
import { getCategoryLabel } from "@/helper/locale";
import { useLibraryProductCategory } from "@/services/library.api";

// Returns a formatter that shows a stored product category (code or free text) in the active locale.
export function useProductCategoryLabel() {
  const locale = useLocale();
  const { data } = useLibraryProductCategory();
  const categories = data?.data.data;
  return useCallback(
    (value?: string | null) => getCategoryLabel(categories ?? [], value ?? "", locale),
    [categories, locale]
  );
}
