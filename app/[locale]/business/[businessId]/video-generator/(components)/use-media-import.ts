"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { showToast } from "@/helper/show-toast";
import { VideoAudioClip } from "@/models/api/content/video.type";
import { useVideoMediaUpload } from "@/services/content/video-generator.api";
import {
  getFileBaseName,
  isFileTooLarge,
  MAX_AUDIO_UPLOAD_MB,
  MAX_VIDEO_UPLOAD_MB,
  readAudioMeta,
  readVideoMeta,
} from "./media-utils";
import type { AttachedVideo } from "./use-video-generator";

// Drag type for videos dragged from the chat thread onto the timeline.
export const VIDEO_DRAG_TYPE = "application/x-postmatic-video";

export type ImportedAudio = Pick<
  VideoAudioClip,
  "name" | "url" | "sourceDurationSec" | "waveform"
>;

// Validates, measures and uploads media for the timeline. Errors are shown as
// toasts; failed files are skipped.
export function useMediaImport() {
  const t = useTranslations("videoGenerator");
  const mUploadMedia = useVideoMediaUpload();
  const { mutateAsync: uploadMedia } = mUploadMedia;

  const importVideos = useCallback(
    async (files: File[]): Promise<AttachedVideo[]> => {
      const videoFiles = files.filter((file) => file.type.startsWith("video/"));
      if (videoFiles.length < files.length) showToast("error", t("unsupportedFile"));
      if (videoFiles.some((file) => isFileTooLarge(file, MAX_VIDEO_UPLOAD_MB))) {
        showToast("error", t("videoTooLarge", { max: MAX_VIDEO_UPLOAD_MB }));
        return [];
      }

      try {
        return await Promise.all(
          videoFiles.map(async (file) => {
            const meta = await readVideoMeta(file);
            const url = await uploadMedia(file);
            return { name: getFileBaseName(file), url, ...meta };
          })
        );
      } catch (error) {
        showToast(
          "error",
          error instanceof Error && error.message === "INVALID_VIDEO"
            ? t("invalidVideo")
            : error
        );
        return [];
      }
    },
    [t, uploadMedia]
  );

  const importAudio = useCallback(
    async (file: File): Promise<ImportedAudio | null> => {
      if (!file.type.startsWith("audio/")) {
        showToast("error", t("unsupportedFile"));
        return null;
      }
      if (isFileTooLarge(file, MAX_AUDIO_UPLOAD_MB)) {
        showToast("error", t("audioTooLarge", { max: MAX_AUDIO_UPLOAD_MB }));
        return null;
      }

      try {
        const meta = await readAudioMeta(file);
        const url = await uploadMedia(file);
        return {
          name: getFileBaseName(file),
          url,
          sourceDurationSec: meta.durationSec,
          waveform: meta.waveform,
        };
      } catch {
        showToast("error", t("invalidAudio"));
        return null;
      }
    },
    [t, uploadMedia]
  );

  return { importVideos, importAudio };
}

// What a drag carries, as far as the browser lets us know before the drop.
// Some browsers hide file types until drop, hence "file".
export const getDragKind = (
  dataTransfer: DataTransfer
): "video" | "audio" | "file" | null => {
  if (dataTransfer.types.includes(VIDEO_DRAG_TYPE)) return "video";
  if (!dataTransfer.types.includes("Files")) return null;
  const fileTypes = Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.type);
  if (fileTypes.some((type) => type.startsWith("video/"))) return "video";
  if (fileTypes.some((type) => type.startsWith("audio/"))) return "audio";
  return "file";
};

// Videos dragged from the chat carry their metadata; nothing to upload again.
export const readDraggedVideo = (dataTransfer: DataTransfer): AttachedVideo | null => {
  try {
    const raw = dataTransfer.getData(VIDEO_DRAG_TYPE);
    return raw ? (JSON.parse(raw) as AttachedVideo) : null;
  } catch {
    return null;
  }
};
