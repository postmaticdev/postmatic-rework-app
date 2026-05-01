"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { GenerateFormSelectRss } from "./generate-form-select-rss";
import { SelectedArticleRss } from "./selected-article-rss";
import { SelectedReferenceImage } from "./selected-reference-image";
import { useTranslations } from "next-intl";
import { Bot, Check, Loader2, Newspaper, Pencil, Send } from "lucide-react";
import { GenerateFormAdvanced } from "./generate-form-advanced";
import { GenerateFormBasic } from "./generate-form-basic";

export function GenerationPanel() {
  const {
    mode,
    form,
    isLoading,
    selectedHistory,
    selectedGeneratedImageUrl,
    histories,
    onSelectGeneratedImage,
    onSubmitGenerate,
  } = useContentGenerate();
  const t = useTranslations("generationPanel");
  const [isTrendDialogOpen, setIsTrendDialogOpen] = useState(false);

  const currentThread = useMemo(() => {
    if (!selectedHistory) return [];
    const group = histories.find((item) =>
      item.jobs.some((job) => job.id === selectedHistory.id)
    );
    return (group?.jobs || [])
      .sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      );
  }, [histories, selectedHistory]);

  const handleRegenerate = () => {
    onSubmitGenerate({ mode: "regenerate" });
  };

  const selectedImage =
    selectedGeneratedImageUrl || selectedHistory?.result?.images?.[0];

  if (mode === "regenerate" && selectedHistory) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">{t("aiRegenerateTitle")}</div>
              <div className="text-sm text-muted-foreground">
                {t("aiRegenerateDescription")}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {currentThread.map((job) => (
            <div key={job.id} className="space-y-3">
              {job.input.prompt || job.input.referenceImage ? (
                <div className="ml-auto flex max-w-[78%] flex-col items-end gap-2">
                  {job.input.referenceImage ? (
                    <Image
                      src={job.input.referenceImage || DEFAULT_PLACEHOLDER_IMAGE}
                      alt="reference image"
                      width={160}
                      height={160}
                      className="h-24 w-24 rounded-lg border object-cover"
                    />
                  ) : null}
                  {job.input.prompt ? (
                    <div className="rounded-3xl bg-background-secondary px-4 py-3 text-sm">
                      {job.input.prompt}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                {job.result?.images?.length ? (
                  job.result.images.map((image, index) => {
                  const imageUrl = image || DEFAULT_PLACEHOLDER_IMAGE;
                  const isSelected =
                    selectedHistory?.id === job.id && selectedImage === image;

                  return (
                    <div key={`${job.id}-${index}`} className="max-w-[82%] space-y-2">
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
          ))}
        </div>

        <div className="border-t px-6 py-3">
          <div className="space-y-3">
            <p className="text-sm font-medium">{t("regeneratePrompt")}</p>
            <div className="flex h-full gap-3">
              <div className="min-w-0 flex-1 rounded-2xl border border-input bg-background-secondary p-3">
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
                  className="min-h-[72px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button
                onClick={handleRegenerate}
                disabled={isLoading || !form.basic.prompt?.trim()}
                className="h-14 w-14 rounded-2xl p-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
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
          <GenerateFormAdvanced />
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
        </DialogContent>
      </Dialog>
    </>
  );
}
