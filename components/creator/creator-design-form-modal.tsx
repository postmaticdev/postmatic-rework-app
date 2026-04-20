"use client";

import {
  Dialog,
  DialogContent,
  DialogFooterWithButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadPhoto } from "@/components/forms/upload-photo";
import { TextField } from "@/components/forms/text-field";
import { CreatorProductCategoryDropdown } from "@/components/forms/creator-product-category-dropdown";
import { ImageCategoryDropdown } from "@/components/forms/image-category-dropdown";
import { useCreatorDesign } from "@/contexts/creator-design-context";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PriceInput } from "../forms/price-input";
import { CurrencyDropdown } from "../forms/currency-dropdown";

export function CreatorDesignFormModal() {
  const {
    isCreateModalOpen,
    isEditModalOpen,
    editingDesign,
    formData,
    setFormData,
    errors,
    handleCreateDesign,
    handleUpdateDesign,
    closeCreateModal,
    closeEditModal,
  } = useCreatorDesign();

  const t = useTranslations("creatorDesign");

  const isOpen = isCreateModalOpen || isEditModalOpen;
  const isEdit = isEditModalOpen && editingDesign;
  const isLoading = false; // You can add loading state from mutations

  const handleClose = () => {
    if (isCreateModalOpen) {
      closeCreateModal();
    } else {
      closeEditModal();
    }
  };

  const handleSubmit = () => {
    if (isEdit) {
      handleUpdateDesign();
    } else {
      handleCreateDesign();
    }
  };

  const updateField = (
    key: keyof typeof formData,
    value: string | number | boolean | string[] | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editDesign") : t("createNewDesign")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Upload Reference Image */}
          <UploadPhoto
            label={t("referenceImage")}
            onImageChange={(url: string | null) =>
              updateField("imageUrl", url || "")
            }
            currentImage={formData.imageUrl}
            error={errors.imageUrl}
          />

          {/* Design Name */}
          <TextField
            label={t("designName")}
            value={formData.name}
            onChange={(value) => updateField("name", value)}
            placeholder={t("designNamePlaceholder")}
            error={errors.name}
          />

          {/* Product Category */}
          <CreatorProductCategoryDropdown
            value={formData.templateProductCategoryIds?.[0] || ""}
            onChange={(value) =>
              updateField("templateProductCategoryIds", [value])
            }
            placeholder={t("selectProductCategory")}
            label={t("productCategory")}
            error={errors.templateProductCategoryIds}
          />

          {/* Image Category */}
          <ImageCategoryDropdown
            value={formData.templateImageCategoryIds?.[0] || ""}
            onChange={(value) =>
              updateField("templateImageCategoryIds", [value])
            }
            placeholder={t("selectImageCategory")}
            label={t("imageCategory")}
            error={errors.templateImageCategoryIds}
          />

          {/* Price */}
          <Label className="text-sm font-medium text-foreground mb-1">
            {t("price")}
          </Label>
          <Label className="text-sm text-destructive font-medium mb-1">
            {t("priceNote")}
          </Label>
          <div className="flex w-full gap-6 items-start justify-between">
            <CurrencyDropdown
              value={formData.currency}
              onChange={(value) => updateField("currency", value)}
              error={errors.currency}
              disabled={true}
            />

            <PriceInput
              value={formData.price}
              onChange={(value) => updateField("price", value)}
              placeholder={t("enterPrice")}
              currency={formData.currency || "IDR"}
              error={errors.price}
              disabled={true}
            />
          </div>

          {/* Publish Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isPublished"
              checked={formData.isPublished || false}
              onCheckedChange={(checked) => updateField("isPublished", checked)}
            />
            <Label htmlFor="isPublished" className="text-sm font-medium">
              {t("publishDesign")}
            </Label>
          </div>
        </div>

        <DialogFooterWithButton
          buttonMessage={
            isLoading
              ? t("saving")
              : isEdit
              ? t("updateDesign")
              : t("createDesign")
          }
          onClick={handleSubmit}
          disabled={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
