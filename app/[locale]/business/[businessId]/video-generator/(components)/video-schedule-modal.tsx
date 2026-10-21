"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play } from "lucide-react";
import { ScheduleSummaryModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/schedule-summary-modal";
import { SOCIAL_MEDIA_PLATFORMS } from "@/constants";
import { showToast } from "@/helper/show-toast";
import { getCurrentScheduleInput } from "@/lib/schedule-date-time";
import { cn } from "@/lib/utils";
import { VideoProject } from "@/models/api/content/video.type";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { useBusinessGetById } from "@/services/business.api";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { useVideoSchedule } from "@/services/content/video-generator.api";
import { formatVideoTime, useVideoPlayback } from "./use-video-playback";
import { VideoStage } from "./video-stage";

type VideoScheduleModalProps = {
  isOpen: boolean;
  businessId: string;
  project: VideoProject;
  scheduleDate: string | null;
  withWatermark: boolean;
  onClose: () => void;
};

// The content summary modal from content-generate, with the post's media
// swapped for a playable preview of the video.
export function VideoScheduleModal({
  isOpen,
  businessId,
  project,
  scheduleDate,
  withWatermark,
  onClose,
}: VideoScheduleModalProps) {
  const t = useTranslations("videoGenerator");
  const schedulerT = useTranslations("contentGenerateScheduler");
  const { data: businessData } = useBusinessGetById(businessId);
  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const mSchedule = useVideoSchedule();
  const [date, setDate] = useState(() => scheduleDate || getCurrentScheduleInput().date);
  const [time, setTime] = useState(() => getCurrentScheduleInput().time);
  const [caption, setCaption] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformEnum[]>([]);

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

  const togglePlatform = (platform: PlatformEnum) => {
    if (!platformOptions.some((item) => item.platform === platform && item.isConnected)) {
      return;
    }
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const handleConfirm = async () => {
    let scheduledAt = new Date(`${date}T${time}`);
    if (!date || !time || Number.isNaN(scheduledAt.getTime())) {
      showToast("error", schedulerT("selectDateTime"));
      return;
    }
    // Same as image posts: a time that already passed publishes next minute.
    if (scheduledAt <= new Date()) {
      scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + 1, 0, 0);
    }
    if (selectedPlatforms.length === 0) {
      showToast("error", schedulerT("selectPlatform"));
      return;
    }

    try {
      await mSchedule.mutateAsync({
        businessId,
        projectId: project.id,
        caption,
        platforms: selectedPlatforms,
        dateTime: scheduledAt.toISOString(),
        withWatermark,
      });
      showToast("success", t("scheduleSuccess"));
      onClose();
    } catch (error) {
      showToast("error", error);
    }
  };

  return (
    <ScheduleSummaryModal
      isOpen={isOpen}
      businessName={businessData?.data?.data?.name}
      businessLogo={businessData?.data?.data?.logo}
      imageUrl=""
      caption={caption}
      date={date}
      time={time}
      minDate={getCurrentScheduleInput().date}
      selectedPlatforms={selectedPlatforms}
      platforms={platformOptions}
      isLoading={mSchedule.isPending}
      showShareReference={false}
      onClose={onClose}
      onCaptionChange={setCaption}
      onDateChange={setDate}
      onTimeChange={setTime}
      onTogglePlatform={togglePlatform}
      onConfirm={handleConfirm}
      renderMedia={(maxHeightClass) => (
        <VideoPostPreview
          project={project}
          isOpen={isOpen}
          withWatermark={withWatermark}
          className={maxHeightClass}
        />
      )}
    />
  );
}

function VideoPostPreview({
  project,
  isOpen,
  withWatermark,
  className,
}: {
  project: VideoProject;
  isOpen: boolean;
  withWatermark: boolean;
  className?: string;
}) {
  const t = useTranslations("videoGenerator");
  const playback = useVideoPlayback(project.scenes, project.id);
  const [ratioWidth, ratioHeight] = project.ratio.split(":").map(Number);
  const { restart, pause } = playback;

  // Auto-play like a feed does, and stop when the modal closes.
  useEffect(() => {
    if (isOpen) restart();
    else pause();
  }, [isOpen, pause, restart]);

  return (
    <button
      type="button"
      className={cn("group relative block w-full cursor-pointer", className)}
      style={{ aspectRatio: `${ratioWidth} / ${ratioHeight}` }}
      onClick={playback.togglePlay}
      aria-label={playback.isPlaying ? t("pause") : t("play")}
    >
      <VideoStage
        ratio={project.ratio}
        scene={project.scenes[playback.activeSceneIndex] ?? null}
        nextScene={
          project.scenes.length > 1
            ? project.scenes[(playback.activeSceneIndex + 1) % project.scenes.length]
            : null
        }
        sceneIndex={playback.activeSceneIndex}
        sceneProgress={playback.sceneProgress}
        sceneElapsed={playback.sceneElapsed}
        isPlaying={playback.isPlaying}
        isBuffering={playback.isBuffering}
        onBufferingChange={playback.setIsBuffering}
        isMuted
        volume={0}
        isUpdating={false}
        showWatermark={withWatermark}
        frameClassName="rounded-none shadow-none ring-0"
      />
      {!playback.isPlaying && (
        <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
          <Play className="ml-0.5 h-6 w-6 fill-current" />
        </span>
      )}
      <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium tabular-nums text-white">
        {playback.isPlaying ? (
          <Pause className="h-3 w-3 fill-current" />
        ) : (
          <Play className="h-3 w-3 fill-current" />
        )}
        {formatVideoTime(playback.totalDuration - playback.currentTime)}
      </span>
    </button>
  );
}
