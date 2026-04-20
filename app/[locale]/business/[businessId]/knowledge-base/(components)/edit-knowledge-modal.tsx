"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooterWithButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BusinessKnowledgeForm } from "@/app/[locale]/business/[businessId]/knowledge-base/(components)/(form)/business-knowledge-form";
import { RoleKnowledgeForm } from "@/app/[locale]/business/[businessId]/knowledge-base/(components)/(form)/role-knowledge-form";
import {
  useRoleKnowledgeGetById,
  useBusinessKnowledgeGetById,
  useBusinessKnowledgeUpsert,
  useRoleKnowledgeUpsert,
} from "@/services/knowledge.api";
import { useParams } from "next/navigation";
import { useManageKnowledge } from "@/contexts/manage-knowledge-context";
import { showToast } from "@/helper/show-toast";
import { useBusinessKnowledgeSchema, useRoleKnowledgeSchema } from "@/validator/new-business/schema-with-i18n";
import { useTranslations } from "next-intl";

interface EditKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: "business" | "role";
}

export function EditKnowledgeModal({
  isOpen,
  onClose,
  initialTab,
}: EditKnowledgeModalProps) {
  const businessKnowledgeSchema = useBusinessKnowledgeSchema();
  const roleKnowledgeSchema = useRoleKnowledgeSchema();
  const [activeTab, setActiveTab] = useState<"business" | "role">(initialTab);
  const { formKnowledge, setFormKnowledge, errors, setErrors } =
    useManageKnowledge();

  const mBusinessKnowledge = useBusinessKnowledgeUpsert();
  const mRoleKnowledge = useRoleKnowledgeUpsert();
  const t = useTranslations();

  const { businessId } = useParams() as { businessId: string };
  const { data: roleKnowledgeData } = useRoleKnowledgeGetById(businessId);
  const { data: businessKnowledgeData } =
    useBusinessKnowledgeGetById(businessId);

  useEffect(() => {
    if (isOpen && roleKnowledgeData && businessKnowledgeData) {
      setFormKnowledge({
        role: roleKnowledgeData?.data?.data,
        business: businessKnowledgeData?.data?.data,
      });
      // Clear errors when modal opens
      setErrors({ business: {}, role: {} });
    }
  }, [
    isOpen,
    roleKnowledgeData,
    businessKnowledgeData,
    setFormKnowledge,
    setErrors,
  ]);

  const handleTabChange = (tab: "business" | "role") => {
    setActiveTab(tab);
    // Clear errors for the tab being switched to
    const newErrors = { ...errors };
    if (tab === "business") {
      newErrors.business = {};
    } else {
      newErrors.role = {};
    }
    setErrors(newErrors);
  };

  const validateForms = () => {
    const validationErrors = { ...errors };

    // Validate business knowledge
    const businessResult = businessKnowledgeSchema.safeParse(
      formKnowledge.business
    );
    if (!businessResult.success) {
      const businessErrors: Record<string, string> = {};
      businessResult.error.issues.forEach((error) => {
        businessErrors[error.path[0] as string] = error.message;
      });
      validationErrors.business = businessErrors;
    } else {
      validationErrors.business = {};
    }

    // Validate role knowledge
    const roleResult = roleKnowledgeSchema.safeParse(formKnowledge.role);
    if (!roleResult.success) {
      const roleErrors: Record<string, string> = {};
      roleResult.error.issues.forEach((error) => {
        roleErrors[error.path[0] as string] = error.message;
      });
      validationErrors.role = roleErrors;
    } else {
      validationErrors.role = {};
    }

    setErrors(validationErrors);

    // Check if there are any validation errors
    const hasErrors =
      Object.keys(validationErrors.business).length > 0 ||
      Object.keys(validationErrors.role).length > 0;

    if (hasErrors) {
      throw new Error(t("errors.formValidation"));
    }
  };

  const onSubmit = async () => {
    try {
      validateForms();

      await Promise.all([
        mBusinessKnowledge.mutateAsync({
          businessId,
          formData: formKnowledge.business,
        }),
        await mRoleKnowledge.mutateAsync({
          businessId,
          formData: formKnowledge.role,
        }),
      ]);
      showToast("success", t("toast.business.knowledgeUpdated"));
      onClose();
    } catch (e) {
      showToast("error", e);
    }
  };

  const m = useTranslations("modal");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m("titleBusinessRole")}</DialogTitle>
          <DialogDescription>
            {m("subtitleBusinessRole")}
          </DialogDescription>

          <div className="flex justify-center">
            <div className="flex bg-background rounded-lg w-full">
              <button
                onClick={() => handleTabChange("business")}
                className={`px-4 py-3 text-sm font-medium rounded-md transition-colors w-2/3 ${
                  activeTab === "business"
                    ? "bg-blue-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m("business")}
              </button>
              <button
                onClick={() => handleTabChange("role")}
                className={`px-4 py-3 text-sm font-medium rounded-md transition-colors w-2/3 ${
                  activeTab === "role"
                    ? "bg-blue-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m("role")}
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Bar */}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "business" && <BusinessKnowledgeForm />}

          {activeTab === "role" && <RoleKnowledgeForm />}
        </div>

        <DialogFooterWithButton
          buttonMessage={m("save")}
          onClick={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
