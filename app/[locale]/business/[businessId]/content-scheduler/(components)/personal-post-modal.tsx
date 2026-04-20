"use client";

import { Dispatch, SetStateAction } from "react";
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
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useContentCaptionEnhance } from "@/services/content/content.api";
import { showToast } from "@/helper/show-toast";
import { useParams } from "next/navigation";

export interface PersonalContentForm {
  image: string | null;
  caption: string;
}

interface PersonalPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: PersonalContentForm;
  setForm: Dispatch<SetStateAction<PersonalContentForm>>;
  errors: Partial<Record<keyof PersonalContentForm, string>>;
  onSave: () => void;
  isSaving: boolean;
}

export function PersonalPostModal({
  isOpen,
  onClose,
  form,
  setForm,
  errors,
  onSave,
  isSaving,
}: PersonalPostModalProps) {
  const t = useTranslations("contentScheduler");
  const { businessId } = useParams() as { businessId: string };
  const mEnhanceCaption = useContentCaptionEnhance();

  const handleGenerateCaption = async () => {
    if (!form.image) {
      showToast(
        "error",
        "Please upload a photo first"
      );
      return;
    }

    try {
      const res = await mEnhanceCaption.mutateAsync({
        businessId,
        formData: {
          images: [form.image],
          model: "gemini",
          currentCaption: form.caption || "",
        },
      });
      setForm((prev) => ({ ...prev, caption: res.data.data.caption }));
      showToast("success", res.data.responseMessage);
    } catch (error) {
      showToast("error", error, t);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addContentManually")}</DialogTitle>
          <DialogDescription>
            {t("addContentManuallyDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col w-full gap-6 items-start">
            <UploadPhoto
              label="Photo"
              onImageChange={(url: string | null) =>
                setForm((prev) => ({ ...prev, image: url }))
              }
              currentImage={form.image || undefined}
              error={errors.image}
            />

            <div className="w-full space-y-4">
              <TextField
                label={t("caption")}
                value={form.caption}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, caption: value }))
                }
                placeholder={t("writeCaption")}
                multiline
                rows={5}
                error={errors.caption}
              />
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 whitespace-nowrap"
              onClick={handleGenerateCaption}
              disabled={mEnhanceCaption.isPending}
            >
              {mEnhanceCaption.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("generateCaption")}
            </Button>
          </div>
        </div>

        <DialogFooterWithButton
          buttonMessage={t("addContent")}
          onClick={onSave}
          disabled={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
}
