"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown as ChevronDownIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { Plus, Trash2, Bot, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_PRODUCT_IMAGE } from "@/constants";
import { ValidRatio } from "@/models/api/content/image.type";
import {
  SelectedAvatarOption,
  useContentGenerate,
} from "@/contexts/content-generate-context";
import { AvatarSelectionModal } from "./avatar-selection-modal";
import { ProductSelectionModal } from "./product-selection-modal";
import { AiModelSelect } from "@/components/forms/ai-model-select";
import { SelectedAvatars } from "./selected-avatars";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export const GenerateFormBasic = ({ onOpenTrend }: { onOpenTrend?: () => void }) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const {
    form,
    isLoading,
    selectedHistory,
    aiModels,
    onSelectAiModel,
    onSelectAvatars,
  } = useContentGenerate();
  const { basic, setBasic } = form;
  const disabled = selectedHistory !== null;
  const t = useTranslations("generationPanel");

  return (
    <div className="space-y-4">
      {basic.productKnowledgeId ? (
        <div className="space-y-4">
          {/* Plus separator if reference image is selected */}
          {basic.referenceImage && (
            <div className="flex justify-center -mb-2 relative z-10">
              <div className="bg-background rounded-full p-1 border shadow-sm">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <h3 className="font-medium text-sm">{t("productName")}</h3>
            <Card 
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" 
              onClick={() => !isLoading && !disabled && setIsProductModalOpen(true)}
            >
              <div className="flex flex-row gap-2 justify-between">
                <div className="flex flex-row gap-3">
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
                    size="icon"
                    className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBasic({ ...basic, productKnowledgeId: "", productName: "", productImage: "" });
                    }}
                    disabled={isLoading || disabled}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-2 block text-sm font-medium">
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

      {/* Avatar Cards */}
      {basic.selectedAvatars.length > 0 && (
        <>
          {/* Plus separator */}
          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-background rounded-full p-1 border shadow-sm">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <SelectedAvatars />
        </>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">AI Model</label>
        <AiModelSelect
          disabled={isLoading || aiModels.isLoading}
          isLoading={aiModels.isLoading}
          models={aiModels.models}
          selectedModel={basic?.model || ""}
          onSelectModel={(modelName) => {
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

      <div>
        <label className="mb-2 block text-sm font-medium">
          {t("aspectRatio")}
        </label>
        <Select
          disabled={isLoading || aiModels.validRatios.length === 0}
          value={basic?.ratio || ""}
          onValueChange={(value) => {
            setBasic({ ...basic, ratio: value as ValidRatio });
          }}
        >
          <SelectTrigger className={cn("w-full bg-background-secondary", isLoading && "opacity-50 cursor-not-allowed")}>
            <SelectValue placeholder="Select ratio" />
          </SelectTrigger>
          <SelectContent>
            {aiModels.validRatios.map((option) => (
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

      <div>
        <label className="mb-2 block text-sm font-medium">
          Trend & Avatar <span className="text-muted-foreground font-normal text-xs">(Opsional)</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          {/* Trend Button */}
        {form.rss ? (
          <Button
            type="button"
            variant="default"
            onClick={() => form.onRssSelect(null)}
            disabled={isLoading}
            className="h-14 w-full bg-red-600 text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("removeSelectedTrend")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            onClick={onOpenTrend}
            disabled={isLoading}
            className="h-14 w-full"
          >
            <Newspaper className="h-4 w-4 mr-2" />
            {t("addLatestTrend")}
          </Button>
        )}

        <Button
          type="button"
          variant={basic.selectedAvatars.length > 0 ? "outline" : "default"}
          onClick={() => setIsAvatarModalOpen(true)}
          disabled={isLoading || disabled}
          className="h-14 w-full"
        >
          <Bot className="h-4 w-4 mr-2" />
          {t("selectAvatar")}
        </Button>
      </div>
      </div>

      {/* <div>
        <label className="block text-sm font-medium mb-2">{t("category")}</label>
        <select
          value={basic?.category}
          disabled={isLoading}
          onChange={(e) => {
            setBasic({ ...basic, category: e.target.value });
          }}
          className={cn(
            "w-full p-2 rounded-md text-sm border border-input bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            isLoading
          )}
        >
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
      </div> */}

      {/* <div>
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
      </div> */}

      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
        }}
      />
      <AvatarSelectionModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        selectedAvatars={basic.selectedAvatars}
        onSave={(items: SelectedAvatarOption[]) => {
          onSelectAvatars(items);
          setIsAvatarModalOpen(false);
        }}
      />
    </div>
  );
};
