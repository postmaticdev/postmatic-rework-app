"use client";

import { ProductCategoryDropdown } from "@/components/forms/product-category-dropdown";
import { CurrencyDropdown } from "@/components/forms/currency-dropdown";
import { PriceInput } from "@/components/forms/price-input";
import { TextField } from "@/components/forms/text-field";
import { UploadPhoto } from "@/components/forms/upload-photo";
import { useFormNewBusiness } from "@/contexts/form-new-business-context";
import { ProductKnowledgePld } from "@/models/api/knowledge/product.type";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export function ProductKnowledge() {
  const { formData, setFormData, errors, clearFieldError } =
    useFormNewBusiness();
  const { step2 } = formData;

  const updateField = (
    key: keyof ProductKnowledgePld,
    value: ProductKnowledgePld[keyof ProductKnowledgePld]
  ) => {
    setFormData((prev) => ({
      ...prev,
      step2: { ...prev.step2, [key]: value },
    }));
  };

  const t = useTranslations("productKnowledge");

  const defaultLabels = {
    productPhoto: t("productPhoto"),
    productName: t("productName"),
    productCategory: t("productCategory"),
    productDescription: t("productDescription"),
    price: t("price"),
    currency: t("currency"),
  };

  const defaultPlaceholders = {
    productName: t("productNamePlaceholder"),
    productCategory: t("productCategoryPlaceholder"),
    productDescription: t("productDescriptionPlaceholder"),
    price: t("pricePlaceholder"),
    currency: t("currencyPlaceholder"),
  };

  const finalLabels = { ...defaultLabels };
  const finalPlaceholders = { ...defaultPlaceholders };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row w-full gap-6 items-start">
        <UploadPhoto
          label={finalLabels.productPhoto}
          // onImageChange={(file) => updateField("images", file ? [file] : [])}
          onImageChange={(url: string | null) => {
            setFormData((prev) => ({
              ...prev,
              step2: { ...prev.step2, images: url ? [url] : [] },
            }));
          }}
          currentImage={step2.images?.[0]}
          error={errors.step2.images}
          onFocus={() => clearFieldError(1, "images")}
        />

        <div className="w-full space-y-4">
          <TextField
            label={finalLabels.productName}
            value={step2.name}
            onChange={(value) => updateField("name", value)}
            placeholder={finalPlaceholders.productName}
            error={errors.step2.name}
            onFocus={() => clearFieldError(1, "name")}
          />

          <ProductCategoryDropdown
            value={step2.category}
            onChange={(value) => updateField("category", value)}
            placeholder={finalPlaceholders.productCategory}
            label={finalLabels.productCategory}
            error={errors.step2.category}
            onFocus={() => clearFieldError(1, "category")}
          />
        </div>
      </div>

      <TextField
        label={finalLabels.productDescription}
        value={step2.description}
        onChange={(value) => updateField("description", value)}
        placeholder={finalPlaceholders.productDescription}
        multiline
        rows={3}
        error={errors.step2.description}
        onFocus={() => clearFieldError(1, "description")}
      />

      <Label className="text-sm font-medium text-foreground mb-1">
        {finalLabels.price}
      </Label>
      <div className="flex w-full gap-6 items-start justify-between">
        <CurrencyDropdown
          value={step2.currency}
          onChange={(value) => updateField("currency", value)}
          placeholder={finalPlaceholders.currency}
          error={errors.step2.currency}
          onFocus={() => clearFieldError(1, "currency")}
        />

      <PriceInput
        value={step2.price}
        onChange={(value) => updateField("price", value)}
        placeholder={finalPlaceholders.price}
        currency={step2.currency || "IDR"}
        error={errors.step2.price}
        onFocus={() => clearFieldError(1, "price")}
      />
      </div>
    </div>
  );
}
