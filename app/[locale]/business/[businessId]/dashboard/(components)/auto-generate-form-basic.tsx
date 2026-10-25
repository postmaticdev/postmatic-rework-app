"use client";

import { Button } from "@/components/ui/button";
import { useAutoGenerate } from "@/contexts/auto-generate-context";
import { Bot, ChevronRight, Plus, X } from "lucide-react";
import { AutoProductSelectionModal } from "./auto-product-selection-modal";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ValidRatio } from "@/models/api/content/image.type";
import { useTranslations } from "next-intl";
import { AutoAvatarSelectionModal } from "./auto-avatar-selection-modal";
import Image from "next/image";
import { DEFAULT_PLACEHOLDER_IMAGE, DEFAULT_PRODUCT_IMAGE } from "@/constants";
import { Card } from "@/components/ui/card";
import { AiModelSelect } from "@/components/forms/ai-model-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Sama dengan RatioIcon di content-generate/generate-form-basic.tsx
const RatioIcon = ({ ratio }: { ratio: string }) => {
  let width = "w-[16px]";
  let height = "h-[16px]";

  if (ratio === "16:9") {
    width = "w-[18px]";
    height = "h-[10px]";
  } else if (ratio === "9:16") {
    width = "w-[10px]";
    height = "h-[18px]";
  } else if (ratio === "4:3") {
    width = "w-[16px]";
    height = "h-[12px]";
  } else if (ratio === "3:4" || ratio === "4:5") {
    width = "w-[12px]";
    height = "h-[16px]";
  } else if (ratio === "2:3") {
    width = "w-[12px]";
    height = "h-[18px]";
  }

  return (
    <div className={`border-2 border-current rounded-[2px] ${width} ${height} opacity-70`} />
  );
};

/**
 * Form dasar untuk pengulangan konten. Tampilannya mengikuti section tengah
 * content-generate (GenerateFormBasic) tanpa bagian trend.
 */
export const AutoGenerateFormBasic = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const { form, isLoading, aiModels, onSelectAiModel, onSelectAvatar } =
    useAutoGenerate();
  const { basic, setBasic } = form;
  const disabled = false; // Auto generate doesn't have selectedHistory
  const t = useTranslations("generationPanel");
  const tAuto = useTranslations("autoGenerate");

  const ratioOptions =
    basic?.ratio && !aiModels.validRatios.includes(basic.ratio)
      ? [...aiModels.validRatios, basic.ratio] // ratio lama saat edit jadwal
      : aiModels.validRatios;

  return (
    <div className="space-y-4">
      {basic.productKnowledgeId && basic.productName ? (
        <div className="space-y-2">
          <h3 className="font-medium text-sm">{t("productName")}</h3>
          <Card
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => !isLoading && !disabled && setIsProductModalOpen(true)}
          >
            <div className="flex flex-row gap-2 justify-between">
              <div className="flex flex-row gap-3 max-md:min-w-0">
                <div className="aspect-square w-20 h-20 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                  <Image
                    src={basic.productImage || DEFAULT_PRODUCT_IMAGE}
                    alt={basic.productName || ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0 flex items-center">
                  <p className="line-clamp-2 text-sm font-medium">{basic.productName}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBasic({ ...basic, productKnowledgeId: "", productName: "", productImage: "" });
                  }}
                  disabled={isLoading || disabled}
                  aria-label={`${t("removeSelectedTrend")} ${basic.productName}`}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            {t("productName")}
          </label>
          <Button
            variant="outline"
            className="w-full justify-between text-left font-normal"
            onClick={() => setIsProductModalOpen(true)}
            disabled={isLoading || disabled}
          >
            <span className="text-muted-foreground">
              {t("selectProduct")}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Avatar Card */}
      {basic.selectedAvatar ? (
        <>
          {/* Plus separator */}
          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-background rounded-full p-1 border shadow-sm">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
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
                variant="ghost"
                size="icon-sm"
                className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                disabled={isLoading}
                onClick={() => onSelectAvatar(null)}
                aria-label={`${t("removeSelectedTrend")} ${basic.selectedAvatar.title}`}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        </>
      ) : null}

      <div className="space-y-2">
        <label className="block text-sm font-medium">{tAuto("aiModel")}</label>
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

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          {t("aspectRatio")}
        </label>
        <Select
          disabled={isLoading || disabled || ratioOptions.length === 0}
          value={basic?.ratio || ""}
          onValueChange={(value) => {
            if (disabled) return;
            setBasic({ ...basic, ratio: value as ValidRatio });
          }}
        >
          <SelectTrigger className={cn("w-full bg-background-secondary", isLoading && "opacity-50 cursor-not-allowed")}>
            <SelectValue placeholder={tAuto("selectRatio")} />
          </SelectTrigger>
          <SelectContent>
            {ratioOptions.map((option) => (
              <SelectItem key={option} value={option}>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <RatioIcon ratio={option} />
                  </div>
                  <span>{option}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          {t("avatarLabel")}{" "}
          <span className="text-muted-foreground font-normal text-xs">({t("optional")})</span>
        </label>
        <Button
          type="button"
          variant={basic.selectedAvatar ? "outline" : "default"}
          onClick={() => setIsAvatarModalOpen(true)}
          disabled={isLoading || disabled}
          size="lg"
          className="w-full min-w-0 whitespace-normal leading-tight max-sm:h-(--control-h)"
        >
          <Bot className="h-4 w-4 mr-2" />
          {t("addAvatar")}
        </Button>
      </div>

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
