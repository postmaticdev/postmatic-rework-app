"use client";

import { useCallback, useRef, useState } from "react";
import {
  VideoDuration,
  VideoProject,
  VideoRatio,
  VideoScene,
} from "@/models/api/content/video.type";
import {
  useVideoEdit,
  useVideoGenerate,
} from "@/services/content/video-generator.api";

export type VideoRequest = {
  prompt: string;
  images: string[];
  // null edits the whole video; ignored for the first generation.
  sceneId: string | null;
};

// A video the user attached in the chat, already uploaded and measured.
export type AttachedVideo = {
  name: string;
  url: string;
  durationSec: number;
  thumbnailUrl: string | null;
};

type SceneRef = { sceneId: string; sceneIndex: number; sceneTitle: string };

export type VideoChatMessage =
  | {
      id: string;
      role: "user";
      text: string;
      images: string[];
      // Kept whole so they can be dragged from the chat onto the timeline.
      videos: AttachedVideo[];
      scene: SceneRef | null;
    }
  | {
      id: string;
      role: "assistant";
      // "upload" = attached videos were added to the timeline as scenes.
      kind: "generate" | "edit" | "upload";
      status: "pending" | "done" | "error";
      progress: number;
      scene: SceneRef | null;
      sceneCount?: number;
      request: VideoRequest;
    };

// Translation key for the stage a first generation is in, by progress.
export const getGenerateStepKey = (progress: number) =>
  progress < 35 ? "stepStoryboard" : progress < 75 ? "stepScenes" : "stepRender";

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const MAX_HISTORY = 50;

export const toUploadedScene = (video: AttachedVideo): VideoScene => ({
  id: createId(),
  title: video.name,
  prompt: "",
  durationSec: Math.round(video.durationSec * 10) / 10,
  videoUrl: video.url,
  thumbnailUrl: video.thumbnailUrl,
  caption: null,
  version: 1,
  source: "upload",
  sourceDurationSec: video.durationSec,
  trimStartSec: 0,
});

export function useVideoGenerator({
  businessId,
  scheduleDate,
}: {
  businessId: string;
  scheduleDate: string | null;
}) {
  const mGenerate = useVideoGenerate();
  const mEdit = useVideoEdit();
  const [project, setProjectState] = useState<VideoProject | null>(null);
  const [messages, setMessages] = useState<VideoChatMessage[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [ratio, setRatio] = useState<VideoRatio>("9:16");
  const [duration, setDuration] = useState<VideoDuration>(30);
  const [isBusy, setIsBusy] = useState(false);
  // Read inside async handlers so they always see the latest project.
  const projectRef = useRef<VideoProject | null>(null);

  // Undo / redo stacks of whole-project snapshots. Kept in a ref so pushes are
  // synchronous; historyVersion re-renders the undo / redo buttons.
  const historyRef = useRef<{ past: VideoProject[]; future: VideoProject[] }>({
    past: [],
    future: [],
  });
  const [, setHistoryVersion] = useState(0);
  // Project as it was when a drag started; the whole drag is one undo step.
  const gestureStartRef = useRef<VideoProject | null>(null);

  const setProject = useCallback((nextProject: VideoProject | null) => {
    projectRef.current = nextProject;
    setProjectState(nextProject);
    // A removed scene can't stay selected.
    setSelectedSceneId((selectedId) =>
      selectedId && nextProject?.scenes.some((scene) => scene.id === selectedId)
        ? selectedId
        : null
    );
  }, []);

  const pushHistory = useCallback((snapshot: VideoProject) => {
    const { past } = historyRef.current;
    historyRef.current = { past: [...past, snapshot].slice(-MAX_HISTORY), future: [] };
    setHistoryVersion((version) => version + 1);
  }, []);

  // Every edit to an existing project is undoable, except the intermediate
  // steps of a drag (see beginHistoryGesture).
  const updateProject = useCallback(
    (updater: (current: VideoProject) => VideoProject) => {
      const currentProject = projectRef.current;
      if (!currentProject) return;
      const nextProject = updater(currentProject);
      if (nextProject === currentProject) return;
      if (!gestureStartRef.current) pushHistory(currentProject);
      setProject(nextProject);
    },
    [pushHistory, setProject]
  );

  // Dropped / dragged-in videos become scenes at `index` (default: the end).
  // Without a project yet, they start one.
  const insertVideoScenes = useCallback(
    (videos: AttachedVideo[], index?: number) => {
      if (!videos.length) return;
      const uploadedScenes = videos.map(toUploadedScene);
      if (!projectRef.current) {
        setProject({
          id: createId(),
          title: videos[0].name,
          ratio,
          scenes: uploadedScenes,
          audioClips: [],
          videoUrl: null,
          createdAt: new Date().toISOString(),
        });
        return;
      }
      updateProject((current) => {
        const scenes = [...current.scenes];
        scenes.splice(index ?? scenes.length, 0, ...uploadedScenes);
        return { ...current, scenes };
      });
    },
    [ratio, setProject, updateProject]
  );

  const beginHistoryGesture = useCallback(() => {
    gestureStartRef.current = projectRef.current;
  }, []);

  const endHistoryGesture = useCallback(() => {
    const startProject = gestureStartRef.current;
    gestureStartRef.current = null;
    if (startProject && startProject !== projectRef.current) pushHistory(startProject);
  }, [pushHistory]);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    const currentProject = projectRef.current;
    if (isBusy || !past.length || !currentProject) return;
    historyRef.current = {
      past: past.slice(0, -1),
      future: [currentProject, ...future].slice(0, MAX_HISTORY),
    };
    setHistoryVersion((version) => version + 1);
    setProject(past[past.length - 1]);
  }, [isBusy, setProject]);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    const currentProject = projectRef.current;
    if (isBusy || !future.length || !currentProject) return;
    historyRef.current = {
      past: [...past, currentProject].slice(-MAX_HISTORY),
      future: future.slice(1),
    };
    setHistoryVersion((version) => version + 1);
    setProject(future[0]);
  }, [isBusy, setProject]);

  const updateAssistantMessage = (
    messageId: string,
    patch: Partial<Extract<VideoChatMessage, { role: "assistant" }>>
  ) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.role === "assistant"
          ? { ...message, ...patch }
          : message
      )
    );
  };

  const runRequest = useCallback(
    async (request: VideoRequest, assistantMessageId: string) => {
      const currentProject = projectRef.current;
      const onProgress = (progress: number) => {
        // Keep the bar short of 100 until the result is actually in.
        updateAssistantMessage(assistantMessageId, {
          progress: Math.min(progress, 95),
        });
      };

      setIsBusy(true);
      try {
        const nextProject = currentProject
          ? await mEdit.mutateAsync({
              project: currentProject,
              payload: {
                businessId,
                projectId: currentProject.id,
                sceneId: request.sceneId,
                prompt: request.prompt,
                referenceImages: request.images,
              },
              onProgress,
            })
          : await mGenerate.mutateAsync({
              payload: {
                businessId,
                prompt: request.prompt,
                ratio,
                durationSec: duration,
                referenceImages: request.images,
                scheduleDate,
              },
              onProgress,
            });

        // An AI edit can be undone; there is nothing before the first video.
        if (currentProject) pushHistory(currentProject);
        setProject(nextProject);
        updateAssistantMessage(assistantMessageId, {
          status: "done",
          progress: 100,
          sceneCount: nextProject.scenes.length,
        });
      } catch {
        updateAssistantMessage(assistantMessageId, { status: "error" });
      } finally {
        setIsBusy(false);
      }
    },
    [businessId, duration, mEdit, mGenerate, pushHistory, ratio, scheduleDate, setProject]
  );

  // Attached videos go straight onto the timeline as scenes; a prompt sent
  // with them is then applied as an edit. A prompt alone generates (first
  // time) or edits the video / the selected scene.
  const submitPrompt = useCallback(
    (prompt: string, images: string[], videos: AttachedVideo[] = []) => {
      const trimmedPrompt = prompt.trim();
      if ((!trimmedPrompt && videos.length === 0) || isBusy) return;

      const nextMessages: VideoChatMessage[] = [];
      let currentProject = projectRef.current;

      if (videos.length > 0) {
        const uploadedScenes = videos.map(toUploadedScene);
        currentProject = currentProject
          ? { ...currentProject, scenes: [...currentProject.scenes, ...uploadedScenes] }
          : {
              id: createId(),
              title: trimmedPrompt.split("\n")[0].slice(0, 60) || videos[0].name,
              ratio,
              scenes: uploadedScenes,
              audioClips: [],
              videoUrl: null,
              createdAt: new Date().toISOString(),
            };
        if (projectRef.current) pushHistory(projectRef.current);
        setProject(currentProject);
      }

      const sceneIndex = currentProject
        ? currentProject.scenes.findIndex((scene) => scene.id === selectedSceneId)
        : -1;
      const scene: SceneRef | null =
        currentProject && sceneIndex >= 0
          ? {
              sceneId: currentProject.scenes[sceneIndex].id,
              sceneIndex,
              sceneTitle: currentProject.scenes[sceneIndex].title,
            }
          : null;
      const request: VideoRequest = {
        prompt: trimmedPrompt,
        images,
        sceneId: scene?.sceneId ?? null,
      };

      nextMessages.push({
        id: createId(),
        role: "user",
        text: trimmedPrompt,
        images,
        videos,
        scene: videos.length ? null : scene,
      });
      if (videos.length > 0) {
        nextMessages.push({
          id: createId(),
          role: "assistant",
          kind: "upload",
          status: "done",
          progress: 100,
          scene: null,
          sceneCount: videos.length,
          request,
        });
      }

      const assistantMessageId = createId();
      if (trimmedPrompt) {
        nextMessages.push({
          id: assistantMessageId,
          role: "assistant",
          kind: currentProject ? "edit" : "generate",
          status: "pending",
          progress: 0,
          scene,
          request,
        });
      }

      setMessages((current) => [...current, ...nextMessages]);
      if (trimmedPrompt) void runRequest(request, assistantMessageId);
    },
    [isBusy, pushHistory, ratio, runRequest, selectedSceneId, setProject]
  );

  const retry = useCallback(
    (messageId: string) => {
      const message = messages.find((item) => item.id === messageId);
      if (!message || message.role !== "assistant" || isBusy) return;
      updateAssistantMessage(messageId, { status: "pending", progress: 0 });
      void runRequest(message.request, messageId);
    },
    [isBusy, messages, runRequest]
  );

  return {
    project,
    updateProject,
    insertVideoScenes,
    beginHistoryGesture,
    endHistoryGesture,
    undo,
    redo,
    canUndo: !isBusy && historyRef.current.past.length > 0,
    canRedo: !isBusy && historyRef.current.future.length > 0,
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
  };
}

export type VideoGeneratorState = ReturnType<typeof useVideoGenerator>;
