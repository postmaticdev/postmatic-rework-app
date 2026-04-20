"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScheduleItemPicker } from "@/components/ui/schedule-item-picker";
import { Calendar } from "lucide-react";
import { useContentSchedulerAutoGetSettings } from "@/services/content/content.api";
import { useParams } from "next/navigation";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { useAutoSchedulerAutosave } from "@/contexts/auto-scheduler-autosave-context";
import { Button } from "@/components/ui/button";
import { LogoLoader } from "@/components/base/logo-loader";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { useTranslations } from "next-intl";

interface AutoPostingProps {
  handleIfNoPlatformConnected: () => void;
}
export function AutoPosting({ handleIfNoPlatformConnected }: AutoPostingProps) {
  const {
    enabled: globalEnabled,
    schedules,
    setGlobalEnabled,
    toggleDay,
    addTime,
    removeTime,
    isValueChanged,
    loading,
    onUpsert,
  } = useAutoSchedulerAutosave();
  const { businessId } = useParams() as { businessId: string };
  const { isLoading } = useContentSchedulerAutoGetSettings(businessId);
  const t = useTranslations("autoPosting");

  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const lenConnectedPlatform =
    platformData?.data.data.filter(
      (platform) => platform.status === "connected"
    ).length || 0;

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
    <Card className="h-full">
      <CardContent className="py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("autoPosting")}</h2>
            <div className="flex flex-row gap-2 items-center">
              <Switch
                checked={globalEnabled}
                onCheckedChange={(v) => {
                  if (lenConnectedPlatform === 0) {
                    handleIfNoPlatformConnected();
                  }
                  setGlobalEnabled(v);
                }}
                onClick={() => {
                  if (lenConnectedPlatform === 0) {
                    handleIfNoPlatformConnected();
                  }
                }}
              />
              <Button onClick={onUpsert} disabled={loading || !isValueChanged}>
                {loading ? t("saving") : t("save")}
              </Button>
            </div>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
            {schedules.schedulerAutoPostings.map((schedule) => (
              <Card key={schedule.day} className="bg-background-secondary">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{schedule.day}</span>
                    </div>
                    <Switch
                      checked={schedule.isActive && globalEnabled}
                      onCheckedChange={() => {
                        toggleDay(schedule.day);
                      }}
                      disabled={!globalEnabled}
                    />
                  </div>

                  {schedule.isActive && globalEnabled && (
                    <div className="mt-3">
                      <ScheduleItemPicker
                        onAddItem={(time, platforms) =>
                          addTime(
                            schedule.day,
                            time,
                            platforms as PlatformEnum[]
                          )
                        }
                        selectedItems={schedule.schedulerAutoPostingTimes.map(
                          (t) => ({
                            time: t.hhmm,
                            platforms: t.platforms as PlatformEnum[],
                          })
                        )}
                        onRemoveItem={(time) => removeTime(schedule.day, time)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
