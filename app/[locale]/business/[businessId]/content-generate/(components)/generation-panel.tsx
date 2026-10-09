"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { LogoLoader } from "@/components/base/logo-loader";
import { showToast } from "@/helper/show-toast";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { cn } from "@/lib/utils";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { helperService } from "@/services/helper.api";
import { useAppAvatarGetAll } from "@/services/app-avatar.api";
import { useBusinessGetById } from "@/services/business.api";
import {
  useBusinessAvatarGetAll,
  useProductKnowledgeGetAll,
} from "@/services/knowledge.api";
import {
  ImportKnowledgeModal,
  KnowledgeImageOption,
} from "./import-knowledge-modal";
import { RssTrendModal } from "./rss-trend-modal";
import { SelectedArticleRss } from "./selected-article-rss";
import { SelectedReferenceImage } from "./selected-reference-image";
import { getModelRestrictionCopy } from "./model-restriction-copy";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  AlertCircle,
  Bot,
  Check,
  Copy,
  CreditCard,
  Newspaper,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { GenerateFormBasic } from "./generate-form-basic";
import { ChatComposerField } from "./chat-composer-field";
import { GeneratedImageViewer } from "./generated-image-viewer";
import { getAiModelDisplayName } from "@/models/api/content/ai-model";
import { AiModelLogo } from "@/components/forms/ai-model-select";

export function GenerationPanel() {
  const { businessId } = useParams() as { businessId: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const {
    mode,
    form,
    isLoading,
    aiModels,
    selectedHistory,
    selectedGeneratedImageUrl,
    schedulerDraftPost,
    schedulerChatSeed,
    histories,
    rss,
    onSelectAiModel,
    onSelectGeneratedImage,
    onSelectHistory,
    onSubmitGenerate,
  } = useContentGenerate();
  const t = useTranslations("generationPanel");
  const schedulerT = useTranslations("contentGenerateScheduler");
  const [isTrendDialogOpen, setIsTrendDialogOpen] = useState(false);
  const [isKnowledgeDialogOpen, setIsKnowledgeDialogOpen] = useState(false);
  const [isRestrictedModelModalOpen, setIsRestrictedModelModalOpen] =
    useState(false);
  const [previewPromptImage, setPreviewPromptImage] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [flyingImage, setFlyingImage] = useState<{ url: string; rect: DOMRect; isFlying: boolean; endX: number; endY: number } | null>(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);

  const triggerFlyAnimation = (url: string, targetRect: DOMRect) => {
    const composer = document.getElementById("chat-composer-container");
    const composerRect = composer?.getBoundingClientRect();
    const endX = composerRect ? composerRect.left + 24 : window.innerWidth / 2 - 40;
    const endY = composerRect ? composerRect.top + 24 : window.innerHeight - 100;

    setFlyingImage({ url, rect: targetRect, isFlying: false, endX, endY });
    
    // Force a reflow and then trigger animation
    setTimeout(() => {
      setFlyingImage((prev) => (prev ? { ...prev, isFlying: true } : null));
    }, 100);

    setTimeout(() => {
      setFlyingImage(null);
    }, 1800);
  };
  const { data: businessData } = useBusinessGetById(businessId);
  const { data: productKnowledgeData } = useProductKnowledgeGetAll(
    businessId,
    {
      limit: 100,
      page: 1,
      sortBy: "name",
      sort: "asc",
    },
    Boolean(businessId)
  );
  const { data: businessAvatarData, isLoading: isLoadingBusinessAvatars } =
    useBusinessAvatarGetAll(businessId, {
      limit: 100,
      page: 1,
      sortBy: "name",
      sort: "asc",
    });
  const { data: appAvatarData, isLoading: isLoadingAppAvatars } =
    useAppAvatarGetAll(
      {
        limit: 100,
        page: 1,
        sortBy: "name",
        sort: "asc",
      },
      isKnowledgeDialogOpen
    );

  useEffect(() => {
    if (isTrendDialogOpen && form.rss) {
      setIsTrendDialogOpen(false);
    }
  }, [form.rss, isTrendDialogOpen]);

  const currentThread = useMemo(() => {
    if (!selectedHistory) return [];
    const activeChatSessionId =
      selectedHistory.input.chatSessionId ?? schedulerDraftPost?.chatSessionId ?? null;

    if (selectedHistory.id.startsWith("chat-") && activeChatSessionId) {
      return histories
        .flatMap((item) => item.jobs)
        .filter(
          (job) =>
            job.id.startsWith("chat-") &&
            job.input.chatSessionId === activeChatSessionId
        )
        .sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        );
    }

    const selectedDate = new Date(selectedHistory.createdAt).toDateString();

    return histories
      .flatMap((item) => item.jobs)
      .filter(
        (job) =>
          job.input.productKnowledgeId ===
          selectedHistory.input.productKnowledgeId &&
          new Date(job.createdAt).toDateString() === selectedDate
      )
      .sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      );
  }, [histories, schedulerDraftPost?.chatSessionId, selectedHistory]);
  const logoImageOptions = useMemo<KnowledgeImageOption[]>(() => {
    const businessLogo = businessData?.data?.data?.logo || "";
    if (!businessLogo) return [];
    return [
      {
        id: "business-logo",
        imageUrl: businessLogo,
        sourceLabel: t("knowledgeTabLogo"),
        title: t("logo"),
      },
    ];
  }, [businessData?.data?.data?.logo, t]);

  const productImageOptions = useMemo<KnowledgeImageOption[]>(() => {
    const products = productKnowledgeData?.data?.data || [];
    const imageSet = new Set<string>();
    const options: KnowledgeImageOption[] = [];

    products.forEach((product) => {
      product.images.forEach((imageUrl, imageIndex) => {
        if (!imageUrl || imageSet.has(imageUrl)) return;
        imageSet.add(imageUrl);
        options.push({
          id: `product-${product.id}-${imageIndex}`,
          imageUrl,
          sourceLabel: t("knowledgeTabProduct"),
          title: product.name,
        });
      });
    });

    return options;
  }, [productKnowledgeData?.data?.data, t]);
  const avatarImageOptions = useMemo<KnowledgeImageOption[]>(() => {
    const avatars = businessAvatarData?.data?.data || [];

    return avatars.map((avatar) => ({
      id: `avatar-${avatar.id}`,
      imageUrl: avatar.imageUrl,
      sourceLabel: t("knowledgeTabAvatar"),
      title: avatar.name,
    }));
  }, [businessAvatarData?.data?.data, t]);
  const moreAvatarImageOptions = useMemo<KnowledgeImageOption[]>(() => {
    const avatars = appAvatarData?.data?.data || [];

    return avatars.map((avatar) => ({
      id: `app-avatar-${avatar.id}`,
      imageUrl: avatar.imageUrl,
      sourceLabel: t("avatarSourceBrowse"),
      title: avatar.name,
    }));
  }, [appAvatarData?.data?.data, t]);

  const handleRegenerate = () => {
    if (
      aiModels.isFreeUser &&
      aiModels.freeUserAllowedModel &&
      form.basic.model &&
      form.basic.model !== aiModels.freeUserAllowedModel.name
    ) {
      setIsRestrictedModelModalOpen(true);
      return;
    }

    onSubmitGenerate({ mode: "regenerate", additionalImages: attachedImages });
    setAttachedImages([]);
  };

  const handleUseFreeUserAllowedModel = () => {
    const allowedModel = aiModels.freeUserAllowedModel;
    if (!allowedModel) {
      setIsRestrictedModelModalOpen(false);
      return;
    }

    const allowedRatios = allowedModel.validRatios.length
      ? allowedModel.validRatios
      : aiModels.validRatios;
    const nextRatio = allowedRatios.includes(form.basic.ratio)
      ? form.basic.ratio
      : (allowedRatios[0] || aiModels.validRatios[0] || "1:1");

    onSelectAiModel(allowedModel);
    setIsRestrictedModelModalOpen(false);
    void onSubmitGenerate({
      mode: "regenerate",
      additionalImages: attachedImages,
      model: allowedModel.name,
      ratio: nextRatio as "1:1" | "2:3" | "4:5" | "5:4" | "9:16" | "16:9",
      imageSize: allowedModel.imageSizes?.[0] || null,
    });
    setAttachedImages([]);
  };

  const handleTopUpNow = () => {
    setIsRestrictedModelModalOpen(false);
    router.push(`/business/${businessId}/settings?tab=billing&topUp=token`);
  };

  const isInsufficientTokenError = (message?: string | null) => {
    const normalizedMessage = message?.toLowerCase() || "";

    return (
      normalizedMessage.includes("token") &&
      (normalizedMessage.includes("tidak mencukupi") ||
        normalizedMessage.includes("insufficient") ||
        normalizedMessage.includes("not enough") ||
        normalizedMessage.includes("habis") ||
        normalizedMessage.includes("saldo"))
    );
  };

  const handleAttachImage = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAttachment(true);
      const imageUrl = await helperService.uploadSingleImage({ image: file });
      setAttachedImages((current) => Array.from(new Set([...current, imageUrl])));
    } finally {
      setIsUploadingAttachment(false);
      if (attachInputRef.current) attachInputRef.current.value = "";
    }
  };

  const handleOpenKnowledgeDialog = () => {
    setIsKnowledgeDialogOpen(true);
  };

  const handleAttachFromKnowledge = (images: string[]) => {
    if (images.length === 0) return;
    setAttachedImages((current) =>
      Array.from(new Set([...current, ...images]))
    );
    setIsKnowledgeDialogOpen(false);
  };

  const selectedImage =
    selectedGeneratedImageUrl || selectedHistory?.result?.images?.[0];
  const modelRestrictionCopy = getModelRestrictionCopy(
    locale,
    aiModels.freeUserAllowedModel
      ? getAiModelDisplayName(aiModels.freeUserAllowedModel)
      : getAiModelDisplayName("gpt-image-1")
  );
  const schedulerMode = Boolean(searchParams.get("scheduleDate"));
  const selectedEditReferenceImage =
    selectedGeneratedImageUrl &&
      form.basic.referenceImageName === "Selected image"
      ? selectedGeneratedImageUrl
      : null;
  const handleOpenScheduleSummary = () => {
    window.dispatchEvent(new Event("content-generate:open-schedule-summary"));
  };

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      showToast("success", t("copyPromptSuccess"));
    } catch {
      showToast("error", t("copyPromptFailed"));
    }
  };

  if (mode === "regenerate" && selectedHistory) {
    return (
      <>
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 pb-44 lg:pb-6 scrollbar-hidden">
            {currentThread.map((job, jobIndex) => {
              const isInitialSchedulerBubble =
                jobIndex === 0 && job.id.startsWith("chat-");
              const avatarPromptImages = Array.from(
                new Set(
                  [
                    job.input.avatarImageUrl,
                    ...(job.input.avatarImages || []),
                    ...(isInitialSchedulerBubble
                      ? schedulerChatSeed?.avatarImages || []
                      : []),
                  ].filter(Boolean) as string[]
                )
              );
              const additionalPromptImages = (job.input.additionalImages || []).filter(
                (imageUrl) => !avatarPromptImages.includes(imageUrl)
              );
              const initialReferenceImage = isInitialSchedulerBubble
                ? schedulerChatSeed?.referenceImage ||
                null
                : null;
              const initialProductImage = isInitialSchedulerBubble
                ? schedulerChatSeed?.productImage ||
                null
                : null;
              const promptImages = Array.from(
                new Set(
                  [
                    initialReferenceImage,
                    initialProductImage,
                    job.input.referenceImage,
                    ...(job.product?.images || []),
                    ...avatarPromptImages,
                    ...additionalPromptImages,
                  ].filter(Boolean) as string[]
                )
              );

              return (
                <div key={job.id} className="space-y-3">
                  {job.input.prompt ||
                    promptImages.length > 0 ? (
                    <div className="ml-auto flex max-w-[78%] flex-col items-end gap-2">
                      {promptImages.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {promptImages.map((imageUrl, imageIndex) => (
                            <div
                              key={`${imageUrl}-${imageIndex}`}
                              className="flex items-center gap-2"
                            >
                              {imageIndex > 0 ? (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-card">
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ) : null}
                              <Image
                                src={imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                                alt={`prompt image ${imageIndex + 1}`}
                                width={160}
                                height={160}
                                className="h-20 w-20 rounded-lg border object-cover sm:h-24 sm:w-24 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setPreviewPromptImage(imageUrl)}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {job.input.prompt ? (
                        <div className="flex max-w-full items-end gap-2 self-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 rounded-full border border-input bg-card/90 hover:bg-muted"
                            onClick={() => handleCopyPrompt(job.input.prompt || "")}
                            title={t("copyPrompt")}
                            aria-label={t("copyPrompt")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <div className="rounded-3xl bg-background-secondary px-4 py-3 text-sm break-words">
                            {job.input.prompt}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {job.status === "error" || job.stage === "error" ? (
                      (() => {
                        const errorMessage =
                          job.error?.message ||
                          "The generated image could not be completed.";
                        const shouldShowTopUpButton =
                          isInsufficientTokenError(errorMessage);

                        return (
                          <div className="w-full max-w-[360px] rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
                            <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                  Image generation failed
                                </p>
                                <p className="mt-1 text-xs break-words">
                                  {errorMessage}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-700 hover:bg-red-100 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-900/50"
                                onClick={() => {
                                  onSelectHistory(job);
                                  setTimeout(() => {
                                    const allowedModel = aiModels.freeUserAllowedModel;
                                    if (aiModels.isFreeUser && allowedModel) {
                                      const allowedRatios = allowedModel.validRatios.length
                                        ? allowedModel.validRatios
                                        : aiModels.validRatios;
                                      const nextRatio = allowedRatios.includes(form.basic.ratio)
                                        ? form.basic.ratio
                                        : (allowedRatios[0] || aiModels.validRatios[0] || "1:1");

                                      onSelectAiModel(allowedModel);
                                      void onSubmitGenerate({
                                        mode: "regenerate",
                                        model: allowedModel.name,
                                        ratio: nextRatio as "1:1" | "2:3" | "4:5" | "5:4" | "9:16" | "16:9",
                                        imageSize: allowedModel.imageSizes?.[0] || null,
                                      });
                                    } else {
                                      void onSubmitGenerate({ mode: "regenerate" });
                                    }
                                  }, 100);
                                }}
                                title="Retry Generation"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                            {shouldShowTopUpButton ? (
                              <Button
                                type="button"
                                size="sm"
                                className="mt-4 h-9 w-full bg-blue-600 text-xs font-medium text-white hover:bg-blue-700"
                                onClick={handleTopUpNow}
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                {modelRestrictionCopy.topUp}
                              </Button>
                            ) : null}
                          </div>
                        );
                      })()
                    ) : job.result?.images?.length ? (
                      job.result.images.map((image, index) => {
                        const imageUrl = image || DEFAULT_PLACEHOLDER_IMAGE;
                        const isSelected =
                          selectedHistory?.id === job.id &&
                          selectedImage === image;

                        const modelObj = aiModels.models.find(m => m.name === job.input.model || String(m.id) === String(job.input.model));
                        const modelDisplayName = modelObj ? getAiModelDisplayName(modelObj) : (getAiModelDisplayName(job.input.model) || t("generatedResult"));

                        return (
                          <div
                            key={`${job.id}-${index}`}
                            className="max-w-[82%] space-y-2"
                          >
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                              <AiModelLogo size="sm" imageUrl={modelObj?.image} />
                              {modelDisplayName}
                            </div>
                            <div className="relative group max-w-[270px]">
                              <GeneratedImageViewer
                                imageUrl={imageUrl}
                                imageItemId={job.result?.imageItemIds?.[index]}
                                alt={`generated-${index + 1}`}
                                protectFromContextMenu
                                className="w-full cursor-zoom-in rounded-lg border object-cover"
                                style={{ aspectRatio: job.result?.ratio ? job.result.ratio.replace(":", "/") : "1/1" }}
                              />
                              {form.basic.referenceImage !== imageUrl && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="absolute top-2 right-2 z-10 h-8 px-3 text-xs bg-background/80 hover:bg-background/100 backdrop-blur-sm shadow-sm opacity-90 hover:opacity-100"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const imgElement = e.currentTarget.parentElement?.querySelector("canvas") || e.currentTarget.parentElement?.querySelector("img");
                                    if (imgElement) {
                                      triggerFlyAnimation(imageUrl, imgElement.getBoundingClientRect());
                                    }
                                    onSelectGeneratedImage(job, image, {
                                      attachForEdit: true,
                                    });
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className={
                                  isSelected
                                    ? "h-8 bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
                                    : "h-8 border border-input bg-muted px-3 text-xs text-foreground hover:bg-muted/80"
                                }
                                onClick={() => onSelectGeneratedImage(job, image)}
                              >
                                {isSelected ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : null}
                                {isSelected ? "Content Used" : "Use Content"}
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-full max-w-[82%] overflow-hidden rounded-2xl border bg-background-secondary sm:max-w-[270px]">
                        <div className="relative flex min-h-48 items-center justify-center bg-card/40 p-6">
                          <LogoLoader
                            hideContentBackground={false}
                            className="relative z-10"
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
                        </div>
                        <div className="space-y-3 border-t bg-background px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-foreground">
                              Generating image...
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">
                              {Math.max(0, Math.min(100, job.progress ?? 0))}%
                            </div>
                          </div>
                          <Progress value={Math.max(0, Math.min(100, job.progress ?? 0))} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-0 right-0 z-20 border-t border-border bg-card px-4 py-3 sm:px-6 lg:z-10">
            <div className="space-y-3">
              <div className="flex h-full">
                <div id="chat-composer-container" className="min-w-0 flex-1 rounded-2xl border border-input bg-background-secondary p-3">
                  {(selectedEditReferenceImage || attachedImages.length > 0) && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {selectedEditReferenceImage ? (
                        <div className="relative">
                          <Image
                            src={
                              selectedEditReferenceImage ||
                              DEFAULT_PLACEHOLDER_IMAGE
                            }
                            alt="selected edit reference"
                            width={96}
                            height={96}
                            className="h-16 w-16 rounded-md object-cover"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                            onClick={() =>
                              form.setBasic({
                                ...form.basic,
                                referenceImage: "",
                                referenceImageName: "",
                                referenceImagePublisher: null,
                              })
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : null}

                      {attachedImages.map((imageUrl, index) => (
                        <div key={`${imageUrl}-${index}`} className="relative">
                          <Image
                            src={imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                            alt={`attached image ${index + 1}`}
                            width={96}
                            height={96}
                            className="h-16 w-16 rounded-md object-cover"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                            onClick={() =>
                              setAttachedImages((current) =>
                                current.filter((_, itemIndex) => itemIndex !== index)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <ChatComposerField
                    value={form.basic.prompt || ""}
                    onChange={(value) =>
                      form.setBasic({ ...form.basic, prompt: value })
                    }
                    placeholder={t("regeneratePromptPlaceholder")}
                    disabled={isLoading}
                    isUploadingAttachment={isUploadingAttachment}
                    isLoadingModels={aiModels.isLoading}
                    models={aiModels.models}
                    selectedModel={form.basic.model || ""}
                    canSubmit={Boolean(form.basic.prompt?.trim())}
                    onSubmit={handleRegenerate}
                    onSelectModel={(modelName) => {
                      const selectedModel = aiModels.models.find(
                        (model) => model.name === modelName
                      );
                      if (selectedModel) onSelectAiModel(selectedModel);
                    }}
                    onAttachGallery={() => attachInputRef.current?.click()}
                    onAttachKnowledge={handleOpenKnowledgeDialog}
                  />
                </div>
              </div>
              {schedulerMode && (
                <Button
                  type="button"
                  className="h-11 w-full bg-blue-500 text-white hover:bg-blue-600 lg:hidden"
                  disabled={isLoading || !selectedHistory}
                  onClick={handleOpenScheduleSummary}
                >
                  <WandSparkles className="h-4 w-4" />
                  {schedulerT("schedulePost")}
                </Button>
              )}
            </div>
            <input
              ref={attachInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAttachImage}
            />
          </div>
        </div>

        <ImportKnowledgeModal
          isOpen={isKnowledgeDialogOpen}
          onClose={() => setIsKnowledgeDialogOpen(false)}
          onAddSelected={handleAttachFromKnowledge}
          logoImageOptions={logoImageOptions}
          productImageOptions={productImageOptions}
          avatarImageOptions={avatarImageOptions}
          moreAvatarImageOptions={moreAvatarImageOptions}
          isLoadingAvatars={isLoadingBusinessAvatars}
          isLoadingMoreAvatars={isLoadingAppAvatars}
        />
        <Dialog open={!!previewPromptImage} onOpenChange={(open) => !open && setPreviewPromptImage(null)}>
          <DialogContent className="max-w-max p-0 bg-transparent border-none shadow-none [&>button]:hidden">
            <DialogTitle className="sr-only">Image Preview</DialogTitle>
            {previewPromptImage && (
              <div className="relative h-[95vh] w-[95vw]">
                <Image 
                  src={previewPromptImage} 
                  alt="Prompt preview" 
                  fill
                  className="object-contain rounded-md"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div id="generation-panel" className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">


          <SelectedReferenceImage />
          <GenerateFormBasic onOpenTrend={() => setIsTrendDialogOpen(true)} />

          <SelectedArticleRss
            onChangeArticle={() => {
              form.onRssSelect(null);
              setIsTrendDialogOpen(true);
            }}
          />
        </div>
      </div>

      <RssTrendModal
        isOpen={isTrendDialogOpen}
        onClose={() => setIsTrendDialogOpen(false)}
        title={t("generateByTrend")}
        hasSelectedRss={Boolean(form.rss)}
        pagination={rss.pagination}
        filterQuery={rss.filterQuery}
        setFilterQuery={rss.setFilterQuery}
      />
      <ConfirmationModal
        isOpen={isRestrictedModelModalOpen}
        onClose={() => setIsRestrictedModelModalOpen(false)}
        onCancel={handleUseFreeUserAllowedModel}
        onConfirm={handleTopUpNow}
        title={modelRestrictionCopy.title}
        description={modelRestrictionCopy.description}
        confirmText={modelRestrictionCopy.topUp}
        cancelText={modelRestrictionCopy.useDefault}
      />

      <Dialog open={!!previewPromptImage} onOpenChange={(open) => !open && setPreviewPromptImage(null)}>
        <DialogContent className="max-w-max p-0 bg-transparent border-none shadow-none [&>button]:hidden">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewPromptImage && (
            <div className="relative h-[95vh] w-[95vw]">
              <Image 
                src={previewPromptImage} 
                alt="Prompt preview" 
                fill
                className="object-contain rounded-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {flyingImage && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={
            flyingImage.isFlying 
            ? {
                left: flyingImage.endX, 
                top: flyingImage.endY,
                width: 64, 
                height: 64,
                opacity: 0.3,
                transform: "scale(0.75)",
                transition: "all 1.8s cubic-bezier(0.25, 1, 0.5, 1)"
              } 
            : {
                left: flyingImage.rect.left,
                top: flyingImage.rect.top,
                width: flyingImage.rect.width,
                height: flyingImage.rect.height,
                opacity: 1,
                transform: "scale(1)",
                transition: "none"
              }
          }
        >
          <img src={flyingImage.url} className="w-full h-full object-cover rounded-lg shadow-lg" />
        </div>
      )}
    </>
  );
}
