"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScheduleTimeInput } from "@/components/ui/schedule-time-input";
import { Textarea } from "@/components/ui/textarea";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { cn } from "@/lib/utils";
import { CalendarDays, Loader2, Send, Sparkles, Heart, MessageCircle, Bookmark, MoreHorizontal, ThumbsUp, Share2, Globe, Repeat2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

interface ScheduleSummaryModalProps {
  isOpen: boolean;
  businessName?: string;
  businessLogo?: string;
  imageUrl: string;
  caption: string;
  date: string;
  time: string;
  minDate?: string;
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
  businessName,
  businessLogo,
  imageUrl,
  caption,
  date,
  time,
  minDate,
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
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<PlatformEnum>("instagram_professional");

  useEffect(() => {
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(activePreviewPlatform)) {
      setActivePreviewPlatform(selectedPlatforms[0]);
    }
  }, [selectedPlatforms, activePreviewPlatform]);

  const renderSocialFooter = () => {
    if (activePreviewPlatform === "linked_in") {
      return (
        <div className="flex items-center justify-between border-t border-border/50 pt-2 pb-1 text-muted-foreground px-2">
          <div className="flex items-center gap-1.5 hover:bg-muted p-2 rounded-md cursor-pointer transition-colors">
            <ThumbsUp className="w-5 h-5" />
            <span className="text-xs font-semibold">Like</span>
          </div>
          <div className="flex items-center gap-1.5 hover:bg-muted p-2 rounded-md cursor-pointer transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-semibold">Comment</span>
          </div>
          <div className="flex items-center gap-1.5 hover:bg-muted p-2 rounded-md cursor-pointer transition-colors">
            <Repeat2 className="w-5 h-5" />
            <span className="text-xs font-semibold">Repost</span>
          </div>
          <div className="flex items-center gap-1.5 hover:bg-muted p-2 rounded-md cursor-pointer transition-colors">
            <Send className="w-5 h-5" />
            <span className="text-xs font-semibold">Send</span>
          </div>
        </div>
      );
    }
    
    if (activePreviewPlatform === "facebook_page") {
      return (
        <div className="flex items-center justify-around border-t border-border/50 pt-1 pb-1 text-muted-foreground">
          <div className="flex items-center justify-center flex-1 gap-2 hover:bg-muted p-2 rounded-md cursor-pointer transition-colors">
            <ThumbsUp className="w-5 h-5" />
            <span className="text-xs font-semibold">Like</span>
          </div>
          <div className="flex items-center justify-center flex-1 gap-2 hover:bg-muted p-2 rounded-md cursor-pointer transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-semibold">Comment</span>
          </div>
          <div className="flex items-center justify-center flex-1 gap-2 hover:bg-muted p-2 rounded-md cursor-pointer transition-colors">
            <Share2 className="w-5 h-5" />
            <span className="text-xs font-semibold">Share</span>
          </div>
        </div>
      );
    }

    // Default Instagram
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-foreground">
          <Heart className="w-6 h-6 hover:text-red-500 cursor-pointer transition-colors" />
          <MessageCircle className="w-6 h-6 hover:text-muted-foreground cursor-pointer transition-colors" />
          <Send className="w-6 h-6 hover:text-muted-foreground cursor-pointer transition-colors" />
        </div>
        <Bookmark className="w-6 h-6 text-foreground hover:text-muted-foreground cursor-pointer transition-colors" />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t("summaryTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Left Section */}
            <div className="flex flex-col gap-6 sticky top-0 h-fit">
              <div className="space-y-4">
                <div className="text-sm font-medium">{t("scheduleAt")}</div>
                <div className="grid gap-3 grid-cols-2">
                  <div 
                    className="flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-input bg-background-secondary px-3"
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector("input");
                      try { input?.showPicker(); } catch {}
                    }}
                  >
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <input
                      type="date"
                      onClick={(e) => {
                        try { e.currentTarget.showPicker(); } catch {}
                      }}
                      value={date}
                      min={minDate}
                      onChange={(event) => onDateChange(event.target.value)}
                      onBlur={() => {
                        if (minDate && date && date < minDate) {
                          onDateChange(minDate);
                        }
                      }}
                      className="h-full w-full bg-transparent text-sm outline-none [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>

                  <div 
                    className="flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-input bg-background-secondary px-3"
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector("input");
                      try { input?.showPicker(); } catch {}
                    }}
                  >
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <ScheduleTimeInput
                      date={date}
                      value={time}
                      onValueChange={onTimeChange}
                      className="h-full w-full border-0 bg-transparent p-0 text-sm outline-none shadow-none focus-visible:ring-0 [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-medium">{t("choosePlatform")}</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

              <label className="flex items-start gap-3 text-sm mt-2">
                <input type="checkbox" checked readOnly className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary" />
                <span>{t("shareReference")}</span>
              </label>
            </div>

            {/* Right Section - Social Media Preview */}
            <div className="flex flex-col gap-3">
              {/* Platform Selector for Preview */}
              {selectedPlatforms.length > 1 && (
                <div className="flex gap-2 sticky -top-6 -mt-6 z-10 bg-background pb-3 pt-2 -mx-2 px-2">
                  {selectedPlatforms.map(platform => (
                    <button
                      key={platform}
                      onClick={() => setActivePreviewPlatform(platform)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border",
                        activePreviewPlatform === platform
                          ? "bg-primary text-white border-primary"
                          : "bg-background-secondary text-muted-foreground border-border hover:bg-muted"
                      )}
                    >
                      {mapEnumPlatform.getPlatformIcon(platform, activePreviewPlatform === platform ? "text-white w-3 h-3" : "w-3 h-3")}
                      {mapEnumPlatform.getPlatformLabel(platform)}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col rounded-[24px] border border-border bg-card overflow-hidden shadow-sm h-fit transform scale-[0.75] origin-top">
                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
                      <div className="w-full h-full rounded-full border-2 border-card bg-muted flex items-center justify-center overflow-hidden">
                        {businessLogo ? (
                          <img src={businessLogo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">{businessName ? businessName.charAt(0).toUpperCase() : "P"}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold leading-tight">{businessName || "Preview Post"}</span>
                      {activePreviewPlatform !== "instagram_professional" && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          Just now • <Globe className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Image */}
                <div className="w-full bg-black/5 flex items-center justify-center flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt={t("summaryTitle")}
                    className="w-full h-auto block"
                  />
                </div>

                {/* Footer / Caption */}
                <div className="p-4 flex flex-col gap-3 relative">
                  {renderSocialFooter()}
                  
                  <div className="relative mt-1">
                    {activePreviewPlatform === "instagram_professional" && (
                      <span className="text-sm font-semibold mr-2">{businessName || "Preview Post"}</span>
                    )}
                    <Textarea
                      value={caption}
                      onChange={(event) => onCaptionChange(event.target.value)}
                      className="min-h-24 max-h-[200px] resize-none bg-transparent border-none p-0 focus-visible:ring-0 shadow-none text-sm scrollbar-hidden"
                      placeholder={t("caption") + "..."}
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="absolute -bottom-2 -right-2 rounded-xl h-8 w-8 shadow-md"
                      onClick={onEnhanceCaption}
                      disabled={isLoading}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
