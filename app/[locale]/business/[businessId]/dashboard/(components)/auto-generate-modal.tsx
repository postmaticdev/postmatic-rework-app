"use client";

import { useState, useEffect, useRef } from "react";
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
import { AutoGenerateReferencePanel } from "./auto-generate-reference-panel";
import { CreateAutoGenerateScheduleRequest, AutoGenerateSchedule } from "@/models/api/content/auto-generate";
import { showToast } from "@/helper/show-toast";
import { useAutoGenerate } from "@/contexts/auto-generate-context";
import type { ValidRatio } from "@/models/api/content/image.type";
import { useContentAutoGenerateCreateSchedule, useContentAutoGenerateUpdateSchedule } from "@/services/content/content.api";
import { useParams } from "next/navigation";
import { AutoGenerateFormBasic } from "./auto-generate-form-basic";
import { AutoGenerateFormAdvanced } from "./auto-generate-form-advance";
import { AutoSelectedReferenceImage } from "./auto-selected-reference-image";
import { TextField } from "@/components/forms/text-field";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TimeInput } from "@/components/ui/time-input";
import { Save, Sparkles, Trash2 } from "lucide-react";

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
  const mCreateSchedule = useContentAutoGenerateCreateSchedule();
  const mUpdateSchedule = useContentAutoGenerateUpdateSchedule();
  const { businessId } = useParams() as { businessId: string };
  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);

  // Form state
  const [additionalPrompt, setAdditionalPrompt] = useState<string>("");
  const [modalSelectedPlatforms, setModalSelectedPlatforms] = useState<PlatformEnum[]>(selectedPlatforms);
  const [modalHour, setModalHour] = useState<string>("");
  const [modalMinute, setModalMinute] = useState<string>("");
  const prevBasicRef = useRef<typeof basic | null>(null);
  const prevAdvanceRef = useRef<typeof advance | null>(null);

  // Auto Generate Context
  const { form, isLoading, productKnowledges, aiModels, onSelectAiModel } = useAutoGenerate();
  const { basic, setBasic, advance, setAdvance } = form;

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

  const getDayName = (dayValue: number | null) => {
    if (dayValue === null) return "";
    return DAYS.find(day => day.value === dayValue)?.label || "";
  };

  const togglePlatform = (platform: PlatformEnum) => {
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


  const handleSave = async () => {
    if (!basic?.productKnowledgeId) {
      showToast("error", t("pleaseSelectProduct"));
      return;
    }

    if (modalSelectedPlatforms.length === 0) {
      showToast("error", t("pleaseSelectPlatform"));
      return;
    }

    if (selectedDay === null) {
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
    console.log('Modal save - editingSchedule:', editingSchedule?.id, 'isActive:', isActiveStatus);
    
    const scheduleData: CreateAutoGenerateScheduleRequest = {
      day: selectedDay,
      time: timeString,
      platforms: modalSelectedPlatforms,
      model: basic.model || "gpt-image-1",
      designStyle: basic.designStyle || "modern",
      ratio: basic.ratio || "1:1",
      referenceImages: basic.referenceImage ? [basic.referenceImage] : [],
      category: basic.category || "sale",
      additionalPrompt: additionalPrompt.trim() || undefined,
      productKnowledgeId: basic.productKnowledgeId,
      isActive: isActiveStatus, // Use existing status when editing, default to true for new schedules
      advBusinessName: form.advance.businessKnowledge.name,
      advBusinessCategory: form.advance.businessKnowledge.category,
      advBusinessDescription: form.advance.businessKnowledge.description,
      advBusinessLocation: form.advance.businessKnowledge.location,
      advBusinessLogo: form.advance.businessKnowledge.logo,
      advBusinessUniqueSellingPoint:
        form.advance.businessKnowledge.uniqueSellingPoint,
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

  // Snapshot form when opening, restore when closing to avoid leaking state to content-generate
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Initialize platform selection and time when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalSelectedPlatforms(selectedPlatforms);
      
      // Parse selectedTime to hour and minute
      if (selectedTime) {
        const [hour, minute] = selectedTime.split(':');
        setModalHour(hour || "");
        setModalMinute(minute || "");
      } else {
        setModalHour("");
        setModalMinute("");
      }
    }
  }, [isOpen, selectedPlatforms, selectedTime]);

  // Prefill form when editing an existing schedule
  useEffect(() => {
    if (!isOpen) return;
    if (editingSchedule) {
      setModalSelectedPlatforms(editingSchedule.platforms);
      
      // Parse editingSchedule.time to hour and minute
      if (editingSchedule.time) {
        const [hour, minute] = editingSchedule.time.split(':');
        setModalHour(hour || "");
        setModalMinute(minute || "");
      }
      
      // Find the AI model that matches the schedule's model
      const scheduleModel = aiModels.models.find(model => model.name === editingSchedule.model);
      
      setBasic({
        ...basic,
        model: editingSchedule.model,
        ratio: editingSchedule.ratio as ValidRatio,
        category: editingSchedule.category,
        designStyle: editingSchedule.designStyle,
        prompt: editingSchedule.additionalPrompt || "",
        productKnowledgeId: editingSchedule.productKnowledgeId,
        referenceImage:
          editingSchedule.referenceImages && editingSchedule.referenceImages.length > 0
            ? editingSchedule.referenceImages[0]
            : null,
        productName: getProductNameById(editingSchedule.productKnowledgeId),
      });

      // Set the selected AI model to match the schedule's model
      if (scheduleModel) {
        onSelectAiModel(scheduleModel);
      }

      // Prefill advance toggles from schedule flags
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

      // Set additional prompt
      setAdditionalPrompt(editingSchedule.additionalPrompt || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingSchedule]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-5xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("configureAutoGenerate")}</DialogTitle>
            <DialogDescription>
              {selectedDay !== null && (
                <div className="flex flex-row items-center space-x-2 gap-2">
                  {t("schedulingFor")} {getDayName(selectedDay)} {t("at")}
                  <TimeInput
                    hour={modalHour}
                    minute={modalMinute}
                    onHourChange={handleModalHourChange}
                    onMinuteChange={handleModalMinuteChange}
                  />
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto  space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 ">
              {/* Left Column - Reference Libary */}
              <div className="space-y-6 md:overflow-y-auto max-h-full md:max-h-[calc(180vh-360px)]">
                <AutoGenerateReferencePanel />
        
              </div>

              {/* Right Column - Form and Status */}
              <div id="auto-generate-form-section" className="space-y-6 p-4 sm:p-6">
                <AutoSelectedReferenceImage/>
              <AutoGenerateFormBasic />
              <AutoGenerateFormAdvanced />

                {/* Platform Selection */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {t("selectPlatforms")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {platformData?.data.data
                        .filter((platform) => platform.status === "connected")
                        .map((platform, index) => {
                          const p = platform.platform as PlatformEnum;
                          const selected = modalSelectedPlatforms.includes(p);
                          return (
                            <Button
                              key={index}
                              variant="outline"
                              onClick={() => togglePlatform(p)}
                              className={cn(
                                "flex-shrink-0",
                                selected
                                  ? "bg-blue-600 hover:bg-blue-700"
                                  : "hover:bg-muted"
                              )}
                            >
                              <div className="bg-background-secondary p-1 rounded-md">
                                {mapEnumPlatform.getPlatformIcon(p)}
                              </div>
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  selected ? "text-white" : "text-muted-foreground"
                                )}
                              >
                                {mapEnumPlatform.getPlatformLabel(p)}
                              </span>
                            </Button>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>


                {/* Additional Prompt */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4 flex gap-2 items-center">
                    <Sparkles className="size-6" /> {t("additionalPrompt")} 
                    </h3>
                    <TextField
                      label=""
                      value={additionalPrompt}
                      onChange={setAdditionalPrompt}
                      placeholder={t("additionalPromptPlaceholder")}
                      multiline={true}
                      rows={3}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {editingSchedule ? (
            <DialogFooterWithTwoButtons
              secondaryButton={{
                message: t("updateSchedule"),
                onClick: handleSave,
                variant: "default",
                icon: <Save className="h-4 w-4" />,
                className: "bg-primary hover:bg-blue-700 px-6 text-white "
              }}
              primaryButton={{
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
    </>
  );
}
