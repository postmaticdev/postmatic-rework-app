"use client";

import { Button } from "@/components/ui/button";
import { useAutoGenerate } from "@/contexts/auto-generate-context";
import { ChevronDown as ChevronDownIcon, Trash2 } from "lucide-react";
import { AutoProductSelectionModal } from "./auto-product-selection-modal";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ValidRatio } from "@/models/api/content/image.type";
import { useTranslations } from "next-intl";
import { AutoAvatarSelectionModal } from "./auto-avatar-selection-modal";
import Image from "next/image";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { Card } from "@/components/ui/card";
import { AiModelSelect } from "@/components/forms/ai-model-select";

export const AutoGenerateFormBasic = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const { form, isLoading, aiModels, onSelectAiModel, onSelectAvatar } =
    useAutoGenerate();
  const { basic, setBasic } = form;
  const disabled = false; // Auto generate doesn't have selectedHistory
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

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium">{t("avatarLabel")}</label>
          <span className="text-xs text-muted-foreground">{t("optional")}</span>
        </div>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
          onClick={() => setIsAvatarModalOpen(true)}
          disabled={isLoading || disabled}
        >
          <span
            className={
              basic.selectedAvatar ? "text-foreground" : "text-muted-foreground"
            }
          >
            {basic.selectedAvatar
              ? t("selectedAvatarCount", { count: 1 })
              : t("selectAvatar")}
          </span>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </div>

      {basic.selectedAvatar ? (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={basic.selectedAvatar.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                  alt={basic.selectedAvatar.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium text-foreground">
                  {basic.selectedAvatar.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {basic.selectedAvatar.source === "knowledge"
                    ? t("avatarSourceKnowledge")
                    : t("avatarSourceBrowse")}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={isLoading}
              onClick={() => onSelectAvatar(null)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ) : null}

      {/* AI Model */}
      <div>
        <label className="block text-sm font-medium mb-2">AI Model</label>
        <AiModelSelect
          disabled={isLoading || disabled || aiModels.isLoading}
          isLoading={aiModels.isLoading}
          models={aiModels.models}
          selectedModel={basic?.model || ""}
          onSelectModel={(modelName) => {
            if (disabled) return;
            const selectedModel = aiModels.models.find(
              (model) => model.name === modelName
            );
            if (selectedModel) {
              onSelectAiModel(selectedModel);
            }
          }}
        />
      </div>

      {/* {aiModels.selectedModel?.name === "gemini-3-pro-image-preview" &&
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
      ) : null} */}

      {/* Aspect Ratio */}
      <div>
        <label className="block text-sm font-medium mb-2">{t("aspectRatio")}</label>
        <select
          className={cn(
            "w-full p-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            isLoading ||
              (disabled && "opacity-50 cursor-not-allowed hover:bg-transparent")
          )}
          disabled={isLoading || disabled}
          value={basic?.ratio || ""}
          onChange={(e) => {
            if (disabled) return;
            setBasic({ ...basic, ratio: e.target.value as ValidRatio });
          }}
        >
          {aiModels.validRatios.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          {/* Show current ratio if it's not in validRatios (for editing existing schedules) */}
          {basic?.ratio && !aiModels.validRatios.includes(basic.ratio) && (
            <option key={basic.ratio} value={basic.ratio}>
              {basic.ratio}
            </option>
          )}
        </select>
      </div>

      {/* Category */}
      {/* <div>
        <label className="block text-sm font-medium mb-2">{t("category")}</label>
        <select
          value={basic?.category}
          disabled={isLoading || disabled}
          onChange={(e) => {
            if (disabled) return;
            setBasic({ ...basic, category: e.target.value });
          }}
          className={cn(
            "w-full p-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            isLoading ||
              (disabled && "opacity-50 cursor-not-allowed hover:bg-transparent")
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
            disabled={isLoading || disabled}
            onChange={(e) =>
              setBasic({ ...basic, customCategory: e.target.value })
            }
            placeholder={t("enterCustomCategory")}
            className={cn(
              "w-full p-2 mt-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              isLoading ||
                (disabled &&
                  "opacity-50 cursor-not-allowed hover:bg-transparent")
            )}
          />
        )}
      </div> */}

      {/* Design Style */}
      {/* <div>
        <label className="block text-sm font-medium mb-2">{t("designStyle")}</label>
        <select
          value={basic.designStyle || ""}
          onChange={(e) => setBasic({ ...basic, designStyle: e.target.value })}
          disabled={isLoading || disabled}
          className={cn(
            "w-full p-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            isLoading ||
              (disabled && "opacity-50 cursor-not-allowed hover:bg-transparent")
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
            disabled={isLoading || disabled}
            onChange={(e) =>
              setBasic({ ...basic, customDesignStyle: e.target.value })
            }
            placeholder={t("enterCustomDesignStyle")}
            className={cn(
              "w-full p-2 mt-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              isLoading ||
                (disabled &&
                  "opacity-50 cursor-not-allowed hover:bg-transparent")
            )}
          />
        )}
      </div> */}
      <AutoProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
        }}
      />
      <AutoAvatarSelectionModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onSave={(item) => {
          onSelectAvatar(item);
          setIsAvatarModalOpen(false);
        }}
        selectedAvatar={basic.selectedAvatar}
      />
    </div>
  );
};


