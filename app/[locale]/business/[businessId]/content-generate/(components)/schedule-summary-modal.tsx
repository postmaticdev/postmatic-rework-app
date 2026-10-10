"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScheduleTimeInput } from "@/components/ui/schedule-time-input";
import { Textarea } from "@/components/ui/textarea";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { cn } from "@/lib/utils";
import { CalendarDays, Loader2, Send, Sparkles, Heart, MessageCircle, Bookmark, MoreHorizontal, ThumbsUp, Share2, Globe, Repeat2, Clock, BadgeCheck, X } from "lucide-react";
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

  const renderCaptionArea = (className?: string) => (
    <div className={cn("relative w-full group", className)}>
      <Textarea
        value={caption}
        onChange={(event) => onCaptionChange(event.target.value)}
        className="min-h-[60px] max-h-[300px] resize-none bg-transparent border-none p-0 focus-visible:ring-0 shadow-none scrollbar-hidden leading-relaxed"
        placeholder={t("caption") + "..."}
      />
      <Button
        type="button"
        size="icon-sm"
        className="absolute -bottom-2 -right-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onEnhanceCaption}
        disabled={isLoading}
      >
        <Sparkles className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderLinkedInPreview = () => (
    <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden shadow-sm w-full mx-auto max-w-[500px]">
      <div className="p-4 flex justify-between items-start">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0">
            {businessLogo ? (
              <img src={businessLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-lg">{businessName ? businessName.charAt(0).toUpperCase() : "P"}</div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm hover:text-blue-600 hover:underline cursor-pointer">{businessName || "Business Name"}</span>
              <BadgeCheck className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">• 1st</span>
            </div>
            <span className="text-muted-foreground text-xs line-clamp-1">Postmatic Business Page</span>
            <span className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
              Just now • <Globe className="w-3 h-3" />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <MoreHorizontal className="w-5 h-5 cursor-pointer hover:text-foreground" />
          <X className="w-5 h-5 cursor-pointer hover:text-foreground" />
        </div>
      </div>

      <div className="px-4 pb-3">
        {renderCaptionArea()}
      </div>

      <div className="w-full bg-black/5 flex items-center justify-center relative max-h-[500px] overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="Preview" className="w-full h-auto object-contain max-h-[500px]" />
        ) : (
          <div className="w-full aspect-video flex items-center justify-center text-muted-foreground bg-muted">No Image</div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-muted-foreground">
          <div className="flex items-center gap-2 hover:bg-muted py-2 px-3 rounded-md cursor-pointer transition-colors">
            <ThumbsUp className="w-5 h-5" />
            <span className="text-sm font-medium">Like</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-muted py-2 px-3 rounded-md cursor-pointer transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Comment</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-muted py-2 px-3 rounded-md cursor-pointer transition-colors">
            <Repeat2 className="w-5 h-5" />
            <span className="text-sm font-medium">Repost</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-muted py-2 px-3 rounded-md cursor-pointer transition-colors">
            <Send className="w-5 h-5" />
            <span className="text-sm font-medium">Send</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFacebookPreview = () => (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm w-full mx-auto max-w-[500px]">
      <div className="p-4 flex justify-between items-start">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0 border border-border/50">
            {businessLogo ? (
              <img src={businessLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-lg">{businessName ? businessName.charAt(0).toUpperCase() : "P"}</div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center flex-wrap gap-x-1">
              <span className="font-bold text-sm hover:underline cursor-pointer">{businessName || "Business Name"}</span>
              <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-muted-foreground text-sm font-semibold mx-1">•</span>
              <span className="text-blue-500 font-semibold text-sm cursor-pointer hover:underline">Follow</span>
            </div>
            <span className="text-muted-foreground text-[13px] flex items-center gap-1 hover:underline cursor-pointer w-fit mt-0.5">
              Just now • <Globe className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground mt-1">
          <MoreHorizontal className="w-5 h-5 cursor-pointer hover:bg-muted rounded-full" />
          <X className="w-5 h-5 cursor-pointer hover:bg-muted rounded-full" />
        </div>
      </div>

      <div className="px-4 pb-3">
        {renderCaptionArea()}
      </div>

      <div className="w-full bg-black/5 flex items-center justify-center relative max-h-[600px] overflow-hidden border-y border-border/50">
        {imageUrl ? (
          <img src={imageUrl} alt="Preview" className="w-full h-auto object-contain max-h-[600px]" />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center text-muted-foreground bg-muted">No Image</div>
        )}
      </div>

      <div className="px-4 py-2 flex items-center justify-between text-muted-foreground border-b border-border/50">
        <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
          <div className="flex -space-x-1">
             <div className="w-5 h-5 rounded-full bg-blue-500 border border-card flex items-center justify-center z-10">
               <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
             </div>
             <div className="w-5 h-5 rounded-full bg-red-500 border border-card flex items-center justify-center">
               <Heart className="w-2.5 h-2.5 text-white fill-white" />
             </div>
          </div>
          <span className="text-[13px]">12</span>
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="cursor-pointer hover:underline">1 Comment</span>
          <span className="cursor-pointer hover:underline">1 Share</span>
        </div>
      </div>

      <div className="px-4 py-1.5">
        <div className="flex items-center justify-between text-muted-foreground font-semibold">
          <div className="flex flex-1 items-center justify-center gap-2 hover:bg-muted py-2 rounded-md cursor-pointer transition-colors">
            <ThumbsUp className="w-5 h-5" />
            <span className="text-sm">Like</span>
          </div>
          <div className="flex flex-1 items-center justify-center gap-2 hover:bg-muted py-2 rounded-md cursor-pointer transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">Comment</span>
          </div>
          <div className="flex flex-1 items-center justify-center gap-2 hover:bg-muted py-2 rounded-md cursor-pointer transition-colors">
            <Share2 className="w-5 h-5" />
            <span className="text-sm">Share</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInstagramPreview = () => (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm w-full mx-auto max-w-[470px]">
      <div className="px-3 py-3 flex justify-between items-center bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
            <div className="w-full h-full rounded-full border-2 border-card bg-muted flex items-center justify-center overflow-hidden">
              {businessLogo ? (
                <img src={businessLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{businessName ? businessName.charAt(0).toUpperCase() : "P"}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm cursor-pointer">{businessName || "business_name"}</span>
            <span className="text-muted-foreground text-sm">• 1m</span>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-foreground cursor-pointer" />
      </div>

      <div className="w-full bg-black/5 flex items-center justify-center relative min-h-[300px] max-h-[580px] overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="Preview" className="w-full h-auto object-contain max-h-[580px]" />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center text-muted-foreground bg-muted">No Image</div>
        )}
      </div>

      <div className="px-3 pt-3 pb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-4">
            <Heart className="w-6 h-6 cursor-pointer hover:opacity-50 transition-opacity" />
            <MessageCircle className="w-6 h-6 cursor-pointer hover:opacity-50 transition-opacity" style={{ transform: 'scaleX(-1)' }} />
            <Send className="w-6 h-6 cursor-pointer hover:opacity-50 transition-opacity" />
          </div>
          <Bookmark className="w-6 h-6 text-foreground cursor-pointer hover:opacity-50 transition-opacity" />
        </div>
        
        <span className="font-semibold text-sm cursor-pointer mt-1 w-fit">12 likes</span>

        <div className="text-sm mt-1 flex flex-col w-full">
          <span className="font-semibold cursor-pointer w-fit mb-1">{businessName || "business_name"}</span>
          {renderCaptionArea()}
        </div>
        
        <span className="text-muted-foreground text-sm mt-1 cursor-pointer w-fit">View all 1 comment</span>
      </div>
    </div>
  );

  const renderActivePreview = () => {
    if (activePreviewPlatform === "linked_in") return renderLinkedInPreview();
    if (activePreviewPlatform === "facebook_page") return renderFacebookPreview();
    return renderInstagramPreview();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{t("summaryTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6 scrollbar-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Left Section */}
            <div className="flex flex-col gap-6 sticky top-0 h-fit">
              <div className="space-y-4">
                <div className="text-sm font-medium">{t("scheduleAt")}</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div
                    className="flex h-(--control-h) cursor-pointer items-center gap-2 rounded-md border border-input bg-background-secondary px-3"
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
                      className="h-full w-full bg-transparent text-base outline-none sm:text-sm [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>

                  <div
                    className="flex h-(--control-h) cursor-pointer items-center gap-2 rounded-md border border-input bg-background-secondary px-3"
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
                      className="h-full w-full border-0 bg-transparent p-0 text-base outline-none shadow-none sm:text-sm focus-visible:ring-0 [&::-webkit-calendar-picker-indicator]:hidden"
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
                <div className="flex gap-2 sticky -top-4 -mt-4 sm:-top-6 sm:-mt-6 z-10 bg-background pb-3 pt-2 -mx-2 px-2">
                  {selectedPlatforms.map(platform => (
                    <button
                      key={platform}
                      onClick={() => setActivePreviewPlatform(platform)}
                      className={cn(
                        "min-h-10 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border",
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

              <div className="flex flex-col h-fit transform lg:scale-[0.85] origin-top">
                {renderActivePreview()}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("schedulePost")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
