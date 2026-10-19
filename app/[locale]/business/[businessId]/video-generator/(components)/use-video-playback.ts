"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VideoScene } from "@/models/api/content/video.type";

// Drives a timeline across scenes. Scenes without a rendered clip are shown as
// storyboard frames, so the clock lives here rather than in a <video> element.
export function useVideoPlayback(scenes: VideoScene[], resetKey?: string | null) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const lastFrameRef = useRef<number | null>(null);

  const sceneStarts = useMemo(() => {
    let elapsed = 0;
    return scenes.map((scene) => {
      const start = elapsed;
      elapsed += scene.durationSec;
      return start;
    });
  }, [scenes]);
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.durationSec, 0);

  // A new project starts from the top, paused.
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [resetKey]);

  useEffect(() => {
    if (!isPlaying || totalDuration <= 0) {
      lastFrameRef.current = null;
      return;
    }

    let frameId = 0;
    const tick = (timestamp: number) => {
      const lastFrame = lastFrameRef.current ?? timestamp;
      const deltaSec = (timestamp - lastFrame) / 1000;
      lastFrameRef.current = timestamp;

      setCurrentTime((previous) => {
        const next = previous + deltaSec;
        if (next < totalDuration) return next;
        if (isLooping) return next % totalDuration;
        setIsPlaying(false);
        return totalDuration;
      });
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      lastFrameRef.current = null;
    };
  }, [isLooping, isPlaying, totalDuration]);

  const activeSceneIndex = useMemo(() => {
    if (!scenes.length) return -1;
    for (let index = scenes.length - 1; index >= 0; index -= 1) {
      if (currentTime >= sceneStarts[index]) return index;
    }
    return 0;
  }, [currentTime, sceneStarts, scenes.length]);

  const togglePlay = useCallback(() => {
    if (totalDuration <= 0) return;
    if (!isPlaying && currentTime >= totalDuration) setCurrentTime(0);
    setIsPlaying((previous) => !previous);
  }, [currentTime, isPlaying, totalDuration]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const restart = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const seek = useCallback(
    (time: number) => {
      setCurrentTime(Math.max(0, Math.min(totalDuration, time)));
    },
    [totalDuration]
  );

  const seekToScene = useCallback(
    (index: number) => {
      if (sceneStarts[index] === undefined) return;
      setCurrentTime(sceneStarts[index]);
    },
    [sceneStarts]
  );

  const activeScene = activeSceneIndex >= 0 ? scenes[activeSceneIndex] : null;
  const sceneElapsed = activeScene
    ? Math.min(currentTime - sceneStarts[activeSceneIndex], activeScene.durationSec)
    : 0;

  return {
    currentTime,
    totalDuration,
    isPlaying,
    isLooping,
    setIsLooping,
    activeSceneIndex,
    sceneStarts,
    // 0..1 progress through the active scene.
    sceneProgress: activeScene ? sceneElapsed / activeScene.durationSec : 0,
    sceneElapsed,
    togglePlay,
    pause,
    restart,
    seek,
    seekToScene,
  };
}

export type VideoPlaybackState = ReturnType<typeof useVideoPlayback>;

export const formatVideoTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
};
