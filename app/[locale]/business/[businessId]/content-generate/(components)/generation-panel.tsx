"use client";

import { GenerateFormBase } from "./generate-form-base";
import { GenerateFormSelectRss } from "./generate-form-select-rss";
import {
  TabMode,
  useContentGenerate,
} from "@/contexts/content-generate-context";

import { SelectedArticleRss } from "./selected-article-rss";
import { SelectedReferenceImage } from "./selected-reference-image";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, WandSparkles } from "lucide-react";
import { useContentCaptionEnhance } from "@/services/content/content.api";
import { showToast } from "@/helper/show-toast";
import { useParams } from "next/navigation";

export function GenerationPanel() {
  const { setMode, tab, setTab, mode, form, isLoading, selectedHistory } = useContentGenerate();
  const mEnhanceCaption = useContentCaptionEnhance();
  const { businessId } = useParams() as { businessId: string };

  const onClickTab = (mode: TabMode) => {
    setMode(mode);
    setTab(mode);
  };

  const t = useTranslations("generationPanel");
  const c = useTranslations("previewPanel")

  const handleEnhanceCaption = async () => {
    const imageUrl = selectedHistory?.result?.images?.[0];
    if (!imageUrl) {
      showToast("error", "Please generate content first to enhance caption");
      return;
    }

    try {
      const res = await mEnhanceCaption.mutateAsync({
        businessId,
        formData: {
          images: [imageUrl],
          model: "gemini",
          currentCaption: form.basic.caption || "",
        },
      });
      form.setBasic({ ...form.basic, caption: res.data.data.caption });
      showToast("success", res.data.responseMessage);
    } catch (error) {
      showToast("error", error, t);
    }
  };

  return (
    <div id="generation-panel" className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="p-4 sm:p-6">
        <div className="flex justify-center">
          <div className="flex bg-background rounded-lg  w-full">
            <button
              onClick={() => onClickTab("knowledge")}
              className={cn(
                "px-4 py-3 text-sm font-medium rounded-md transition-colors w-1/2 ",
                tab === "knowledge"
                  ? "bg-blue-500 text-white"
                  : "text-muted-foreground hover:text-foreground",
                mode === "regenerate" ? "w-full" : "w-1/2"
              )}
            >
              {t("basicGenerate")}
            </button>

            <button
              onClick={() => onClickTab("rss")}
              className={cn(
                "px-4 py-3 text-sm font-medium rounded-md transition-colors w-1/2",
                tab === "rss"
                  ? "bg-blue-500 text-white"
                  : "text-muted-foreground hover:text-foreground",
                mode === "regenerate" ? "hidden" : "w-1/2"
              )}
            >
              {t("generateByTrend")}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 pb-6 overflow-y-auto space-y-4">
        {tab === "rss" && (
          <div>
            <GenerateFormSelectRss />
            <SelectedReferenceImage />
            <SelectedArticleRss />
            <div className="space-y-4 mt-4">
              <GenerateFormBase />
            </div>
          </div>
        )}

        {tab === "knowledge" && (
          <>
            <SelectedReferenceImage />
            <GenerateFormBase />
          </>
        )}

        {/* Caption for desktop */}
        {selectedHistory !== null && (
        <div className="hidden lg:block  flex-col space-y-2">
          <div className="font-bold text-xl">Caption</div>
          <Textarea
            value={form.basic.caption || c("captionWillShowHere")}
            rows={3}
            onChange={(e) => {
              form.setBasic({ ...form.basic, caption: e.target.value });
            }}
            className="min-h-[60px] max-h-[120px] resize-none border-none p-0 text-sm focus:ring-0"
            placeholder={c("writeCaption")}
          />

          <Button
            size="sm"
            className=" w-full bg-blue-500 hover:bg-blue-600 text-white"
            disabled={isLoading || mEnhanceCaption.isPending}
            onClick={handleEnhanceCaption}
          >
            {mEnhanceCaption.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <WandSparkles className="h-5 w-5" />
            )}
            {c("enhanceCaption")}
          </Button>
        </div>
          )}
      </div>
    </div>
  );
}
