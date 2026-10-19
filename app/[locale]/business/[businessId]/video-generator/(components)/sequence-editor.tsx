"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Film,
  Loader2,
  Music,
  Pencil,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/helper/show-toast";
import { cn } from "@/lib/utils";
import {
  VideoAudioClip,
  VideoProject,
  VideoScene,
} from "@/models/api/content/video.type";
import { getSceneGradient } from "./video-stage";
import { formatVideoTime, VideoPlaybackState } from "./use-video-playback";
import {
  getDragKind,
  ImportedAudio,
  readDraggedVideo,
  useMediaImport,
} from "./use-media-import";
import { toUploadedScene } from "./use-video-generator";

const MIN_CLIP_SEC = 0.5;
// Generated scenes have no source length; keep them to a sensible maximum.
const MAX_AI_SCENE_SEC = 30;
// Bounds for the auto-fit scale (pixels per second).
const MIN_PIXELS_PER_SECOND = 8;
const MAX_PIXELS_PER_SECOND = 160;
// Empty room after the last clip so clips can be extended / moved past it.
const TRACK_TAIL_SEC = 5;
const DRAG_THRESHOLD_PX = 4;
const LABEL_STEPS_SEC = [0.5, 1, 2, 5, 10, 15, 30, 60];

const RULER_HEIGHT = 24;
const DEFAULT_VIDEO_TRACK_SHARE = 0.56;
const MIN_VIDEO_TRACK_HEIGHT = 36;
const MIN_AUDIO_TRACK_HEIGHT = 28;
const TRACK_SHARE_STORAGE_KEY = "postmatic.videoGenerator.videoTrackShare";
export const DEFAULT_TRACKS_HEIGHT = 124;
export const MIN_TRACKS_HEIGHT = 100;
export const MAX_TRACKS_HEIGHT = 420;

const roundTenth = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type DragState =
  | {
      type: "reorder";
      sceneId: string;
      fromIndex: number;
      startX: number;
      offsetX: number;
      targetIndex: number;
      moved: boolean;
    }
  | {
      type: "trim-scene";
      edge: "start" | "end";
      sceneId: string;
      startX: number;
      initialDuration: number;
      initialTrimStart: number;
    }
  | {
      type: "move-audio";
      clipId: string;
      startX: number;
      initialStart: number;
      moved: boolean;
    }
  | {
      type: "trim-audio";
      edge: "start" | "end";
      clipId: string;
      startX: number;
      initialStart: number;
      initialDuration: number;
      initialTrimStart: number;
    };

export type SequenceEditorProps = {
  project: VideoProject;
  playback: VideoPlaybackState;
  selectedSceneId: string | null;
  // undefined = nothing pending, null = whole video, string = that scene.
  updatingSceneId: string | null | undefined;
  disabled: boolean;
  // Ruler + video + audio track height, set by the resizable panel.
  tracksHeight?: number;
  onSelectScene: (index: number) => void;
  onChangeProject: (updater: (current: VideoProject) => VideoProject) => void;
  // Wrap a drag so all of its intermediate updates become one undo step.
  onBeginChange: () => void;
  onEndChange: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

// Editor-style sequence: a time ruler with playhead, a ripple video track
// (drag to reorder, drag edges to trim) and an audio track (drag to move,
// drag edges to trim). Clips never overlap.
export function SequenceEditor({
  project,
  playback,
  selectedSceneId,
  updatingSceneId,
  disabled,
  tracksHeight = DEFAULT_TRACKS_HEIGHT,
  onSelectScene,
  onChangeProject,
  onBeginChange,
  onEndChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: SequenceEditorProps) {
  // Taller panel = taller tracks, so clips and trim handles are easier to grab.
  // The divider between the tracks sets how that height is shared.
  const [videoTrackShare, setVideoTrackShare] = useState(DEFAULT_VIDEO_TRACK_SHARE);
  const trackSpace = tracksHeight - RULER_HEIGHT;
  const maxVideoTrackHeight = trackSpace - MIN_AUDIO_TRACK_HEIGHT;
  const videoTrackHeight = Math.round(
    clamp(trackSpace * videoTrackShare, MIN_VIDEO_TRACK_HEIGHT, maxVideoTrackHeight)
  );
  const audioTrackHeight = trackSpace - videoTrackHeight;
  const trackResizeRef = useRef<{ startY: number; startHeight: number; lastShare: number } | null>(
    null
  );

  useEffect(() => {
    try {
      const storedShare = Number(localStorage.getItem(TRACK_SHARE_STORAGE_KEY));
      if (storedShare > 0 && storedShare < 1) setVideoTrackShare(storedShare);
    } catch {}
  }, []);

  const saveVideoTrackShare = (share: number) => {
    try {
      localStorage.setItem(TRACK_SHARE_STORAGE_KEY, String(share));
    } catch {}
  };

  const resizeVideoTrack = (height: number) => {
    const share =
      clamp(height, MIN_VIDEO_TRACK_HEIGHT, maxVideoTrackHeight) / trackSpace;
    setVideoTrackShare(share);
    return share;
  };

  const trackDividerHandlers = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      trackResizeRef.current = {
        startY: event.clientY,
        startHeight: videoTrackHeight,
        lastShare: videoTrackShare,
      };
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      const resize = trackResizeRef.current;
      if (!resize) return;
      resize.lastShare = resizeVideoTrack(resize.startHeight + event.clientY - resize.startY);
    },
    onPointerUp: () => endTrackResize(),
    onPointerCancel: () => endTrackResize(),
    onDoubleClick: () => {
      setVideoTrackShare(DEFAULT_VIDEO_TRACK_SHARE);
      saveVideoTrackShare(DEFAULT_VIDEO_TRACK_SHARE);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.key === "ArrowUp" ? -8 : 8;
      saveVideoTrackShare(resizeVideoTrack(videoTrackHeight + step));
    },
  };

  function endTrackResize() {
    const resize = trackResizeRef.current;
    if (!resize) return;
    trackResizeRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    saveVideoTrackShare(resize.lastShare);
  }
  const t = useTranslations("videoGenerator");
  const { importVideos, importAudio } = useMediaImport();
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(40);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [importingTrack, setImportingTrack] = useState<"video" | "audio" | null>(null);
  // Where a file / chat video dragged over a track would land.
  const [dropTarget, setDropTarget] = useState<
    { track: "video"; index: number } | { track: "audio"; time: number } | null
  >(null);
  const { scenes, audioClips } = project;
  const { currentTime, totalDuration, isPlaying, sceneStarts, seek } = playback;

  const setDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDragState(next);
  };

  // The scale fits the whole timeline to the panel width: on load, when clips
  // are added / removed and when the panel resizes. Not while trimming, so the
  // scale doesn't shift under the pointer.
  const timelineLengthRef = useRef(0);
  timelineLengthRef.current = Math.max(
    totalDuration,
    audioClips.reduce((end, clip) => Math.max(end, clip.startSec + clip.durationSec), 0)
  );
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const fitToWidth = () => {
      const width = scroller.clientWidth;
      const length = timelineLengthRef.current;
      if (!width || length <= 0 || dragRef.current) return;
      setPixelsPerSecond(
        clamp((width - 24) / length, MIN_PIXELS_PER_SECOND, MAX_PIXELS_PER_SECOND)
      );
    };
    fitToWidth();
    const observer = new ResizeObserver(fitToWidth);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [project.id, scenes.length, audioClips.length]);

  // Follow the playhead while playing.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !isPlaying) return;
    const playheadX = currentTime * pixelsPerSecond;
    if (
      playheadX < scroller.scrollLeft ||
      playheadX > scroller.scrollLeft + scroller.clientWidth - 32
    ) {
      scroller.scrollLeft = Math.max(0, playheadX - 32);
    }
  }, [currentTime, isPlaying, pixelsPerSecond]);

  const audioEnd = audioClips.reduce(
    (end, clip) => Math.max(end, clip.startSec + clip.durationSec),
    0
  );
  const contentWidth =
    (Math.max(totalDuration, audioEnd) + TRACK_TAIL_SEC) * pixelsPerSecond;

  // While reordering, the other clips already shuffle into the new order.
  const previewScenes = useMemo(() => {
    if (drag?.type !== "reorder" || drag.targetIndex === drag.fromIndex) return scenes;
    const reordered = [...scenes];
    const [moved] = reordered.splice(drag.fromIndex, 1);
    reordered.splice(drag.targetIndex, 0, moved);
    return reordered;
  }, [drag, scenes]);

  const labelStep =
    LABEL_STEPS_SEC.find((step) => step * pixelsPerSecond >= 56) ??
    LABEL_STEPS_SEC[LABEL_STEPS_SEC.length - 1];
  const rulerMarks = useMemo(() => {
    const marks: number[] = [];
    const end = contentWidth / pixelsPerSecond;
    for (let time = 0; time <= end; time += labelStep) marks.push(roundTenth(time));
    return marks;
  }, [contentWidth, labelStep, pixelsPerSecond]);

  const getAudioNeighbours = (clipId: string) => {
    const sorted = [...audioClips].sort((left, right) => left.startSec - right.startSec);
    const index = sorted.findIndex((clip) => clip.id === clipId);
    const previous = sorted[index - 1];
    const next = sorted[index + 1];
    return {
      previousEnd: previous ? previous.startSec + previous.durationSec : 0,
      nextStart: next ? next.startSec : Number.POSITIVE_INFINITY,
    };
  };

  const updateScene = (sceneId: string, patch: (scene: VideoScene) => VideoScene) =>
    onChangeProject((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => (scene.id === sceneId ? patch(scene) : scene)),
    }));

  const updateAudioClip = (
    clipId: string,
    patch: (clip: VideoAudioClip) => VideoAudioClip
  ) =>
    onChangeProject((current) => ({
      ...current,
      audioClips: current.audioClips.map((clip) => (clip.id === clipId ? patch(clip) : clip)),
    }));

  // ---- Ruler / playhead ----------------------------------------------------

  const seekToPointer = (clientX: number) => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;
    seek((clientX - rect.left) / pixelsPerSecond);
  };

  // ---- Pointer handling shared by every draggable --------------------------

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const current = dragRef.current;
    if (!current) return;
    const offsetX = event.clientX - current.startX;
    const deltaSec = offsetX / pixelsPerSecond;

    if (current.type === "reorder") {
      const moved = current.moved || Math.abs(offsetX) > DRAG_THRESHOLD_PX;
      const dragged = scenes[current.fromIndex];
      const draggedCenter =
        (sceneStarts[current.fromIndex] + dragged.durationSec / 2) * pixelsPerSecond +
        offsetX;
      let elapsed = 0;
      let targetIndex = 0;
      scenes.forEach((scene, index) => {
        if (index === current.fromIndex) return;
        const width = scene.durationSec * pixelsPerSecond;
        if (draggedCenter > elapsed + width / 2) targetIndex += 1;
        elapsed += width;
      });
      setDrag({ ...current, offsetX, moved, targetIndex });
      return;
    }

    if (current.type === "trim-scene") {
      updateScene(current.sceneId, (scene) => {
        const sourceDuration =
          scene.source === "upload" ? scene.sourceDurationSec ?? null : null;
        if (current.edge === "end") {
          const maxDuration = sourceDuration
            ? sourceDuration - current.initialTrimStart
            : MAX_AI_SCENE_SEC;
          return {
            ...scene,
            durationSec: roundTenth(
              clamp(current.initialDuration + deltaSec, MIN_CLIP_SEC, maxDuration)
            ),
          };
        }
        // Left edge: uploaded clips cut footage from the start; generated
        // scenes just get shorter / longer.
        if (sourceDuration) {
          const trimStart = roundTenth(
            clamp(
              current.initialTrimStart + deltaSec,
              0,
              current.initialTrimStart + current.initialDuration - MIN_CLIP_SEC
            )
          );
          return {
            ...scene,
            trimStartSec: trimStart,
            durationSec: roundTenth(
              current.initialDuration - (trimStart - current.initialTrimStart)
            ),
          };
        }
        return {
          ...scene,
          durationSec: roundTenth(
            clamp(current.initialDuration - deltaSec, MIN_CLIP_SEC, MAX_AI_SCENE_SEC)
          ),
        };
      });
      return;
    }

    const { previousEnd, nextStart } = getAudioNeighbours(current.clipId);

    if (current.type === "move-audio") {
      const moved = current.moved || Math.abs(offsetX) > DRAG_THRESHOLD_PX;
      if (moved !== current.moved) setDrag({ ...current, moved });
      if (!moved) return;
      updateAudioClip(current.clipId, (clip) => ({
        ...clip,
        startSec: roundTenth(
          clamp(current.initialStart + deltaSec, previousEnd, nextStart - clip.durationSec)
        ),
      }));
      return;
    }

    updateAudioClip(current.clipId, (clip) => {
      if (current.edge === "end") {
        const maxDuration = Math.min(
          clip.sourceDurationSec - current.initialTrimStart,
          nextStart - current.initialStart
        );
        return {
          ...clip,
          durationSec: roundTenth(
            clamp(current.initialDuration + deltaSec, MIN_CLIP_SEC, maxDuration)
          ),
        };
      }
      const shift = roundTenth(
        clamp(
          deltaSec,
          Math.max(previousEnd - current.initialStart, -current.initialTrimStart),
          current.initialDuration - MIN_CLIP_SEC
        )
      );
      return {
        ...clip,
        startSec: roundTenth(current.initialStart + shift),
        trimStartSec: roundTenth(current.initialTrimStart + shift),
        durationSec: roundTenth(current.initialDuration - shift),
      };
    });
  };

  const handlePointerUp = () => {
    const current = dragRef.current;
    if (!current) return;
    setDrag(null);

    if (current.type === "reorder") {
      if (!current.moved) {
        onSelectScene(current.fromIndex);
        setSelectedAudioId(null);
      } else if (current.targetIndex !== current.fromIndex) {
        onChangeProject((project) => {
          const reordered = [...project.scenes];
          const [moved] = reordered.splice(current.fromIndex, 1);
          reordered.splice(current.targetIndex, 0, moved);
          return { ...project, scenes: reordered };
        });
      }
    }

    if (current.type === "move-audio" && !current.moved) {
      setSelectedAudioId((selected) => (selected === current.clipId ? null : current.clipId));
    }
    onEndChange();
  };

  const startDrag = (event: React.PointerEvent<HTMLElement>, next: DragState) => {
    if (disabled || event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onBeginChange();
    setDrag(next);
  };

  const pointerHandlers = {
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    // Touch scrolling cancels the pointer; that must not count as a click.
    onPointerCancel: () => {
      if (!dragRef.current) return;
      setDrag(null);
      onEndChange();
    },
  };

  // ---- Toolbar actions ------------------------------------------------------

  const canDeleteScene = Boolean(selectedSceneId) && scenes.length > 1;
  const canDelete = Boolean(selectedAudioId) || canDeleteScene;

  const deleteSelected = () => {
    if (disabled) return;
    if (selectedAudioId) {
      onChangeProject((current) => ({
        ...current,
        audioClips: current.audioClips.filter((clip) => clip.id !== selectedAudioId),
      }));
      setSelectedAudioId(null);
      return;
    }
    if (canDeleteScene) {
      onChangeProject((current) => ({
        ...current,
        scenes: current.scenes.filter((scene) => scene.id !== selectedSceneId),
      }));
    }
  };

  // Places a clip without overlapping: at `atTime` (inside the gap there, or
  // right after the clip that was hit) or, by default / when there's no room,
  // after the last clip. Fills the rest of the video unless the file is shorter.
  const addAudioClip = (audio: ImportedAudio, atTime?: number) => {
    const clipId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    onChangeProject((current) => {
      const sorted = [...current.audioClips].sort((left, right) => left.startSec - right.startSec);
      const lastEnd = sorted.reduce((end, clip) => Math.max(end, clip.startSec + clip.durationSec), 0);
      let startSec = lastEnd;
      let maxDuration = Number.POSITIVE_INFINITY;

      if (atTime !== undefined) {
        const time = Math.max(0, atTime);
        const hitClip = sorted.find(
          (clip) => time >= clip.startSec && time < clip.startSec + clip.durationSec
        );
        const candidateStart = hitClip ? hitClip.startSec + hitClip.durationSec : time;
        const nextClip = sorted.find((clip) => clip.startSec >= candidateStart);
        const room = nextClip ? nextClip.startSec - candidateStart : Number.POSITIVE_INFINITY;
        if (room >= MIN_CLIP_SEC) {
          startSec = candidateStart;
          maxDuration = room;
        }
      }

      const videoDuration = current.scenes.reduce((sum, scene) => sum + scene.durationSec, 0);
      const roomInVideo = videoDuration - startSec;
      const preferredDuration =
        roomInVideo >= 1 ? Math.min(audio.sourceDurationSec, roomInVideo) : audio.sourceDurationSec;
      return {
        ...current,
        audioClips: [
          ...current.audioClips,
          {
            id: clipId,
            ...audio,
            startSec: roundTenth(startSec),
            durationSec: roundTenth(Math.min(preferredDuration, maxDuration)),
            trimStartSec: 0,
          },
        ],
      };
    });
    setSelectedAudioId(clipId);
  };

  const handleAddAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportingTrack("audio");
    try {
      const audio = await importAudio(file);
      if (audio) addAudioClip(audio);
    } finally {
      setImportingTrack(null);
    }
  };

  // ---- Drag & drop from the computer / the chat ---------------------------

  const getPointerTime = (clientX: number) => {
    const rect = contentRef.current?.getBoundingClientRect();
    return rect ? Math.max(0, (clientX - rect.left) / pixelsPerSecond) : 0;
  };

  // Drops between scenes: before the first scene whose middle is to the right.
  const getSceneInsertIndex = (time: number) =>
    scenes.reduce(
      (insertIndex, scene, index) =>
        time > sceneStarts[index] + scene.durationSec / 2 ? index + 1 : insertIndex,
      0
    );

  // The track under the pointer; the ruler counts as the video track.
  const getHoveredTrack = (clientY: number): "video" | "audio" => {
    const top = tracksRef.current?.getBoundingClientRect().top ?? 0;
    return clientY - top < RULER_HEIGHT + videoTrackHeight ? "video" : "audio";
  };

  // Anywhere on the sequence accepts media. Known types go to their own track
  // whatever the pointer is over; unknown ones (some browsers hide types until
  // the drop) preview on the hovered track.
  const handleDragOver = (event: React.DragEvent) => {
    if (disabled || importingTrack) return;
    const kind = getDragKind(event.dataTransfer);
    if (!kind) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    const track = kind === "file" ? getHoveredTrack(event.clientY) : kind;
    const time = getPointerTime(event.clientX);
    setDropTarget(
      track === "video" ? { track, index: getSceneInsertIndex(time) } : { track, time }
    );
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDropTarget(null);
    }
  };

  // Videos are inserted between scenes, audio files placed one after another
  // from the drop time. The whole drop is a single undo step.
  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDropTarget(null);
    if (disabled || importingTrack) return;
    // Read everything off the event before awaiting; the browser clears it.
    const time = getPointerTime(event.clientX);
    const draggedVideo = readDraggedVideo(event.dataTransfer);
    const files = Array.from(event.dataTransfer.files);
    const videoFiles = files.filter((file) => file.type.startsWith("video/"));
    const audioFiles = files.filter((file) => file.type.startsWith("audio/"));
    if (videoFiles.length + audioFiles.length < files.length) {
      showToast("error", t("unsupportedFile"));
    }
    if (!draggedVideo && !videoFiles.length && !audioFiles.length) return;

    setImportingTrack(draggedVideo || videoFiles.length ? "video" : "audio");
    try {
      const videos = draggedVideo
        ? [draggedVideo]
        : videoFiles.length
          ? await importVideos(videoFiles)
          : [];
      const audios: ImportedAudio[] = [];
      for (const file of audioFiles) {
        const audio = await importAudio(file);
        if (audio) audios.push(audio);
      }
      if (!videos.length && !audios.length) return;

      onBeginChange();
      if (videos.length) {
        const insertIndex = getSceneInsertIndex(time);
        onChangeProject((current) => {
          const nextScenes = [...current.scenes];
          nextScenes.splice(
            Math.min(insertIndex, nextScenes.length),
            0,
            ...videos.map(toUploadedScene)
          );
          return { ...current, scenes: nextScenes };
        });
      }
      audios.forEach((audio) => addAudioClip(audio, time));
      onEndChange();
    } finally {
      setImportingTrack(null);
    }
  };

  const toggleSceneMute = (sceneId: string) =>
    updateScene(sceneId, (scene) => ({ ...scene, isMuted: !scene.isMuted }));
  const toggleAudioClipMute = (clipId: string) =>
    updateAudioClip(clipId, (clip) => ({ ...clip, isMuted: !clip.isMuted }));
  const clipMuteLabels = { mute: t("muteClip"), unmute: t("unmuteClip") };

  // Shortcuts for the selected clip, from anywhere on the page except while
  // typing or inside a dialog: Delete / Backspace removes it, M (un)mutes it.
  // Kept in a ref so the listener always sees the latest selection.
  const clipShortcutRef = useRef<(action: "delete" | "mute") => boolean>(() => false);
  clipShortcutRef.current = (action) => {
    if (disabled) return false;
    if (action === "delete") {
      if (!canDelete) return false;
      deleteSelected();
      return true;
    }
    if (selectedAudioId) toggleAudioClipMute(selectedAudioId);
    else if (selectedSceneId) toggleSceneMute(selectedSceneId);
    else return false;
    return true;
  };
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const action =
        event.key === "Delete" || event.key === "Backspace"
          ? "delete"
          : event.key.toLowerCase() === "m"
            ? "mute"
            : null;
      if (!action) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")
      ) {
        return;
      }
      if (clipShortcutRef.current(action)) event.preventDefault();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const dropIndicatorX =
    dropTarget?.track === "video"
      ? (dropTarget.index < scenes.length ? sceneStarts[dropTarget.index] : totalDuration) *
        pixelsPerSecond
      : dropTarget?.track === "audio"
        ? dropTarget.time * pixelsPerSecond
        : null;

  const playheadX = currentTime * pixelsPerSecond;
  const shortcutLabels = getShortcutLabels();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">{t("sequence")}</p>
          <p className="truncate text-[11px] text-muted-foreground max-sm:hidden">
            {t("sequenceHint")}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled || !canDelete}
          onClick={deleteSelected}
          title={t("deleteClip")}
          aria-label={t("deleteClip")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!canUndo}
          onClick={onUndo}
          title={t("undoShortcut", { shortcut: shortcutLabels.undo })}
          aria-label={t("undo")}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!canRedo}
          onClick={onRedo}
          title={t("redoShortcut", { shortcut: shortcutLabels.redo })}
          aria-label={t("redo")}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={tracksRef}
        className="relative flex overflow-hidden rounded-lg border bg-background-secondary/60"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Track headers */}
        <div className="w-[72px] shrink-0 border-r bg-card sm:w-24">
          <div className="h-6 border-b" />
          <div
            className="flex items-center gap-0.5 border-b px-1.5 text-xs font-medium sm:px-2"
            style={{ height: videoTrackHeight }}
          >
            <Film className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="ml-1 max-sm:hidden">{t("videoTrack")}</span>
            <TrackMuteButton
              isMuted={Boolean(project.isVideoMuted)}
              muteLabel={t("muteVideoTrack")}
              unmuteLabel={t("unmuteVideoTrack")}
              onToggle={() =>
                onChangeProject((current) => ({ ...current, isVideoMuted: !current.isVideoMuted }))
              }
            />
          </div>
          <div
            className="flex items-center gap-0.5 px-1.5 text-xs font-medium sm:px-2"
            style={{ height: audioTrackHeight }}
          >
            <Music className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="max-sm:hidden">{t("audioTrack")}</span>
            <TrackMuteButton
              isMuted={Boolean(project.isAudioMuted)}
              muteLabel={t("muteAudioTrack")}
              unmuteLabel={t("unmuteAudioTrack")}
              onToggle={() =>
                onChangeProject((current) => ({ ...current, isAudioMuted: !current.isAudioMuted }))
              }
            />
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background-secondary hover:text-foreground disabled:opacity-50"
              disabled={disabled || importingTrack !== null}
              onClick={() => audioInputRef.current?.click()}
              title={t("addAudio")}
              aria-label={t("addAudio")}
            >
              {importingTrack === "audio" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Tracks */}
        <div
          ref={scrollRef}
          className="relative min-w-0 flex-1 overflow-x-auto scrollbar-hidden [scrollbar-width:thin]"
        >
          <div
            ref={contentRef}
            className="relative"
            style={{ width: contentWidth, minWidth: "100%" }}
          >
            {/* Ruler */}
            <div
              className="relative h-6 cursor-pointer touch-none select-none border-b bg-card"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                seekToPointer(event.clientX);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  seekToPointer(event.clientX);
                }
              }}
              role="slider"
              aria-label={t("seek")}
              aria-valuemin={0}
              aria-valuemax={Math.round(totalDuration)}
              aria-valuenow={Math.round(currentTime)}
            >
              {rulerMarks.map((time) => (
                <span
                  key={time}
                  className="absolute bottom-0 flex h-full flex-col justify-between"
                  style={{ left: time * pixelsPerSecond }}
                >
                  <span className="pl-1 text-[10px] leading-4 tabular-nums text-muted-foreground">
                    {formatVideoTime(time)}
                  </span>
                  <span className="h-1.5 w-px bg-border" />
                </span>
              ))}
            </div>

            {/* Video track */}
            <div
              className={cn(
                "relative border-b transition-colors",
                dropTarget?.track === "video" && "bg-primary/5"
              )}
              style={{ height: videoTrackHeight }}
              onPointerDown={() => setSelectedAudioId(null)}
            >
              {dropTarget?.track === "video" && dropIndicatorX !== null && (
                <DropIndicator x={dropIndicatorX} label={t("dropToAddScene")} />
              )}
              {importingTrack === "video" && <ImportingOverlay label={t("addingMedia")} />}
              {previewScenes.map((scene) => {
                const index = scenes.indexOf(scene);
                const isDragged = drag?.type === "reorder" && drag.sceneId === scene.id && drag.moved;
                const layoutIndex = previewScenes.indexOf(scene);
                const left =
                  previewScenes
                    .slice(0, layoutIndex)
                    .reduce((sum, item) => sum + item.durationSec, 0) * pixelsPerSecond;
                const width = scene.durationSec * pixelsPerSecond;

                return (
                  <div key={scene.id}>
                    {isDragged && (
                      <div
                        className="absolute inset-y-1 rounded-md border-2 border-dashed border-primary/50 bg-primary/5"
                        style={{ left, width }}
                      />
                    )}
                    <SceneClip
                      scene={scene}
                      index={index}
                      left={
                        isDragged && drag?.type === "reorder"
                          ? sceneStarts[drag.fromIndex] * pixelsPerSecond + drag.offsetX
                          : left
                      }
                      width={width}
                      isSelected={scene.id === selectedSceneId}
                      isDragging={isDragged}
                      isUpdating={
                        updatingSceneId === null ||
                        (updatingSceneId !== undefined && updatingSceneId === scene.id)
                      }
                      disabled={disabled}
                      label={t("sceneLabel", { index: index + 1 })}
                      muteLabels={clipMuteLabels}
                      onToggleMute={() => toggleSceneMute(scene.id)}
                      onBodyPointerDown={(event) =>
                        startDrag(event, {
                          type: "reorder",
                          sceneId: scene.id,
                          fromIndex: index,
                          startX: event.clientX,
                          offsetX: 0,
                          targetIndex: index,
                          moved: false,
                        })
                      }
                      onEdgePointerDown={(event, edge) =>
                        startDrag(event, {
                          type: "trim-scene",
                          edge,
                          sceneId: scene.id,
                          startX: event.clientX,
                          initialDuration: scene.durationSec,
                          initialTrimStart: scene.trimStartSec ?? 0,
                        })
                      }
                      pointerHandlers={pointerHandlers}
                    />
                  </div>
                );
              })}
            </div>

            {/* Audio track */}
            <div
              className={cn(
                "relative transition-colors",
                dropTarget?.track === "audio" && "bg-emerald-500/5"
              )}
              style={{ height: audioTrackHeight }}
              onPointerDown={() => setSelectedAudioId(null)}
            >
              {dropTarget?.track === "audio" && dropIndicatorX !== null && (
                <DropIndicator x={dropIndicatorX} label={t("dropToAddAudio")} tone="audio" />
              )}
              {importingTrack === "audio" && <ImportingOverlay label={t("addingMedia")} />}
              {audioClips.length === 0 && (
                <button
                  type="button"
                  disabled={disabled || importingTrack !== null}
                  className="sticky left-0 flex h-full items-center gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("audioEmpty")}
                </button>
              )}
              {audioClips.map((clip) => (
                <AudioClip
                  key={clip.id}
                  clip={clip}
                  pixelsPerSecond={pixelsPerSecond}
                  isSelected={clip.id === selectedAudioId}
                  isTrackMuted={Boolean(project.isAudioMuted)}
                  disabled={disabled}
                  muteLabels={clipMuteLabels}
                  onToggleMute={() => toggleAudioClipMute(clip.id)}
                  onBodyPointerDown={(event) =>
                    startDrag(event, {
                      type: "move-audio",
                      clipId: clip.id,
                      startX: event.clientX,
                      initialStart: clip.startSec,
                      moved: false,
                    })
                  }
                  onEdgePointerDown={(event, edge) =>
                    startDrag(event, {
                      type: "trim-audio",
                      edge,
                      clipId: clip.id,
                      startX: event.clientX,
                      initialStart: clip.startSec,
                      initialDuration: clip.durationSec,
                      initialTrimStart: clip.trimStartSec,
                    })
                  }
                  pointerHandlers={pointerHandlers}
                />
              ))}
            </div>

            {/* End of video marker + playhead */}
            <div
              className="pointer-events-none absolute bottom-0 top-6 w-px bg-foreground/20"
              style={{ left: totalDuration * pixelsPerSecond }}
            />
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-30 w-0.5 -translate-x-1/2 bg-red-500"
              style={{ left: playheadX }}
            >
              <span className="absolute -top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-red-500" />
            </div>
          </div>
        </div>

        {/* Divider between the video and audio tracks: drag to share the height */}
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={t("resizeTracks")}
          aria-valuemin={MIN_VIDEO_TRACK_HEIGHT}
          aria-valuemax={maxVideoTrackHeight}
          aria-valuenow={videoTrackHeight}
          tabIndex={0}
          title={t("resizeTracksHint")}
          className="group absolute inset-x-0 z-40 flex h-2 -translate-y-1/2 cursor-row-resize touch-none items-center focus-visible:outline-none"
          style={{ top: RULER_HEIGHT + videoTrackHeight }}
          {...trackDividerHandlers}
        >
          <span className="h-0.5 w-full bg-transparent transition-colors group-hover:bg-primary/60 group-active:bg-primary group-focus-visible:bg-primary" />
        </div>
      </div>

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAddAudio}
      />
    </div>
  );
}

const getShortcutLabels = () => {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return isMac
    ? { undo: "⌘Z", redo: "⇧⌘Z" }
    : { undo: "Ctrl+Z", redo: "Ctrl+Y" };
};

// Where a dragged file will land, with a hint of what dropping does.
function DropIndicator({
  x,
  label,
  tone = "video",
}: {
  x: number;
  label: string;
  tone?: "video" | "audio";
}) {
  return (
    <div className="pointer-events-none absolute inset-y-0 z-20" style={{ left: x }}>
      <span
        className={cn(
          "absolute inset-y-0.5 w-1 -translate-x-1/2 rounded-full",
          tone === "audio" ? "bg-emerald-500" : "bg-primary"
        )}
      />
      <span
        className={cn(
          "absolute left-1.5 top-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold text-white shadow",
          tone === "audio" ? "bg-emerald-600" : "bg-primary"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function ImportingOverlay({ label }: { label: string }) {
  return (
    <div className="pointer-events-none sticky left-0 z-20 flex h-full w-fit items-center gap-1.5 bg-card/80 px-3 text-xs font-medium text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {label}
    </div>
  );
}

type ClipMuteLabels = { mute: string; unmute: string };

function TrackMuteButton({
  isMuted,
  muteLabel,
  unmuteLabel,
  onToggle,
}: {
  isMuted: boolean;
  muteLabel: string;
  unmuteLabel: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-background-secondary hover:text-foreground",
        isMuted ? "text-red-500" : "text-muted-foreground"
      )}
      onClick={onToggle}
      title={isMuted ? unmuteLabel : muteLabel}
      aria-label={isMuted ? unmuteLabel : muteLabel}
      aria-pressed={isMuted}
    >
      {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}

// Small toggle on a clip. Shown on hover / selection, and always while muted
// so a silenced clip stands out.
function ClipMuteButton({
  isMuted,
  disabled,
  labels,
  onToggle,
}: {
  isMuted: boolean;
  disabled: boolean;
  labels: ClipMuteLabels;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "relative z-[11] flex h-5 w-5 shrink-0 items-center justify-center rounded bg-black/40 text-white transition-opacity hover:bg-black/60 disabled:pointer-events-none",
        !isMuted &&
          "opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 focus-visible:opacity-100"
      )}
      // Keep the clip from starting a drag.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      title={isMuted ? labels.unmute : labels.mute}
      aria-label={isMuted ? labels.unmute : labels.mute}
      aria-pressed={isMuted}
    >
      {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
    </button>
  );
}

type PointerHandlers = {
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
};

function TrimHandle({
  edge,
  disabled,
  onPointerDown,
}: {
  edge: "start" | "end";
  disabled: boolean;
  // Move/up events bubble to the clip, which owns the drag handlers.
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
}) {
  return (
    <span
      className={cn(
        "absolute inset-y-0 z-10 flex w-2.5 touch-none items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100 group-data-[selected=true]:opacity-100",
        edge === "start" ? "left-0 rounded-l-md" : "right-0 rounded-r-md",
        disabled ? "pointer-events-none" : "cursor-ew-resize"
      )}
      onPointerDown={onPointerDown}
    >
      <span className="h-4 w-0.5 rounded-full bg-white/90" />
    </span>
  );
}

function SceneClip({
  scene,
  index,
  left,
  width,
  isSelected,
  isDragging,
  isUpdating,
  disabled,
  label,
  muteLabels,
  onToggleMute,
  onBodyPointerDown,
  onEdgePointerDown,
  pointerHandlers,
}: {
  scene: VideoScene;
  index: number;
  left: number;
  width: number;
  isSelected: boolean;
  isDragging: boolean;
  isUpdating: boolean;
  disabled: boolean;
  label: string;
  muteLabels: ClipMuteLabels;
  onToggleMute: () => void;
  onBodyPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onEdgePointerDown: (event: React.PointerEvent<HTMLElement>, edge: "start" | "end") => void;
  pointerHandlers: PointerHandlers;
}) {
  const t = useTranslations("videoGenerator");
  const showText = width >= 56;
  const durationLabel = t("clipDuration", { value: scene.durationSec });

  return (
    <div
      data-selected={isSelected}
      className={cn(
        "group absolute inset-y-1 select-none overflow-hidden rounded-md border-2 bg-gradient-to-br text-white shadow-sm",
        getSceneGradient(index),
        isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent",
        isDragging ? "z-20 cursor-grabbing opacity-90 shadow-lg" : "transition-[left] duration-150",
        disabled ? "cursor-not-allowed opacity-70" : !isDragging && "cursor-grab"
      )}
      style={{
        left,
        width: Math.max(width, 6),
        backgroundImage: scene.thumbnailUrl ? `url("${scene.thumbnailUrl}")` : undefined,
        backgroundSize: "auto 100%",
        backgroundRepeat: "repeat-x",
      }}
      title={`${label} · ${scene.title} · ${durationLabel}`}
      onPointerDown={onBodyPointerDown}
      {...pointerHandlers}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      {showText && (
        <div className="relative flex h-full flex-col justify-between px-2 py-1">
          <div className="flex items-center gap-1 text-[11px] font-semibold leading-tight">
            {scene.source === "upload" && <Film className="h-3 w-3 shrink-0" />}
            <span className="truncate">{index + 1}. {scene.title}</span>
            {isUpdating ? (
              <Loader2 className="ml-auto h-3 w-3 shrink-0 animate-spin" />
            ) : isSelected ? (
              <Pencil className="ml-auto h-3 w-3 shrink-0" />
            ) : scene.version > 1 ? (
              <span className="ml-auto shrink-0 rounded bg-white/25 px-1 text-[9px]">
                v{scene.version}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] tabular-nums text-white/85">
              {durationLabel}
            </span>
            {/* Only clips with footage have sound of their own to mute. */}
            {(scene.videoUrl || scene.isMuted) && (
              <ClipMuteButton
                isMuted={Boolean(scene.isMuted)}
                disabled={disabled}
                labels={muteLabels}
                onToggle={onToggleMute}
              />
            )}
          </div>
        </div>
      )}
      <TrimHandle
        edge="start"
        disabled={disabled}
        onPointerDown={(event) => onEdgePointerDown(event, "start")}
      />
      <TrimHandle
        edge="end"
        disabled={disabled}
        onPointerDown={(event) => onEdgePointerDown(event, "end")}
      />
    </div>
  );
}

function AudioClip({
  clip,
  pixelsPerSecond,
  isSelected,
  isTrackMuted,
  disabled,
  muteLabels,
  onToggleMute,
  onBodyPointerDown,
  onEdgePointerDown,
  pointerHandlers,
}: {
  clip: VideoAudioClip;
  pixelsPerSecond: number;
  isSelected: boolean;
  isTrackMuted: boolean;
  disabled: boolean;
  muteLabels: ClipMuteLabels;
  onToggleMute: () => void;
  onBodyPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onEdgePointerDown: (event: React.PointerEvent<HTMLElement>, edge: "start" | "end") => void;
  pointerHandlers: PointerHandlers;
}) {
  const t = useTranslations("videoGenerator");
  const width = clip.durationSec * pixelsPerSecond;

  return (
    <div
      data-selected={isSelected}
      className={cn(
        "group absolute inset-y-1 select-none overflow-hidden rounded-md border-2 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        isSelected ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-emerald-500/40",
        (isTrackMuted || clip.isMuted) && "opacity-50",
        disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
      )}
      style={{ left: clip.startSec * pixelsPerSecond, width: Math.max(width, 6) }}
      title={`${clip.name} · ${t("clipDuration", { value: clip.durationSec })}`}
      onPointerDown={onBodyPointerDown}
      {...pointerHandlers}
    >
      <Waveform clip={clip} />
      {width >= 56 && (
        <span className="relative flex items-center gap-1 px-2 pt-0.5 text-[10px] font-semibold">
          <Music className="h-3 w-3 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{clip.name}</span>
          <ClipMuteButton
            isMuted={Boolean(clip.isMuted)}
            disabled={disabled}
            labels={muteLabels}
            onToggle={onToggleMute}
          />
        </span>
      )}
      <TrimHandle
        edge="start"
        disabled={disabled}
        onPointerDown={(event) => onEdgePointerDown(event, "start")}
      />
      <TrimHandle
        edge="end"
        disabled={disabled}
        onPointerDown={(event) => onEdgePointerDown(event, "end")}
      />
    </div>
  );
}

// Peaks for the trimmed part of the source only.
function Waveform({ clip }: { clip: VideoAudioClip }) {
  const peaks = clip.waveform;
  if (!peaks?.length || clip.sourceDurationSec <= 0) return null;
  const peaksPerSecond = peaks.length / clip.sourceDurationSec;
  const startIndex = Math.floor(clip.trimStartSec * peaksPerSecond);
  const endIndex = Math.ceil((clip.trimStartSec + clip.durationSec) * peaksPerSecond);
  const visiblePeaks = peaks.slice(startIndex, Math.max(startIndex + 1, endIndex));

  return (
    <svg
      className="absolute inset-x-0 bottom-0 h-3/4 w-full text-emerald-600/70 dark:text-emerald-300/70"
      viewBox={`0 0 ${visiblePeaks.length} 2`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {visiblePeaks.map((peak, index) => {
        const height = Math.max(peak, 0.04) * 1.8;
        return (
          <rect
            key={index}
            x={index + 0.15}
            width={0.7}
            y={1 - height / 2}
            height={height}
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}
