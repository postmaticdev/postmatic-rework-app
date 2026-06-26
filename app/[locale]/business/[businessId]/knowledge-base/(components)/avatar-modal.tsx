"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooterWithButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadPhoto } from "@/components/forms/upload-photo";
import { TextField } from "@/components/forms/text-field";
import { BusinessAvatarPld } from "@/models/api/knowledge/avatar.type";
import { useTranslations } from "next-intl";

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (avatarData: BusinessAvatarPld & { id?: string }) => void;
  mode: "add" | "edit";
  formValue: BusinessAvatarPld & { id?: string };
  onChange: (avatarData: BusinessAvatarPld & { id?: string }) => void;
  errors?: Record<string, string>;
}

export function AvatarModal({
  isOpen,
  onClose,
  onSave,
  mode,
  formValue,
  onChange,
  errors = {},
}: AvatarModalProps) {
  const t = useTranslations("avatarKnowledge");

  const updateField = (
    key: keyof BusinessAvatarPld,
    value: BusinessAvatarPld[keyof BusinessAvatarPld]
  ) => {
    onChange({ ...formValue, [key]: value });
  };

  const isEditMode = mode === "edit";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("editAvatar") : t("addAvatar")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("editAvatarDescription")
              : t("addAvatarDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <UploadPhoto
              label={t("avatarPhoto")}
              onImageChange={(url: string | null) =>
                updateField("imageUrl", url || "")
              }
              currentImage={formValue.imageUrl}
              error={errors.imageUrl}
            />

            <div className="w-full">
              <TextField
                label={t("avatarName")}
                value={formValue.name}
                onChange={(value) => updateField("name", value)}
                placeholder={t("avatarNamePlaceholder")}
                error={errors.name}
              />
            </div>
          </div>
        </div>

        <DialogFooterWithButton
          buttonMessage={isEditMode ? t("saveButton") : t("addAvatar")}
          onClick={() => onSave(formValue)}
        />
      </DialogContent>
    </Dialog>
  );
}
