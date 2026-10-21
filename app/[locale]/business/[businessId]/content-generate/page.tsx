"use client";

import { ReferencePanel } from "@/app/[locale]/business/[businessId]/content-generate/(components)/reference-panel";
import { GenerationPanel } from "@/app/[locale]/business/[businessId]/content-generate/(components)/generation-panel";
import { PreviewPanel } from "@/app/[locale]/business/[businessId]/content-generate/(components)/preview-panel";
import { LogoLoader } from "@/components/base/logo-loader";
import { Button } from "@/components/ui/button";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SELECTED_IMAGE_REFERENCE_NAME } from "@/constants";

// Mobile (< lg) memecah halaman menjadi langkah terpisah:
// 1. "reference" — pilih referensi, sticky button Lanjutkan
// 2. "form"      — produk, AI model, aspect ratio, dll + sticky button Generate (dari PreviewPanel)
// 3. chat AI     — otomatis saat mode berubah ke "regenerate" setelah generate
// Desktop (lg+) tetap 3 kolom seperti sebelumnya.
type MobileStep = "reference" | "form";

export default function ContentGenerate() {
  const { mode, form, isLoading, isRestoringSchedulerChat } =
    useContentGenerate();
  const t = useTranslations("generationPanel");
  const [mobileStep, setMobileStep] = useState<MobileStep>("reference");

  // The generator state is reset by the provider when the route is left, not on unmount here:
  // Strict Mode's simulated unmount would otherwise reset it in the middle of a draft-chat restore.
  useEffect(() => {
    document.body.style.pointerEvents = "";
    return () => {
      document.body.style.pointerEvents = "";
    };
  }, []);

  // Setelah masuk chat AI, flow berikutnya (mis. reset form) dimulai lagi dari langkah referensi.
  useEffect(() => {
    if (mode === "regenerate") setMobileStep("reference");
  }, [mode]);

  const goToMobileStep = (step: MobileStep) => {
    setMobileStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isRestoringSchedulerChat) {
    return (
      <main className="relative flex min-h-0 flex-1 items-center justify-center bg-card md:ml-0 lg:h-[calc(100dvh-4rem)]">
        <LogoLoader
          size={112}
          hideContentBackground={false}
          pulse
          label={t("loadingSchedulerChat")}
        />
      </main>
    );
  }

  const isChatMode = mode === "regenerate";
  const isMobileReferenceStep = !isChatMode && mobileStep === "reference";
  const isMobileFormStep = !isChatMode && mobileStep === "form";
  const selectedReferenceImage = form.basic.referenceImage;

  return (
    <main
      className={cn(
        "relative flex min-h-0 flex-1 flex-col md:ml-0 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden",
        // Mobile chat AI: setinggi layar (dikurangi header) agar thread scroll sendiri
        // dan composer + tombol jadwalkan selalu menempel di bawah
        isChatMode && "max-lg:h-[calc(100dvh-4.5rem)] max-lg:overflow-hidden"
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col lg:flex-row",
          // ruang untuk sticky bar bawah di mobile
          !isChatMode && "max-lg:pb-36"
        )}
      >
        {isMobileFormStep && (
          <div className="sticky top-16 z-20 border-b bg-card px-4 py-2 lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              disabled={isLoading}
              onClick={() => goToMobileStep("reference")}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("mobileBackToReference")}
            </Button>
          </div>
        )}

        <div
          className={cn(
            // tanpa overflow di mobile agar tab + search referensi bisa sticky terhadap halaman
            "relative w-full border-r bg-card lg:min-h-0 lg:w-1/3 lg:overflow-hidden",
            mode === "regenerate" ? "hidden" : "w-full lg:w-1/3",
            isMobileFormStep && "max-lg:hidden"
          )}
        >
          <ReferencePanel />
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 pointer-events-auto" />
          )}
        </div>

        <div
          className={cn(
            "relative w-full border-r bg-card lg:min-h-0 lg:overflow-hidden",
            mode === "regenerate"
              ? "flex-1 min-h-0 w-full lg:w-2/3"
              : "w-full lg:w-1/3",
            isMobileReferenceStep && "max-lg:hidden"
          )}
        >
          <GenerationPanel />
        </div>

        <div
          className={cn(
            "w-full bg-card lg:min-h-0 lg:w-1/3 lg:overflow-hidden",
            mode === "regenerate" && "hidden lg:block",
            isMobileReferenceStep && "max-lg:hidden"
          )}
        >
          <PreviewPanel />
        </div>
      </div>

      {/* Sticky bar langkah referensi (mobile) */}
      {isMobileReferenceStep && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:left-16 lg:hidden">
          {selectedReferenceImage ? (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border">
              <Image
                src={selectedReferenceImage}
                alt={
                  // The context's marker for an attached edit image.
                  form.basic.referenceImageName === SELECTED_IMAGE_REFERENCE_NAME
                    ? t("selectedEditReferenceAlt")
                    : form.basic.referenceImageName || ""
                }
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="flex-1 bg-blue-500 text-white hover:bg-blue-600"
            disabled={isLoading}
            onClick={() => goToMobileStep("form")}
          >
            {t("mobileContinue")}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </main>
  );
}
