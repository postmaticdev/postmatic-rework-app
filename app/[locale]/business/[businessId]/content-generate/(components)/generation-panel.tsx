"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { helperService } from "@/services/helper.api";
import { useBusinessGetById } from "@/services/business.api";
import { useProductKnowledgeGetAll } from "@/services/knowledge.api";
import { GenerateFormSelectRss } from "./generate-form-select-rss";
import { SelectedArticleRss } from "./selected-article-rss";
import { SelectedReferenceImage } from "./selected-reference-image";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Bot,
  Check,
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

export function GenerationPanel() {
  const { businessId } = useParams() as { businessId: string };
  const searchParams = useSearchParams();
  const {
    mode,
    form,
    isLoading,
    aiModels,
    selectedHistory,
    selectedGeneratedImageUrl,
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
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [selectedKnowledgeImages, setSelectedKnowledgeImages] = useState<
    string[]
  >([]);
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

  useEffect(() => {
    if (isTrendDialogOpen && form.rss) {
      setIsTrendDialogOpen(false);
    }
  }, [form.rss, isTrendDialogOpen]);

  const currentThread = useMemo(() => {
    if (!selectedHistory) return [];
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
  }, [histories, selectedHistory]);

  const knowledgeImageOptions = useMemo(() => {
    const options: Array<{
      id: string;
      imageUrl: string;
      sourceLabel: string;
      title: string;
    }> = [];
    const imageSet = new Set<string>();
    const businessLogo = businessData?.data?.data?.logo || "";
    const products = productKnowledgeData?.data?.data || [];

    if (businessLogo) {
      imageSet.add(businessLogo);
      options.push({
        id: "business-logo",
        imageUrl: businessLogo,
        sourceLabel: "Business Logo",
        title: "Business Logo",
      });
    }

    products.forEach((product) => {
      product.images.forEach((imageUrl, imageIndex) => {
        if (!imageUrl || imageSet.has(imageUrl)) return;
        imageSet.add(imageUrl);
        options.push({
          id: `product-${product.id}-${imageIndex}`,
          imageUrl,
          sourceLabel: "Product",
          title: product.name,
        });
      });
    });

    return options;
  }, [businessData?.data?.data?.logo, productKnowledgeData?.data?.data]);

  const handleRegenerate = () => {
    onSubmitGenerate({ mode: "regenerate", additionalImages: attachedImages });
    setAttachedImages([]);
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
    setSelectedKnowledgeImages([]);
    setIsKnowledgeDialogOpen(true);
  };

  const handleAttachFromKnowledge = () => {
    if (selectedKnowledgeImages.length === 0) return;
    setAttachedImages((current) =>
      Array.from(new Set([...current, ...selectedKnowledgeImages]))
    );
    setIsKnowledgeDialogOpen(false);
    setSelectedKnowledgeImages([]);
  };

  const selectedImage =
    selectedGeneratedImageUrl || selectedHistory?.result?.images?.[0];
  const schedulerMode = Boolean(searchParams.get("scheduleDate"));
  const selectedEditReferenceImage =
    selectedGeneratedImageUrl &&
    form.basic.referenceImageName === "Selected image"
      ? selectedGeneratedImageUrl
      : null;
  const handleOpenScheduleSummary = () => {
    window.dispatchEvent(new Event("content-generate:open-schedule-summary"));
  };

  if (mode === "regenerate" && selectedHistory) {
    return (
      <>
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 pb-44 lg:pb-6">
          {currentThread.map((job) => {
            const additionalPromptImages = job.input.additionalImages || [];
            const promptImages = Array.from(
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
                        <div className="rounded-3xl bg-background-secondary px-4 py-3 text-sm">
                          {job.input.prompt}
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
                              {job.input.model || t("generatedResult")}
                            </div>
                            <GeneratedImageViewer
                              imageUrl={imageUrl}
                              imageItemId={job.result?.imageItemIds?.[index]}
                              alt={`generated-${index + 1}`}
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

        <Dialog
          open={isKnowledgeDialogOpen}
          onOpenChange={(open) => {
            setIsKnowledgeDialogOpen(open);
            if (!open) setSelectedKnowledgeImages([]);
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Import from Knowledge</DialogTitle>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
              {knowledgeImageOptions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No knowledge images found. Add business logo or product images
                  first.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {knowledgeImageOptions.map((item) => {
                    const isSelected = selectedKnowledgeImages.includes(
                      item.imageUrl
                    );

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`overflow-hidden rounded-lg border text-left transition ${
                          isSelected
                            ? "border-blue-500 ring-2 ring-blue-500/30"
                            : "border-border hover:border-blue-300"
                        }`}
                        onClick={() =>
                          setSelectedKnowledgeImages((current) =>
                            current.includes(item.imageUrl)
                              ? current.filter((imageUrl) => imageUrl !== item.imageUrl)
                              : [...current, item.imageUrl]
                          )
                        }
                      >
                        <Image
                          src={item.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                          alt={item.title}
                          width={240}
                          height={180}
                          className="h-28 w-full object-cover"
                        />
                        <div className="space-y-0.5 p-2">
                          <p className="line-clamp-1 text-xs font-semibold text-foreground">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.sourceLabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsKnowledgeDialogOpen(false);
                  setSelectedKnowledgeImages([]);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAttachFromKnowledge}
                disabled={selectedKnowledgeImages.length === 0}
              >
                Add Selected
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div id="generation-panel" className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">


          <SelectedReferenceImage />
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

      <Dialog open={isTrendDialogOpen} onOpenChange={setIsTrendDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("generateByTrend")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <GenerateFormSelectRss
              onArticleSelected={() => setIsTrendDialogOpen(false)}
            />
          </div>
          {!form.rss && rss.articles.length !== 0 && (
            <DialogFooter>
              <PaginationControls
                pagination={rss.pagination}
                setFilterQuery={rss.setFilterQuery}
                filterQuery={rss.filterQuery}
                className="border-t-0 pt-0"
              />
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
