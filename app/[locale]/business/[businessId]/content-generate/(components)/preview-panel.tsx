"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { CardNoGap } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoLoader } from "@/components/base/logo-loader";
import { Progress } from "@/components/ui/progress";
import { ScheduleSummaryModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/schedule-summary-modal";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { dateManipulation } from "@/helper/date-manipulation";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
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

function buildTimeOptions() {
  return Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2)
      .toString()
      .padStart(2, "0");
    const minute = index % 2 === 0 ? "00" : "30";
    return `${hour}:${minute}`;
  });
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

  const connectedPlatforms = useMemo(
    () =>
      (platformData?.data.data || [])
        .filter((platform) => platform.status === "connected")
        .map((platform) => platform.platform),
    [platformData?.data.data]
  );
  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const minDate = dateManipulation.ymd(new Date());

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
    if (selectedPlatforms.length === 0) {
      showToast("error", schedulerT("selectPlatform"));
      return;
    }

    try {
      const savedDraft = await mSaveDraft.mutateAsync({
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
      });

      const formData = {
        generatedImageContentId: savedDraft.data.data.id,
        caption: form.basic.caption || selectedHistory.result.caption || "",
        platforms: selectedPlatforms,
        dateTime: new Date(`${date}T${time}`).toISOString(),
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
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger className="h-11 rounded-2xl bg-background-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 border-b space-y-3">
              <div className="text-sm font-semibold">
                {schedulerT("choosePlatform")}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {connectedPlatforms.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-background-secondary"
                      }`}
                    >
                      {mapEnumPlatform.getPlatformIcon(
                        platform,
                        isSelected ? "text-white" : ""
                      )}
                      <span>{mapEnumPlatform.getPlatformLabel(platform)}</span>
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
        timeOptions={timeOptions}
        selectedPlatforms={selectedPlatforms}
        connectedPlatforms={connectedPlatforms}
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
