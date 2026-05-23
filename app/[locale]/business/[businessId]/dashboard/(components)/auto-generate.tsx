"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LogoLoader } from "@/components/base/logo-loader";
import { useAutoGenerate } from "@/contexts/auto-generate-context";
import { useParams } from "next/navigation";
import {
  useContentAutoGenerateGetSettings,
  useContentAutoGenerateUpdateSchedule,
} from "@/services/content/content.api";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AutoGenerateModal } from "./auto-generate-modal";
import { AutoGenerateHistoryModal } from "./auto-generate-history-modal";
import { Clock, Edit, History, Plus, Send, X } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { AutoGenerateSchedule } from "@/models/api/content/auto-generate";
import { showToast } from "@/helper/show-toast";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { cn } from "@/lib/utils";
import { SOCIAL_MEDIA_PLATFORMS } from "@/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AutoGenerateProps {
  handleIfNoPlatformConnected: () => void;
  cardClassName?: string;
  scheduleListClassName?: string;
}

export function AutoGenerate({
  handleIfNoPlatformConnected,
  cardClassName,
  scheduleListClassName = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
}: AutoGenerateProps) {
  const {
    getSchedulesByDay,
    deleteScheduleDirectly,
  } = useAutoGenerate();

  const { businessId } = useParams() as { businessId: string };
  const { isLoading } = useContentAutoGenerateGetSettings(businessId);
  const updateScheduleMutation = useContentAutoGenerateUpdateSchedule();
  const t = useTranslations("autoGenerate");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImages] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformEnum[]>(
    []
  );
  const [editingSchedule, setEditingSchedule] =
    useState<AutoGenerateSchedule | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRepeatDays, setSelectedRepeatDays] = useState<number[]>([]);
  const [scheduleToDelete, setScheduleToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const lenConnectedPlatform =
    platformData?.data.data.filter(
      (platform) =>
        SOCIAL_MEDIA_PLATFORMS.includes(platform.platform) &&
        platform.status === "connected"
    ).length || 0;

  const DAYS = useMemo(
    () => [
      { value: 0, label: t("sunday") },
      { value: 1, label: t("monday") },
      { value: 2, label: t("tuesday") },
      { value: 3, label: t("wednesday") },
      { value: 4, label: t("thursday") },
      { value: 5, label: t("friday") },
      { value: 6, label: t("saturday") },
    ],
    [t]
  );

  const visibleDayValues = useMemo(() => {
    const daysWithSchedules = DAYS.filter(
      (day) => getSchedulesByDay(day.value).length > 0
    ).map((day) => day.value);

    return Array.from(new Set([...daysWithSchedules, ...selectedRepeatDays]))
      .sort((a, b) => a - b);
  }, [DAYS, getSchedulesByDay, selectedRepeatDays]);

  const visibleDays = DAYS.filter((day) => visibleDayValues.includes(day.value));
  const selectableDays = DAYS.filter(
    (day) => !visibleDayValues.includes(day.value)
  );

  const handleSelectRepeatDay = (day: number) => {
    setSelectedRepeatDays((current) =>
      current.includes(day) ? current : [...current, day]
    );
  };

  const handleRemoveRepeatDay = (day: number) => {
    if (getSchedulesByDay(day).length > 0) return;
    setSelectedRepeatDays((current) => current.filter((item) => item !== day));
  };

  const handleAddScheduleToDay = (day: number) => {
    setSelectedDay(day);
    setSelectedTime("");
    setSelectedPlatforms([]); // Will be selected in modal
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const handleEditSchedule = (schedule: AutoGenerateSchedule) => {
    setSelectedDay(schedule.day);
    setSelectedTime(schedule.time);
    setSelectedPlatforms(schedule.platforms);
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleDeleteSchedule = (schedule: AutoGenerateSchedule) => {
    // Get schedule name (platforms and time)
    const platformNames = schedule.platforms
      .map((p) => mapEnumPlatform.getPlatformLabel(p))
      .join(", ");
    const scheduleName = `${platformNames} - ${schedule.time}`;

    setScheduleToDelete({
      id: schedule.id,
      name: scheduleName,
    });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;

    setIsDeleting(true);
    try {
      await deleteScheduleDirectly(scheduleToDelete.id);
      setIsDeleteModalOpen(false);
      setIsModalOpen(false);
      showToast("success", t("scheduleDeletedSuccessfully"));
    } catch {
      showToast("error", t("scheduleDeleteFailed"));
    } finally {
      setIsDeleting(false);
      setScheduleToDelete(null);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false);
      setScheduleToDelete(null);
    }
  };

  const handleToggleSchedule = async (scheduleId: string) => {
    try {
      console.log("handleToggleSchedule called for scheduleId:", scheduleId);

      // Find the schedule to get its current status by checking all days
      let schedule = null;
      for (let day = 0; day < 7; day++) {
        const daySchedules = getSchedulesByDay(day);
        schedule = daySchedules.find((s) => s.id === scheduleId);
        if (schedule) {
          console.log(
            "Found schedule:",
            schedule.id,
            "Current isActive:",
            schedule.isActive,
            "Day:",
            day
          );
          break;
        }
      }

      if (!schedule) {
        console.log("Schedule not found for ID:", scheduleId);
        showToast("error", t("scheduleNotFound"));
        return;
      }

      // Check if schedule has no platforms
      if (!schedule.platforms || schedule.platforms.length === 0) {
        console.log("Schedule has no platforms");

        // If no connected platforms, show modal to connect platform
        if (lenConnectedPlatform === 0) {
          console.log("No connected platforms available");
          handleIfNoPlatformConnected();
          return;
        }

        // If there are connected platforms, open edit modal to select platforms
        console.log("Connected platforms available, opening edit modal");
        showToast("info", t("pleaseSelectPlatform"));
        handleEditSchedule(schedule);
        return;
      }

      // Toggle the active status
      const newActiveStatus = !schedule.isActive;
      console.log(
        "Toggling schedule from",
        schedule.isActive,
        "to",
        newActiveStatus
      );

      // Create the update payload with all existing data but new isActive status
      const updateData = {
        day: schedule.day,
        time: schedule.time,
        platforms: schedule.platforms,
        model: schedule.model,
        designStyle: schedule.designStyle,
        ratio: schedule.ratio,
        category: schedule.category,
        additionalPrompt: schedule.additionalPrompt || undefined,
        productKnowledgeId: schedule.productKnowledgeId,
        isActive: newActiveStatus,
        advBusinessName: schedule.advBusinessName,
        advBusinessCategory: schedule.advBusinessCategory,
        advBusinessDescription: schedule.advBusinessDescription,
        advBusinessLocation: schedule.advBusinessLocation,
        advBusinessLogo: schedule.advBusinessLogo,
        advBusinessUniqueSellingPoint: schedule.advBusinessUniqueSellingPoint,
        advBusinessWebsite: schedule.advBusinessWebsite,
        advBusinessVisionMission: schedule.advBusinessVisionMission,
        advBusinessColorTone: schedule.advBusinessColorTone,
        advProductName: schedule.advProductName,
        advProductCategory: schedule.advProductCategory,
        advProductDescription: schedule.advProductDescription,
        advProductPrice: schedule.advProductPrice,
        advRoleHashtags: schedule.advRoleHashtags,
      };

      await updateScheduleMutation.mutateAsync({
        businessId,
        scheduleId,
        formData: updateData,
      });

      console.log(
        "Schedule updated successfully:",
        scheduleId,
        "New status:",
        newActiveStatus
      );
      showToast(
        "success",
        newActiveStatus ? t("scheduleActivated") : t("scheduleDeactivated")
      );
    } catch (error) {
      console.error("Error toggling schedule:", error);
      showToast("error", t("scheduleToggleFailed"));
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
    setSelectedTime("");
    setSelectedPlatforms([]);
    setEditingSchedule(null);
  };

  const handleModalSave = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
    setSelectedTime("");
    setSelectedPlatforms([]);
    setEditingSchedule(null);
  };

  if (isLoading) {
    return (
      <Card className={cn("h-full flex items-center justify-center", cardClassName)}>
        <CardContent className="py-6 flex items-center justify-center">
          <LogoLoader />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("h-full", cardClassName)}>
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">{t("autoGenerate")}</h1>
              <div className="flex flex-row gap-2 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      disabled={selectableDays.length === 0}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      {t("addRepetitionDay")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {selectableDays.map((day) => (
                      <DropdownMenuItem
                        key={day.value}
                        onClick={() => handleSelectRepeatDay(day.value)}
                      >
                        {day.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("autoGenerateEnabled")}
                </p>

              </div>

              <div className={scheduleListClassName}>
                {visibleDays.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-muted-foreground/35 bg-background-secondary px-4 py-8 text-center text-sm text-muted-foreground">
                    Pilih hari repetisi dengan tombol tambah.
                  </div>
                ) : null}
                {visibleDays.map((day) => {
                  const daySchedules = getSchedulesByDay(day.value);
                  const canRemoveDay =
                    daySchedules.length === 0 &&
                    selectedRepeatDays.includes(day.value);
                  return (
                    <Card key={day.value} className="bg-background-secondary">
                      <CardContent className="space-y-3 p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2">
                            <h3 className="font-semibold text-center">
                              {day.label}
                            </h3>
                            {canRemoveDay ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleRemoveRepeatDay(day.value)}
                                aria-label={`Hapus ${day.label}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>

                          {/* Existing Schedules */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ">
                            {daySchedules.length === 0 ? (
                              <div className="rounded-lg border border-dashed border-muted-foreground/35 bg-card/70 px-3 py-4 text-center text-sm text-muted-foreground">
                                {t("noRepetitionSchedule")}
                              </div>
                            ) : (
                              daySchedules.map((schedule, index) => {
                                const shouldSpanFullOnSm =
                                  daySchedules.length % 2 === 1 &&
                                  index === daySchedules.length - 1;

                                return (
                                  <div
                                    key={schedule.id}
                                    className={cn(
                                      "flex items-center gap-3",
                                      shouldSpanFullOnSm
                                        ? "sm:col-span-2 col-span-1"
                                        : ""
                                    )}
                                  >
                                    <button
                                      type="button"
                                      className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 text-left transition-colors hover:bg-primary/10"
                                      onClick={(event) => {
                                        const target = event.target as HTMLElement;
                                        if (
                                          target.closest(
                                            '[data-toggle-schedule="true"]'
                                          )
                                        ) {
                                          return;
                                        }
                                        handleEditSchedule(schedule);
                                      }}
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="truncate text-sm font-medium">
                                          {schedule.time}
                                        </span>
                                        <div className="flex shrink-0 items-center gap-1">
                                          {schedule.platforms.map((platform) => (
                                            <span
                                              className="text-xs font-medium"
                                              key={platform}
                                            >
                                              {mapEnumPlatform.getPlatformIcon(platform)}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Edit className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <div
                                          data-toggle-schedule="true"
                                          onClick={(event) => event.stopPropagation()}
                                          onPointerDown={(event) =>
                                            event.stopPropagation()
                                          }
                                        >
                                          <Switch
                                            className="z-50"
                                            checked={schedule.isActive}
                                            onCheckedChange={() =>
                                              handleToggleSchedule(schedule.id)
                                            }
                                          />
                                        </div>
                                      </div>
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <Button
                            onClick={() => handleAddScheduleToDay(day.value)}
                            className="w-full"
                          >
                            <Send className="h-4 w-4" />
                            {t("addScheduleFull")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AutoGenerateModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        onDelete={handleDeleteSchedule}
        selectedDay={selectedDay}
        selectedTime={selectedTime}
        selectedPlatforms={selectedPlatforms}
        editingSchedule={editingSchedule}
      />

      <AutoGenerateHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title={t("deleteScheduleTitle")}
        description={t("deleteScheduleDescription")}
        itemName={scheduleToDelete?.name || ""}
        isLoading={isDeleting}
      />

      {/* Image Preview Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("generatedImages")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {selectedImages.map((image, index) => (
              <div key={index} className="space-y-2">
                <Image
                  src={image}
                  alt={`Generated ${index + 1}`}
                  width={400}
                  height={400}
                  className="w-full h-auto rounded-lg border"
                />
                <p className="text-sm text-muted-foreground text-center">
                  {t("generatedImage")} {index + 1}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
