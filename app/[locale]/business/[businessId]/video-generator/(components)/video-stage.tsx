"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { VideoRatio, VideoScene } from "@/models/api/content/video.type";

// Backdrops for scenes that have no rendered clip or image yet.
const SCENE_GRADIENTS = [
  "from-sky-500 via-blue-600 to-indigo-700",
  "from-fuchsia-500 via-purple-600 to-indigo-700",
  "from-amber-400 via-orange-500 to-rose-600",
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-rose-400 via-pink-500 to-fuchsia-600",
  "from-indigo-500 via-violet-600 to-purple-700",
  "from-cyan-400 via-sky-500 to-blue-600",
  "from-orange-400 via-amber-500 to-yellow-500",
];

export const getSceneGradient = (index: number) =>
  SCENE_GRADIENTS[index % SCENE_GRADIENTS.length];

type VideoStageProps = {
  ratio: VideoRatio;
  scene: VideoScene | null;
  // Its clip is loaded in the background so the cut to it doesn't stall.
  nextScene?: VideoScene | null;
  sceneIndex: number;
  sceneProgress: number;
  sceneElapsed: number;
  isPlaying: boolean;
  // The active clip is still loading; the timeline waits for it.
  isBuffering?: boolean;
  onBufferingChange?: (isBuffering: boolean) => void;
  isMuted: boolean;
  // 0..1, applied to rendered scene clips.
  volume: number;
  isUpdating: boolean;
  updatingLabel?: string;
  // Free users see (and download) the video with the Postmatic watermark.
  showWatermark?: boolean;
  frameClassName?: string;
};

// Fits a frame of the project's aspect ratio inside the available space and
// renders the active scene: its clip when rendered, else a storyboard frame.
export function VideoStage({
  ratio,
  scene,
  nextScene,
  sceneIndex,
  sceneProgress,
  sceneElapsed,
  isPlaying,
  isBuffering = false,
  onBufferingChange,
  isMuted,
  volume,
  isUpdating,
  updatingLabel,
  showWatermark = false,
  frameClassName,
}: VideoStageProps) {
  const t = useTranslations("videoGenerator");
  const [ratioWidth, ratioHeight] = ratio.split(":").map(Number);
  // Keyed by scene, so the preloaded clip becomes the active one as is.
  const clipScenes = [scene, nextScene].filter(
    (clipScene, index, list): clipScene is VideoScene =>
      Boolean(clipScene?.videoUrl) &&
      list.findIndex((other) => other?.id === clipScene?.id) === index
  );

  return (
    <div className="relative h-full w-full" style={{ containerType: "size" }}>
      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-neutral-950 shadow-2xl ring-1 ring-black/5",
          frameClassName
        )}
        style={{
          width: `min(100cqw, calc(100cqh * ${ratioWidth} / ${ratioHeight}))`,
          aspectRatio: `${ratioWidth} / ${ratioHeight}`,
          containerType: "inline-size",
        }}
      >
        {clipScenes.map((clipScene) => {
          const isActive = clipScene.id === scene?.id;
          return (
            <SceneClip
              key={clipScene.id}
              src={clipScene.videoUrl!}
              poster={clipScene.thumbnailUrl ?? undefined}
              elapsed={(clipScene.trimStartSec ?? 0) + (isActive ? sceneElapsed : 0)}
              isActive={isActive}
              isPlaying={isActive && isPlaying}
              isMuted={!isActive || isMuted}
              volume={volume}
              onBufferingChange={onBufferingChange}
            />
          );
        })}

        {scene && !scene.videoUrl && (
          <StoryboardFrame
            key={`${scene.id}-${scene.version}`}
            scene={scene}
            sceneIndex={sceneIndex}
            progress={sceneProgress}
          />
        )}

        {isPlaying && isBuffering && !isUpdating && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 text-white animate-in fade-in duration-300">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        )}

        {scene && (
          <div className="pointer-events-none absolute left-[4cqw] top-[4cqw] rounded-full bg-black/45 px-[2.5cqw] py-[1cqw] text-[clamp(10px,3cqw,14px)] font-medium text-white backdrop-blur-sm">
            {t("sceneLabel", { index: sceneIndex + 1 })} · {scene.title}
          </div>
        )}

        {showWatermark && <VideoWatermark />}

        {isUpdating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-white backdrop-blur-[2px] animate-in fade-in duration-300">
            <Loader2 className="h-7 w-7 animate-spin" />
            {updatingLabel && (
              <span className="px-4 text-center text-sm font-medium">{updatingLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Mirrors the watermark the backend burns into free users' renders.
function VideoWatermark() {
  return (
    <div className="pointer-events-none absolute right-[4cqw] top-[4cqw] flex items-center gap-[1.2cqw] rounded-md bg-black/30 px-[1.8cqw] py-[1cqw] opacity-90 backdrop-blur-[1px]">
      <Image
        src="/logoblue.png"
        alt=""
        width={32}
        height={32}
        className="h-[clamp(12px,4cqw,22px)] w-[clamp(12px,4cqw,22px)] rounded-full bg-white object-contain p-[1px]"
      />
      <span className="text-[clamp(9px,3cqw,15px)] font-semibold tracking-wide text-white">
        Postmatic
      </span>
    </div>
  );
}

function StoryboardFrame({
  scene,
  sceneIndex,
  progress,
}: {
  scene: VideoScene;
  sceneIndex: number;
  progress: number;
}) {
  // Slow push-in, like a Ken Burns pan, so storyboard frames feel like video.
  const zoomStyle = { transform: `scale(${1.04 + progress * 0.08})` };

  return (
    <div className="absolute inset-0 animate-in fade-in duration-500">
      {scene.thumbnailUrl ? (
        <Image
          src={scene.thumbnailUrl}
          alt=""
          fill
          draggable={false}
          className="object-cover"
          style={zoomStyle}
          unoptimized
        />
      ) : (
        <div
          className={cn("absolute inset-0 bg-gradient-to-br", getSceneGradient(sceneIndex))}
          style={zoomStyle}
        >
          <div className="absolute -right-[15%] -top-[10%] h-[60%] aspect-square rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-[15%] -left-[10%] h-[50%] aspect-square rounded-full bg-black/20 blur-2xl" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      {scene.caption && (
        <p
          key={scene.caption}
          className="absolute inset-x-[6cqw] bottom-[8cqw] text-center text-[clamp(16px,7cqw,44px)] font-bold leading-tight text-white drop-shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-700"
        >
          {scene.caption}
        </p>
      )}
    </div>
  );
}

const CLIP_STATE_EVENTS = [
  "loadeddata",
  "canplay",
  "playing",
  "waiting",
  "seeking",
  "seeked",
  "ended",
  "error",
] as const;

function SceneClip({
  src,
  poster,
  elapsed,
  isActive,
  isPlaying,
  isMuted,
  volume,
  onBufferingChange,
}: {
  src: string;
  poster?: string;
  elapsed: number;
  isActive: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  onBufferingChange?: (isBuffering: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Only the visible clip can hold the timeline. An ended or broken clip never
  // does, so playback can't get stuck on it.
  useEffect(() => {
    const video = videoRef.current;
    if (!isActive || !video || !onBufferingChange) return;
    const report = () =>
      onBufferingChange(
        !video.ended &&
          !video.error &&
          video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA
      );
    report();
    CLIP_STATE_EVENTS.forEach((type) => video.addEventListener(type, report));
    return () => {
      CLIP_STATE_EVENTS.forEach((type) => video.removeEventListener(type, report));
      onBufferingChange(false);
    };
  }, [isActive, onBufferingChange, src]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume, src]);

  // The shared timeline is the clock; nudge the clip only when it drifts.
  useEffect(() => {
    const video = videoRef.current;
    if (video && Math.abs(video.currentTime - elapsed) > 0.35) {
      video.currentTime = elapsed;
    }
  }, [elapsed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) void video.play().catch(() => {});
    else video.pause();
  }, [isPlaying, src]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      preload="auto"
      muted={isMuted}
      playsInline
      aria-hidden={!isActive}
      className={cn(
        "absolute inset-0 h-full w-full object-cover",
        !isActive && "pointer-events-none opacity-0"
      )}
    />
  );
}
