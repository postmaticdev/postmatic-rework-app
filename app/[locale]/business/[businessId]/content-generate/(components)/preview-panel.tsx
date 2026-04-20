"use client";

import { useRef, useState } from "react";
import { CardNoGap } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Textarea } from "@/components/ui/textarea";
import { HistoryModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/history-modal";
import { FullscreenImageModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/fullscreen-image-modal";
import { Clock, Loader2, RotateCcw, WandSparkles } from "lucide-react";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useBusinessGetById } from "@/services/business.api";
import { useParams } from "next/navigation";
import { LogoLoader } from "@/components/base/logo-loader";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";
import { useContentCaptionEnhance } from "@/services/content/content.api";
import { showToast } from "@/helper/show-toast";

export function PreviewPanel() {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isFullscreenImageOpen, setIsFullscreenImageOpen] = useState(false);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const {
    form,
    selectedHistory,
    onSelectHistory,
    isLoading,
    onSubmitGenerate,
    onSaveDraft,
    setMode,
    isDraftSaved,
  } = useContentGenerate();
  const { businessId } = useParams() as { businessId: string };
  const { data: businessData } = useBusinessGetById(businessId);
  const businessName = businessData?.data?.data?.name;
  const businessLogo = businessData?.data?.data?.logo;
  const t = useTranslations("previewPanel");
  const mEnhanceCaption = useContentCaptionEnhance();

  const onOpenFullscreenImage = () => {
    if (selectedHistory?.result?.images.length === 0) {
      return;
    }
    setMode("mask");
    setIsFullscreenImageOpen(true);
    setIsHistoryModalOpen(false);
    form.setMask(null);
    form.setBasic({ ...form.basic, prompt: "" });
  };

  const onCloseFullscreenImage = () => {
    setIsFullscreenImageOpen(false);
    setMode("regenerate");
  };

  const handleGenerateClick = () => {
    onSubmitGenerate({
      mode: selectedHistory ? "regenerate" : undefined,
    });
    // Scroll to preview panel on mobile, with a slight delay to ensure state updates
    setTimeout(() => {
      if (window.innerWidth < 1024) {
        // For mobile and tablet views
        previewPanelRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

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
    <div className="h-full flex flex-col p-4 sm:p-6">
      {/* Instagram Feed Style Card */}
      <CardNoGap className="flex-1 overflow-auto">
        {/* Header - Instagram style */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src={businessLogo || "/logoblue.png"}
              alt="logol"
              width={200}
              height={200}
              className="w-8 h-8"
            />
            <span className="font-medium text-sm">{businessName}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className=" p-0"
            onClick={() => setIsHistoryModalOpen(true)}
          >
            <span className="font-medium text-sm">{t("history")}</span>
            <Clock className="h-5 w-5" />
          </Button>
        </div>

        {/* Image Preview - Instagram style */}
        <div
          className="relative w-full h-fit cursor-pointer hover:opacity-95 transition-opacity"
          onClick={onOpenFullscreenImage}
        >
          {/* Business Image Content */}
          {isLoading ? (
            <div className="flex items-center justify-center w-full h-full bg-background-secondary relative !aspect-square">
              <LogoLoader
                hideContentBackground={false}
                className="absolute z-10"
              />
              <div className="absolute bg-black z-0 w-full h-full opacity-50 blur-sm">
                <Image
                  src={
                    selectedHistory?.result?.images[0] ||
                    form.basic.productImage ||
                    DEFAULT_PLACEHOLDER_IMAGE
                  }
                  alt={""}
                  key={
                    selectedHistory?.result?.images[0] ||
                    form.basic.productImage ||
                    DEFAULT_PLACEHOLDER_IMAGE
                  }
                  fill
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
            </div>
          ) : (
            <Image
              src={
                selectedHistory?.result?.images[0] ||
                form.basic.productImage ||
                DEFAULT_PLACEHOLDER_IMAGE
              }
              alt={""}
              key={
                selectedHistory?.result?.images[0] ||
                form.basic.productImage ||
                DEFAULT_PLACEHOLDER_IMAGE
              }
              width={800}
              height={800}
              className="w-full h-auto"
              priority
            />
          )}
        </div>

        {isLoading &&
          typeof selectedHistory?.progress === "number" &&
          selectedHistory?.progress < 100 && (
            <div className="p-4 flex flex-row items-center gap-4 border-b">
              <Progress value={selectedHistory?.progress ?? 0} />
              <span className="text-sm">{selectedHistory?.progress}%</span>
            </div>
          )}

        {/* Caption - Instagram style */}
        <div className="block lg:hidden p-4 border-b flex-col space-y-4">
          <div className="text-sm">
            <div className="font-medium mb-2">{businessName}</div>
            <Textarea
              value={form.basic.caption || t("captionWillShowHere")}
              rows={3}
              onChange={(e) => {
                form.setBasic({ ...form.basic, caption: e.target.value });
              }}
              className="min-h-[60px] max-h-[120px] resize-none border-none p-0 text-sm focus:ring-0"
              placeholder={t("writeCaption")}
            />
          </div>
          {selectedHistory && (
            <div className="flex flex-row gap-2 justify-between">
              <Button
                size="sm"
                className=" w-fit  bg-blue-500 hover:bg-blue-600 text-white"
                disabled={isLoading || mEnhanceCaption.isPending}
                onClick={handleEnhanceCaption}
              >
                {mEnhanceCaption.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <WandSparkles className="h-5 w-5" />
                )}
                {t("enhanceCaption")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-fit self-end"
                onClick={() => onSelectHistory(null)}
              >
                <RotateCcw className="h-5 w-5" />
                {t("resetForm")}
              </Button>
            </div>
          )}
        </div>

        {/* Optimize Prompt */}
        <div className="p-4 border-b lg:border-none flex flex-col mb-2">
          <label className="block text-sm font-medium mb-2">
            {t("optimizePrompt")}
          </label>
          <Textarea
            value={form?.basic?.prompt || ""}
            rows={3}
            onChange={(e) =>
              form.setBasic({ ...form.basic, prompt: e.target.value })
            }
            className="min-h-[60px] max-h-[120px] resize-none border-border text-sm focus:ring-0 p-4"
            placeholder={t("writeOptimizePrompt")}
          />
        </div>

        {/* Generate/Regenerate Button MOBILE*/}
        <div className="lg:hidden p-4 ">
          {/* Save as Draft Button - Only show after generation */}
          {selectedHistory && (
            <>
              {!isDraftSaved ? (
                <Button
                  onClick={onSaveDraft}
                  variant="outline"
                  className="w-full mb-2"
                  disabled={isLoading}
                >
                  {t("saveAsDraft")}
                </Button>
              ) : (
                <Link href={`/business/${businessId}/content-scheduler`}>
                  <Button variant="outline" className="w-full mb-2">
                    {t("viewInContentLibrary")}
                  </Button>
                </Link>
              )}
            </>
          )}
          <Button
            onClick={handleGenerateClick}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            disabled={isLoading}
          >
            <WandSparkles className="h-5 w-5" />
            {isLoading
              ? t("loading")
              : selectedHistory
              ? t("regenerate")
              : t("generate")}
          </Button>
        </div>
      </CardNoGap>
      <div className="hidden lg:block sticky bottom-0 right-0  border border-border space-y-2 bg-card py-2 px-4 -mt-3 rounded-b-md">
        {/* Save as Draft Button - Only show after generation */}

        <div className="flex w-full gap-4">
          {selectedHistory && (
            <>
              {!isDraftSaved ? (
                <Button
                  onClick={onSaveDraft}
                  variant="outline"
                  className="flex-grow"
                  disabled={isLoading}
                >
                  {t("saveAsDraft")}
                </Button>
              ) : (
                <Link
                  className="flex-grow"
                  href={`/business/${businessId}/content-scheduler`}
                >
                  <Button variant="outline" className="w-full">
                    {t("viewInContentLibrary")}
                  </Button>
                </Link>
              )}
              {selectedHistory && (
                <Button
                  variant="outline"
                  className="w-1/3"
                  disabled={isLoading}
                  onClick={() => onSelectHistory(null)}
                >
                  <RotateCcw className="h-5 w-5" />
                  {t("resetForm")}
                </Button>
              )}
            </>
          )}
        </div>
        <Button
          onClick={handleGenerateClick}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          disabled={isLoading}
        >
          <WandSparkles className="h-5 w-5" />
          {isLoading
            ? t("loading")
            : selectedHistory
            ? t("regenerate")
            : t("generate")}
        </Button>
      </div>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Fullscreen Image Modal */}
      <FullscreenImageModal
        isOpen={isFullscreenImageOpen}
        onClose={onCloseFullscreenImage}
      />
    </div>
  );
}
