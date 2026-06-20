"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadPhoto } from "@/components/forms/upload-photo";
import { Textarea } from "@/components/ui/textarea";
import { ScheduleTimeInput } from "@/components/ui/schedule-time-input";
import { SOCIAL_MEDIA_PLATFORMS } from "@/constants";
import { showToast } from "@/helper/show-toast";
import { dateManipulation } from "@/helper/date-manipulation";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { cn } from "@/lib/utils";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import {
  useContentCaptionEnhance,
  useContentSchedulerManualAddToQueue,
  useContentSchedulerManualEditQueue,
} from "@/services/content/content.api";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { CalendarDays, Loader2, Send, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getCurrentScheduleInput } from "@/lib/schedule-date-time";

interface ContentSchedulerUploadDialogProps {
  isOpen: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onScheduled: () => void;
  onNeedPlatformConnect: () => void;
  editDraft?: {
    id: number;
    date: Date;
    image: string;
    caption: string;
    platforms: PlatformEnum[];
  } | null;
}

export function ContentSchedulerUploadDialog({
  isOpen,
  selectedDate,
  onClose,
  onScheduled,
  onNeedPlatformConnect,
  editDraft,
}: ContentSchedulerUploadDialogProps) {
  const { businessId } = useParams() as { businessId: string };
  const t = useTranslations("contentScheduler");
  const locale = useLocale();
  const { data: platformsData } = usePlatformKnowledgeGetAll(businessId);
  const scheduleMutation = useContentSchedulerManualAddToQueue();
  const editScheduleMutation = useContentSchedulerManualEditQueue();
  const enhanceCaptionMutation = useContentCaptionEnhance();

  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformEnum[]>([]);
  const [draftScheduleId, setDraftScheduleId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const nextDateSource = editDraft?.date || selectedDate || new Date();
    const nextDate = dateManipulation.ymd(nextDateSource);
    const nextTime = `${nextDateSource
      .getHours()
      .toString()
      .padStart(2, "0")}:${nextDateSource
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

    setDate(nextDate);
    setTime(editDraft ? nextTime : "08:00");
    setSelectedPlatforms(editDraft?.platforms || []);
    setImage(editDraft?.image || null);
    setCaption(editDraft?.caption || "");
    setDraftScheduleId(editDraft?.id || null);
  }, [editDraft, isOpen, selectedDate]);

  const connectedPlatforms = useMemo(
    () =>
      (platformsData?.data.data || []).filter(
        (platform) => platform.status === "connected"
      ),
    [platformsData?.data.data]
  );

  const hasConnectedPlatforms = connectedPlatforms.length > 0;
  const platformOptions = useMemo(
    () =>
      SOCIAL_MEDIA_PLATFORMS.map((platform) => ({
        platform,
        isConnected: connectedPlatforms.some((item) => item.platform === platform),
      })),
    [connectedPlatforms]
  );

  const activeDate = editDraft?.date || selectedDate;
  const formattedDate = activeDate
    ? new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(activeDate)
    : "";

  const togglePlatform = (platform: PlatformEnum) => {
    const isConnected = connectedPlatforms.some((item) => item.platform === platform);
    if (!isConnected) {
      onNeedPlatformConnect();
      return;
    }

    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const handleEnhanceCaption = async () => {
    if (!image) {
      showToast("error", t("uploadPhotoFirst"));
      return;
    }

    try {
      const response = await enhanceCaptionMutation.mutateAsync({
        businessId,
        formData: {
          imageUrl: image,
        },
      });

      setCaption(response.data.data.caption);
      showToast("success", response.data.responseMessage);
    } catch (error) {
      showToast("error", error);
    }
  };

  const handleImageChange = async (nextImage: string | null) => {
    setImage(nextImage);

    if (!nextImage) {
      if (!editDraft) setDraftScheduleId(null);
      return;
    }

    try {
      if (draftScheduleId) {
        await editScheduleMutation.mutateAsync({
          businessId,
          idScheduler: draftScheduleId,
          formData: {
            imageUrl: nextImage,
            caption,
            platforms: selectedPlatforms,
            dateTime: new Date(`${date}T${time}`).toISOString(),
            status: "draft",
            withChatAI: false,
          },
        });
        return;
      }

      const draft = await scheduleMutation.mutateAsync({
        businessId,
        formData: {
          imageUrl: nextImage,
          caption: "",
          platforms: [],
          dateTime: new Date(`${date}T${time}`).toISOString(),
          status: "draft",
          withChatAI: false,
        },
      });

      setDraftScheduleId(draft.data.data.id);
    } catch (error) {
      showToast("error", error);
    }
  };

  const handleSchedule = async () => {
    if (!image) {
      showToast("error", t("uploadPhotoFirst"));
      return;
    }
    if (!caption.trim()) {
      showToast("error", t("captionRequired"));
      return;
    }
    if (!date || !time) {
      showToast("error", t("selectDateAndTime"));
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      showToast("error", t("selectDateAndTime"));
      return;
    }
    if (selectedPlatforms.length === 0) {
      if (!hasConnectedPlatforms) {
        onNeedPlatformConnect();
        return;
      }
      showToast("error", t("pleaseSelectAtLeastOnePlatform"));
      return;
    }

    try {
      const formData = {
        imageUrl: image,
        caption,
        platforms: selectedPlatforms,
        dateTime: scheduledAt.toISOString(),
        status: "ready" as const,
        withChatAI: false,
      };

      if (draftScheduleId) {
        await editScheduleMutation.mutateAsync({
          businessId,
          idScheduler: draftScheduleId,
          formData,
        });
      } else {
        await scheduleMutation.mutateAsync({
          businessId,
          formData,
        });
      }

      showToast("success", t("postScheduledSuccess"));
      onScheduled();
    } catch (error) {
      showToast("error", error);
    }
  };

  const isSubmitting =
    scheduleMutation.isPending || editScheduleMutation.isPending;
  const minDate = getCurrentScheduleInput().date;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editDraft ? t("editPost") : t("schedulerDialogTitle")}
          </DialogTitle>
          <DialogDescription>{formattedDate}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid gap-8 md:grid-cols-[160px_1fr]">
            <UploadPhoto
              label={t("fileUpload")}
              onImageChange={handleImageChange}
              currentImage={image}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("caption")}</label>
              <div className="relative">
                <Textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder={t("writeCaption")}
                  className="min-h-32 resize-none rounded-2xl bg-background-secondary pr-14"
                />
                <Button
                  type="button"
                  size="icon"
                  className="absolute bottom-3 right-3 rounded-xl"
                  onClick={handleEnhanceCaption}
                  disabled={enhanceCaptionMutation.isPending || isSubmitting}
                >
                  {enhanceCaptionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 text-xl font-semibold">
              {t("chooseDateTime")}
            </div>
            <div className="grid gap-3 grid-cols-2 ">
              <label className="space-y-2">
                <span className="text-sm font-medium">{t("selectDate")}</span>
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
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t("selectTime")}</span>
                <ScheduleTimeInput
                  date={date}
                  value={time}
                  onValueChange={setTime}
                  className="h-11 rounded-2xl bg-background-secondary"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 text-xl font-semibold">{t("choosePlatforms")}</div>
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
                          {t("notConnected")}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {!hasConnectedPlatforms && (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("noConnectedPlatformMessage")}
              </p>
            )}
          </section>
        </div>

        <div className="border-t p-6">
          <Button
            onClick={handleSchedule}
            disabled={isSubmitting}
            className="w-full rounded-2xl py-6 text-base"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("schedulePostButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
