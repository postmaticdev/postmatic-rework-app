"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { useRole } from "@/contexts/role-context";
import { showToast } from "@/helper/show-toast";
import { cn } from "@/lib/utils";
import { VideoScene } from "@/models/api/content/video.type";
import { useVideoDownloadUrl } from "@/services/content/video-generator.api";
import { VIDEO_CHAT_PROMPT_ID, VideoChatPanel } from "./(components)/video-chat-panel";
import { formatScheduleDate, VideoPlayerPanel } from "./(components)/video-player-panel";
import { VideoScheduleModal } from "./(components)/video-schedule-modal";
import { VideoBriefPanel, VideoStartScreen } from "./(components)/video-start-screen";
import { VideoFlowStep } from "./(components)/video-flow-steps";
import {
  AttachedVideo,
  getGenerateStepKey,
  useVideoGenerator,
} from "./(components)/use-video-generator";
import { useMediaImport } from "./(components)/use-media-import";
import { useVideoPlayback } from "./(components)/use-video-playback";

const EMPTY_SCENES: VideoScene[] = [];

const saveFile = async (url: string, fileName: string) => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
    const objectUrl = URL.createObjectURL(await response.blob());
    triggerDownload(objectUrl, fileName);
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Cross-origin files without CORS: let the browser handle the link.
    triggerDownload(url, fileName);
  }
};

const triggerDownload = (href: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Opens on a start screen: upload existing videos, or brief the AI (product,
// optional avatar, storyline) to draft a storyboard. The brief, then the chat,
// sit on the left of the workspace: desktop (lg+) shows them beside the player
// + scene timeline; mobile shows the player first so the result stays visible,
// chat below with the composer pinned to the bottom.
export default function VideoGeneratorPage() {
  const { businessId } = useParams() as { businessId: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const scheduleDate = searchParams.get("scheduleDate");
  const t = useTranslations("videoGenerator");
  const { aiModels } = useContentGenerate();
  // Top-up links are only offered to members allowed to purchase.
  const canPurchase = useRole().access.purchase.write;
  const generator = useVideoGenerator({ businessId, scheduleDate });
  const { project, messages, selectedSceneId, setSelectedSceneId, isBusy } = generator;
  const playback = useVideoPlayback(project?.scenes ?? EMPTY_SCENES, project?.id);
  const mDownloadUrl = useVideoDownloadUrl();
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isWatermarkConfirmOpen, setIsWatermarkConfirmOpen] = useState(false);
  const [isStartOverOpen, setIsStartOverOpen] = useState(false);
  const isFreeUser = aiModels.isFreeUser;
  // Until a brief is sent or videos are uploaded: the start screen, or the
  // brief once the AI path is picked.
  const hasStarted = Boolean(project || generator.storyboard || messages.length);
  const [entryMode, setEntryMode] = useState<"choose" | "brief">("choose");
  const isBriefing = !hasStarted && entryMode === "brief";

  // Play a freshly generated video right away (muted, so autoplay is allowed).
  const { restart, pause } = playback;
  useEffect(() => {
    if (project?.id) restart();
  }, [project?.id, restart]);

  // Ctrl/⌘+Z undo, Ctrl/⌘+Shift+Z or Ctrl+Y redo. Text fields keep their own
  // undo, and nothing changes behind an open dialog.
  const { undo, redo, insertVideoScenes } = generator;
  const { importVideos } = useMediaImport();
  const [isImportingVideos, setIsImportingVideos] = useState(false);
  const isDialogOpen = isScheduleOpen || isWatermarkConfirmOpen || isStartOverOpen;
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isDialogOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      const key = event.key.toLowerCase();
      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = key === "y" || (key === "z" && event.shiftKey);
      if (!isUndo && !isRedo) return;
      event.preventDefault();
      if (isUndo) undo();
      else redo();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, redo, undo]);

  // A file dropped outside a drop zone would make the browser open it and
  // lose the work on this page.
  useEffect(() => {
    const blockStrayFileDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files") || event.defaultPrevented) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
    };
    window.addEventListener("dragover", blockStrayFileDrop);
    window.addEventListener("drop", blockStrayFileDrop);
    return () => {
      window.removeEventListener("dragover", blockStrayFileDrop);
      window.removeEventListener("drop", blockStrayFileDrop);
    };
  }, []);

  // Before anything exists, dropped videos take the upload path so the chat
  // opens on them; after that they're added to the sequence.
  const { startFromVideos } = generator;
  const handleDropVideos = async (input: File[] | AttachedVideo[]) => {
    const addVideos = project ? insertVideoScenes : startFromVideos;
    const isFileList = input.every((item) => item instanceof File);
    if (!isFileList) {
      addVideos(input as AttachedVideo[]);
      return;
    }
    setIsImportingVideos(true);
    try {
      const videos = await importVideos(input as File[]);
      if (videos.length) addVideos(videos);
    } finally {
      setIsImportingVideos(false);
    }
  };

  // Starting over from the AI path reopens the brief, prefilled.
  const handleStartOver = () => {
    setIsStartOverOpen(false);
    pause();
    setEntryMode(generator.setup ? "brief" : "choose");
    generator.reset();
  };

  const pendingMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.status === "pending");
  const pendingAssistant =
    pendingMessage?.role === "assistant" ? pendingMessage : undefined;
  const updatingSceneId =
    pendingAssistant?.kind === "edit"
      ? (pendingAssistant.scene?.sceneId ?? null)
      : undefined;
  // Drafting the first storyboard or rendering the approved one takes over the
  // preview; a revision keeps the storyboard on screen behind a spinner.
  const generating =
    project || !pendingAssistant
      ? null
      : pendingAssistant.kind === "generate"
        ? {
            progress: pendingAssistant.progress,
            label: t(getGenerateStepKey(pendingAssistant.progress)),
          }
        : pendingAssistant.kind === "storyboard" && !pendingAssistant.isRevision
          ? { progress: pendingAssistant.progress, label: t("stepStoryboard") }
          : null;
  const isStoryboardRevising =
    pendingAssistant?.kind === "storyboard" && Boolean(pendingAssistant.isRevision);
  // The AI path is brief → storyboard → video; uploads skip the stepper.
  const isAiFlow = messages.some(
    (message) => message.role === "assistant" && message.kind === "storyboard"
  );
  const flowStep: VideoFlowStep | null = isBriefing
    ? 1
    : !isAiFlow
      ? null
      : project || pendingAssistant?.kind === "generate"
        ? 3
        : 2;

  // Selecting a scene jumps to it and targets the next prompt at it; picking
  // it again goes back to editing the whole video.
  const handleSelectScene = (index: number) => {
    const scene = project?.scenes[index];
    if (!scene) return;
    pause();
    playback.seekToScene(index);
    setSelectedSceneId(scene.id === selectedSceneId ? null : scene.id);
  };

  const downloadVideo = async (withWatermark: boolean) => {
    setIsWatermarkConfirmOpen(false);
    if (!project) return;

    try {
      const url = await mDownloadUrl.mutateAsync({
        project,
        payload: { businessId, projectId: project.id, withWatermark },
      });
      if (!url) {
        showToast("info", t("comingSoon"));
        return;
      }
      const suffix = withWatermark ? "-watermarked" : "";
      await saveFile(url, `postmatic-video${suffix}-${Date.now()}.mp4`);
    } catch (error) {
      showToast("error", error);
    }
  };

  // Free users only ever get the watermarked render; tell them first.
  const handleDownload = () => {
    if (isFreeUser) {
      setIsWatermarkConfirmOpen(true);
      return;
    }
    void downloadVideo(false);
  };

  const handleTopUp = () => {
    setIsWatermarkConfirmOpen(false);
    router.push(`/business/${businessId}/settings?tab=billing&topUp=token`);
  };

  // Storyboard changes are asked for in the chat. On mobile the chat sits
  // below the preview, so bring the composer into view.
  const focusChatPrompt = () => {
    const promptField = document.getElementById(VIDEO_CHAT_PROMPT_ID);
    promptField?.scrollIntoView({ behavior: "smooth", block: "center" });
    promptField?.focus({ preventScroll: true });
  };

  const handleOpenSchedule = () => {
    pause();
    setIsScheduleOpen(true);
  };

  if (!hasStarted && !isBriefing) {
    return (
      <main className="relative flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
        <VideoStartScreen
          scheduleLabel={
            scheduleDate
              ? t("scheduledFor", { date: formatScheduleDate(scheduleDate, locale) })
              : null
          }
          isImporting={isImportingVideos}
          onUploadVideos={(files) => void handleDropVideos(files)}
          onChooseAi={() => setEntryMode("brief")}
        />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-4rem)] lg:flex-row lg:overflow-hidden">
      <div
        className={cn(
          "border-t lg:order-1 lg:min-h-0 lg:w-[380px] lg:shrink-0 lg:border-t-0 lg:border-r xl:w-[420px]",
          // On mobile the brief comes first; the empty preview waits below.
          isBriefing ? "order-1 border-t-0" : "order-2"
        )}
      >
        {isBriefing ? (
          <VideoBriefPanel
            initialSetup={generator.setup}
            ratio={generator.ratio}
            duration={generator.duration}
            onRatioChange={generator.setRatio}
            onDurationChange={generator.setDuration}
            onBack={() => setEntryMode("choose")}
            onSubmit={generator.startStoryboard}
          />
        ) : (
          <VideoChatPanel
            generator={generator}
            onSelectScene={handleSelectScene}
            onStartOver={() => setIsStartOverOpen(true)}
          />
        )}
      </div>

      <div
        className={cn(
          "min-w-0 flex-1 lg:order-2 lg:min-h-0",
          isBriefing ? "order-2 max-lg:hidden" : "order-1"
        )}
      >
        <VideoPlayerPanel
          project={project}
          playback={playback}
          selectedSceneId={selectedSceneId}
          updatingSceneId={updatingSceneId}
          generating={generating}
          flowStep={flowStep}
          storyboard={generator.storyboard}
          isStoryboardRevising={isStoryboardRevising}
          onEditStoryboard={focusChatPrompt}
          onApproveStoryboard={generator.approveStoryboard}
          isBusy={isBusy}
          isDownloading={mDownloadUrl.isPending}
          isAccessLoading={aiModels.isLoading}
          showWatermark={isFreeUser}
          scheduleDate={scheduleDate}
          onSelectScene={handleSelectScene}
          onChangeProject={generator.updateProject}
          history={{
            onBeginChange: generator.beginHistoryGesture,
            onEndChange: generator.endHistoryGesture,
            canUndo: generator.canUndo,
            canRedo: generator.canRedo,
            onUndo: undo,
            onRedo: redo,
          }}
          isImportingVideos={isImportingVideos}
          onDropVideos={handleDropVideos}
          onDownload={handleDownload}
          onSchedule={handleOpenSchedule}
        />
      </div>

      {project && (
        <VideoScheduleModal
          isOpen={isScheduleOpen}
          businessId={businessId}
          project={project}
          scheduleDate={scheduleDate}
          withWatermark={isFreeUser}
          onClose={() => setIsScheduleOpen(false)}
        />
      )}

      <ConfirmationModal
        isOpen={isWatermarkConfirmOpen}
        onClose={() => setIsWatermarkConfirmOpen(false)}
        onCancel={canPurchase ? () => void downloadVideo(true) : undefined}
        onConfirm={canPurchase ? handleTopUp : () => void downloadVideo(true)}
        title={t("downloadWatermarkTitle")}
        description={t("downloadWatermarkDescription")}
        confirmText={canPurchase ? t("topUpNow") : t("downloadWithWatermark")}
        cancelText={canPurchase ? t("downloadWithWatermark") : t("cancel")}
      />

      <ConfirmationModal
        isOpen={isStartOverOpen}
        onClose={() => setIsStartOverOpen(false)}
        onConfirm={handleStartOver}
        title={t("startOverTitle")}
        description={t("startOverDescription")}
        confirmText={t("startOverConfirm")}
        cancelText={t("cancel")}
        variant="warning"
      />
    </main>
  );
}
