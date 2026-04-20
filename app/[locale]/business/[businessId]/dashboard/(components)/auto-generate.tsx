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
import { useState } from "react";
import { AutoGenerateModal } from "./auto-generate-modal";
import { AutoGenerateHistoryModal } from "./auto-generate-history-modal";
import { Clock, Plus, Edit, History } from "lucide-react";
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
import { TimeInput } from "@/components/ui/time-input";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";

interface AutoGenerateProps {
  handleIfNoPlatformConnected: () => void;
}

export function AutoGenerate({
  handleIfNoPlatformConnected,
}: AutoGenerateProps) {
  const {
    enabled: globalEnabled,
    setGlobalEnabled,
    getSchedulesByDay,
    deleteScheduleDirectly,
    onUpsert,
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
  const [dayInputs, setDayInputs] = useState<{
    [key: number]: { hour: string; minute: string };
  }>({});
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const lenConnectedPlatform =
    platformData?.data.data.filter(
      (platform) => platform.status === "connected"
    ).length || 0;

  const DAYS = [
    { value: 0, label: t("sunday") },
    { value: 1, label: t("monday") },
    { value: 2, label: t("tuesday") },
    { value: 3, label: t("wednesday") },
    { value: 4, label: t("thursday") },
    { value: 5, label: t("friday") },
    { value: 6, label: t("saturday") },
  ];

  const handleDayHourChange = (day: number, hour: string) => {
    if (hour === "")
      return setDayInputs((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          hour,
        },
      }));
    const n = Number(hour);
    if (!Number.isNaN(n) && n >= 0 && n <= 23) {
      setDayInputs((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          hour,
        },
      }));
    }
  };

  const handleDayMinuteChange = (day: number, minute: string) => {
    if (minute === "")
      return setDayInputs((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          minute,
        },
      }));
    const n = Number(minute);
    if (!Number.isNaN(n) && n >= 0 && n <= 59) {
      setDayInputs((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          minute,
        },
      }));
    }
  };

  const handleAddScheduleToDay = async (day: number) => {
    const dayInput = dayInputs[day];
    if (!dayInput?.hour || !dayInput?.minute) {
      showToast("error", t("pleaseSelectTimeAndPlatform"));
      return;
    }

    const h = parseInt(dayInput.hour, 10);
    const m = parseInt(dayInput.minute, 10);
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

    setSelectedDay(day);
    setSelectedTime(timeString);
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
        referenceImages: schedule.referenceImages || [],
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
      <Card className="h-full flex items-center justify-center">
        <CardContent className="py-6 flex items-center justify-center">
          <LogoLoader />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full">
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">{t("autoGenerate")}</h1>
              <div className="flex flex-row gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHistoryModalOpen(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  {t("history")}
                </Button>
                <Switch
                  checked={globalEnabled}
                  onCheckedChange={async (v) => {
                    console.log("Global switch toggled:", v);
                    if (lenConnectedPlatform === 0) {
                      handleIfNoPlatformConnected();
                      return;
                    }
                    setGlobalEnabled(v);
                    // Immediately save the preference change
                    try {
                      await onUpsert();
                      console.log("Global preference updated successfully:", v);
                    } catch (error) {
                      console.error(
                        "Failed to update global preference:",
                        error
                      );
                    }
                  }}
                  onClick={() => {
                    if (lenConnectedPlatform === 0) {
                      handleIfNoPlatformConnected();
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {globalEnabled ? (
                  <p>{t("autoGenerateEnabled")}</p>
                ) : (
                  <p>{t("autoGenerateDisabled")}</p>
                )}
              </div>

              {/* 7 Day Cards - Only show when enabled */}
              {globalEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2  lg:grid-cols-3 xl:grid-cols-4   gap-4">
                  {DAYS.map((day) => {
                    const daySchedules = getSchedulesByDay(day.value);
                    return (
                      <Card
                        key={day.value}
                        className="p-4 bg-background-secondary"
                      >
                        <div className="space-y-3">
                          <h3 className="font-semibold text-center">
                            {day.label}
                          </h3>

                          {/* Existing Schedules */}
                          <div className="space-y-2">
                            {daySchedules.map((schedule) => (
                              <div
                                key={schedule.id}
                                className="flex flex-row justify-between items-center gap-2"
                              >
                                <div
                                  className="flex items-center justify-between p-2 w-full bg-card rounded-lg cursor-pointer hover:bg-primary/20"
                                  onClick={() => handleEditSchedule(schedule)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                      {schedule.time}
                                    </span>
                                    {schedule.platforms.map((platform) => (
                                      <span
                                        className="text-xs font-medium"
                                        key={platform}
                                      >
                                        {mapEnumPlatform.getPlatformIcon(
                                          platform
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditSchedule(schedule);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    {/* <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSchedule(schedule.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button> */}
                                  </div>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Switch
                                    checked={schedule.isActive}
                                    onCheckedChange={(checked) => {
                                      console.log(
                                        "Switch clicked for schedule:",
                                        schedule.id,
                                        "Current status:",
                                        schedule.isActive,
                                        "New status:",
                                        checked
                                      );
                                      handleToggleSchedule(schedule.id);
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Time Input */}
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                                {t("selectTime")}
                              </label>
                              <div className="flex flex-row w-full justify-between items-center">
                                <TimeInput
                                  hour={dayInputs[day.value]?.hour || ""}
                                  minute={dayInputs[day.value]?.minute || ""}
                                  onHourChange={(value) =>
                                    handleDayHourChange(day.value, value)
                                  }
                                  onMinuteChange={(value) =>
                                    handleDayMinuteChange(day.value, value)
                                  }
                                />
                                <div className="hidden xl:block">
                                  <Button
                                    onClick={() =>
                                      handleAddScheduleToDay(day.value)
                                    }
                                    className=" px-3"
                                    disabled={
                                      !dayInputs[day.value]?.hour ||
                                      !dayInputs[day.value]?.minute
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t("addScheduleFull")}
                                  </Button>
                                </div>
                                <div className="block xl:hidden">
                                  <Button
                                    onClick={() =>
                                      handleAddScheduleToDay(day.value)
                                    }
                                    className=" px-3"
                                    disabled={
                                      !dayInputs[day.value]?.hour ||
                                      !dayInputs[day.value]?.minute
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t("addScheduleShort")}
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Add Button for mobile */}
                            {/* <div className="block sm:hidden w-full">
                              <Button 
                                onClick={() => handleAddScheduleToDay(day.value)} 
                                className="px-3 w-full"
                                disabled={
                                  !dayInputs[day.value]?.hour ||
                                  !dayInputs[day.value]?.minute
                                }
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                {t("addSchedule")}
                              </Button>
                            </div> */}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
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
