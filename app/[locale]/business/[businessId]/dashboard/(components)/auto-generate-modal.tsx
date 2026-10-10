"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooterWithButton,
  DialogFooterWithTwoButtons,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { useTranslations } from "next-intl";
import { CreateAutoGenerateScheduleRequest, AutoGenerateSchedule } from "@/models/api/content/auto-generate";
import { showToast } from "@/helper/show-toast";
import { useAutoGenerate } from "@/contexts/auto-generate-context";
import type { ValidRatio } from "@/models/api/content/image.type";
import { useContentAutoGenerateCreateSchedule, useContentAutoGenerateUpdateSchedule } from "@/services/content/content.api";
import { useParams } from "next/navigation";
import { AutoGenerateFormBasic } from "./auto-generate-form-basic";
import { AutoGenerateFormAdvanced } from "./auto-generate-form-advance";
import { TextField } from "@/components/forms/text-field";
import { usePlatformKnowledgeGetAll, useBusinessKnowledgeGetById } from "@/services/knowledge.api";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { TimeInput } from "@/components/ui/time-input";
import { 
  Save, Sparkles, Trash2, Send,
  Heart, MessageCircle, Bookmark, MoreHorizontal, 
  ThumbsUp, Share2, Globe, Repeat2, BadgeCheck, X,
  CalendarDays, Clock as ClockIcon
} from "lucide-react";
import { SOCIAL_MEDIA_PLATFORMS } from "@/constants";
import { Textarea } from "@/components/ui/textarea";

interface AutoGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete?: (schedule: AutoGenerateSchedule) => void;
  selectedDay: number | null;
  selectedTime: string;
  selectedPlatforms: PlatformEnum[];
  editingSchedule: AutoGenerateSchedule | null;
}

export function AutoGenerateModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  selectedDay,
  selectedTime,
  selectedPlatforms,
  editingSchedule,
}: AutoGenerateModalProps) {
  const t = useTranslations("autoGenerate");
  const tContentGenerate = useTranslations("contentGenerateScheduler");
  const mCreateSchedule = useContentAutoGenerateCreateSchedule();
  const mUpdateSchedule = useContentAutoGenerateUpdateSchedule();
  const { businessId } = useParams() as { businessId: string };
  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const { data: businessKnowledgeData } = useBusinessKnowledgeGetById(businessId);

  const businessName = businessKnowledgeData?.data?.data?.name || "Business Name";
  const businessLogo = businessKnowledgeData?.data?.data?.primaryLogo || businessKnowledgeData?.data?.data?.primaryLogoUrl || "";

  // Form state
  const [additionalPrompt, setAdditionalPrompt] = useState<string>("");
  const [modalSelectedPlatforms, setModalSelectedPlatforms] = useState<PlatformEnum[]>(selectedPlatforms);
  const [modalHour, setModalHour] = useState<string>("");
  const [modalMinute, setModalMinute] = useState<string>("");
  const [modalDay, setModalDay] = useState<number | null>(selectedDay);
  const prevBasicRef = useRef<typeof basic | null>(null);
  const prevAdvanceRef = useRef<typeof advance | null>(null);

  const [activePreviewPlatform, setActivePreviewPlatform] = useState<PlatformEnum>("instagram_professional");

  // Auto Generate Context
  const { form, isLoading, productKnowledges, aiModels, onSelectAiModel } = useAutoGenerate();
  const { basic, setBasic, advance, setAdvance } = form;
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

  // Helper function to get product name from productKnowledgeId
  const getProductNameById = (productKnowledgeId: string) => {
    const product = productKnowledges.contents.find(p => p.id === productKnowledgeId);
    return product?.name || "";
  };

  const DAYS = [
    { value: 0, label: t("sunday") },
    { value: 1, label: t("monday") },
    { value: 2, label: t("tuesday") },
    { value: 3, label: t("wednesday") },
    { value: 4, label: t("thursday") },
    { value: 5, label: t("friday") },
    { value: 6, label: t("saturday") },
  ];

  const togglePlatform = (platform: PlatformEnum) => {
    if (!connectedPlatforms.includes(platform)) return;

    setModalSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleModalHourChange = (value: string) => {
    if (value === "") return setModalHour(value);
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 0 && n <= 23) {
      setModalHour(value);
    }
  };

  const handleModalMinuteChange = (value: string) => {
    if (value === "") return setModalMinute(value);
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 0 && n <= 59) {
      setModalMinute(value);
    }
  };

  useEffect(() => {
    if (modalSelectedPlatforms.length > 0 && !modalSelectedPlatforms.includes(activePreviewPlatform)) {
      setActivePreviewPlatform(modalSelectedPlatforms[0]);
    }
  }, [modalSelectedPlatforms, activePreviewPlatform]);

  const handleSave = async () => {
    if (!basic?.productKnowledgeId) {
      showToast("error", t("pleaseSelectProduct"));
      return;
    }

    const connectedSelectedPlatforms = modalSelectedPlatforms.filter((platform) =>
      connectedPlatforms.includes(platform)
    );

    if (connectedSelectedPlatforms.length === 0) {
      showToast("error", t("pleaseSelectPlatform"));
      return;
    }

    if (modalDay === null) {
      showToast("error", t("pleaseSelectDay"));
      return;
    }

    if (!modalHour || !modalMinute) {
      showToast("error", t("pleaseSelectTime"));
      return;
    }

    const h = parseInt(modalHour, 10);
    const m = parseInt(modalMinute, 10);
    if (Number.isNaN(h) || h < 0 || h > 23) {
      showToast("error", t("hourMustBe0-23"));
      return;
    }
    if (Number.isNaN(m) || m < 0 || m > 59) {
      showToast("error", t("minuteMustBe0-59"));
      return;
    }

    const hh = h.toString().padStart(2, "0");
    const mm = m.toString().padStart(2, "0");
    const timeString = `${hh}:${mm}`;

    const isActiveStatus = editingSchedule ? editingSchedule.isActive : true;
    
    const scheduleData: CreateAutoGenerateScheduleRequest = {
      day: modalDay,
      time: timeString,
      platforms: connectedSelectedPlatforms,
      model: basic.model || "gpt-image-1",
      designStyle: basic.designStyle || "modern",
      ratio: basic.ratio || "1:1",
      category: basic.category || "sale",
      additionalPrompt: additionalPrompt.trim() || undefined,
      avatarImageUrl: basic.avatarImageUrl || undefined,
      productKnowledgeId: basic.productKnowledgeId,
      isActive: isActiveStatus,
      advBusinessName: form.advance.businessKnowledge.name,
      advBusinessCategory: form.advance.businessKnowledge.category,
      advBusinessDescription: form.advance.businessKnowledge.description,
      advBusinessLocation: form.advance.businessKnowledge.location,
      advBusinessLogo: form.advance.businessKnowledge.logo,
      advBusinessUniqueSellingPoint: form.advance.businessKnowledge.uniqueSellingPoint,
      advBusinessWebsite: form.advance.businessKnowledge.website,
      advBusinessVisionMission: form.advance.businessKnowledge.visionMission,
      advBusinessColorTone: form.advance.businessKnowledge.colorTone,
      advProductName: form.advance.productKnowledge.name,
      advProductCategory: form.advance.productKnowledge.category,
      advProductDescription: form.advance.productKnowledge.description,
      advProductPrice: form.advance.productKnowledge.price,
      advRoleHashtags: form.advance.roleKnowledge.hashtags,
    };

    try {
      if (editingSchedule) {
        await mUpdateSchedule.mutateAsync({
          businessId,
          scheduleId: editingSchedule.id,
          formData: scheduleData,
        });
        showToast("success", t("scheduleUpdatedSuccessfully"));
      } else {
        await mCreateSchedule.mutateAsync({
          businessId,
          formData: scheduleData,
        });
        showToast("success", t("scheduleSavedSuccessfully"));
      }
      onSave();
    } catch {
      showToast("error", t("scheduleSaveFailed"));
    }
  };

  useEffect(() => {
    if (isOpen) {
      prevBasicRef.current = structuredClone(basic);
      prevAdvanceRef.current = structuredClone(advance);
    } else {
      if (prevBasicRef.current) setBasic(prevBasicRef.current);
      if (prevAdvanceRef.current) setAdvance(prevAdvanceRef.current);
      prevBasicRef.current = null;
      prevAdvanceRef.current = null;
      setAdditionalPrompt("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setModalSelectedPlatforms(selectedPlatforms);
      setModalDay(selectedDay);
      if (selectedTime) {
        const [hour, minute] = selectedTime.split(':');
        setModalHour(hour || "");
        setModalMinute(minute || "");
      } else {
        setModalHour("");
        setModalMinute("");
      }
    }
  }, [isOpen, selectedPlatforms, selectedTime, selectedDay]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingSchedule) {
      setModalSelectedPlatforms(editingSchedule.platforms);
      if (editingSchedule.time) {
        const [hour, minute] = editingSchedule.time.split(':');
        setModalHour(hour || "");
        setModalMinute(minute || "");
      }
      const scheduleModel = aiModels.models.find(model => model.name === editingSchedule.model);
      setBasic({
        ...basic,
        model: editingSchedule.model,
        ratio: editingSchedule.ratio as ValidRatio,
        category: editingSchedule.category,
        designStyle: editingSchedule.designStyle,
        prompt: editingSchedule.additionalPrompt || "",
        productKnowledgeId: editingSchedule.productKnowledgeId,
        productName: getProductNameById(editingSchedule.productKnowledgeId),
        selectedAvatar: editingSchedule.avatarImageUrl
          ? {
              id: `schedule-avatar-${editingSchedule.id}`,
              imageUrl: editingSchedule.avatarImageUrl,
              title: "Avatar",
              source: "browse",
            }
          : null,
        avatarImageUrl: editingSchedule.avatarImageUrl || null,
      });

      if (scheduleModel) {
        onSelectAiModel(scheduleModel);
      }

      setAdvance({
        ...advance,
        businessKnowledge: {
          ...advance.businessKnowledge,
          name: !!editingSchedule.advBusinessName,
          category: !!editingSchedule.advBusinessCategory,
          description: !!editingSchedule.advBusinessDescription,
          location: !!editingSchedule.advBusinessLocation,
          logo: !!editingSchedule.advBusinessLogo,
          uniqueSellingPoint: !!editingSchedule.advBusinessUniqueSellingPoint,
          website: !!editingSchedule.advBusinessWebsite,
          visionMission: !!editingSchedule.advBusinessVisionMission,
          colorTone: !!editingSchedule.advBusinessColorTone,
        },
        productKnowledge: {
          ...advance.productKnowledge,
          name: !!editingSchedule.advProductName,
          category: !!editingSchedule.advProductCategory,
          description: !!editingSchedule.advProductDescription,
          price: !!editingSchedule.advProductPrice,
        },
        roleKnowledge: {
          ...advance.roleKnowledge,
          hashtags: !!editingSchedule.advRoleHashtags,
        },
      });

      setAdditionalPrompt(editingSchedule.additionalPrompt || "");
    }
  }, [isOpen, editingSchedule]);

  const renderCaptionArea = (className?: string) => (
    <div className={cn("relative w-full group", className)}>
      <Textarea
        value={additionalPrompt}
        readOnly
        className="min-h-[60px] max-h-[300px] resize-none bg-transparent border-none p-0 focus-visible:ring-0 shadow-none text-sm scrollbar-hidden leading-relaxed text-muted-foreground"
        placeholder={tContentGenerate("caption") + "..."}
      />
    </div>
  );

  const renderImagePreviewPlaceholder = () => (
    <div className="w-full aspect-square flex flex-col items-center justify-center text-muted-foreground bg-muted border border-dashed border-border/50">
      <Sparkles className="h-8 w-8 mb-2 opacity-50" />
      <span className="text-sm font-medium">Generated Image</span>
      <span className="text-xs opacity-70">Ratio: {basic.ratio || "1:1"}</span>
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
              <div className="w-full h-full flex items-center justify-center font-bold text-lg">{businessName.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm hover:text-blue-600 hover:underline cursor-pointer">{businessName}</span>
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
        {renderImagePreviewPlaceholder()}
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
              <div className="w-full h-full flex items-center justify-center font-bold text-lg">{businessName.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center flex-wrap gap-x-1">
              <span className="font-bold text-sm hover:underline cursor-pointer">{businessName}</span>
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
        {renderImagePreviewPlaceholder()}
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
                <span className="text-sm font-bold">{businessName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm cursor-pointer">{businessName}</span>
            <span className="text-muted-foreground text-sm">• 1m</span>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-foreground cursor-pointer" />
      </div>
      <div className="w-full bg-black/5 flex items-center justify-center relative min-h-[300px] max-h-[580px] overflow-hidden">
        {renderImagePreviewPlaceholder()}
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
          <span className="font-semibold cursor-pointer w-fit mb-1">{businessName}</span>
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
      <DialogContent
        size="xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("configureAutoGenerate")}</DialogTitle>
          <DialogDescription>
            {t("scheduleConfiguration")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6 scrollbar-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Left Section - Form */}
            <div className="flex flex-col gap-6 sticky top-0 h-fit">
              <div className="space-y-4">
                <div className="text-sm font-medium">{tContentGenerate("scheduleAt")}</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <NativeSelect
                      value={modalDay !== null ? modalDay.toString() : ""}
                      onChange={(e) => setModalDay(Number(e.target.value))}
                      disabled={!!editingSchedule}
                      className="bg-background-secondary"
                    >
                      <option value="" disabled>
                        {t("pleaseSelectDay")}
                      </option>
                      {DAYS.map((day) => (
                        <option key={day.value} value={day.value.toString()}>
                          {day.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="flex h-(--control-h) items-center gap-2 rounded-md border border-input bg-background-secondary px-3 shadow-xs">
                    <ClockIcon className="h-4 w-4 text-primary shrink-0" />
                    <TimeInput
                      hour={modalHour}
                      minute={modalMinute}
                      onHourChange={handleModalHourChange}
                      onMinuteChange={handleModalMinuteChange}
                    />
                  </div>
                </div>
              </div>

              <AutoGenerateFormBasic />

              <div className="space-y-4">
                <div className="text-sm font-medium">{tContentGenerate("choosePlatform")}</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {platformOptions.map(({ platform, isConnected }) => {
                    const isSelected = isConnected && modalSelectedPlatforms.includes(platform);
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
                              {tContentGenerate("notConnected")}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex gap-2 items-center">
                  <Sparkles className="size-4 text-primary" /> Content Brief 
                </label>
                <Textarea
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  placeholder={t("additionalPromptPlaceholder")}
                  rows={3}
                  className="max-h-[120px] scrollbar-hidden resize-none"
                />
              </div>

              <AutoGenerateFormAdvanced />
            </div>

            {/* Right Section - Social Media Preview */}
            <div className="flex flex-col gap-3">
              {modalSelectedPlatforms.length > 1 && (
                <div className="flex gap-2 sticky -top-4 -mt-4 sm:-top-6 sm:-mt-6 z-10 bg-background pb-3 pt-2 -mx-2 px-2">
                  {modalSelectedPlatforms.map(platform => (
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

        {editingSchedule ? (
          <DialogFooterWithTwoButtons
            primaryButton={{
              message: t("updateSchedule"),
              onClick: handleSave,
              variant: "default",
              icon: <Save className="h-4 w-4" />,
              className: "bg-primary hover:bg-blue-700 text-white"
            }}
            secondaryButton={{
              message: t("deleteSchedule"),
              onClick: () => editingSchedule && onDelete?.(editingSchedule),
              variant: "destructive",
              icon: <Trash2 className="h-4 w-4" />,
              className: "bg-red-600 hover:bg-red-700 text-white"
            }}
          />
        ) : (
          <DialogFooterWithButton
            buttonMessage={t("saveSchedule")}
            onClick={handleSave}
            disabled={isLoading || !basic?.productKnowledgeId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
