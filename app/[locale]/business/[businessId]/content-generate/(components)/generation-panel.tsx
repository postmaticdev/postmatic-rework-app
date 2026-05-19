"use client";

import { useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { helperService } from "@/services/helper.api";
import { GenerateFormSelectRss } from "./generate-form-select-rss";
import { SelectedArticleRss } from "./selected-article-rss";
import { SelectedReferenceImage } from "./selected-reference-image";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Bot,
  Check,
  ImagePlus,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Send,
  X,
} from "lucide-react";
import { GenerateFormBasic } from "./generate-form-basic";

export function GenerationPanel() {
  const {
    mode,
    form,
    isLoading,
    selectedHistory,
    selectedGeneratedImageUrl,
    histories,
    rss,
    onSelectGeneratedImage,
    onSubmitGenerate,
  } = useContentGenerate();
  const t = useTranslations("generationPanel");
  const [isTrendDialogOpen, setIsTrendDialogOpen] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const attachInputRef = useRef<HTMLInputElement | null>(null);

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
      setAttachedImages((current) => [...current, imageUrl]);
    } finally {
      setIsUploadingAttachment(false);
      if (attachInputRef.current) attachInputRef.current.value = "";
    }
  };

  const selectedImage =
    selectedGeneratedImageUrl || selectedHistory?.result?.images?.[0];

  if (mode === "regenerate" && selectedHistory) {
    return (
      <div className="flex h-full min-h-0 flex-col">


        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          {currentThread.map((job, jobIndex) => {
            const promptImages = Array.from(
              new Set(
                [
                  ...(jobIndex === 0 ? job.product?.images || [] : []),
                  job.input.referenceImage,
                ].filter(Boolean) as string[]
              )
            );

            return (
              <div key={job.id} className="space-y-3">
                {job.input.prompt ||
                  job.input.referenceImage ||
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
                          <Image
                            src={imageUrl}
                            alt={`generated-${index + 1}`}
                            width={800}
                            height={800}
                            className="aspect-square w-full max-w-[360px] rounded-lg border object-cover"
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
                              className="h-8 bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
                              onClick={() => onSelectGeneratedImage(job, image)}
                            >
                              <Check className="h-3.5 w-3.5" />
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

        <div className="border-t bg-card px-6 py-3 lg:sticky lg:bottom-0 lg:right-0 lg:z-10 lg:border lg:border-border">
          <div className="space-y-3">

            <div className="flex h-full gap-3">
              <div className="min-w-0 flex-1 rounded-2xl border border-input bg-background-secondary p-3">
                {attachedImages.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
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
                ) : null}
                {selectedGeneratedImageUrl &&
                  form.basic.referenceImageName === "Selected image" ? (
                  <Image
                    src={selectedGeneratedImageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                    alt="selected edit reference"
                    width={96}
                    height={96}
                    className="mb-3 h-16 w-16 rounded-md object-cover"
                  />
                ) : null}
                <Textarea
                  value={form.basic.prompt || ""}
                  onChange={(event) =>
                    form.setBasic({ ...form.basic, prompt: event.target.value })
                  }
                  placeholder={t("regeneratePromptPlaceholder")}
                  className=" resize-none border-0  p-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button
                onClick={handleRegenerate}
                disabled={isLoading || !form.basic.prompt?.trim()}
                className="h-14 w-14 rounded-md p-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
          <input
            ref={attachInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAttachImage}
          />
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => attachInputRef.current?.click()}
              disabled={isUploadingAttachment || isLoading}
            >
              {isUploadingAttachment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              Attach image
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="generation-panel" className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">


          <SelectedReferenceImage />
          <GenerateFormBasic />

          <Button
            type="button"
            variant="default"
            onClick={() => setIsTrendDialogOpen(true)}
            className="w-full h-14"
          >
            <Newspaper className="h-4 w-4" />
            {t("addLatestTrend")}
          </Button>

          <SelectedArticleRss />
        </div>
      </div>

      <Dialog open={isTrendDialogOpen} onOpenChange={setIsTrendDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("generateByTrend")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <GenerateFormSelectRss />
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
