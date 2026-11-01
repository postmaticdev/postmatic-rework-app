"use client";

import { BusinessCategoryDropdown } from "@/components/forms/business-category-dropdown";
import { ColorPickerField } from "@/components/forms/colorpickerfield";
import { TextField } from "@/components/forms/text-field";
import { UploadPhoto } from "@/components/forms/upload-photo";
import { Input } from "@/components/ui/input";
import { useManageKnowledge } from "@/contexts/manage-knowledge-context";
import { BusinessKnowledgePld } from "@/models/api/knowledge/business.type";
import { SearchableCountrySelect } from "@/app/[locale]/profile/(components)/searchable-select-content";
import { useMemo } from "react";
import countryCodes from "@/lib/country-code.json";
import { useLocale, useTranslations } from "next-intl";
import { localizeCountryNames } from "@/helper/locale";

interface BusinessKnowledgeFormProps {
  onUploadingChange?: (uploading: boolean) => void;
}

export function BusinessKnowledgeForm({
  onUploadingChange,
}: BusinessKnowledgeFormProps = {}) {
  const { formKnowledge, setFormKnowledge, errors } = useManageKnowledge();

  // Functional update: the logo upload resolves later and must not overwrite
  // fields edited while it was uploading.
  const updateField = (
    key: keyof BusinessKnowledgePld,
    value: BusinessKnowledgePld[keyof BusinessKnowledgePld]
  ) => {
    setFormKnowledge((prev) => ({
      ...prev,
      business: { ...prev.business, [key]: value },
    }));
  };
  const b = useTranslations("businessKnowledge");
  const locale = useLocale();
  const localizedCountries = useMemo(
    () => localizeCountryNames(countryCodes, locale),
    [locale]
  );

  const defaultLabels = {
    logoBrand: b("logoBrand"),
    brandName: b("brandName"),
    category: b("category"),
    description: b("description"),
    website: b("urlWebsite"),
    phone: b("phone"),
    colorTone: b("colorTone"),
  };

  const defaultPlaceholders = {
    brandName: b("brandNamePlaceholder"),
    category: b("categoryPlaceholder"),
    description: b("descriptionPlaceholder"),
    website: "https://example.com",
    phone: b("phonePlaceholder"),
  };

  const finalLabels = { ...defaultLabels };
  const finalPlaceholders = { ...defaultPlaceholders };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Logo di kiri, nama & kategori di kanan (juga di mobile) */}
      <div className="flex w-full flex-row items-start gap-3 sm:gap-6 [&>*:first-child]:shrink-0">
        <UploadPhoto
          label={finalLabels.logoBrand}
          onImageChange={(file: string | null) =>
            updateField("primaryLogo", file)
          }
          currentImage={formKnowledge?.business?.primaryLogo}
          error={errors.business.primaryLogo}
          onUploadingChange={onUploadingChange}
        />

        <div className="min-w-0 flex-1 space-y-4">
          <TextField
            label={finalLabels.brandName}
            value={formKnowledge?.business?.name}
            onChange={(value) => updateField("name", value)}
            placeholder={finalPlaceholders.brandName}
            error={errors.business.name}
          />

          <BusinessCategoryDropdown
            value={formKnowledge?.business?.category}
            onChange={(value) => updateField("category", value)}
            placeholder={finalPlaceholders.category}
            label={finalLabels.category}
            error={errors.business.category}
          />
        </div>
      </div>

      <TextField
        label={finalLabels.description}
        value={formKnowledge?.business?.description}
        onChange={(value) => updateField("description", value)}
        placeholder={finalPlaceholders.description}
        multiline
        rows={3}
        error={errors.business.description}
      />

      <TextField
        label={finalLabels.website}
        value={formKnowledge?.business?.website}
        onChange={(value) => updateField("website", value)}
        placeholder={finalPlaceholders.website}
        error={errors.business.website}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {finalLabels.phone}
        </label>
        <div className="flex gap-2">
          <SearchableCountrySelect
            countries={localizedCountries}
            value={formKnowledge?.business?.countryCode || "+62"}
            onValueChange={(value) => updateField("countryCode", value)}
            placeholder="+62"
            searchPlaceholder={b("searchCountry")}
            className="w-36 bg-background-secondary"
          />
          <Input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={formKnowledge?.business?.businessPhone}
            onChange={(event) =>
              updateField("businessPhone", event.target.value.replace(/D/g, ""))
            }
            placeholder={finalPlaceholders.phone}
            className={`bg-background-secondary ${
              errors.business.businessPhone ? "border-red-500" : ""
            }`}
          />
        </div>
        {(errors.business.countryCode || errors.business.businessPhone) && (
          <p className="text-sm text-red-500">
            {errors.business.countryCode || errors.business.businessPhone}
          </p>
        )}
      </div>

      {/* <TextField
        label={finalLabels.colorTone}
        value={formKnowledge?.business?.colorTone}
        onChange={(value) => updateField("colorTone", value)}
        placeholder="palpale"
        error={errors.business.colorTone}
      /> */}

      <ColorPickerField
        label={finalLabels.colorTone}
        value={formKnowledge?.business?.colorTone} // "FF00FF" (tanpa #) dari DB/form
        onChange={(val) => updateField("colorTone", val)} // val juga "FF00FF"
        error={errors.business.colorTone}
      />
    </div>
  );
}
