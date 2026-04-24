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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/helper/show-toast";
import { dateManipulation } from "@/helper/date-manipulation";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import {
  useContentCaptionEnhance,
  useContentPersonalCreate,
  useContentSchedulerManualAddToQueue,
} from "@/services/content/content.api";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { CalendarDays, Loader2, Send, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

interface ContentSchedulerUploadDialogProps {
  isOpen: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onScheduled: () => void;
  onNeedPlatformConnect: () => void;
}

function buildTimeOptions() {
  return Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2)
      .toString()
      .padStart(2, "0");
    const minute = index % 2 === 0 ? "00" : "30";
    return `${hour}:${minute}`;
  });
}

export function ContentSchedulerUploadDialog({
  isOpen,
  selectedDate,
  onClose,
  onScheduled,
  onNeedPlatformConnect,
}: ContentSchedulerUploadDialogProps) {
  const { businessId } = useParams() as { businessId: string };
  const t = useTranslations("contentScheduler");
  const locale = useLocale();
  const { data: platformsData } = usePlatformKnowledgeGetAll(businessId);
  const createPersonalMutation = useContentPersonalCreate();
  const scheduleMutation = useContentSchedulerManualAddToQueue();
  const enhanceCaptionMutation = useContentCaptionEnhance();

  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformEnum[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const nextDate = selectedDate
      ? dateManipulation.ymd(selectedDate)
      : dateManipulation.ymd(new Date());
    setDate(nextDate);
    setTime("08:00");
    setSelectedPlatforms([]);
    setImage(null);
    setCaption("");
  }, [isOpen, selectedDate]);

  const connectedPlatforms = useMemo(
    () =>
      (platformsData?.data.data || []).filter(
        (platform) => platform.status === "connected"
      ),
    [platformsData?.data.data]
  );

  const hasConnectedPlatforms = connectedPlatforms.length > 0;
  const timeOptions = useMemo(() => buildTimeOptions(), []);

  const formattedDate = selectedDate
    ? new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(selectedDate)
    : "";

  const togglePlatform = (platform: PlatformEnum) => {
    if (!hasConnectedPlatforms) {
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
          images: [image],
          model: "gemini",
          currentCaption: caption,
        },
      });

      setCaption(response.data.data.caption);
      showToast("success", response.data.responseMessage);
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
    if (selectedPlatforms.length === 0) {
      if (!hasConnectedPlatforms) {
        onNeedPlatformConnect();
        return;
      }
      showToast("error", t("pleaseSelectAtLeastOnePlatform"));
      return;
    }

    try {
      const createdDraft = await createPersonalMutation.mutateAsync({
        businessId,
        formData: {
          images: [image],
          caption,
        },
      });

      await scheduleMutation.mutateAsync({
        businessId,
        formData: {
          generatedImageContentId: createdDraft.data.data.id,
          caption,
          platforms: selectedPlatforms,
          dateTime: new Date(`${date}T${time}`).toISOString(),
        },
      });

      showToast("success", t("postScheduledSuccess"));
      onScheduled();
    } catch (error) {
      showToast("error", error);
    }
  };

  const isSubmitting =
    createPersonalMutation.isPending || scheduleMutation.isPending;
  const minDate = dateManipulation.ymd(new Date());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("schedulerDialogTitle")}</DialogTitle>
          <DialogDescription>{formattedDate}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-[120px_1fr]">
            <UploadPhoto
              label={t("fileUpload")}
              onImageChange={setImage}
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
            <div className="grid gap-3 sm:grid-cols-2">
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
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 text-xl font-semibold">{t("choosePlatforms")}</div>
            <div className="grid gap-3 sm:grid-cols-3">
                {connectedPlatforms.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform.platform);
                  return (
                    <button
                      key={platform.platform}
                      type="button"
                      onClick={() => togglePlatform(platform.platform)}
                      className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background-secondary"
                    }`}
                  >
                    {mapEnumPlatform.getPlatformIcon(
                      platform.platform,
                      isSelected ? "text-white" : ""
                    )}
                    <span>{mapEnumPlatform.getPlatformLabel(platform.platform)}</span>
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
