"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  normalizeBusinessKnowledge,
  normalizeRoleKnowledge,
  prepareBusinessKnowledgePayload,
  prepareRoleKnowledgePayload,
} from "@/helper/knowledge-form";
import {
  getApiValidationErrors,
  getFirstValidationMessage,
} from "@/helper/api-validation";
import { showToast } from "@/helper/show-toast";
import { useBusinessKnowledgeSchema, useRoleKnowledgeSchema } from "@/validator/new-business/schema-with-i18n";
import { useTranslations } from "next-intl";
import {
  KnowledgeListError,
  KnowledgeListLoading,
} from "./knowledge-list-states";

const BUSINESS_VALIDATION_FIELD_MAP = {
  primaryLogoUrl: "primaryLogo",
  businessPhone: "businessPhone",
  countryCode: "countryCode",
  websiteUrl: "website",
} as const;

const ROLE_VALIDATION_FIELD_MAP = {
  targetAudience: "targetAudience",
  tone: "tone",
  hashtags: "hashtags",
} as const;

type KnowledgeTab = "business" | "role";

interface EditKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: KnowledgeTab;
}

export function EditKnowledgeModal({
  isOpen,
  onClose,
  initialTab,
}: EditKnowledgeModalProps) {
  const businessKnowledgeSchema = useBusinessKnowledgeSchema();
  const roleKnowledgeSchema = useRoleKnowledgeSchema();
  const [activeTab, setActiveTab] = useState<KnowledgeTab>(initialTab);
  const { formKnowledge, setFormKnowledge, errors, setErrors } =
    useManageKnowledge();

  const mBusinessKnowledge = useBusinessKnowledgeUpsert();
  const mRoleKnowledge = useRoleKnowledgeUpsert();
  const t = useTranslations();

  const { businessId } = useParams() as { businessId: string };
  const {
    data: roleKnowledgeData,
    isError: isRoleError,
    refetch: refetchRole,
    isRefetching: isRefetchingRole,
  } = useRoleKnowledgeGetById(businessId);
  const {
    data: businessKnowledgeData,
    isError: isBusinessError,
    refetch: refetchBusiness,
    isRefetching: isRefetchingBusiness,
  } = useBusinessKnowledgeGetById(businessId);

  // The form state lives in a layout-level context, so until this business's
  // data is loaded into it the form may still hold another business's values.
  // Saving is blocked until then.
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const isSubmittingRef = useRef(false);

  const isLoadError =
    (isBusinessError && !businessKnowledgeData) ||
    (isRoleError && !roleKnowledgeData);

  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
      return;
    }
    setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen && !isInitialized && roleKnowledgeData && businessKnowledgeData) {
      setFormKnowledge({
        role: normalizeRoleKnowledge(roleKnowledgeData?.data?.data),
        business: normalizeBusinessKnowledge(businessKnowledgeData?.data?.data),
      });
      // Clear errors when modal opens
      setErrors({ business: {}, role: {} });
      setIsInitialized(true);
    }
  }, [
    isOpen,
    isInitialized,
    roleKnowledgeData,
    businessKnowledgeData,
    setFormKnowledge,
    setErrors,
  ]);

  // Both tabs are saved together, so show the tab that holds the errors.
  const showTabWithErrors = (
    businessErrors: Record<string, string>,
    roleErrors: Record<string, string>
  ) => {
    const businessHasErrors = Object.keys(businessErrors).length > 0;
    const roleHasErrors = Object.keys(roleErrors).length > 0;
    const activeHasErrors =
      activeTab === "business" ? businessHasErrors : roleHasErrors;
    if (!activeHasErrors && (businessHasErrors || roleHasErrors)) {
      setActiveTab(businessHasErrors ? "business" : "role");
    }
  };

  const validateForms = () => {
    const validationErrors = { ...errors };

    // Validate business knowledge
    const businessResult = businessKnowledgeSchema.safeParse({
      ...formKnowledge.business,
      primaryLogo: formKnowledge.business.primaryLogo ?? "",
    });
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
    showTabWithErrors(validationErrors.business, validationErrors.role);

    // Check if there are any validation errors
    const hasErrors =
      Object.keys(validationErrors.business).length > 0 ||
      Object.keys(validationErrors.role).length > 0;

    if (hasErrors) {
      throw new Error(t("errors.formValidation"));
    }
  };

  const onSubmit = async () => {
    if (isSubmittingRef.current || !isInitialized || isUploadingLogo) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      validateForms();

      const [businessResult, roleResult] = await Promise.allSettled([
        mBusinessKnowledge.mutateAsync({
          businessId,
          formData: prepareBusinessKnowledgePayload(formKnowledge.business),
        }),
        mRoleKnowledge.mutateAsync({
          businessId,
          formData: prepareRoleKnowledgePayload(formKnowledge.role),
        }),
      ]);

      if (
        businessResult.status === "fulfilled" &&
        roleResult.status === "fulfilled"
      ) {
        showToast("success", t("toast.business.knowledgeUpdated"));
        onClose();
        return;
      }

      // Map each request's validation errors to its own tab.
      const businessErrors =
        businessResult.status === "rejected"
          ? getApiValidationErrors(
              businessResult.reason,
              BUSINESS_VALIDATION_FIELD_MAP
            )
          : {};
      const roleErrors =
        roleResult.status === "rejected"
          ? getApiValidationErrors(roleResult.reason, ROLE_VALIDATION_FIELD_MAP)
          : {};

      if (Object.keys(businessErrors).length || Object.keys(roleErrors).length) {
        setErrors({
          business: businessErrors,
          role: roleErrors,
        });
        showTabWithErrors(businessErrors, roleErrors);
        showToast(
          "error",
          getFirstValidationMessage({ ...businessErrors, ...roleErrors }) ||
            t("errors.formValidation")
        );
        return;
      }

      showToast(
        "error",
        businessResult.status === "rejected"
          ? businessResult.reason
          : roleResult.status === "rejected"
            ? roleResult.reason
            : undefined
      );
    } catch (error) {
      // Client-side validation failed (the fields show the details).
      showToast("error", error);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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
                type="button"
                onClick={() => setActiveTab("business")}
                className={`px-4 py-3 text-sm font-medium rounded-md transition-colors w-2/3 ${
                  activeTab === "business"
                    ? "bg-blue-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m("business")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("role")}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6 space-y-6">
          {!isInitialized ? (
            isLoadError ? (
              <KnowledgeListError
                onRetry={() => {
                  if (isBusinessError) refetchBusiness();
                  if (isRoleError) refetchRole();
                }}
                isRetrying={isRefetchingBusiness || isRefetchingRole}
              />
            ) : (
              <KnowledgeListLoading />
            )
          ) : activeTab === "business" ? (
            <BusinessKnowledgeForm onUploadingChange={setIsUploadingLogo} />
          ) : (
            <RoleKnowledgeForm />
          )}
        </div>

        <DialogFooterWithButton
          buttonMessage={m("save")}
          onClick={onSubmit}
          disabled={isSubmitting || !isInitialized || isUploadingLogo}
        />
      </DialogContent>
    </Dialog>
  );
}
