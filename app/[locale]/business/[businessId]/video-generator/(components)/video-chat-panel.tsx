"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowUp,
  Check,
  ChevronDown,
  Clapperboard,
  Film,
  Paperclip,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { showToast } from "@/helper/show-toast";
import { cn } from "@/lib/utils";
import {
  VIDEO_DURATIONS,
  VIDEO_RATIOS,
  VideoProject,
  VideoRatio,
} from "@/models/api/content/video.type";
import { helperService, validateUploadImageFile } from "@/services/helper.api";
import {
  AttachedVideo,
  getGenerateStepKey,
  VideoChatMessage,
  VideoGeneratorState,
} from "./use-video-generator";
import { useMediaImport, VIDEO_DRAG_TYPE } from "./use-media-import";
import { formatVideoTime } from "./use-video-playback";

const MAX_ATTACHMENTS = 4;
const MAX_VIDEO_ATTACHMENTS = 10;
const SUGGESTION_KEYS = [
  "suggestionProductLaunch",
  "suggestionPromo",
  "suggestionTutorial",
] as const;

type VideoChatPanelProps = {
  generator: VideoGeneratorState;
  onSelectScene: (index: number) => void;
};

export function VideoChatPanel({ generator, onSelectScene }: VideoChatPanelProps) {
  const t = useTranslations("videoGenerator");
  const tRoot = useTranslations();
  const {
    project,
    messages,
    selectedSceneId,
    setSelectedSceneId,
    ratio,
    setRatio,
    duration,
    setDuration,
    isBusy,
    submitPrompt,
    retry,
  } = generator;
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachedVideos, setAttachedVideos] = useState<AttachedVideo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { importVideos } = useMediaImport();
  const threadEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSceneIndex = project
    ? project.scenes.findIndex((scene) => scene.id === selectedSceneId)
    : -1;
  const selectedScene =
    selectedSceneIndex >= 0 && project ? project.scenes[selectedSceneIndex] : null;
  const selectedSceneLabel = selectedScene
    ? `${t("sceneLabel", { index: selectedSceneIndex + 1 })} · ${selectedScene.title}`
    : "";
  const placeholder = !project
    ? t("promptPlaceholder")
    : selectedScene
      ? t("editScenePlaceholder", {
          scene: t("sceneLabel", { index: selectedSceneIndex + 1 }),
        })
      : t("editVideoPlaceholder");
  const canSubmit =
    Boolean(prompt.trim() || attachedVideos.length) && !isBusy && !isUploading;

  useEffect(() => {
    if (!messages.length) return;
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 44), 180)}px`;
  }, [prompt]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitPrompt(prompt, attachments, attachedVideos);
    setPrompt("");
    setAttachments([]);
    setAttachedVideos([]);
  };

  const uploadImages = async (files: File[]) => {
    const invalidReason = files.map(validateUploadImageFile).find(Boolean);
    if (invalidReason) {
      showToast("error", tRoot(`toast.content.${invalidReason}`));
      return;
    }
    const uploaded = await Promise.all(
      files.map((file) => helperService.uploadSingleImage({ image: file }))
    );
    setAttachments((current) => Array.from(new Set([...current, ...uploaded])));
  };

  const uploadVideos = async (files: File[]) => {
    const videos = await importVideos(files);
    setAttachedVideos((current) => [...current, ...videos]);
  };

  // One picker for both: images become references, videos become scenes.
  const handleAttach = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const imageFiles = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, MAX_ATTACHMENTS - attachments.length);
    const videoFiles = files
      .filter((file) => file.type.startsWith("video/"))
      .slice(0, MAX_VIDEO_ATTACHMENTS - attachedVideos.length);
    if (files.some((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
      showToast("error", t("unsupportedFile"));
    }
    if (!imageFiles.length && !videoFiles.length) return;

    try {
      setIsUploading(true);
      if (imageFiles.length) await uploadImages(imageFiles);
      if (videoFiles.length) await uploadVideos(videoFiles);
    } catch (error) {
      showToast("error", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-col bg-card lg:h-full">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5 scrollbar-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-5 py-4">
            <div className="space-y-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Clapperboard className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">{t("emptyChatTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("emptyChatDescription")}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("suggestionLabel")}
              </p>
              {SUGGESTION_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="flex w-full items-start gap-2 rounded-xl border bg-background-secondary px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => {
                    setPrompt(t(key));
                    textareaRef.current?.focus();
                  }}
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <UserBubble
                key={message.id}
                message={message}
                onSelectScene={onSelectScene}
              />
            ) : (
              <AssistantBubble
                key={message.id}
                message={message}
                project={project}
                isBusy={isBusy}
                onRetry={() => retry(message.id)}
              />
            )
          )
        )}
        <div ref={threadEndRef} />
      </div>

      <div className="sticky bottom-0 z-10 border-t bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border border-input bg-background-secondary p-3 focus-within:border-primary/50">
          {selectedScene && (
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-primary">
                <Pencil className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {t("editingScene", { scene: selectedSceneLabel })}
                </span>
                <button
                  type="button"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-primary/15"
                  onClick={() => setSelectedSceneId(null)}
                  title={t("stopEditingScene")}
                  aria-label={t("stopEditingScene")}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}

          {(attachments.length > 0 || attachedVideos.length > 0 || isUploading) && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachedVideos.map((video, index) => (
                <div key={video.url} className="relative" title={video.name}>
                  <VideoThumb thumbnailUrl={video.thumbnailUrl} className="h-14 w-14" />
                  <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[10px] font-medium tabular-nums text-white">
                    {formatVideoTime(video.durationSec)}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                    onClick={() =>
                      setAttachedVideos((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                    aria-label={t("removeVideo")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {attachments.map((imageUrl) => (
                <div key={imageUrl} className="relative">
                  <Image
                    src={imageUrl}
                    alt=""
                    width={96}
                    height={96}
                    className="h-14 w-14 rounded-md object-cover"
                    unoptimized
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                    onClick={() =>
                      setAttachments((current) => current.filter((url) => url !== imageUrl))
                    }
                    aria-label={t("removeImage")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {isUploading && (
                <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={prompt}
            rows={1}
            disabled={isBusy}
            placeholder={placeholder}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            className="block w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground/70 disabled:opacity-60 sm:text-sm"
          />

          <div className="mt-2 flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={
                isBusy ||
                isUploading ||
                (attachments.length >= MAX_ATTACHMENTS &&
                  attachedVideos.length >= MAX_VIDEO_ATTACHMENTS)
              }
              onClick={() => fileInputRef.current?.click()}
              title={t("attachMedia")}
              aria-label={t("attachMedia")}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {!project && (
              <>
                <OptionDropdown
                  label={t("ratio")}
                  value={ratio}
                  options={VIDEO_RATIOS.map((item) => ({
                    value: item,
                    label: item,
                    icon: <RatioIcon ratio={item} />,
                  }))}
                  disabled={isBusy}
                  onChange={setRatio}
                />
                <OptionDropdown
                  label={t("duration")}
                  value={duration}
                  options={VIDEO_DURATIONS.map((item) => ({
                    value: item,
                    label: t("durationValue", { value: item }),
                  }))}
                  disabled={isBusy}
                  onChange={setDuration}
                />
              </>
            )}

            <Button
              type="button"
              size="icon-sm"
              className="ml-auto rounded-full"
              disabled={!canSubmit}
              onClick={handleSubmit}
              title={t("send")}
              aria-label={t("send")}
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleAttach}
        />
      </div>
    </div>
  );
}

// Outline of the frame shape, e.g. a tall rectangle for 9:16.
function RatioIcon({ ratio }: { ratio: VideoRatio }) {
  const [width, height] = ratio.split(":").map(Number);
  const longestSide = Math.max(width, height);

  return (
    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden>
      <span
        className="rounded-[2px] border-[1.5px] border-current"
        style={{
          width: `${(width / longestSide) * 100}%`,
          height: `${(height / longestSide) * 100}%`,
        }}
      />
    </span>
  );
}

function OptionDropdown<TValue extends string | number>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: TValue;
  options: { value: TValue; label: string; icon?: React.ReactNode }[];
  disabled?: boolean;
  onChange: (value: TValue) => void;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-full bg-card px-2.5 text-xs"
          aria-label={label}
        >
          <span className="text-muted-foreground">{label}</span>
          {selected?.icon}
          <span className="font-semibold">{selected?.label}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {options.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => onChange(option.value)}>
            {option.icon}
            <span className="flex-1">{option.label}</span>
            {option.value === value && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserBubble({
  message,
  onSelectScene,
}: {
  message: Extract<VideoChatMessage, { role: "user" }>;
  onSelectScene: (index: number) => void;
}) {
  const t = useTranslations("videoGenerator");

  return (
    <div className="ml-auto flex max-w-[85%] flex-col items-end gap-2">
      {message.scene && (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15"
          onClick={() => onSelectScene(message.scene!.sceneIndex)}
        >
          <Pencil className="h-3 w-3" />
          {t("sceneLabel", { index: message.scene.sceneIndex + 1 })} · {message.scene.sceneTitle}
        </button>
      )}
      {message.images.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          {message.images.map((imageUrl) => (
            <Image
              key={imageUrl}
              src={imageUrl}
              alt=""
              width={160}
              height={160}
              className="h-20 w-20 rounded-lg border object-cover"
              unoptimized
            />
          ))}
        </div>
      )}
      {message.videos.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          {message.videos.map((video, index) => (
            <div
              key={`${video.name}-${index}`}
              className="w-20 cursor-grab space-y-1 active:cursor-grabbing"
              title={`${video.name} · ${t("dragToSequence")}`}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(VIDEO_DRAG_TYPE, JSON.stringify(video));
                event.dataTransfer.effectAllowed = "copy";
              }}
            >
              <VideoThumb thumbnailUrl={video.thumbnailUrl} className="h-20 w-20 border" />
              <p className="truncate text-[11px] text-muted-foreground">{video.name}</p>
            </div>
          ))}
        </div>
      )}
      {message.text && (
        <div className="rounded-3xl bg-background-secondary px-4 py-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
          {message.text}
        </div>
      )}
    </div>
  );
}

function VideoThumb({
  thumbnailUrl,
  className,
}: {
  thumbnailUrl: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-md bg-neutral-900 text-white",
        className
      )}
    >
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- local data URL
        <img
          src={thumbnailUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-black/50">
        <Film className="h-3 w-3" />
      </span>
    </div>
  );
}

function AssistantBubble({
  message,
  project,
  isBusy,
  onRetry,
}: {
  message: Extract<VideoChatMessage, { role: "assistant" }>;
  project: VideoProject | null;
  isBusy: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("videoGenerator");
  const sceneName = message.scene
    ? t("sceneLabel", { index: message.scene.sceneIndex + 1 })
    : "";

  if (message.status === "error") {
    return (
      <div className="flex max-w-[85%] items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="flex-1">{t("requestFailed")}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/50"
          disabled={isBusy}
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("retry")}
        </Button>
      </div>
    );
  }

  const pendingLabel =
    message.kind === "generate"
      ? t(getGenerateStepKey(message.progress))
      : message.scene
        ? t("updatingScene", { scene: sceneName })
        : t("updatingVideo");
  const doneLabel =
    message.kind === "upload"
      ? t("videosAdded", { count: message.sceneCount ?? 0 })
      : message.kind === "generate"
      ? t("videoReady", { count: message.sceneCount ?? project?.scenes.length ?? 0 })
      : message.scene
        ? t("sceneUpdated", { scene: sceneName })
        : t("videoUpdated");

  return (
    <div className="flex max-w-[85%] items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      {message.status === "pending" ? (
        <div className="w-full min-w-[220px] space-y-2 rounded-2xl border bg-card p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              {message.kind === "generate" ? t("generating") : pendingLabel}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {message.progress}%
            </span>
          </div>
          <Progress value={message.progress} />
          {message.kind === "generate" && (
            <p className="text-xs text-muted-foreground">{pendingLabel}</p>
          )}
        </div>
      ) : (
        <p className={cn("pt-1 text-sm leading-relaxed")}>{doneLabel}</p>
      )}
    </div>
  );
}
