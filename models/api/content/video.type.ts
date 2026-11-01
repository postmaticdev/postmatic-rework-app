/* ----------------------------------------------------------------
  AI Video Generator
  --------------------------------------------------------------*/

import { PlatformEnum } from "../knowledge/platform.type";

export const VIDEO_RATIOS = ["9:16", "1:1", "16:9"] as const;
export type VideoRatio = (typeof VIDEO_RATIOS)[number];

export const VIDEO_DURATIONS = [15, 30, 60] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];

export interface VideoScene {
  id: string;
  title: string;
  // Prompt the scene was (re)generated from; shown when editing the scene.
  prompt: string;
  durationSec: number;
  // Rendered clip for this scene. Until it exists the player falls back to
  // an animated storyboard frame built from thumbnailUrl.
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  // On-screen text overlay for the scene.
  caption?: string | null;
  // Bumped every time the scene is regenerated from an edit prompt.
  version: number;
  // "upload" scenes come from a clip the user attached in the chat.
  source?: "ai" | "upload";
  // Length of the uploaded clip; caps how far the scene can be extended.
  sourceDurationSec?: number | null;
  // Seconds cut from the start of the uploaded clip (trimmed from the left).
  trimStartSec?: number;
  // Silences this clip's own sound.
  isMuted?: boolean;
}

// A clip on the audio track (music, voice over). Clips never overlap.
export interface VideoAudioClip {
  id: string;
  name: string;
  url: string;
  // Position on the video timeline.
  startSec: number;
  durationSec: number;
  // Seconds cut from the start of the source file.
  trimStartSec: number;
  sourceDurationSec: number;
  // Normalised peaks (0..1) across the whole source, for the waveform.
  waveform?: number[];
  isMuted?: boolean;
}

export interface VideoProject {
  id: string;
  title: string;
  ratio: VideoRatio;
  // Played back to back, in this order.
  scenes: VideoScene[];
  audioClips: VideoAudioClip[];
  // Track-level mutes: the sound of the video clips / the whole audio track.
  isVideoMuted?: boolean;
  isAudioMuted?: boolean;
  // Final stitched video, available once rendering finished.
  videoUrl?: string | null;
  createdAt: string;
}

// One beat of the story, agreed on before any video is rendered.
export interface StoryboardScene {
  id: string;
  title: string;
  // What is on screen; the scene is rendered from this.
  description: string;
  caption: string | null;
  durationSec: number;
}

// The plan the user reviews before the video is generated. It is shown as a
// single image with one panel per scene; changes are asked for in the chat,
// which returns a new image.
export interface VideoStoryboard {
  id: string;
  title: string;
  ratio: VideoRatio;
  imageUrl: string;
  // The scenes drawn in the image, in order.
  scenes: StoryboardScene[];
}

/*
  Payload for generating the storyboard of a new video
*/
export interface GenerateVideoPld {
  businessId: string;
  // Product the video promotes, picked before the chat opens.
  productKnowledgeId: string;
  // Optional person to feature in the video.
  avatarImageUrl?: string | null;
  prompt: string;
  ratio: VideoRatio;
  durationSec: VideoDuration;
  referenceImages: string[];
  scheduleDate?: string | null;
}

/*
  Payload for revising a storyboard from a chat prompt
*/
export interface ReviseStoryboardPld {
  businessId: string;
  prompt: string;
  referenceImages: string[];
}

/*
  Payload for rendering the video from an approved storyboard
*/
export interface RenderVideoPld {
  businessId: string;
  productKnowledgeId: string;
  avatarImageUrl?: string | null;
  referenceImages: string[];
  storyboard: VideoStoryboard;
  scheduleDate?: string | null;
}

/*
  Payload for scheduling a video post
*/
export interface ScheduleVideoPld {
  businessId: string;
  projectId: string;
  caption: string;
  platforms: PlatformEnum[];
  dateTime: string;
  // Free users publish the watermarked render.
  withWatermark: boolean;
}

/*
  Payload for downloading the rendered video
*/
export interface DownloadVideoPld {
  businessId: string;
  projectId: string;
  // Free users only get the watermarked render.
  withWatermark: boolean;
}

/*
  Payload for editing the whole video, or a single scene when sceneId is set
*/
export interface EditVideoPld {
  businessId: string;
  projectId: string;
  sceneId?: string | null;
  prompt: string;
  referenceImages: string[];
}
