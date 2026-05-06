"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";

interface ProductCategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  onFocus?: () => void;
}

export function ProductCategoryDropdown({
  value,
  onChange,
  placeholder = "Pilih kategori produk",
  label = "Kategori Produk",
  error,
  onFocus,
}: ProductCategoryDropdownProps) {
  const t = useTranslations("productCategory");
  const PRODUCT_CATEGORIES = [
    t("foodAndDrink"),
    t("fashionAndClothing"),
    t("beautyAndPersonalCare"),
    t("electronicsAndGadgets"),
    t("homeAndLiving"),
    t("healthAndWellness"),
    t("babyAndChildren"),
    t("automotiveAndAccessories"),
    t("sportsAndOutdoor"),
    t("booksAndStationery"),
    t("jewelryAndAccessories"),
    t("petSupplies"),
    t("furnitureAndDecor"),
    t("toolsAndHardware"),
    t("digitalAndSubscription"),
    t("other"),
  ];
  const categoryOptions = PRODUCT_CATEGORIES.includes(value)
    ? PRODUCT_CATEGORIES
    : value
      ? [...PRODUCT_CATEGORIES, value]
      : PRODUCT_CATEGORIES;

  const handleCategoryChange = (selectedValue: string) => {
    onChange(selectedValue);
  };

  return (
    <div className="space-y-1 ">
      <div className="flex flex-col md:flex-row w-full justify-between items-center gap-2">
        <div className="space-y-2 w-full">
          <Label htmlFor="category">{label}</Label>
          <select
            id="category"
            className={`flex p-2 h-10 w-full items-center rounded-md border bg-background dark:bg-card px-3 py-2 text-sm shadow-xs ring-offset-background transition-[color,box-shadow] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              error
                ? "border-red-500 focus:ring-red-500"
                : "border-input focus:ring-ring"
            }`}
            value={value || ""}
            onChange={(e) => handleCategoryChange(e.target.value)}
            onFocus={onFocus}
            aria-invalid={!!error}
          >
            <option value="" disabled hidden>
              {placeholder}
            </option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
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
