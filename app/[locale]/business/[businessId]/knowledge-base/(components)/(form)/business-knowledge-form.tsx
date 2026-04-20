"use client";

import { BusinessCategoryDropdown } from "@/components/forms/business-category-dropdown";
import { ColorPickerField } from "@/components/forms/colorpickerfield";
import { TextField } from "@/components/forms/text-field";
import { UploadPhoto } from "@/components/forms/upload-photo";
import { useManageKnowledge } from "@/contexts/manage-knowledge-context";
import { BusinessKnowledgePld } from "@/models/api/knowledge/business.type";
import { useTranslations } from "next-intl";

export function BusinessKnowledgeForm() {
  const { formKnowledge, setFormKnowledge, errors } = useManageKnowledge();

  const updateField = (
    key: keyof BusinessKnowledgePld,
    value: BusinessKnowledgePld[keyof BusinessKnowledgePld]
  ) => {
    setFormKnowledge({
      ...formKnowledge,
      business: { ...formKnowledge.business, [key]: value },
    });
  };
  const b = useTranslations("businessKnowledge");

  const defaultLabels = {
    logoBrand: b("logoBrand"),
    brandName: b("brandName"),
    category: b("category"),
    description: b("description"),
    visionMission: b("visionMission"),
    uniqueSellingPoint: b("uniqueSellingPoint"),
    urlWebsite: b("urlWebsite"),
    location: b("location"),
    colorTone: b("colorTone"),
  };

  const defaultPlaceholders = {
    brandName: b("brandNamePlaceholder"),
    category: b("categoryPlaceholder"),
    description: b("descriptionPlaceholder"),
    visionMission: b("visionMissionPlaceholder"),
    uniqueSellingPoint: b("uniqueSellingPointPlaceholder"),
    urlWebsite: b("urlWebsitePlaceholder"),
    location: b("locationPlaceholder"),
  };

  const finalLabels = { ...defaultLabels };
  const finalPlaceholders = { ...defaultPlaceholders };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row w-full gap-6 items-start">
        <UploadPhoto
          label={finalLabels.logoBrand}
          onImageChange={(file: string | null) =>
            setFormKnowledge({
              ...formKnowledge,
              business: { ...formKnowledge.business, primaryLogo: file },
            })
          }
          currentImage={formKnowledge?.business?.primaryLogo}
          error={errors.business.primaryLogo}
        />

        <div className="w-full space-y-4">
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
        label={finalLabels.visionMission}
        value={formKnowledge?.business?.visionMission}
        onChange={(value) => updateField("visionMission", value)}
        placeholder={finalPlaceholders.visionMission}
        multiline
        rows={3}
        error={errors.business.visionMission}
      />

      <TextField
        label={finalLabels.uniqueSellingPoint}
        value={formKnowledge?.business?.uniqueSellingPoint}
        onChange={(value) => updateField("uniqueSellingPoint", value)}
        placeholder={finalPlaceholders.uniqueSellingPoint}
        error={errors.business.uniqueSellingPoint}
      />

      <TextField
        label={finalLabels.urlWebsite}
        value={formKnowledge?.business?.website}
        onChange={(value) => updateField("website", value)}
        placeholder={finalPlaceholders.urlWebsite}
        error={errors.business.website}
      />

      <TextField
        label={finalLabels.location}
        value={formKnowledge?.business?.location}
        onChange={(value) => updateField("location", value)}
        placeholder={finalPlaceholders.location}
        error={errors.business.location}
      />

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
