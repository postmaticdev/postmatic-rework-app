"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { cn } from "@/lib/utils";
import { CalendarDays, Loader2, Send, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface ScheduleSummaryModalProps {
  isOpen: boolean;
  imageUrl: string;
  caption: string;
  date: string;
  time: string;
  minDate?: string;
  minTime?: string;
  selectedPlatforms: PlatformEnum[];
  platforms: { platform: PlatformEnum; isConnected: boolean }[];
  isLoading: boolean;
  onClose: () => void;
  onCaptionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onTogglePlatform: (platform: PlatformEnum) => void;
  onEnhanceCaption: () => void;
  onConfirm: () => void;
}

export function ScheduleSummaryModal({
  isOpen,
  imageUrl,
  caption,
  date,
  time,
  minDate,
  minTime,
  selectedPlatforms,
  platforms,
  isLoading,
  onClose,
  onCaptionChange,
  onDateChange,
  onTimeChange,
  onTogglePlatform,
  onEnhanceCaption,
  onConfirm,
}: ScheduleSummaryModalProps) {
  const t = useTranslations("contentGenerateScheduler");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t("summaryTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-center">
            <Image
              src={imageUrl}
              alt={t("summaryTitle")}
              width={460}
              height={460}
              className="h-auto max-h-[430px] w-auto rounded-[28px] object-cover"
            />
          </div>

          <div className="rounded-[28px] border border-border p-5">
            <div className="mb-2 text-sm font-medium">{t("caption")}</div>
            <div className="relative">
              <Textarea
                value={caption}
                onChange={(event) => onCaptionChange(event.target.value)}
                className="min-h-32 resize-none rounded-2xl bg-background-secondary pr-14"
              />
              <Button
                type="button"
                size="icon"
                className="absolute bottom-3 right-3 rounded-xl"
                onClick={onEnhanceCaption}
                disabled={isLoading}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t("scheduleAt")}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-2xl border border-input bg-background-secondary px-3">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <input
                    type="date"
                    value={date}
                    min={minDate}
                    onChange={(event) => onDateChange(event.target.value)}
                    className="h-11 w-full bg-transparent text-sm outline-none"
                  />
                </div>

                <Input
                  type="time"
                  value={time}
                  min={minTime}
                  step={60}
                  onChange={(event) => onTimeChange(event.target.value)}
                  className="h-11 rounded-2xl bg-background-secondary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{t("choosePlatform")}</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {platforms.map(({ platform, isConnected }) => {
                  const isSelected =
                    isConnected && selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => onTogglePlatform(platform)}
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
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked readOnly className="mt-1 h-4 w-4" />
            <span>{t("shareReference")}</span>
          </label>
        </div>

        <div className="border-t p-6">
          <div className="flex justify-end">
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full rounded-2xl py-6 text-base sm:w-auto sm:min-w-72"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("schedulePost")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
