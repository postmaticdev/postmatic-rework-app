"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { useRole } from "@/contexts/role-context";
import { useRouter } from "@/i18n/navigation";
import {
  AiModelRes,
  getFreeUserAiModelDisplayNames,
  isAiModelRestrictedForFreeUser,
} from "@/models/api/content/ai-model";

/**
 * Model picker guard: a free user who picks a premium model gets the top-up
 * dialog right away and keeps the current model, instead of finding out on
 * Generate. Render `premiumModelModal` next to the picker.
 */
export function usePremiumModelGuard() {
  const { businessId } = useParams() as { businessId: string };
  const router = useRouter();
  const t = useTranslations("generationPanel");
  const { aiModels, form, onSelectAiModel } = useContentGenerate();
  // Top-up links are only offered to members allowed to purchase.
  const canPurchase = useRole().access.purchase.write;
  const [isOpen, setIsOpen] = useState(false);

  const selectModel = (model: AiModelRes) => {
    if (
      aiModels.isFreeUser &&
      aiModels.freeUserAllowedModel &&
      isAiModelRestrictedForFreeUser(aiModels.models, model.name)
    ) {
      setIsOpen(true);
      return;
    }
    onSelectAiModel(model);
  };

  const handleUseDefaultModel = () => {
    setIsOpen(false);
    const allowedModel = aiModels.freeUserAllowedModel;
    if (
      allowedModel &&
      isAiModelRestrictedForFreeUser(aiModels.models, form.basic.model)
    ) {
      onSelectAiModel(allowedModel);
    }
  };

  const handleTopUpNow = () => {
    setIsOpen(false);
    router.push(`/business/${businessId}/settings?tab=billing&topUp=token`);
  };

  const premiumModelModal = (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onCancel={canPurchase ? handleUseDefaultModel : undefined}
      onConfirm={canPurchase ? handleTopUpNow : handleUseDefaultModel}
      title={t("freeModelRestrictionTitle")}
      description={t("freeModelRestrictionDescription", {
        modelName: getFreeUserAiModelDisplayNames(aiModels.models),
      })}
      confirmText={
        canPurchase
          ? t("freeModelRestrictionTopUp")
          : t("freeModelRestrictionUseDefault")
      }
      cancelText={canPurchase ? t("freeModelRestrictionUseDefault") : t("cancel")}
    />
  );

  return { selectModel, premiumModelModal };
}
