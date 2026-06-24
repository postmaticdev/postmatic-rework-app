"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { showToast } from "@/helper/show-toast";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
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
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { GenerateFormBasic } from "./generate-form-basic";
import { ChatComposerField } from "./chat-composer-field";
import { GeneratedImageViewer } from "./generated-image-viewer";
import { getAiModelDisplayName } from "@/models/api/content/ai-model";
import { SelectedAvatars } from "./selected-avatars";

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
    onSubmitGenerate,
  } = useContentGenerate();
  const t = useTranslations("generationPanel");
  const schedulerT = useTranslations("contentGenerateScheduler");
  const [isTrendDialogOpen, setIsTrendDialogOpen] = useState(false);
  const [isKnowledgeDialogOpen, setIsKnowledgeDialogOpen] = useState(false);
  const [isRestrictedModelModalOpen, setIsRestrictedModelModalOpen] =
    useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
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
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 pb-44 lg:pb-6">
            {currentThread.map((job, jobIndex) => {
              const additionalPromptImages = job.input.additionalImages || [];
              const isInitialSchedulerBubble =
                jobIndex === 0 && job.id.startsWith("chat-");
              const initialReferenceImage = isInitialSchedulerBubble
                ? schedulerChatSeed?.referenceImage ||
                null
                : null;
              const initialProductImage = isInitialSchedulerBubble
                ? schedulerChatSeed?.productImage ||
                null
                : null;
              const initialAvatarImages = isInitialSchedulerBubble
                ? schedulerChatSeed?.avatarImages || []
                : [];
              const promptImages = isInitialSchedulerBubble
                ? Array.from(
                  new Set(
                    [
                      initialReferenceImage,
                      initialProductImage,
                      ...initialAvatarImages,
                      ...additionalPromptImages,
                    ].filter(Boolean) as string[]
                  )
                )
                : Array.from(
                  new Set(
                    [
                      ...additionalPromptImages,
                      ...(job.product?.images || []),
                      job.input.referenceImage,
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
                                className="h-20 w-20 rounded-lg border object-cover sm:h-24 sm:w-24"
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
                      <div className="max-w-[82%] rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
                        <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <p className="font-medium">Image generation failed</p>
                            <p className="mt-1 text-xs">
                              {job.error?.message ||
                                "The generated image could not be completed."}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : job.result?.images?.length ? (
                      job.result.images.map((image, index) => {
                        const imageUrl = image || DEFAULT_PLACEHOLDER_IMAGE;
                        const isSelected =
                          selectedHistory?.id === job.id &&
                          selectedImage === image;

                        return (
                          <div
                            key={`${job.id}-${index}`}
                            className="max-w-[82%] space-y-2"
                          >
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                              <Bot className="h-3.5 w-3.5" />
                              {getAiModelDisplayName(job.input.model) || t("generatedResult")}
                            </div>
                            <GeneratedImageViewer
                              imageUrl={imageUrl}
                              imageItemId={job.result?.imageItemIds?.[index]}
                              alt={`generated-${index + 1}`}
                              protectFromContextMenu={aiModels.isFreeUser}
                              className="aspect-square w-full max-w-[360px] cursor-zoom-in rounded-lg border object-cover"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() =>
                                  onSelectGeneratedImage(job, image, {
                                    attachForEdit: true,
                                  })
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
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
                      <div className="max-w-[82%] rounded-lg border bg-background-secondary p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating image...
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
                <div className="min-w-0 flex-1 rounded-2xl border border-input bg-background-secondary p-3">
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
      </>
    );
  }

  return (
    <>
      <div id="generation-panel" className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">


          <SelectedReferenceImage />
          <SelectedAvatars />
          <GenerateFormBasic />

          {form.rss ? (
            <Button
              type="button"
              variant="default"
              onClick={() => form.onRssSelect(null)}
              disabled={isLoading}
              className="h-14 w-full bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              {t("removeSelectedTrend")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              onClick={() => setIsTrendDialogOpen(true)}
              disabled={isLoading}
              className="h-14 w-full"
            >
              <Newspaper className="h-4 w-4" />
              {t("addLatestTrend")}
            </Button>
          )}

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

    </>
  );
}
