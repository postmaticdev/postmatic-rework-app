"use client";

import { useEffect, useRef } from "react";
import { VideoAudioClip } from "@/models/api/content/video.type";

type AudioTrackPlayerProps = {
  clips: VideoAudioClip[];
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
};

// Headless: one <audio> per clip, kept in step with the shared timeline clock.
export function AudioTrackPlayer({
  clips,
  currentTime,
  isPlaying,
  volume,
  isMuted,
}: AudioTrackPlayerProps) {
  const audioRefs = useRef(new Map<string, HTMLAudioElement>());

  useEffect(() => {
    clips.forEach((clip) => {
      const audio = audioRefs.current.get(clip.id);
      if (!audio) return;
      audio.volume = volume;
      audio.muted = isMuted || Boolean(clip.isMuted);

      const localTime = currentTime - clip.startSec;
      const isInside = localTime >= 0 && localTime < clip.durationSec;
      if (!isPlaying || !isInside) {
        if (!audio.paused) audio.pause();
        return;
      }

      const sourceTime = clip.trimStartSec + localTime;
      // Re-sync only on real drift (seeking, trimming); small jitter is fine.
      if (Math.abs(audio.currentTime - sourceTime) > 0.3) {
        audio.currentTime = sourceTime;
      }
      if (audio.paused) void audio.play().catch(() => {});
    });
  }, [clips, currentTime, isMuted, isPlaying, volume]);

  return (
    <>
      {clips.map((clip) => (
        <audio
          key={clip.id}
          ref={(element) => {
            if (element) audioRefs.current.set(clip.id, element);
            else audioRefs.current.delete(clip.id);
          }}
          src={clip.url}
          preload="auto"
          className="hidden"
        />
      ))}
    </>
  );
}
