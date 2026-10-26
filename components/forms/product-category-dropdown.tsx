"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { getCategoryLabel } from "@/helper/locale";
import { PRODUCT_CATEGORY_OTHER } from "@/models/api/library/product-category.type";
import { useLibraryProductCategory } from "@/services/library.api";

interface ProductCategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  onFocus?: () => void;
}

// Stores a suggested category code, or the typed text when "Lainnya" is picked (the "other" code itself
// is never stored).
export function ProductCategoryDropdown({
  value,
  onChange,
  placeholder: placeholderProp,
  label: labelProp,
  error,
  onFocus,
}: ProductCategoryDropdownProps) {
  const t = useTranslations("productCategory");
  const locale = useLocale();
  const placeholder = placeholderProp ?? t("selectPlaceholder");
  const label = labelProp ?? t("label");
  const { data, isLoading } = useLibraryProductCategory();
  const categories = data?.data.data ?? [];
  const [otherSelected, setOtherSelected] = useState(false);

  const isSuggestedCode = categories.some(
    (category) => category.code === value && category.code !== PRODUCT_CATEGORY_OTHER
  );
  // Until the list loads, a code cannot be told apart from free text.
  const isFreeText =
    categories.length > 0 && !!value && value !== PRODUCT_CATEGORY_OTHER && !isSuggestedCode;
  const showOtherInput = otherSelected || isFreeText || value === PRODUCT_CATEGORY_OTHER;
  const selectValue = isSuggestedCode ? value : showOtherInput ? PRODUCT_CATEGORY_OTHER : "";

  // A scrapper result can be "other"; the user still has to type the category.
  useEffect(() => {
    if (value === PRODUCT_CATEGORY_OTHER) {
      setOtherSelected(true);
      onChange("");
    }
  }, [value, onChange]);

  const handleSelectChange = (selected: string) => {
    if (selected === PRODUCT_CATEGORY_OTHER) {
      setOtherSelected(true);
      onChange("");
      return;
    }
    setOtherSelected(false);
    onChange(selected);
  };

  return (
    <div className="space-y-1 ">
      <div className="flex flex-col md:flex-row w-full justify-between items-center gap-2">
        <div className="space-y-2 w-full">
          <Label htmlFor="category">{label}</Label>
          <NativeSelect
            id="category"
            className={`bg-background dark:bg-card ${error ? "border-red-500" : ""}`}
            value={selectValue}
            onChange={(e) => handleSelectChange(e.target.value)}
            onFocus={onFocus}
            disabled={isLoading}
            aria-invalid={!!error}
          >
            <option value="" disabled hidden>
              {placeholder}
            </option>
            {categories.map((category) => (
              <option key={category.code} value={category.code}>
                {getCategoryLabel(categories, category.code, locale)}
              </option>
            ))}
          </NativeSelect>
          {showOtherInput && (
            <Input
              id="category-other"
              value={isFreeText ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              onFocus={onFocus}
              placeholder={t("enterOtherCategory")}
              maxLength={255}
              className={`bg-background dark:bg-card ${error ? "border-red-500" : ""}`}
              aria-invalid={!!error}
            />
          )}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-1">
          <Info className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}
