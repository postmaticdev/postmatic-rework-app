"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { GenerateFormBase } from "./generate-form-base";
import { GenerateFormSelectRss } from "./generate-form-select-rss";
import { SelectedArticleRss } from "./selected-article-rss";
import { SelectedReferenceImage } from "./selected-reference-image";
import { useTranslations } from "next-intl";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";

export function GenerationPanel() {
  const {
    mode,
    form,
    isLoading,
    selectedHistory,
    histories,
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
      .filter((job) => job.status === "done" && job.result)
      .sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      );
  }, [histories, selectedHistory]);

  const handleRegenerate = () => {
    onSubmitGenerate({ mode: "regenerate" });
  };

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
              {job.input.prompt ? (
                <div className="ml-auto max-w-[70%] rounded-3xl bg-primary px-4 py-3 text-sm text-white">
                  {job.input.prompt}
                </div>
              ) : null}

              <div className="max-w-[80%] rounded-[28px] border border-border bg-background-secondary p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t("generatedResult")}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(job.result?.images || []).map((image, index) => (
                    
                      <Image
                      key={`${job.id}-${index}`}
                        src={image || DEFAULT_PLACEHOLDER_IMAGE}
                        alt={`generated-${index + 1}`}
                        width={800}
                        height={800}
                        className="aspect-square items-center justify-center rounded-lg w-40 h-40 object-cover"
                      />
                   
                  ))}
                </div>
                <div className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {job.result?.caption}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">{t("regeneratePrompt")}</label>
            <div className="flex items-end gap-3">
              <Textarea
                value={form.basic.prompt || ""}
                onChange={(event) =>
                  form.setBasic({ ...form.basic, prompt: event.target.value })
                }
                placeholder={t("regeneratePromptPlaceholder")}
                className="min-h-28 resize-none rounded-2xl bg-background-secondary"
              />
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
          <div className="rounded-[28px] border border-border bg-background-secondary p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{t("plannerTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("plannerDescription")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTrendDialogOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
                {t("generateByTrend")}
              </Button>
            </div>
          </div>

          <SelectedReferenceImage />
          <SelectedArticleRss />
          <GenerateFormBase />
        </div>

        <div className="border-t p-6">
          <div className="rounded-2xl bg-background-secondary p-4 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{t("rssOptionalTitle")}</div>
            <div>{t("rssOptionalDescription")}</div>
          </div>
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
