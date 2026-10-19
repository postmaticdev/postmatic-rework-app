import { useMutation } from "@tanstack/react-query";
import {
  DownloadVideoPld,
  EditVideoPld,
  GenerateVideoPld,
  RenderVideoPld,
  ReviseStoryboardPld,
  ScheduleVideoPld,
  StoryboardScene,
  VideoProject,
  VideoStoryboard,
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

const buildMockStoryboardScenes = (payload: GenerateVideoPld): StoryboardScene[] => {
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
      description: `${beat.title}: ${payload.prompt}`,
      caption: beat.caption,
      durationSec,
    };
  });
};

const MOCK_PANEL_COLORS = ["#2563eb", "#7c3aed", "#ea580c", "#0d9488", "#db2777", "#4f46e5"];

const escapeSvgText = (text: string) =>
  text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

// Draws the storyboard sheet the backend will return as an image: one panel
// per scene in the video's ratio, with its title and caption.
const buildMockStoryboardImage = (
  scenes: StoryboardScene[],
  ratio: VideoStoryboard["ratio"]
) => {
  const [ratioWidth, ratioHeight] = ratio.split(":").map(Number);
  const columns = scenes.length <= 4 ? 2 : scenes.length <= 6 ? 3 : 4;
  const rows = Math.ceil(scenes.length / columns);
  const gap = 24;
  const panelWidth = 320;
  const frameHeight = Math.round((panelWidth * ratioHeight) / ratioWidth);
  const panelHeight = frameHeight + 72;
  const width = columns * panelWidth + (columns + 1) * gap;
  const height = rows * panelHeight + (rows + 1) * gap;
  const sceneWord = getToastLocale() === "id" ? "Adegan" : "Scene";

  const panels = scenes
    .map((scene, index) => {
      const x = gap + (index % columns) * (panelWidth + gap);
      const y = gap + Math.floor(index / columns) * (panelHeight + gap);
      const color = MOCK_PANEL_COLORS[index % MOCK_PANEL_COLORS.length];
      return `
        <g transform="translate(${x} ${y})">
          <rect width="${panelWidth}" height="${frameHeight}" rx="14" fill="${color}" />
          <rect width="${panelWidth}" height="${frameHeight}" rx="14" fill="url(#shade)" />
          <rect x="14" y="14" width="96" height="28" rx="14" fill="rgba(0,0,0,0.35)" />
          <text x="62" y="33" text-anchor="middle" font-size="14" font-weight="600" fill="#fff">${sceneWord} ${index + 1}</text>
          <text x="${panelWidth / 2}" y="${frameHeight - 28}" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">${escapeSvgText(truncate(scene.caption ?? "", 30))}</text>
          <text x="2" y="${frameHeight + 30}" font-size="17" font-weight="700" fill="#111827">${escapeSvgText(truncate(scene.title, 28))} · ${scene.durationSec}s</text>
          <text x="2" y="${frameHeight + 56}" font-size="14" fill="#6b7280">${escapeSvgText(truncate(scene.description, 40))}</text>
        </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Inter, Arial, sans-serif">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.45" stop-color="#000" stop-opacity="0" />
        <stop offset="1" stop-color="#000" stop-opacity="0.55" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="#ffffff" />
    ${panels}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const videoGeneratorService = {
  // Plans the video as a storyboard image; nothing is rendered until the
  // storyboard is approved.
  generateStoryboard: async (
    payload: GenerateVideoPld,
    onProgress?: ProgressCallback
  ): Promise<VideoStoryboard> => {
    await simulateJob(3000, onProgress);
    const scenes = buildMockStoryboardScenes(payload);

    return {
      id: createId(),
      title: payload.prompt.trim().split("\n")[0].slice(0, 60),
      ratio: payload.ratio,
      imageUrl: buildMockStoryboardImage(scenes, payload.ratio),
      scenes,
    };
  },

  // Redraws the storyboard image with the requested changes.
  reviseStoryboard: async (
    storyboard: VideoStoryboard,
    payload: ReviseStoryboardPld,
    onProgress?: ProgressCallback
  ): Promise<VideoStoryboard> => {
    await simulateJob(2500, onProgress);
    const scenes = storyboard.scenes.map((scene) => ({
      ...scene,
      description: `${scene.title}: ${payload.prompt}`,
    }));

    return {
      ...storyboard,
      imageUrl: buildMockStoryboardImage(scenes, storyboard.ratio),
      scenes,
    };
  },

  render: async (
    payload: RenderVideoPld,
    onProgress?: ProgressCallback
  ): Promise<VideoProject> => {
    await simulateJob(6000, onProgress);
    const { storyboard, referenceImages } = payload;

    return {
      id: createId(),
      title: storyboard.title,
      ratio: storyboard.ratio,
      scenes: storyboard.scenes.map((scene, index) => ({
        id: scene.id,
        title: scene.title,
        prompt: scene.description,
        durationSec: scene.durationSec,
        caption: scene.caption,
        thumbnailUrl: referenceImages.length
          ? referenceImages[index % referenceImages.length]
          : null,
        videoUrl: null,
        version: 1,
        source: "ai" as const,
      })),
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

export const useVideoStoryboardGenerate = () => {
  return useMutation({
    mutationFn: ({
      payload,
      onProgress,
    }: {
      payload: GenerateVideoPld;
      onProgress?: ProgressCallback;
    }) => videoGeneratorService.generateStoryboard(payload, onProgress),
  });
};

export const useVideoStoryboardRevise = () => {
  return useMutation({
    mutationFn: ({
      storyboard,
      payload,
      onProgress,
    }: {
      storyboard: VideoStoryboard;
      payload: ReviseStoryboardPld;
      onProgress?: ProgressCallback;
    }) => videoGeneratorService.reviseStoryboard(storyboard, payload, onProgress),
  });
};

export const useVideoRender = () => {
  return useMutation({
    mutationFn: ({
      payload,
      onProgress,
    }: {
      payload: RenderVideoPld;
      onProgress?: ProgressCallback;
    }) => videoGeneratorService.render(payload, onProgress),
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
