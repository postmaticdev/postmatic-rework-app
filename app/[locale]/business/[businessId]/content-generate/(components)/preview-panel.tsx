"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { CardNoGap } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LogoLoader } from "@/components/base/logo-loader";
import { Progress } from "@/components/ui/progress";
import { ScheduleSummaryModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/schedule-summary-modal";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { DEFAULT_PLACEHOLDER_IMAGE, SOCIAL_MEDIA_PLATFORMS } from "@/constants";
import { dateManipulation } from "@/helper/date-manipulation";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { cn } from "@/lib/utils";
import {
  removeSchedulerDraftMarker,
  upsertSchedulerDraftMarker,
} from "@/lib/scheduler-draft-markers";
import {
  useContentCaptionEnhance,
  useContentDraftSaveDraftContent,
  useContentSchedulerManualAddToQueue,
  useContentSchedulerManualEditQueue,
} from "@/services/content/content.api";
import { useBusinessGetById } from "@/services/business.api";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  Loader2,
  RotateCcw,
  WandSparkles,
} from "lucide-react";
import { showToast } from "@/helper/show-toast";

function formatTimeInput(date: Date) {
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

export function PreviewPanel() {
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { businessId } = useParams() as { businessId: string };
  const {
    form,
    selectedHistory,
    selectedGeneratedImageUrl,
    onSelectHistory,
    isLoading,
    onSubmitGenerate,
  } = useContentGenerate();
  const { data: businessData } = useBusinessGetById(businessId);
  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const businessName = businessData?.data?.data?.name;
  const businessLogo = businessData?.data?.data?.logo;
  const t = useTranslations("previewPanel");
  const schedulerT = useTranslations("contentGenerateScheduler");
  const mEnhanceCaption = useContentCaptionEnhance();
  const mSaveDraft = useContentDraftSaveDraftContent();
  const mSchedulePost = useContentSchedulerManualAddToQueue();
  const mEditSchedulePost = useContentSchedulerManualEditQueue();

  const scheduleDate = searchParams.get("scheduleDate");
  const scheduleTime = searchParams.get("scheduleTime");
  const editSchedulerManualPostingId = searchParams.get(
    "editSchedulerManualPostingId"
  );
  const initialPlatforms = searchParams.get("platforms");
  const schedulerMode = Boolean(scheduleDate);
  const selectedImageUrl =
    selectedGeneratedImageUrl || selectedHistory?.result?.images?.[0];

  const [date, setDate] = useState(dateManipulation.ymd(new Date()));
  const [time, setTime] = useState("08:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformEnum[]>([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [autoSavedDraftId, setAutoSavedDraftId] = useState<string | null>(null);
  const autoSaveKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (scheduleDate) {
      setDate(scheduleDate);
      setAutoSavedDraftId(null);
      autoSaveKeyRef.current = null;
    }
  }, [scheduleDate]);

  useEffect(() => {
    if (scheduleTime) {
      setTime(scheduleTime);
    }
  }, [scheduleTime]);

  useEffect(() => {
    if (!initialPlatforms) return;

    setSelectedPlatforms(
      initialPlatforms
        .split(",")
        .filter(Boolean)
        .map((platform) => platform as PlatformEnum)
    );
  }, [initialPlatforms]);

  const platformOptions = useMemo(
    () =>
      SOCIAL_MEDIA_PLATFORMS.map((platform) => ({
        platform,
        isConnected: (platformData?.data.data || []).some(
          (item) => item.platform === platform && item.status === "connected"
        ),
      })),
    [platformData?.data.data]
  );
  const connectedPlatforms = useMemo(
    () =>
      platformOptions
        .filter((platform) => platform.isConnected)
        .map((platform) => platform.platform),
    [platformOptions]
  );
  const minDate = dateManipulation.ymd(new Date());
  const minTime = date === minDate ? formatTimeInput(new Date()) : undefined;

  useEffect(() => {
    if (
      !schedulerMode ||
      !scheduleDate ||
      !selectedHistory?.result ||
      !selectedImageUrl ||
      editSchedulerManualPostingId
    ) {
      return;
    }

    const autoSaveKey = `${scheduleDate}:${selectedHistory.id}:${selectedImageUrl}`;
    if (autoSaveKeyRef.current === autoSaveKey || mSaveDraft.isPending) {
      return;
    }

    autoSaveKeyRef.current = autoSaveKey;
    mSaveDraft
      .mutateAsync({
        businessId,
        formData: {
          caption: form.basic.caption || selectedHistory.result.caption || "",
          category:
            selectedHistory.result.category || selectedHistory.input.category || "",
          designStyle:
            selectedHistory.result.designStyle ||
            selectedHistory.input.designStyle ||
            "",
          ratio: selectedHistory.result.ratio || selectedHistory.input.ratio || "",
          images: [selectedImageUrl],
          productKnowledgeId: selectedHistory.input.productKnowledgeId || "",
          referenceImages:
            selectedHistory.result.referenceImages ||
            (selectedHistory.input.referenceImage
              ? [selectedHistory.input.referenceImage]
              : []),
        },
      })
      .then((savedDraft) => {
        const draftId = savedDraft.data.data.id;
        if (isMountedRef.current) {
          setAutoSavedDraftId(draftId);
        }
        upsertSchedulerDraftMarker(businessId, {
          draftId,
          jobId: selectedHistory.id,
          date: scheduleDate,
          image: selectedImageUrl,
          caption: form.basic.caption || selectedHistory.result?.caption || "",
          createdAt: new Date().toISOString(),
        });
      })
      .catch(() => {
        autoSaveKeyRef.current = null;
      });
  }, [
    businessId,
    editSchedulerManualPostingId,
    form.basic.caption,
    mSaveDraft,
    scheduleDate,
    schedulerMode,
    selectedHistory,
    selectedImageUrl,
  ]);

  const handleGenerateClick = () => {
    if (schedulerMode && selectedHistory) {
      setIsSummaryOpen(true);
      return;
    }

    onSubmitGenerate({
      mode: selectedHistory ? "regenerate" : undefined,
    });
    setTimeout(() => {
      if (window.innerWidth < 1024) {
        previewPanelRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleEnhanceCaption = async () => {
    const imageUrl = selectedImageUrl;
    if (!imageUrl) {
      showToast("error", schedulerT("generateFirst"));
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

  const togglePlatform = (platform: PlatformEnum) => {
    if (!connectedPlatforms.includes(platform)) return;

    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const handleConfirmSchedule = async () => {
    if (!selectedHistory?.result) {
      showToast("error", schedulerT("generateFirst"));
      return;
    }
    if (!date || !time) {
      showToast("error", schedulerT("selectDateTime"));
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      showToast("error", schedulerT("selectDateTime"));
      return;
    }
    if (scheduledAt <= new Date()) {
      showToast("error", schedulerT("scheduleTimePassed"));
      return;
    }

    const connectedSelectedPlatforms = selectedPlatforms.filter((platform) =>
      connectedPlatforms.includes(platform)
    );

    if (connectedSelectedPlatforms.length === 0) {
      showToast("error", schedulerT("selectPlatform"));
      return;
    }

    try {
      const generatedImageContentId =
        autoSavedDraftId ||
        (
          await mSaveDraft.mutateAsync({
            businessId,
            formData: {
              caption: form.basic.caption || selectedHistory.result.caption || "",
              category:
                selectedHistory.result.category ||
                selectedHistory.input.category ||
                "",
              designStyle:
                selectedHistory.result.designStyle ||
                selectedHistory.input.designStyle ||
                "",
              ratio:
                selectedHistory.result.ratio || selectedHistory.input.ratio || "",
              images: selectedImageUrl
                ? [selectedImageUrl]
                : selectedHistory.result.images || [],
              productKnowledgeId: selectedHistory.input.productKnowledgeId || "",
              referenceImages:
                selectedHistory.result.referenceImages ||
                (selectedHistory.input.referenceImage
                  ? [selectedHistory.input.referenceImage]
                  : []),
            },
          })
        ).data.data.id;

      const formData = {
        generatedImageContentId,
        imageUrl: selectedImageUrl,
        caption: form.basic.caption || selectedHistory.result.caption || "",
        platforms: connectedSelectedPlatforms,
        dateTime: scheduledAt.toISOString(),
      };

      if (editSchedulerManualPostingId) {
        await mEditSchedulePost.mutateAsync({
          businessId,
          idScheduler: Number(editSchedulerManualPostingId),
          formData,
        });
      } else {
        await mSchedulePost.mutateAsync({
          businessId,
          formData,
        });
      }

      setIsSummaryOpen(false);
      removeSchedulerDraftMarker(businessId, generatedImageContentId);
      router.push(`/business/${businessId}/content-scheduler?selectedDate=${date}`);
    } catch (error) {
      showToast("error", error);
    }
  };

  const isScheduling =
    mSaveDraft.isPending ||
    mSchedulePost.isPending ||
    mEditSchedulePost.isPending;

  return (
    <div ref={previewPanelRef} className="h-full flex flex-col p-4 sm:p-6">
      <CardNoGap className="flex-1 overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src={businessLogo || "/logoblue.png"}
              alt="logo"
              width={200}
              height={200}
              className="w-8 h-8"
            />
            <span className="font-medium text-sm">{businessName}</span>
          </div>
          {!schedulerMode && selectedHistory && (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => onSelectHistory(null)}
            >
              <RotateCcw className="h-4 w-4" />
              {t("resetForm")}
            </Button>
          )}
        </div>

        <div className="relative w-full h-fit transition-opacity">
          {isLoading ? (
            <div className="flex items-center justify-center w-full h-full bg-background-secondary relative !aspect-square">
              <LogoLoader
                hideContentBackground={false}
                className="absolute z-10"
              />
              <div className="absolute bg-black z-0 w-full h-full opacity-50 blur-sm">
                <Image
                  src={
                    selectedImageUrl ||
                    form.basic.productImage ||
                    DEFAULT_PLACEHOLDER_IMAGE
                  }
                  alt=""
                  fill
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
            </div>
          ) : (
            <Image
              src={
                selectedImageUrl ||
                form.basic.productImage ||
                DEFAULT_PLACEHOLDER_IMAGE
              }
              alt=""
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

        <div className="p-4 border-b flex-col space-y-4">
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
            <Button
              size="sm"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
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
          )}
        </div>

        {schedulerMode && (
          <>
            <div className="p-4 border-b">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-2xl border border-input bg-background-secondary px-3">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <input
                    type="date"
                    value={date}
                    min={minDate}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-11 w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <Input
                  type="time"
                  value={time}
                  min={minTime}
                  step={60}
                  onChange={(event) => setTime(event.target.value)}
                  className="h-11 rounded-2xl bg-background-secondary"
                />
              </div>
            </div>

            <div className="p-4 border-b space-y-3">
              <div className="text-sm font-semibold">
                {schedulerT("choosePlatform")}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {platformOptions.map(({ platform, isConnected }) => {
                  const isSelected =
                    isConnected && selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      disabled={!isConnected}
                      className={cn(
                        "flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-background-secondary",
                        !isConnected &&
                          "cursor-not-allowed border-dashed bg-muted/30 text-muted-foreground opacity-70"
                      )}
                    >
                      {mapEnumPlatform.getPlatformIcon(
                        platform,
                        isSelected
                          ? "text-white"
                          : !isConnected
                          ? "text-muted-foreground"
                          : ""
                      )}
                      <span className="flex flex-col leading-tight">
                        <span>{mapEnumPlatform.getPlatformLabel(platform)}</span>
                        {!isConnected && (
                          <span className="text-[11px] font-normal">
                            {schedulerT("notConnected")}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {!schedulerMode && (
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
        )}
      </CardNoGap>

      <div className="sticky bottom-0 right-0 border border-border space-y-2 bg-card py-2 px-4 -mt-3 rounded-b-md">
        {!schedulerMode && selectedHistory && (
          <div className="flex w-full gap-4">
            <Button
              variant="outline"
              className="w-full"
              disabled={isLoading}
              onClick={() => onSelectHistory(null)}
            >
              <RotateCcw className="h-5 w-5" />
              {t("resetForm")}
            </Button>
          </div>
        )}
        <Button
          onClick={handleGenerateClick}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          disabled={isLoading}
        >
          <WandSparkles className="h-5 w-5" />
          {schedulerMode
            ? selectedHistory
              ? schedulerT("schedulePost")
              : schedulerT("generateContent")
            : isLoading
            ? t("loading")
            : selectedHistory
            ? t("regenerate")
            : t("generate")}
        </Button>
      </div>

      <ScheduleSummaryModal
        isOpen={isSummaryOpen}
        imageUrl={
          selectedImageUrl ||
          form.basic.productImage ||
          DEFAULT_PLACEHOLDER_IMAGE
        }
        caption={form.basic.caption || selectedHistory?.result?.caption || ""}
        date={date}
        time={time}
        minDate={minDate}
        minTime={minTime}
        selectedPlatforms={selectedPlatforms}
        platforms={platformOptions}
        isLoading={isScheduling || mEnhanceCaption.isPending}
        onClose={() => setIsSummaryOpen(false)}
        onCaptionChange={(value) =>
          form.setBasic({ ...form.basic, caption: value })
        }
        onDateChange={setDate}
        onTimeChange={setTime}
        onTogglePlatform={togglePlatform}
        onEnhanceCaption={handleEnhanceCaption}
        onConfirm={handleConfirmSchedule}
      />
    </div>
  );
}
