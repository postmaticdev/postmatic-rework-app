"use client";

import { Button } from "@/components/ui/button";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { ChevronDown as ChevronDownIcon } from "lucide-react";
import { ProductSelectionModal } from "./product-selection-modal";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ValidRatio } from "@/models/api/content/image.type";
import { useTranslations } from "next-intl";

export const GenerateFormBasic = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const { form, isLoading, selectedHistory, aiModels, onSelectAiModel } = useContentGenerate();
  const { basic, setBasic } = form;
  const disabled = selectedHistory !== null;
  const t = useTranslations("generationPanel");

  const CATEGORY_OPTIONS = [
    {
      label: "Default ⭐️",
      value: "Default",
    },
    {
      label: t("promosiDiskon"),
      value: t("promosiDiskon"),
    },
    {
      label: t("productShowcase"),
      value: t("productShowcase"),
    },
    {
      label: t("testimoniReviewPelanggan"),
      value: t("testimoniReviewPelanggan"),
    },
    {
      label: t("behindTheScenes"),
      value: t("behindTheScenes"),
    },
    {
      label: t("edukasiTips"),
      value: t("edukasiTips"),
    },
    {
      label: t("eventAktivitas"),
      value: t("eventAktivitas"),
    },
    {
      label: t("brandingStory"),
      value: t("brandingStory"),
    },
    {
      label: t("tutorialCaraPakai"),
      value: t("tutorialCaraPakai"),
    },
    {
      label: t("entertainmentKontenViral"),
      value: t("entertainmentKontenViral"),
    },
    {
      label: t("pengumumanPembaruan"),
      value: t("pengumumanPembaruan"),
    },
  ];
  
  const DESIGN_STYLE_OPTIONS = [
    {
      label: "Default ⭐️",
      value: "Default",
    },
    {
      label: "Minimalist",
      value: "Minimalist",
    },
    {
      label: "Flat Design",
      value: "Flat Design",
    },
    {
      label: "3D Design",
      value: "3D Design",
    },
    {
      label: "Futuristic",
      value: "Futuristic",
    },
    {
      label: "Retro / Vintage",
      value: "Retro / Vintage",
    },
    {
      label: "Cartoon / Character",
      value: "Cartoon / Character",
    },
    {
      label: "Realistic / Photorealism",
      value: "Realistic / Photorealism",
    },
    {
      label: "Abstract",
      value: "Abstract",
    },
    {
      label: "Typography-based",
      value: "Typography-based",
    },
    {
      label: "Gradient / Colorful",
      value: "Gradient / Colorful",
    },
    {
      label: "Cyberpunk",
      value: "Cyberpunk",
    },
    {
      label: "Line Art",
      value: "Line Art",
    },
    {
      label: "Geometric",
      value: "Geometric",
    },
    {
      label: "Hand-drawn / Sketch",
      value: "Hand-drawn / Sketch",
    },
  ];
  
  return (
    <div className="space-y-4">
      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium mb-2">{t("productName")}</label>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
          onClick={() => setIsProductModalOpen(true)}
          disabled={isLoading || disabled}
        >
          <span
            className={
              basic?.productKnowledgeId
                ? "text-foreground"
                : "text-muted-foreground"
            }
          >
            {basic?.productKnowledgeId ? basic?.productName : t("selectProduct")}
          </span>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* AI Model */}
      <div>
        <label className="block text-sm font-medium mb-2">AI Model</label>
        <select
          className={cn(
            "w-full p-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            isLoading 
          )}
          disabled={isLoading || aiModels.isLoading}
          value={basic?.model || ""}
          onChange={(e) => {
            
            const selectedModel = aiModels.models.find(model => model.name === e.target.value);
            if (selectedModel) {
              onSelectAiModel(selectedModel);
            }
          }}
        >
          {aiModels.models.map((model) => (
            <option key={model.name} value={model.name}>
              {model.description}
            </option>
          ))}
        </select>
      </div>

      {aiModels.selectedModel?.name === "gemini-3-pro-image-preview" &&
        aiModels.selectedModel?.imageSizes?.length ? (
        <div>
          <label className="block text-sm font-medium mb-2">Image Size</label>
          <select
            className={cn(
              "w-full p-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              isLoading
            )}
            disabled={isLoading || aiModels.isLoading}
            value={basic?.imageSize || ""}
            onChange={(e) => {
              
              setBasic({ ...basic, imageSize: e.target.value });
            }}
          >
            {(aiModels.selectedModel?.imageSizes || []).map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Aspect Ratio */}
      <div>
        <label className="block text-sm font-medium mb-2">{t("aspectRatio")}</label>
        <select
          className={cn(
            "w-full p-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            isLoading
          )}
          disabled={isLoading}
          value={basic?.ratio || ""}
          onChange={(e) => {
            
            setBasic({ ...basic, ratio: e.target.value as ValidRatio });
          }}
        >
          {aiModels.validRatios.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium mb-2">{t("category")}</label>
        <select
          value={basic?.category}
          disabled={isLoading }
          onChange={(e) => {
            
            setBasic({ ...basic, category: e.target.value });
          }}
          className={cn(
            "w-full p-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            isLoading 
          )}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value="other">{t("other")}</option>
        </select>
        {basic.category === "other" && (
          <input
            type="text"
            value={basic.customCategory}
            disabled={isLoading}
            onChange={(e) =>
              setBasic({ ...basic, customCategory: e.target.value })
            }
            placeholder={t("enterCustomCategory")}
            className={cn(
              "w-full p-2 mt-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              isLoading 
            )}
          />
        )}
      </div>

      {/* Design Style */}
      <div>
        <label className="block text-sm font-medium mb-2">{t("designStyle")}</label>
        <select
          value={basic.designStyle || ""}
          onChange={(e) => setBasic({ ...basic, designStyle: e.target.value })}
          disabled={isLoading}
          className={cn(
            "w-full p-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            isLoading
          )}
        >
          {DESIGN_STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}

          <option value="other">{t("other")}</option>
        </select>
        {basic.designStyle === "other" && (
          <input
            type="text"
            value={basic.customDesignStyle}
            disabled={isLoading}
            onChange={(e) =>
              setBasic({ ...basic, customDesignStyle: e.target.value })
            }
            placeholder={t("enterCustomDesignStyle")}
            className={cn(
              "w-full p-2 mt-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              isLoading 
            )}
          />
        )}
      </div>
      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
        }}
      />
    </div>
  );
};


