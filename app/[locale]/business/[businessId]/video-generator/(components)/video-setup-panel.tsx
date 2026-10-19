"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bot,
  ChevronRight,
  Clapperboard,
  ImageIcon,
  Package,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SharedReferencePanel } from "@/components/shared/shared-reference-panel";
import { DEFAULT_PRODUCT_IMAGE } from "@/constants";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { showToast } from "@/helper/show-toast";
import { useLibraryTemplateSaveOwnBusinessReferenceImage } from "@/services/library.api";
import { AvatarSelectionModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/avatar-selection-modal";
import { ProductSelectionModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/product-selection-modal";
import { VideoSetup } from "./use-video-generator";

type VideoSetupPanelProps = {
  initialSetup: VideoSetup | null;
  onConfirm: (setup: VideoSetup) => void;
};

// First step of the video generator: pick the product (required) and, if
// wanted, an avatar and a style reference. The chat opens after this.
export function VideoSetupPanel({ initialSetup, onConfirm }: VideoSetupPanelProps) {
  const t = useTranslations("videoGenerator");
  const [product, setProduct] = useState(initialSetup?.product ?? null);
  const [avatar, setAvatar] = useState(initialSetup?.avatar ?? null);
  const [reference, setReference] = useState(initialSetup?.reference ?? null);
  const [openModal, setOpenModal] = useState<"product" | "avatar" | "reference" | null>(
    null
  );

  return (
    <div className="flex min-h-0 flex-col bg-card lg:h-full">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-2 pt-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clapperboard className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold">{t("setupTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("setupDescription")}</p>
        </div>

        <SetupSlot
          label={t("setupProduct")}
          emptyLabel={t("setupSelectProduct")}
          icon={<Package className="h-4 w-4" />}
          imageUrl={product ? product.imageUrl || DEFAULT_PRODUCT_IMAGE : null}
          title={product?.name}
          onOpen={() => setOpenModal("product")}
          onRemove={() => setProduct(null)}
        />
        <SetupSlot
          label={t("setupAvatar")}
          isOptional
          emptyLabel={t("setupSelectAvatar")}
          icon={<Bot className="h-4 w-4" />}
          imageUrl={avatar?.imageUrl ?? null}
          title={avatar?.title}
          onOpen={() => setOpenModal("avatar")}
          onRemove={() => setAvatar(null)}
        />
        <SetupSlot
          label={t("setupReference")}
          isOptional
          emptyLabel={t("setupSelectReference")}
          icon={<ImageIcon className="h-4 w-4" />}
          imageUrl={reference?.imageUrl ?? null}
          title={reference?.name || t("setupReference")}
          onOpen={() => setOpenModal("reference")}
          onRemove={() => setReference(null)}
        />
      </div>

      <div className="sticky bottom-0 z-10 space-y-2 border-t bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!product && (
          <p className="text-center text-xs text-muted-foreground">{t("setupProductRequired")}</p>
        )}
        <Button
          type="button"
          className="w-full"
          disabled={!product}
          onClick={() => product && onConfirm({ product, avatar, reference })}
        >
          {t("setupContinue")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <ProductSelectionModal
        isOpen={openModal === "product"}
        onClose={() => setOpenModal(null)}
        selectedProductId={product?.id ?? null}
        onSelect={(item) =>
          setProduct({ id: item.id, name: item.name, imageUrl: item.images?.[0] || null })
        }
      />
      <AvatarSelectionModal
        isOpen={openModal === "avatar"}
        onClose={() => setOpenModal(null)}
        selectedAvatars={avatar ? [avatar] : []}
        onSave={(items) => {
          setAvatar(items[0] ?? null);
          setOpenModal(null);
        }}
      />
      <ReferenceSelectionModal
        isOpen={openModal === "reference"}
        onClose={() => setOpenModal(null)}
        onSelect={(item) => {
          setReference(item);
          setOpenModal(null);
        }}
      />
    </div>
  );
}

function SetupSlot({
  label,
  isOptional = false,
  emptyLabel,
  icon,
  imageUrl,
  title,
  onOpen,
  onRemove,
}: {
  label: string;
  isOptional?: boolean;
  emptyLabel: string;
  icon: React.ReactNode;
  // null = nothing picked yet.
  imageUrl: string | null;
  title?: string;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("videoGenerator");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {label}{" "}
        {isOptional && (
          <span className="text-xs font-normal text-muted-foreground">({t("optional")})</span>
        )}
      </p>
      {imageUrl ? (
        <div className="flex items-center gap-3 rounded-xl border bg-background-secondary p-2.5">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={onOpen}
            title={t("setupChange")}
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image src={imageUrl} alt="" fill sizes="56px" className="object-cover" unoptimized />
            </div>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm font-medium">{title}</span>
              <span className="text-xs text-primary">{t("setupChange")}</span>
            </span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
            title={t("setupRemove")}
            aria-label={t("setupRemove")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl border border-dashed bg-background-secondary px-3 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          onClick={onOpen}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <span className="flex-1 text-muted-foreground">{emptyLabel}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// The content generator's reference library, picking into the video setup
// instead of the content form.
function ReferenceSelectionModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (reference: { imageUrl: string; name: string | null }) => void;
}) {
  const t = useTranslations("videoGenerator");
  const { businessId } = useParams() as { businessId: string };
  const {
    publishedTemplates,
    savedTemplates,
    onSaveUnsave,
    onConfirmUnsave,
    onCloseUnsaveModal,
    unsaveModal,
  } = useContentGenerate();
  const mSaveReference = useLibraryTemplateSaveOwnBusinessReferenceImage();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="h-[85dvh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("setupSelectReference")}</DialogTitle>
          <DialogDescription>{t("setupReferenceDescription")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          <SharedReferencePanel
            publishedTemplates={publishedTemplates}
            savedTemplates={savedTemplates}
            onSelectReferenceImage={(imageUrl, imageName) =>
              onSelect({ imageUrl, name: imageName })
            }
            onSaveUploadedReference={async ({ imageUrl, name }) => {
              const res = await mSaveReference.mutateAsync({
                businessId,
                formData: { imageUrl, name },
              });
              showToast("success", res.data.responseMessage);
              onSelect({ imageUrl, name });
            }}
            onSaveUnsave={onSaveUnsave}
            onConfirmUnsave={onConfirmUnsave}
            onCloseUnsaveModal={onCloseUnsaveModal}
            unsaveModal={unsaveModal}
            isLoading={false}
            selectedTemplate={null}
            showSearchNotFound
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
