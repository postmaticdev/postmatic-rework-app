"use client";

export const MAX_VIDEO_UPLOAD_MB = 200;
export const MAX_AUDIO_UPLOAD_MB = 50;
const WAVEFORM_PEAKS_PER_SECOND = 20;
const MAX_WAVEFORM_PEAKS = 2000;

export type LocalVideoMeta = {
  durationSec: number;
  thumbnailUrl: string | null;
};

export type LocalAudioMeta = {
  durationSec: number;
  waveform: number[];
};

export const getFileBaseName = (file: File) =>
  file.name.replace(/\.[^.]+$/, "") || file.name;

export const isFileTooLarge = (file: File, maxMb: number) =>
  file.size > maxMb * 1024 * 1024;

// Reads duration and grabs an early frame as the clip thumbnail.
export const readVideoMeta = (file: File): Promise<LocalVideoMeta> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanUp = () => URL.revokeObjectURL(objectUrl);

    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        cleanUp();
        reject(new Error("INVALID_VIDEO"));
        return;
      }
      video.currentTime = Math.min(0.5, video.duration / 2);
    };
    video.onseeked = () => {
      let thumbnailUrl: string | null = null;
      try {
        const canvas = document.createElement("canvas");
        const scale = 240 / Math.max(video.videoWidth, video.videoHeight, 1);
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);
      } catch {}
      const durationSec = video.duration;
      cleanUp();
      resolve({ durationSec, thumbnailUrl });
    };
    video.onerror = () => {
      cleanUp();
      reject(new Error("INVALID_VIDEO"));
    };
    video.src = objectUrl;
  });

// Decodes the file once to get its duration and waveform peaks.
export const readAudioMeta = async (file: File): Promise<LocalAudioMeta> => {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error("INVALID_AUDIO");

  const context = new AudioContextClass();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const channel = buffer.getChannelData(0);
    const peakCount = Math.max(
      1,
      Math.min(MAX_WAVEFORM_PEAKS, Math.ceil(buffer.duration * WAVEFORM_PEAKS_PER_SECOND))
    );
    const samplesPerPeak = Math.max(1, Math.floor(channel.length / peakCount));
    const peaks: number[] = [];
    let maxPeak = 0;

    for (let peakIndex = 0; peakIndex < peakCount; peakIndex += 1) {
      let peak = 0;
      const start = peakIndex * samplesPerPeak;
      const end = Math.min(channel.length, start + samplesPerPeak);
      for (let sample = start; sample < end; sample += 1) {
        const value = Math.abs(channel[sample]);
        if (value > peak) peak = value;
      }
      peaks.push(peak);
      if (peak > maxPeak) maxPeak = peak;
    }

    return {
      durationSec: buffer.duration,
      waveform: peaks.map((peak) => (maxPeak > 0 ? peak / maxPeak : 0)),
    };
  } catch {
    throw new Error("INVALID_AUDIO");
  } finally {
    void context.close();
  }
};
