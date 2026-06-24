"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown as ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAiModelDisplayName } from "@/models/api/content/ai-model";
import { ValidRatio } from "@/models/api/content/image.type";
import {
  SelectedAvatarOption,
  useContentGenerate,
} from "@/contexts/content-generate-context";
import { AvatarSelectionModal } from "./avatar-selection-modal";
import { ProductSelectionModal } from "./product-selection-modal";

export const GenerateFormBasic = () => {
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
          <span
            className={
              basic?.productKnowledgeId
                ? "text-foreground"
                : "text-muted-foreground"
            }
          >
            {basic?.productKnowledgeId
              ? basic?.productName
              : t("selectProduct")}
          </span>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium">
            {t("avatarLabel")}
          </label>
          <span className="text-xs text-muted-foreground">
            {t("optional")}
          </span>
        </div>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
          onClick={() => setIsAvatarModalOpen(true)}
          disabled={isLoading || disabled}
        >
          <span
            className={
              basic.selectedAvatars.length
                ? "text-foreground"
                : "text-muted-foreground"
            }
          >
            {basic.selectedAvatars.length
              ? t("selectedAvatarCount", {
                  count: basic.selectedAvatars.length,
                })
              : t("selectAvatar")}
          </span>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">AI Model</label>
        <select
          className={cn(
            "w-full rounded-md border border-input bg-background-secondary p-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring",
            isLoading
          )}
          disabled={isLoading || aiModels.isLoading}
          value={basic?.model || ""}
          onChange={(e) => {
            const selectedModel = aiModels.models.find(
              (model) => model.name === e.target.value
            );

            if (selectedModel) {
              onSelectAiModel(selectedModel);
            }
          }}
        >
          {aiModels.isLoading ? (
            <option value="">Loading models...</option>
          ) : null}
          {!aiModels.isLoading && aiModels.models.length === 0 ? (
            <option value="">No model available</option>
          ) : null}
          {aiModels.models.map((model) => (
            <option key={model.name} value={model.name}>
              {getAiModelDisplayName(model)}
            </option>
          ))}
        </select>
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
        <select
          className={cn(
            "w-full rounded-md border border-input bg-background-secondary p-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring",
            isLoading
          )}
          disabled={isLoading}
          value={basic?.ratio || ""}
          onChange={(e) => {
            setBasic({ ...basic, ratio: e.target.value as ValidRatio });
          }}
        >
          {aiModels.validRatios.length === 0 ? (
            <option value="">No ratio available</option>
          ) : null}
          {aiModels.validRatios.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
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
