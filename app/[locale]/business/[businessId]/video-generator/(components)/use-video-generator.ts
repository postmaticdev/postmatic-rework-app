"use client";

import { useCallback, useRef, useState } from "react";
import {
  VideoDuration,
  VideoProject,
  VideoRatio,
  VideoScene,
  VideoStoryboard,
} from "@/models/api/content/video.type";
import {
  useVideoEdit,
  useVideoRender,
  useVideoStoryboardGenerate,
  useVideoStoryboardRevise,
} from "@/services/content/video-generator.api";
import { SelectedAvatarOption } from "@/contexts/content-generate-context";

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

// Picked before the chat opens: the product is required, the avatar and the
// style reference are optional.
export type VideoSetup = {
  product: { id: string; name: string; imageUrl: string | null };
  avatar: SelectedAvatarOption | null;
  reference: { imageUrl: string; name: string | null } | null;
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
      // "storyboard" = the plan was drafted (or revised, see isRevision);
      // "generate" = the approved storyboard was rendered into the video;
      // "upload" = attached videos were added to the timeline as scenes.
      kind: "storyboard" | "generate" | "edit" | "upload";
      isRevision?: boolean;
      status: "pending" | "done" | "error";
      progress: number;
      scene: SceneRef | null;
      sceneCount?: number;
      request: VideoRequest;
    };

// Translation key for the stage a render is in, by progress.
export const getGenerateStepKey = (progress: number) =>
  progress < 50 ? "stepScenes" : "stepRender";

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
  const mStoryboard = useVideoStoryboardGenerate();
  const mReviseStoryboard = useVideoStoryboardRevise();
  const mRender = useVideoRender();
  const mEdit = useVideoEdit();
  const [project, setProjectState] = useState<VideoProject | null>(null);
  const [messages, setMessages] = useState<VideoChatMessage[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [ratio, setRatio] = useState<VideoRatio>("9:16");
  const [duration, setDuration] = useState<VideoDuration>(30);
  const [isBusy, setIsBusy] = useState(false);
  const [setup, setSetupState] = useState<VideoSetup | null>(null);
  // Read inside async handlers so a brief can be set and sent in one go.
  const setupRef = useRef<VideoSetup | null>(null);
  // Read inside async handlers so they always see the latest project.
  const projectRef = useRef<VideoProject | null>(null);
  // Drafted from the first prompt and approved before anything is rendered.
  const [storyboard, setStoryboardState] = useState<VideoStoryboard | null>(null);
  const storyboardRef = useRef<VideoStoryboard | null>(null);
  // Images sent with the storyboard prompts, reused for the render.
  const storyboardImagesRef = useRef<string[]>([]);

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

  const setStoryboard = useCallback((nextStoryboard: VideoStoryboard | null) => {
    storyboardRef.current = nextStoryboard;
    setStoryboardState(nextStoryboard);
  }, []);

  const setSetup = useCallback((nextSetup: VideoSetup | null) => {
    setupRef.current = nextSetup;
    setSetupState(nextSetup);
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
      const currentStoryboard = storyboardRef.current;
      const setup = setupRef.current;
      const onProgress = (progress: number) => {
        // Keep the bar short of 100 until the result is actually in.
        updateAssistantMessage(assistantMessageId, {
          progress: Math.min(progress, 95),
        });
      };

      setIsBusy(true);
      try {
        let sceneCount: number;
        if (currentProject) {
          const nextProject = await mEdit.mutateAsync({
            project: currentProject,
            payload: {
              businessId,
              projectId: currentProject.id,
              sceneId: request.sceneId,
              prompt: request.prompt,
              referenceImages: request.images,
            },
            onProgress,
          });
          pushHistory(currentProject);
          setProject(nextProject);
          sceneCount = nextProject.scenes.length;
        } else {
          // Before the video exists, prompts draft and then revise the storyboard.
          const nextStoryboard = currentStoryboard
            ? await mReviseStoryboard.mutateAsync({
                storyboard: currentStoryboard,
                payload: { businessId, prompt: request.prompt, referenceImages: request.images },
                onProgress,
              })
            : await mStoryboard.mutateAsync({
                payload: {
                  businessId,
                  productKnowledgeId: setup?.product.id ?? "",
                  avatarImageUrl: setup?.avatar?.imageUrl ?? null,
                  prompt: request.prompt,
                  ratio,
                  durationSec: duration,
                  referenceImages: setup?.reference
                    ? [setup.reference.imageUrl, ...request.images]
                    : request.images,
                  scheduleDate,
                },
                onProgress,
              });
          storyboardImagesRef.current = Array.from(
            new Set([...(currentStoryboard ? storyboardImagesRef.current : []), ...request.images])
          );
          setStoryboard(nextStoryboard);
          sceneCount = nextStoryboard.scenes.length;
        }

        updateAssistantMessage(assistantMessageId, {
          status: "done",
          progress: 100,
          sceneCount,
        });
      } catch {
        updateAssistantMessage(assistantMessageId, { status: "error" });
      } finally {
        setIsBusy(false);
      }
    },
    [
      businessId,
      duration,
      mEdit,
      mReviseStoryboard,
      mStoryboard,
      pushHistory,
      ratio,
      scheduleDate,
      setProject,
      setStoryboard,
    ]
  );

  // Renders the approved storyboard into the video.
  const runRender = useCallback(
    async (assistantMessageId: string) => {
      const approvedStoryboard = storyboardRef.current;
      const setup = setupRef.current;
      if (!approvedStoryboard) return;
      const onProgress = (progress: number) => {
        updateAssistantMessage(assistantMessageId, {
          progress: Math.min(progress, 95),
        });
      };

      setIsBusy(true);
      try {
        const nextProject = await mRender.mutateAsync({
          payload: {
            businessId,
            productKnowledgeId: setup?.product.id ?? "",
            avatarImageUrl: setup?.avatar?.imageUrl ?? null,
            referenceImages: [
              ...(setup?.reference ? [setup.reference.imageUrl] : []),
              ...storyboardImagesRef.current,
            ],
            storyboard: approvedStoryboard,
            scheduleDate,
          },
          onProgress,
        });
        setProject(nextProject);
        setStoryboard(null);
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
    [businessId, mRender, scheduleDate, setProject, setStoryboard]
  );

  const approveStoryboard = useCallback(() => {
    if (isBusy || !storyboardRef.current?.scenes.length || projectRef.current) return;
    const assistantMessageId = createId();
    setMessages((current) => [
      ...current,
      {
        id: assistantMessageId,
        role: "assistant",
        kind: "generate",
        status: "pending",
        progress: 0,
        scene: null,
        request: { prompt: "", images: [], sceneId: null },
      },
    ]);
    void runRender(assistantMessageId);
  }, [isBusy, runRender]);

  // Attached videos go straight onto the timeline as scenes; a prompt sent
  // with them is then applied as an edit. A prompt alone drafts or revises
  // the storyboard until the video exists, then edits the video / the
  // selected scene.
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
          kind: currentProject ? "edit" : "storyboard",
          isRevision: !currentProject && Boolean(storyboardRef.current),
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
      if (message.kind === "generate") void runRender(messageId);
      else void runRequest(message.request, messageId);
    },
    [isBusy, messages, runRender, runRequest]
  );

  // The two ways in from the start screen: a brief (product, optional avatar
  // and the story in words) drafts the storyboard; existing videos go straight
  // onto the timeline.
  const startStoryboard = useCallback(
    (nextSetup: VideoSetup, prompt: string) => {
      setSetup(nextSetup);
      submitPrompt(prompt, []);
    },
    [setSetup, submitPrompt]
  );

  const startFromVideos = useCallback(
    (videos: AttachedVideo[]) => {
      setSetup(null);
      submitPrompt("", [], videos);
    },
    [setSetup, submitPrompt]
  );

  // Back to the start screen. The setup is kept to prefill the brief.
  const reset = useCallback(() => {
    if (isBusy) return;
    historyRef.current = { past: [], future: [] };
    gestureStartRef.current = null;
    storyboardImagesRef.current = [];
    setHistoryVersion((version) => version + 1);
    setProject(null);
    setStoryboard(null);
    setMessages([]);
  }, [isBusy, setProject, setStoryboard]);

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
    setup,
    storyboard,
    approveStoryboard,
    submitPrompt,
    retry,
    startStoryboard,
    startFromVideos,
    reset,
  };
}

export type VideoGeneratorState = ReturnType<typeof useVideoGenerator>;
