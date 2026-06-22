"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { CardNoGap } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ScheduleTimeInput } from "@/components/ui/schedule-time-input";
import { Textarea } from "@/components/ui/textarea";
import { LogoLoader } from "@/components/base/logo-loader";
import { Progress } from "@/components/ui/progress";
import { ScheduleSummaryModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/schedule-summary-modal";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { DEFAULT_PLACEHOLDER_IMAGE, SOCIAL_MEDIA_PLATFORMS } from "@/constants";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { cn } from "@/lib/utils";
import {
  getSchedulerDraftMarkers,
  removeSchedulerDraftMarker,
  upsertSchedulerDraftMarker,
} from "@/lib/scheduler-draft-markers";
import {
  useContentCaptionEnhance,
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
import { getCurrentScheduleInput } from "@/lib/schedule-date-time";

export function PreviewPanel() {
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const shouldAutoEnhanceOnFirstGenerateRef = useRef(false);
  const lastAutoEnhancedResultKeyRef = useRef<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { businessId } = useParams() as { businessId: string };
  const {
    mode,
    form,
    selectedHistory,
    selectedGeneratedImageUrl,
    schedulerDraftPost,
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

  const [date, setDate] = useState(() => getCurrentScheduleInput().date);
  const [time, setTime] = useState(() => getCurrentScheduleInput().time);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformEnum[]>([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isScheduleNowConfirmOpen, setIsScheduleNowConfirmOpen] =
    useState(false);
  const [isAutoEnhancingCaption, setIsAutoEnhancingCaption] = useState(false);
  useEffect(() => {
    if (scheduleDate) {
      setDate(scheduleDate);
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
  const isFirstGenerateFlow =
    !selectedHistory || selectedHistory.id.startsWith("chat-scheduled-");
  const currentScheduleInput = getCurrentScheduleInput();
  const minDate = currentScheduleInput.date;
  const isEnhanceCaptionLoading =
    mEnhanceCaption.isPending &&
    (!isAutoEnhancingCaption || !form.basic.caption.trim());
  const canEnhanceCaption =
    Boolean(selectedHistory && selectedImageUrl) && !isEnhanceCaptionLoading;
  const schedulerDraftId = schedulerDraftPost?.id ||
    (editSchedulerManualPostingId
      ? Number(editSchedulerManualPostingId)
      : null);

  const handleGenerateClick = () => {
    if (schedulerMode && selectedHistory) {
      setIsSummaryOpen(true);
      return;
    }

    shouldAutoEnhanceOnFirstGenerateRef.current = isFirstGenerateFlow;

    onSubmitGenerate({
      mode: selectedHistory ? "regenerate" : undefined,
    });
    setTimeout(() => {
      if (window.innerWidth < 1024) {
        previewPanelRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const persistCaptionToSchedulerDraft = useCallback(
    async (nextCaption: string) => {
      if (!schedulerMode || !schedulerDraftId || !selectedHistory || !selectedImageUrl) {
        return;
      }

      const currentDraftMarker = getSchedulerDraftMarkers(businessId).find(
        (marker) => marker.draftId === String(schedulerDraftId)
      );
      const draftDate = currentDraftMarker?.date || scheduleDate || date;
      const draftTime =
        currentDraftMarker?.time || scheduleTime || time || getCurrentScheduleInput().time;

      if (draftDate) {
        upsertSchedulerDraftMarker(businessId, {
          draftId: String(schedulerDraftId),
          jobId: selectedHistory.id,
          date: draftDate,
          time: draftTime,
          image: selectedImageUrl,
          caption: nextCaption,
          productImage:
            currentDraftMarker?.productImage || form.basic.productImage || null,
          referenceImage:
            currentDraftMarker?.referenceImage ||
            selectedHistory.input.referenceImage ||
            form.basic.referenceImage ||
            null,
          chatSessionId:
            schedulerDraftPost?.chatSessionId ?? currentDraftMarker?.chatSessionId ?? null,
          businessProductId:
            selectedHistory.input.productKnowledgeId ||
            currentDraftMarker?.businessProductId ||
            null,
          createdAt: currentDraftMarker?.createdAt || selectedHistory.createdAt,
        });
      }

      await mEditSchedulePost.mutateAsync({
        businessId,
        idScheduler: schedulerDraftId,
        formData: {
          imageUrl: selectedImageUrl,
          caption: nextCaption,
          platforms: [],
          dateTime: new Date(`${draftDate}T${draftTime}`).toISOString(),
          status: "draft",
          withChatAI: true,
          shareAsReference: true,
          businessProductId: selectedHistory.input.productKnowledgeId,
          chatSessionId:
            schedulerDraftPost?.chatSessionId ??
            currentDraftMarker?.chatSessionId ??
            undefined,
        },
      });
    },
    [
      businessId,
      date,
      form.basic.productImage,
      form.basic.referenceImage,
      mEditSchedulePost,
      scheduleDate,
      scheduleTime,
      schedulerDraftId,
      schedulerDraftPost?.chatSessionId,
      schedulerMode,
      selectedHistory,
      selectedImageUrl,
      time,
    ]
  );

  const handleEnhanceCaption = useCallback(
    async (options?: { silent?: boolean }) => {
      const imageUrl = selectedImageUrl;
      if (!imageUrl) {
        if (!options?.silent) {
          showToast("error", schedulerT("generateFirst"));
        }
        return;
      }

      if (options?.silent) {
        setIsAutoEnhancingCaption(true);
      }

      try {
        const res = await mEnhanceCaption.mutateAsync({
          businessId,
          formData: {
            imageUrl,
          },
        });
        const nextCaption = res.data.data.caption;
        form.setBasic({ ...form.basic, caption: nextCaption });
        await persistCaptionToSchedulerDraft(nextCaption);
        if (!options?.silent) {
          showToast("success", res.data.responseMessage);
        }
      } catch (error) {
        if (!options?.silent) {
          showToast("error", error, t);
        }
      } finally {
        if (options?.silent) {
          setIsAutoEnhancingCaption(false);
        }
      }
    },
    [
      businessId,
      form,
      mEnhanceCaption,
      persistCaptionToSchedulerDraft,
      schedulerT,
      selectedImageUrl,
      t,
    ]
  );

  useEffect(() => {
    if (!selectedHistory) {
      shouldAutoEnhanceOnFirstGenerateRef.current = false;
      return;
    }

    const isFailed =
      selectedHistory.status === "error" || selectedHistory.stage === "error";
    if (isFailed) {
      shouldAutoEnhanceOnFirstGenerateRef.current = false;
      return;
    }

    const currentDraftMarker =
      schedulerMode && schedulerDraftId
        ? getSchedulerDraftMarkers(businessId).find(
            (marker) => marker.draftId === String(schedulerDraftId)
          )
        : null;
    const persistedCaption =
      currentDraftMarker?.caption?.trim() ||
      form.basic.caption.trim() ||
      selectedHistory.result?.caption?.trim() ||
      selectedHistory.input.caption?.trim() ||
      "";
    const isGeneratedChatResult =
      selectedHistory.id.startsWith("chat-") &&
      !selectedHistory.id.startsWith("chat-pending-") &&
      !selectedHistory.id.startsWith("chat-scheduled-");
    const isReady =
      !isLoading &&
      selectedHistory.status === "done" &&
      selectedHistory.stage === "done" &&
      Boolean(selectedImageUrl);
    const shouldAutoEnhance =
      (shouldAutoEnhanceOnFirstGenerateRef.current && !persistedCaption) ||
      (schedulerMode &&
        schedulerDraftId &&
        isGeneratedChatResult &&
        !persistedCaption);
    const resultKey = schedulerDraftId
      ? `${schedulerDraftId}:${selectedHistory.id}:${selectedImageUrl || ""}`
      : `${selectedHistory.id}:${selectedImageUrl || ""}`;

    if (!shouldAutoEnhance || !isReady) return;
    if (lastAutoEnhancedResultKeyRef.current === resultKey) return;

    lastAutoEnhancedResultKeyRef.current = resultKey;
    shouldAutoEnhanceOnFirstGenerateRef.current = false;
    void handleEnhanceCaption({ silent: true });
  }, [
    form.basic.caption,
    businessId,
    handleEnhanceCaption,
    isLoading,
    schedulerMode,
    schedulerDraftId,
    selectedHistory,
    selectedImageUrl,
  ]);

  const togglePlatform = (platform: PlatformEnum) => {
    if (!connectedPlatforms.includes(platform)) return;

    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const submitSchedule = async (scheduleDate: string, scheduleTime: string) => {
    if (!selectedHistory?.result) {
      showToast("error", schedulerT("generateFirst"));
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      showToast("error", schedulerT("selectDateTime"));
      return;
    }

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      showToast("error", schedulerT("selectDateTime"));
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
      const formData = {
        imageUrl: selectedImageUrl,
        caption: form.basic.caption || selectedHistory.result.caption || "",
        platforms: connectedSelectedPlatforms,
        dateTime: scheduledAt.toISOString(),
        status: "ready" as const,
        withChatAI: true,
        shareAsReference: true,
        businessProductId: selectedHistory.input.productKnowledgeId,
        chatSessionId: schedulerDraftPost?.chatSessionId || undefined,
      };

      if (schedulerDraftPost) {
        await mEditSchedulePost.mutateAsync({
          businessId,
          idScheduler: schedulerDraftPost.id,
          formData,
        });
      } else if (editSchedulerManualPostingId) {
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
      setIsScheduleNowConfirmOpen(false);
      if (schedulerDraftPost) {
        removeSchedulerDraftMarker(businessId, String(schedulerDraftPost.id));
      }
      router.push(
        `/business/${businessId}/content-scheduler?selectedDate=${scheduleDate}`
      );
    } catch (error) {
      showToast("error", error);
    }
  };

  const handleConfirmSchedule = async () => {
    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      showToast("error", schedulerT("selectDateTime"));
      return;
    }
    if (scheduledAt <= new Date()) {
      setIsScheduleNowConfirmOpen(true);
      return;
    }

    await submitSchedule(date, time);
  };

  const handleScheduleNow = async () => {
    const nextSchedule = getCurrentScheduleInput();
    setDate(nextSchedule.date);
    setTime(nextSchedule.time);
    await submitSchedule(nextSchedule.date, nextSchedule.time);
  };

  const isScheduling =
    mSchedulePost.isPending ||
    mEditSchedulePost.isPending;

  useEffect(() => {
    const handleOpenScheduleSummary = () => {
      if (mode !== "regenerate" || !schedulerMode) return;
      if (!selectedHistory) {
        showToast("error", schedulerT("generateFirst"));
        return;
      }
      setIsSummaryOpen(true);
    };

    window.addEventListener(
      "content-generate:open-schedule-summary",
      handleOpenScheduleSummary
    );
    return () => {
      window.removeEventListener(
        "content-generate:open-schedule-summary",
        handleOpenScheduleSummary
      );
    };
  }, [mode, schedulerMode, selectedHistory, schedulerT]);

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
              className="w-8 h-8 rounded-full"
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
            <div className="relative">
              <Textarea
                value={form.basic.caption}
                rows={4}
                onChange={(e) => {
                  form.setBasic({ ...form.basic, caption: e.target.value });
                }}
                className="min-h-[120px] resize-none rounded-2xl bg-background-secondary pr-14 text-sm"
                placeholder={
                  selectedHistory ? t("captionWillShowHere") : t("writeCaption")
                }
              />
              {selectedHistory && (
                <Button
                  type="button"
                  size="icon"
                  className="absolute bottom-3 right-3 rounded-xl"
                  onClick={() => void handleEnhanceCaption()}
                  disabled={!canEnhanceCaption}
                  title={t("enhanceCaption")}
                  aria-label={t("enhanceCaption")}
                >
                  {isEnhanceCaptionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <WandSparkles className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {schedulerMode && (
          <>
            <div className="p-4 border-b">
              <div className="grid gap-3 grid-cols-2">
                <div className="flex h-12 items-center gap-2 rounded-2xl border border-input bg-background-secondary px-3">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <input
                    type="date"
                    value={date}
                    min={minDate}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-full w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <ScheduleTimeInput
                  date={date}
                  value={time}
                  onValueChange={setTime}
                  className="h-12 rounded-2xl bg-background-secondary"
                />
              </div>
            </div>

            <div className="p-4 border-b space-y-3">
              <div className="text-sm font-semibold">
                {schedulerT("choosePlatform")}
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
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
      <ConfirmationModal
        isOpen={isScheduleNowConfirmOpen}
        onClose={() => setIsScheduleNowConfirmOpen(false)}
        onConfirm={handleScheduleNow}
        title={schedulerT("publishTimePassedTitle")}
        description={schedulerT("publishTimePassedDescription")}
        confirmText={schedulerT("scheduleNowConfirm")}
        cancelText={schedulerT("scheduleNowCancel")}
        detailLabel={schedulerT("selectedPublishTime")}
        detailValue={`${date} ${time}`}
        isLoading={isScheduling || mEnhanceCaption.isPending}
      />
    </div>
  );
}
