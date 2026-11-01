"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  ImageIcon,
  Loader2,
  Package,
  Sparkles,
  Upload,
  X,
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
import { cn } from "@/lib/utils";
import {
  VIDEO_DURATIONS,
  VIDEO_RATIOS,
  VideoDuration,
  VideoRatio,
} from "@/models/api/content/video.type";
import { useLibraryTemplateSaveOwnBusinessReferenceImage } from "@/services/library.api";
import { AvatarSelectionModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/avatar-selection-modal";
import { ProductSelectionModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/product-selection-modal";
import { MAX_VIDEO_UPLOAD_MB } from "./media-utils";
import { getDragKind } from "./use-media-import";
import { VideoSetup } from "./use-video-generator";
import { OptionDropdown, RatioIcon } from "./video-chat-panel";

const SUGGESTION_KEYS = [
  "suggestionProductLaunch",
  "suggestionPromo",
  "suggestionTutorial",
] as const;

type VideoStartScreenProps = {
  // Already formatted for display.
  scheduleLabel: string | null;
  isImporting: boolean;
  onUploadVideos: (files: File[]) => void;
  onChooseAi: () => void;
};

// First screen of the video generator. Two ways in: upload videos the user
// already has (they land in the sequence, ready to edit through the chat), or
// brief the AI (see VideoBriefPanel), which drafts a storyboard to approve
// before anything is rendered.
export function VideoStartScreen({
  scheduleLabel,
  isImporting,
  onUploadVideos,
  onChooseAi,
}: VideoStartScreenProps) {
  const t = useTranslations("videoGenerator");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background-secondary">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-xl space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clapperboard className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold sm:text-2xl">{t("startTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("startDescription")}</p>
          {scheduleLabel && <ScheduleBadge label={scheduleLabel} />}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <UploadOption isImporting={isImporting} onUpload={onUploadVideos} />
          <AiOption onStart={onChooseAi} />
        </div>
      </div>
    </div>
  );
}

function ScheduleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
      <CalendarDays className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

// Numbered "how it works" list inside each option card.
function OptionSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-2.5 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {index + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function UploadOption({
  isImporting,
  onUpload,
}: {
  isImporting: boolean;
  onUpload: (files: File[]) => void;
}) {
  const t = useTranslations("videoGenerator");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="space-y-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <Upload className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold">{t("uploadOptionTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("uploadOptionDescription")}</p>
      </div>
      <OptionSteps steps={[t("uploadOptionStep1"), t("uploadOptionStep2")]} />

      <button
        type="button"
        disabled={isImporting}
        className={cn(
          "mt-auto flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
          isDragOver && "border-primary/60 bg-primary/5"
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          const kind = getDragKind(event.dataTransfer);
          if (isImporting || (kind !== "video" && kind !== "file")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragOver(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          if (isImporting) return;
          onUpload(Array.from(event.dataTransfer.files));
        }}
      >
        {isImporting ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <Upload className="h-6 w-6 text-primary" />
        )}
        <span className="text-sm font-medium">
          {isImporting ? t("addingMedia") : t("uploadDropLabel")}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("uploadDropHint", { max: MAX_VIDEO_UPLOAD_MB })}
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = "";
          if (files.length) onUpload(files);
        }}
      />
    </div>
  );
}

function AiOption({ onStart }: { onStart: () => void }) {
  const t = useTranslations("videoGenerator");

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-primary/30 bg-card p-5 shadow-sm ring-1 ring-primary/10 sm:p-6">
      <div className="space-y-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold">{t("aiOptionTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("aiOptionDescription")}</p>
      </div>
      <OptionSteps
        steps={[t("aiOptionStep1"), t("aiOptionStep2"), t("aiOptionStep3")]}
      />
      <Button type="button" className="mt-auto w-full" onClick={onStart}>
        {t("aiOptionCta")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

type VideoBriefPanelProps = {
  // Prefills the brief, e.g. after starting over.
  initialSetup: VideoSetup | null;
  ratio: VideoRatio;
  duration: VideoDuration;
  onRatioChange: (ratio: VideoRatio) => void;
  onDurationChange: (duration: VideoDuration) => void;
  onBack: () => void;
  onSubmit: (setup: VideoSetup, prompt: string) => void;
};

// The AI path, in the chat's place: product (required), avatar and style
// reference (optional) on top, and a chat box at the bottom to describe the
// storyline. Sending it drafts the storyboard and the chat takes over.
export function VideoBriefPanel({
  initialSetup,
  ratio,
  duration,
  onRatioChange,
  onDurationChange,
  onBack,
  onSubmit,
}: VideoBriefPanelProps) {
  const t = useTranslations("videoGenerator");
  const [product, setProduct] = useState(initialSetup?.product ?? null);
  const [avatar, setAvatar] = useState(initialSetup?.avatar ?? null);
  const [reference, setReference] = useState(initialSetup?.reference ?? null);
  const [prompt, setPrompt] = useState("");
  const [openModal, setOpenModal] = useState<"product" | "avatar" | "reference" | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmedPrompt = prompt.trim();
  const missingHint = !product
    ? t("setupProductRequired")
    : !trimmedPrompt
      ? t("briefPromptRequired")
      : null;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 66), 180)}px`;
  }, [prompt]);

  const handleSubmit = () => {
    if (!product || !trimmedPrompt) return;
    onSubmit({ product, avatar, reference }, trimmedPrompt);
  };

  return (
    <div className="flex min-h-0 flex-col bg-card lg:h-full">
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onBack}
          title={t("back")}
          aria-label={t("back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{t("aiOptionTitle")}</p>
          <p className="truncate text-xs text-muted-foreground">{t("briefStepLabel")}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">{t("briefTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("briefDescription")}</p>
        </div>

        <div className="space-y-4">
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

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("suggestionLabel")}
          </p>
          {SUGGESTION_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="flex w-full items-start gap-2 rounded-xl border bg-background-secondary px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              onClick={() => {
                setPrompt(t(key));
                textareaRef.current?.focus();
              }}
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 space-y-2 border-t bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="text-xs text-muted-foreground">{missingHint ?? t("briefSubmitHint")}</p>
        <div className="rounded-2xl border border-input bg-background-secondary p-3 focus-within:border-primary/50">
          <textarea
            ref={textareaRef}
            value={prompt}
            rows={3}
            aria-label={t("briefPromptLabel")}
            placeholder={t("briefPromptPlaceholder")}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            className="block w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground/70 sm:text-sm"
          />
          <div className="mt-2 flex items-center gap-1.5">
            <OptionDropdown
              label={t("ratio")}
              value={ratio}
              options={VIDEO_RATIOS.map((item) => ({
                value: item,
                label: item,
                icon: <RatioIcon ratio={item} />,
              }))}
              onChange={onRatioChange}
            />
            <OptionDropdown
              label={t("duration")}
              value={duration}
              options={VIDEO_DURATIONS.map((item) => ({
                value: item,
                label: t("durationValue", { value: item }),
              }))}
              onChange={onDurationChange}
            />
            <Button
              type="button"
              size="icon-sm"
              className="ml-auto rounded-full"
              disabled={Boolean(missingHint)}
              onClick={handleSubmit}
              title={t("createStoryboard")}
              aria-label={t("createStoryboard")}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
    <div className="min-w-0 space-y-2">
      <p className="text-sm font-medium">
        {label}{" "}
        {isOptional && (
          <span className="text-xs font-normal text-muted-foreground">({t("optional")})</span>
        )}
      </p>
      {imageUrl ? (
        <div className="flex items-center gap-2.5 rounded-xl border bg-background-secondary p-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            onClick={onOpen}
            title={t("setupChange")}
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image src={imageUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
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
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="flex h-[66px] w-full items-center gap-3 rounded-xl border border-dashed bg-background-secondary px-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          onClick={onOpen}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{emptyLabel}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// The content generator's reference library, picking into the video brief
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
            onSaveUploadedReference={async ({ imageUrl, name, typeCategoryIds }) => {
              const res = await mSaveReference.mutateAsync({
                businessId,
                formData: { imageUrl, name, typeCategoryIds },
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
