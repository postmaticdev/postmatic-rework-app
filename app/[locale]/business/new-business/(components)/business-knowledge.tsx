"use client";

import { BusinessCategoryDropdown } from "@/components/forms/business-category-dropdown";
import { ColorPickerField } from "@/components/forms/colorpickerfield";
import { TextField } from "@/components/forms/text-field";
import { UploadPhoto } from "@/components/forms/upload-photo";
import { Input } from "@/components/ui/input";
import { useFormNewBusiness } from "@/contexts/form-new-business-context";
import { BusinessKnowledgePld } from "@/models/api/knowledge/business.type";
import { SearchableCountrySelect } from "@/app/[locale]/profile/(components)/searchable-select-content";
import countryCodes from "@/lib/country-code.json";
import { useTranslations } from "next-intl";

export function BusinessKnowledge() {
  const { formData, setFormData, errors, clearFieldError } =
    useFormNewBusiness();
  const { step1 } = formData;

  const updateField = (
    key: keyof BusinessKnowledgePld,
    value: BusinessKnowledgePld[keyof BusinessKnowledgePld]
  ) => {
    setFormData({ ...formData, step1: { ...formData.step1, [key]: value } });
  };

  const t = useTranslations("businessKnowledge");

  const defaultLabels = {
    logoBrand: t("logoBrand"),
    brandName: t("brandName"),
    category: t("category"),
    description: t("description"),
    website: t("website"),
    phone: t("phone"),
    colorTone: t("colorTone"),
  };

  const defaultPlaceholders = {
    brandName: t("brandNamePlaceholder"),
    category: t("categoryPlaceholder"),
    description: t("descriptionPlaceholder"),
    website: "https://example.com",
    phone: t("phonePlaceholder"),
    colorTone: "FFFFFF",
  };

  const finalLabels = { ...defaultLabels };
  const finalPlaceholders = { ...defaultPlaceholders };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row w-full gap-6 items-start">
        <UploadPhoto
          label={finalLabels.logoBrand}
          // onImageChange={(file) => updateField("primaryLogo", file)}
          onImageChange={(url: string | null) => {
            setFormData((prev) => ({
              ...prev,
              step1: { ...prev.step1, primaryLogo: url },
            }));
          }}
          currentImage={step1.primaryLogo}
          error={errors.step1.primaryLogo}
          onFocus={() => clearFieldError(0, "primaryLogo")}
        />

        <div className="w-full space-y-4">
          <TextField
            label={finalLabels.brandName}
            value={step1.name}
            onChange={(value) => updateField("name", value)}
            placeholder={finalPlaceholders.brandName}
            error={errors.step1.name}
            onFocus={() => clearFieldError(0, "name")}
          />

          <BusinessCategoryDropdown
            value={step1.category}
            onChange={(value) => updateField("category", value)}
            placeholder={finalPlaceholders.category}
            label="Kategori Bisnis"
            error={errors.step1.category}
            onFocus={() => clearFieldError(0, "category")}
          />
        </div>
      </div>

      <TextField
        label={finalLabels.description}
        value={step1.description}
        onChange={(value) => updateField("description", value)}
        placeholder={finalPlaceholders.description}
        multiline
        rows={3}
        error={errors.step1.description}
        onFocus={() => clearFieldError(0, "description")}
      />

      <TextField
        label={finalLabels.website}
        value={step1.website}
        onChange={(value) => updateField("website", value)}
        placeholder={finalPlaceholders.website}
        error={errors.step1.website}
        onFocus={() => clearFieldError(0, "website")}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {finalLabels.phone}
        </label>
        <div className="flex gap-2">
          <SearchableCountrySelect
            countries={countryCodes}
            value={step1.countryCode || "+62"}
            onValueChange={(value) => {
              updateField("countryCode", value);
              clearFieldError(0, "countryCode");
            }}
            placeholder="+62"
            searchPlaceholder="Search country..."
            className="w-36 bg-background-secondary"
          />
          <Input
            type="number"
            value={step1.businessPhone}
            onKeyDown={(event) =>
              ["e", "E", "+", "-"].includes(event.key) &&
              event.preventDefault()
            }
            onChange={(event) => {
              updateField("businessPhone", event.target.value);
              clearFieldError(0, "businessPhone");
            }}
            placeholder={finalPlaceholders.phone}
            className={`bg-background-secondary ${
              errors.step1.businessPhone ? "border-red-500" : ""
            }`}
          />
        </div>
        {(errors.step1.countryCode || errors.step1.businessPhone) && (
          <p className="text-sm text-red-500">
            {errors.step1.countryCode || errors.step1.businessPhone}
          </p>
        )}
      </div>

      <ColorPickerField
        label={finalLabels.colorTone}
        value={step1.colorTone} // "FF00FF" (tanpa #) dari DB/form
        onChange={(val) => updateField("colorTone", val)} // val juga "FF00FF"
        error={errors.step1.colorTone}
      />
    </div>
  );
}
