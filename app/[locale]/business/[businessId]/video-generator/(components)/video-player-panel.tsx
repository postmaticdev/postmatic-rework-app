"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock,
  CalendarDays,
  Clapperboard,
  Download,
  Loader2,
  Maximize,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Upload,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { LogoLoader } from "@/components/base/logo-loader";
import { cn } from "@/lib/utils";
import { VideoProject } from "@/models/api/content/video.type";
import { AudioTrackPlayer } from "./audio-track-player";
import {
  DEFAULT_TRACKS_HEIGHT,
  MAX_TRACKS_HEIGHT,
  MIN_TRACKS_HEIGHT,
  SequenceEditor,
  SequenceEditorProps,
} from "./sequence-editor";
import { VideoStage } from "./video-stage";
import { formatVideoTime, VideoPlaybackState } from "./use-video-playback";
import { StoryboardEditor } from "./storyboard-editor";
import { VideoStoryboard } from "@/models/api/content/video.type";
import { getDragKind, readDraggedVideo } from "./use-media-import";
import type { AttachedVideo } from "./use-video-generator";

const SEQUENCE_HEIGHT_STORAGE_KEY = "postmatic.videoGenerator.sequenceHeight";
// The preview never shrinks below this while the sequence grows.
const MIN_STAGE_HEIGHT = 180;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type VideoPlayerPanelProps = {
  project: VideoProject | null;
  playback: VideoPlaybackState;
  selectedSceneId: string | null;
  // undefined = nothing pending, null = whole video, string = that scene.
  updatingSceneId: string | null | undefined;
  // Progress of the first generation, while there is no project yet.
  // Drafting the storyboard or rendering the video, while there is no
  // project yet.
  generating: { progress: number; label: string } | null;
  // Shown for review until it is approved and rendered.
  storyboard: VideoStoryboard | null;
  isStoryboardRevising: boolean;
  onChangeStoryboard: (updater: (current: VideoStoryboard) => VideoStoryboard) => void;
  onApproveStoryboard: () => void;
  isBusy: boolean;
  isDownloading: boolean;
  // Blocks downloading until we know whether the watermark applies.
  isAccessLoading: boolean;
  showWatermark: boolean;
  scheduleDate: string | null;
  onSelectScene: (index: number) => void;
  onChangeProject: (updater: (current: VideoProject) => VideoProject) => void;
  history: Pick<
    SequenceEditorProps,
    "onBeginChange" | "onEndChange" | "canUndo" | "canRedo" | "onUndo" | "onRedo"
  >;
  onDownload: () => void;
  onSchedule: () => void;
  // Dropping videos on the empty preview starts a project from them.
  isImportingVideos: boolean;
  onDropVideos: (input: File[] | AttachedVideo[]) => void;
};

export function VideoPlayerPanel({
  project,
  playback,
  selectedSceneId,
  updatingSceneId,
  generating,
  storyboard,
  isStoryboardRevising,
  onChangeStoryboard,
  onApproveStoryboard,
  isBusy,
  isDownloading,
  isAccessLoading,
  showWatermark,
  scheduleDate,
  onSelectScene,
  onChangeProject,
  history,
  onDownload,
  onSchedule,
  isImportingVideos,
  onDropVideos,
}: VideoPlayerPanelProps) {
  const t = useTranslations("videoGenerator");
  const locale = useLocale();
  const panelRef = useRef<HTMLElement>(null);
  const [isStageDragOver, setIsStageDragOver] = useState(false);
  const canDropOnStage =
    !project && !storyboard && generating === null && !isBusy && !isImportingVideos;
  // Starts muted so the autoplay after generating is allowed by browsers.
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const isSilent = isMuted || volume === 0;

  // Adding music or a voice over is a request to hear it.
  const audioClipCount = project?.audioClips.length ?? 0;
  const previousAudioClipCountRef = useRef(audioClipCount);
  useEffect(() => {
    if (audioClipCount > previousAudioClipCountRef.current) {
      setIsMuted(false);
      setVolume((current) => (current === 0 ? 0.8 : current));
    }
    previousAudioClipCountRef.current = audioClipCount;
  }, [audioClipCount]);

  const handleVolumeChange = (nextVolume: number) => {
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  // ---- Resizable sequence panel ---------------------------------------------
  const stageRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{
    startY: number;
    startHeight: number;
    maxHeight: number;
    lastHeight: number;
  } | null>(null);
  const [tracksHeight, setTracksHeight] = useState(DEFAULT_TRACKS_HEIGHT);

  // Restore the height this viewer picked last time.
  useEffect(() => {
    try {
      const storedHeight = Number(localStorage.getItem(SEQUENCE_HEIGHT_STORAGE_KEY));
      if (storedHeight) {
        setTracksHeight(clamp(storedHeight, MIN_TRACKS_HEIGHT, MAX_TRACKS_HEIGHT));
      }
    } catch {}
  }, []);

  const saveTracksHeight = (height: number) => {
    try {
      localStorage.setItem(SEQUENCE_HEIGHT_STORAGE_KEY, String(height));
    } catch {}
  };

  // On desktop the preview gives up its space, but never below MIN_STAGE_HEIGHT.
  // On mobile the page simply grows.
  const getMaxTracksHeight = () => {
    const stageHeight = stageRef.current?.clientHeight ?? 0;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const roomFromStage = isDesktop
      ? tracksHeight + Math.max(0, stageHeight - MIN_STAGE_HEIGHT)
      : MAX_TRACKS_HEIGHT;
    return Math.max(MIN_TRACKS_HEIGHT, Math.min(MAX_TRACKS_HEIGHT, roomFromStage));
  };

  const resizeTo = (height: number, maxHeight = getMaxTracksHeight()) => {
    const nextHeight = Math.round(clamp(height, MIN_TRACKS_HEIGHT, maxHeight));
    setTracksHeight(nextHeight);
    return nextHeight;
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      startY: event.clientY,
      startHeight: tracksHeight,
      maxHeight: getMaxTracksHeight(),
      lastHeight: tracksHeight,
    };
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;
    // Dragging up makes the sequence taller.
    resize.lastHeight = resizeTo(
      resize.startHeight + (resize.startY - event.clientY),
      resize.maxHeight
    );
  };

  const handleResizeEnd = () => {
    const resize = resizeRef.current;
    if (!resize) return;
    resizeRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    saveTracksHeight(resize.lastHeight);
  };

  const handleResizeKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowUp: tracksHeight + 16,
      ArrowDown: tracksHeight - 16,
      Home: MIN_TRACKS_HEIGHT,
      End: MAX_TRACKS_HEIGHT,
    };
    if (!(event.key in steps)) return;
    event.preventDefault();
    saveTracksHeight(resizeTo(steps[event.key]));
  };

  // Unmuting from zero restores an audible level instead of staying silent.
  const toggleMute = () => {
    if (isSilent) {
      if (volume === 0) setVolume(0.5);
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  const activeScene =
    project && playback.activeSceneIndex >= 0
      ? project.scenes[playback.activeSceneIndex]
      : null;
  // Wraps to the first scene, which is what plays next while looping.
  const nextScene =
    project && project.scenes.length > 1 && playback.activeSceneIndex >= 0
      ? project.scenes[(playback.activeSceneIndex + 1) % project.scenes.length]
      : null;
  const isActiveSceneUpdating =
    updatingSceneId === null ||
    (updatingSceneId !== undefined && updatingSceneId === activeScene?.id);
  const updatingLabel =
    updatingSceneId === null
      ? t("updatingVideo")
      : activeScene
        ? t("updatingScene", {
            scene: t("sceneLabel", { index: playback.activeSceneIndex + 1 }),
          })
        : undefined;

  const formattedScheduleDate = scheduleDate
    ? new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(`${scheduleDate}T00:00:00`))
    : null;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void panelRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <section
      ref={panelRef}
      className="flex min-h-0 flex-col bg-card lg:h-full"
    >
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <Clapperboard className="h-4 w-4 shrink-0 text-primary" />
            <h1 className="truncate text-sm font-semibold sm:text-base">
              {project?.title || t("title")}
            </h1>
            {project && (
              <Badge variant="outline" className="shrink-0">
                {project.ratio}
              </Badge>
            )}
          </div>
          {formattedScheduleDate && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("scheduledFor", { date: formattedScheduleDate })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!project || isBusy || isDownloading || isAccessLoading}
            onClick={onDownload}
            title={t("download")}
            aria-label={t("download")}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!project || isBusy}
            onClick={onSchedule}
          >
            <CalendarClock className="h-4 w-4" />
            {t("schedule")}
          </Button>
        </div>
      </header>

      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 bg-background-secondary p-4 max-lg:h-[min(60dvh,560px)] sm:p-6"
        onDragOver={(event) => {
          if (!canDropOnStage) return;
          const kind = getDragKind(event.dataTransfer);
          if (kind !== "video" && kind !== "file") return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsStageDragOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsStageDragOver(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsStageDragOver(false);
          if (!canDropOnStage) return;
          const draggedVideo = readDraggedVideo(event.dataTransfer);
          onDropVideos(draggedVideo ? [draggedVideo] : Array.from(event.dataTransfer.files));
        }}
      >
        {project ? (
          <VideoStage
            ratio={project.ratio}
            scene={activeScene}
            nextScene={nextScene}
            sceneIndex={playback.activeSceneIndex}
            sceneProgress={playback.sceneProgress}
            sceneElapsed={playback.sceneElapsed}
            isPlaying={playback.isPlaying}
            isBuffering={playback.isBuffering}
            onBufferingChange={playback.setIsBuffering}
            isMuted={
              isSilent || Boolean(project.isVideoMuted) || Boolean(activeScene?.isMuted)
            }
            volume={volume}
            isUpdating={isActiveSceneUpdating}
            updatingLabel={updatingLabel}
            showWatermark={showWatermark}
          />
        ) : generating !== null ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <LogoLoader hideContentBackground={false} />
            <div className="w-full max-w-xs space-y-2">
              <p className="text-sm font-medium">{generating.label}</p>
              <Progress value={generating.progress} />
            </div>
          </div>
        ) : storyboard ? (
          <StoryboardEditor
            storyboard={storyboard}
            disabled={isBusy}
            isRevising={isStoryboardRevising}
            onChange={onChangeStoryboard}
            onApprove={onApproveStoryboard}
          />
        ) : (
          <div
            className={cn(
              "flex h-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-transparent px-6 text-center transition-colors",
              isStageDragOver && "border-primary/60 bg-primary/5"
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
              {isImportingVideos ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : isStageDragOver ? (
                <Upload className="h-7 w-7" />
              ) : (
                <Clapperboard className="h-7 w-7" />
              )}
            </div>
            <p className="text-base font-semibold">
              {isImportingVideos
                ? t("addingMedia")
                : isStageDragOver
                  ? t("dropToStartVideo")
                  : t("previewEmptyTitle")}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("previewEmptyDescription")}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground/80">{t("dropVideoHint")}</p>
          </div>
        )}
      </div>

      {project && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={t("resizeSequence")}
          aria-valuemin={MIN_TRACKS_HEIGHT}
          aria-valuemax={MAX_TRACKS_HEIGHT}
          aria-valuenow={tracksHeight}
          tabIndex={0}
          title={t("resizeSequenceHint")}
          className="group flex h-3 shrink-0 cursor-row-resize touch-none items-center justify-center border-t bg-card transition-colors hover:bg-primary/5 focus-visible:bg-primary/10 focus-visible:outline-none"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onDoubleClick={() => saveTracksHeight(resizeTo(DEFAULT_TRACKS_HEIGHT))}
          onKeyDown={handleResizeKey}
        >
          <span className="h-1 w-10 rounded-full bg-border transition-colors group-hover:bg-primary/60 group-active:bg-primary group-focus-visible:bg-primary" />
        </div>
      )}

      {project && (
        <div className="space-y-3 px-4 pb-3 pt-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={playback.togglePlay}
              title={playback.isPlaying ? t("pause") : t("play")}
              aria-label={playback.isPlaying ? t("pause") : t("play")}
            >
              {playback.isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={playback.restart}
              title={t("restart")}
              aria-label={t("restart")}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => playback.setIsLooping((previous) => !previous)}
              title={t("loop")}
              aria-label={t("loop")}
              aria-pressed={playback.isLooping}
              className={cn(playback.isLooping && "bg-primary/10 text-primary hover:text-primary")}
            >
              <Repeat className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-xs font-medium tabular-nums text-muted-foreground">
              {formatVideoTime(playback.currentTime)} / {formatVideoTime(playback.totalDuration)}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleMute}
                  title={isSilent ? t("unmute") : t("mute")}
                  aria-label={isSilent ? t("unmute") : t("mute")}
                >
                  {isSilent ? (
                    <VolumeX className="h-4 w-4" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : Math.round(volume * 100)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => handleVolumeChange(value / 100)}
                  aria-label={t("volume")}
                  className="w-16 sm:w-24 [&>span:first-child]:h-1.5 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={toggleFullscreen}
                title={t("fullscreen")}
                aria-label={t("fullscreen")}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <SequenceEditor
            project={project}
            playback={playback}
            selectedSceneId={selectedSceneId}
            updatingSceneId={updatingSceneId}
            disabled={isBusy}
            tracksHeight={tracksHeight}
            onSelectScene={onSelectScene}
            onChangeProject={onChangeProject}
            {...history}
          />
          <AudioTrackPlayer
            clips={project.audioClips}
            currentTime={playback.currentTime}
            isPlaying={playback.isPlaying && !playback.isBuffering}
            volume={volume}
            isMuted={isSilent || Boolean(project.isAudioMuted)}
          />
        </div>
      )}
    </section>
  );
}
