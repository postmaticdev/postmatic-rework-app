"use client";

import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { getBusinessCategoryLabel } from "@/helper/locale";
import { useLibraryBusinessCategory } from "@/services/library.api";
import { Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface BusinessCategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  onFocus?: () => void;
}

export function BusinessCategoryDropdown({
  value,
  onChange,
  placeholder: placeholderProp,
  label: labelProp,
  error,
  onFocus,
}: BusinessCategoryDropdownProps) {
  const t = useTranslations("businessCategory");
  const locale = useLocale();
  const placeholder = placeholderProp ?? t("selectPlaceholder");
  const label = labelProp ?? t("label");
  const { data, isLoading } = useLibraryBusinessCategory();
  const categories = data?.data.data ?? [];
  const isKnownValue = categories.some((category) => category.code === value);

  // The API only accepts a category code. A legacy free-text value is cleared so the user picks a valid one.
  useEffect(() => {
    if (categories.length > 0 && value && !isKnownValue) {
      onChange("");
    }
  }, [categories.length, value, isKnownValue, onChange]);

  return (
    <div className="space-y-1 ">
      <div className="flex flex-col md:flex-row w-full justify-between items-center gap-2">
        <div className="space-y-2 w-full">
          <Label htmlFor="category">{label}</Label>
          <NativeSelect
            id="category"
            className={`bg-background dark:bg-card ${error ? "border-red-500" : ""}`}
            value={isKnownValue ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            disabled={isLoading}
            aria-invalid={!!error}
          >
            <option value="" disabled hidden>
              {placeholder}
            </option>
            {categories.map((category) => (
              <option key={category.code} value={category.code}>
                {getBusinessCategoryLabel(categories, category.code, locale)}
              </option>
            ))}
          </NativeSelect>
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
