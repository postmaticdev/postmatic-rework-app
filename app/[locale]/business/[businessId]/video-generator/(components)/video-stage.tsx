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
  sceneIndex: number;
  sceneProgress: number;
  sceneElapsed: number;
  isPlaying: boolean;
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
  sceneIndex,
  sceneProgress,
  sceneElapsed,
  isPlaying,
  isMuted,
  volume,
  isUpdating,
  updatingLabel,
  showWatermark = false,
  frameClassName,
}: VideoStageProps) {
  const t = useTranslations("videoGenerator");
  const [ratioWidth, ratioHeight] = ratio.split(":").map(Number);

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
        {scene ? (
          scene.videoUrl ? (
            <SceneClip
              src={scene.videoUrl}
              elapsed={(scene.trimStartSec ?? 0) + sceneElapsed}
              isPlaying={isPlaying}
              isMuted={isMuted}
              volume={volume}
            />
          ) : (
            <StoryboardFrame
              key={`${scene.id}-${scene.version}`}
              scene={scene}
              sceneIndex={sceneIndex}
              progress={sceneProgress}
            />
          )
        ) : null}

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

function SceneClip({
  src,
  elapsed,
  isPlaying,
  isMuted,
  volume,
}: {
  src: string;
  elapsed: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
      muted={isMuted}
      playsInline
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
