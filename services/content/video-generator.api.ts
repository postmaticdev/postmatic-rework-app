import { useMutation } from "@tanstack/react-query";
import {
  DownloadVideoPld,
  EditVideoPld,
  GenerateVideoPld,
  ScheduleVideoPld,
  VideoProject,
  VideoScene,
} from "@/models/api/content/video.type";
import { getToastLocale } from "@/helper/api-response-message";

/*
  AI Video Generator

  The backend endpoints are still being built, so this service resolves mock
  projects locally. Replace the bodies of `videoGeneratorService` with the real
  API calls (e.g. api.post<BaseResponse<VideoProject>>(...)); the hooks and the
  page only depend on the VideoProject shape and the optional progress callback.
*/

type ProgressCallback = (progress: number) => void;

// Storyboard beats used by the mock, picked in order based on the duration.
// The mock "generates" them in the active app language.
const MOCK_SCENE_BEATS_BY_LOCALE = {
  en: [
    { title: "Hook", caption: "Stop scrolling — this is for you" },
    { title: "Problem", caption: "Sound familiar?" },
    { title: "Product intro", caption: "Meet the solution" },
    { title: "Key feature", caption: "Made to fit your day" },
    { title: "Benefit", caption: "Feel the difference" },
    { title: "Social proof", caption: "Loved by our customers" },
    { title: "Offer", caption: "Limited-time offer" },
    { title: "Call to action", caption: "Order now" },
  ],
  id: [
    { title: "Pembuka", caption: "Berhenti scroll — ini untuk Anda" },
    { title: "Masalah", caption: "Terdengar familier?" },
    { title: "Perkenalan produk", caption: "Inilah solusinya" },
    { title: "Fitur utama", caption: "Dibuat untuk keseharian Anda" },
    { title: "Manfaat", caption: "Rasakan bedanya" },
    { title: "Bukti sosial", caption: "Disukai pelanggan kami" },
    { title: "Penawaran", caption: "Penawaran terbatas" },
    { title: "Ajakan bertindak", caption: "Pesan sekarang" },
  ],
};

const MOCK_SCENE_COUNT_BY_DURATION: Record<number, number> = {
  15: 4,
  30: 6,
  60: 8,
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Simulates a long-running render job that reports progress.
const simulateJob = async (durationMs: number, onProgress?: ProgressCallback) => {
  const steps = 20;
  for (let step = 1; step <= steps; step += 1) {
    await new Promise((resolve) => setTimeout(resolve, durationMs / steps));
    onProgress?.(Math.round((step / steps) * 100));
  }
};

const buildMockScenes = (payload: GenerateVideoPld): VideoScene[] => {
  const sceneCount = MOCK_SCENE_COUNT_BY_DURATION[payload.durationSec] ?? 6;
  const baseDuration = Math.floor((payload.durationSec / sceneCount) * 10) / 10;

  return MOCK_SCENE_BEATS_BY_LOCALE[getToastLocale()].slice(0, sceneCount).map((beat, index) => {
    const isLast = index === sceneCount - 1;
    // Give the remainder to the last scene so the total matches exactly.
    const durationSec = isLast
      ? Math.round((payload.durationSec - baseDuration * (sceneCount - 1)) * 10) / 10
      : baseDuration;

    return {
      id: createId(),
      title: beat.title,
      prompt: `${beat.title}: ${payload.prompt}`,
      durationSec,
      caption: beat.caption,
      thumbnailUrl: payload.referenceImages.length
        ? payload.referenceImages[index % payload.referenceImages.length]
        : null,
      videoUrl: null,
      version: 1,
      source: "ai" as const,
    };
  });
};

const videoGeneratorService = {
  generate: async (
    payload: GenerateVideoPld,
    onProgress?: ProgressCallback
  ): Promise<VideoProject> => {
    await simulateJob(6000, onProgress);
    const title = payload.prompt.trim().split("\n")[0].slice(0, 60);

    return {
      id: createId(),
      title,
      ratio: payload.ratio,
      scenes: buildMockScenes(payload),
      audioClips: [],
      videoUrl: null,
      createdAt: new Date().toISOString(),
    };
  },

  edit: async (
    project: VideoProject,
    payload: EditVideoPld,
    onProgress?: ProgressCallback
  ): Promise<VideoProject> => {
    await simulateJob(payload.sceneId ? 3500 : 6000, onProgress);

    const scenes = project.scenes.map((scene, index) => {
      if (payload.sceneId && scene.id !== payload.sceneId) return scene;
      const newImage = payload.referenceImages[index % (payload.referenceImages.length || 1)];

      return {
        ...scene,
        prompt: payload.prompt,
        caption: payload.sceneId ? payload.prompt.slice(0, 48) : scene.caption,
        // Uploaded clips keep their footage; only AI scenes take new images.
        thumbnailUrl:
          scene.source === "upload" ? scene.thumbnailUrl : newImage || scene.thumbnailUrl,
        version: scene.version + 1,
      };
    });

    return { ...project, scenes };
  },

  // Uploads a video or audio file for the timeline and returns its URL. The
  // mock keeps the file in the browser (object URL) until the endpoint exists.
  uploadMedia: async (file: File): Promise<string> => {
    return URL.createObjectURL(file);
  },

  schedule: async (payload: ScheduleVideoPld): Promise<{ id: string }> => {
    void payload;
    await simulateJob(1200);
    return { id: createId() };
  },

  // Resolves the file to download; the backend picks the watermarked render
  // when withWatermark is set. The mock has no rendered file yet, so null.
  getDownloadUrl: async (
    project: VideoProject,
    payload: DownloadVideoPld
  ): Promise<string | null> => {
    void payload;
    await simulateJob(800);
    return project.videoUrl ?? null;
  },
};

export const useVideoGenerate = () => {
  return useMutation({
    mutationFn: ({
      payload,
      onProgress,
    }: {
      payload: GenerateVideoPld;
      onProgress?: ProgressCallback;
    }) => videoGeneratorService.generate(payload, onProgress),
  });
};

export const useVideoMediaUpload = () => {
  return useMutation({
    mutationFn: (file: File) => videoGeneratorService.uploadMedia(file),
  });
};

export const useVideoSchedule = () => {
  return useMutation({
    mutationFn: (payload: ScheduleVideoPld) => videoGeneratorService.schedule(payload),
  });
};

export const useVideoDownloadUrl = () => {
  return useMutation({
    mutationFn: ({
      project,
      payload,
    }: {
      project: VideoProject;
      payload: DownloadVideoPld;
    }) => videoGeneratorService.getDownloadUrl(project, payload),
  });
};

export const useVideoEdit = () => {
  return useMutation({
    mutationFn: ({
      project,
      payload,
      onProgress,
    }: {
      project: VideoProject;
      payload: EditVideoPld;
      onProgress?: ProgressCallback;
    }) => videoGeneratorService.edit(project, payload, onProgress),
  });
};
