"use client";

import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { StoryboardScene, VideoStoryboard } from "@/models/api/content/video.type";
import { createId } from "./use-video-generator";

const MIN_SCENE_SEC = 1;
const MAX_SCENE_SEC = 20;
const DEFAULT_SCENE_SEC = 5;

type StoryboardEditorProps = {
  storyboard: VideoStoryboard;
  disabled: boolean;
  // A chat prompt is revising the storyboard.
  isRevising: boolean;
  onChange: (updater: (current: VideoStoryboard) => VideoStoryboard) => void;
  onApprove: () => void;
};

// Review step between the prompt and the render: the user reads the planned
// scenes, edits them here (or asks for a revision in the chat), then approves.
export function StoryboardEditor({
  storyboard,
  disabled,
  isRevising,
  onChange,
  onApprove,
}: StoryboardEditorProps) {
  const t = useTranslations("videoGenerator");
  const { scenes } = storyboard;
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.durationSec, 0);
  const hasEmptyScene = scenes.some((scene) => !scene.description.trim());
  const isLocked = disabled || isRevising;

  const updateScene = (sceneId: string, patch: Partial<StoryboardScene>) =>
    onChange((current) => ({
      ...current,
      scenes: current.scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, ...patch } : scene
      ),
    }));

  const moveScene = (index: number, offset: -1 | 1) =>
    onChange((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.scenes.length) return current;
      const nextScenes = [...current.scenes];
      [nextScenes[index], nextScenes[target]] = [nextScenes[target], nextScenes[index]];
      return { ...current, scenes: nextScenes };
    });

  const removeScene = (sceneId: string) =>
    onChange((current) => ({
      ...current,
      scenes: current.scenes.filter((scene) => scene.id !== sceneId),
    }));

  const addScene = () =>
    onChange((current) => ({
      ...current,
      scenes: [
        ...current.scenes,
        {
          id: createId(),
          title: t("newSceneTitle"),
          description: "",
          caption: null,
          durationSec: DEFAULT_SCENE_SEC,
        },
      ],
    }));

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex shrink-0 flex-wrap items-start gap-3 border-b px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Clapperboard className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-semibold sm:text-base">{t("storyboardTitle")}</h2>
            <Badge variant="outline" className="shrink-0">
              {storyboard.ratio}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("storyboardSummary", { count: scenes.length, duration: totalDuration })}
          </p>
        </div>
        <p className="w-full text-xs text-muted-foreground sm:w-auto sm:max-w-xs sm:text-right">
          {t("storyboardHint")}
        </p>
      </div>

      <ol className="grid min-h-0 flex-1 auto-rows-min gap-3 overflow-y-auto p-4 sm:grid-cols-2 2xl:grid-cols-3">
        {scenes.map((scene, index) => (
          <li
            key={scene.id}
            className="flex flex-col gap-2.5 rounded-xl border bg-background-secondary p-3"
          >
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {t("sceneLabel", { index: index + 1 })}
              </span>
              <label className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={MIN_SCENE_SEC}
                  max={MAX_SCENE_SEC}
                  step={0.5}
                  value={scene.durationSec}
                  disabled={isLocked}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) return;
                    updateScene(scene.id, {
                      durationSec: Math.min(MAX_SCENE_SEC, Math.max(MIN_SCENE_SEC, value)),
                    });
                  }}
                  aria-label={t("storyboardDuration")}
                  className="h-7 w-16 px-2 text-xs tabular-nums"
                />
                {t("secondsShort")}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isLocked || index === 0}
                onClick={() => moveScene(index, -1)}
                title={t("moveSceneUp")}
                aria-label={t("moveSceneUp")}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isLocked || index === scenes.length - 1}
                onClick={() => moveScene(index, 1)}
                title={t("moveSceneDown")}
                aria-label={t("moveSceneDown")}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                disabled={isLocked || scenes.length <= 1}
                onClick={() => removeScene(scene.id)}
                title={t("deleteScene")}
                aria-label={t("deleteScene")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Input
              value={scene.title}
              disabled={isLocked}
              onChange={(event) => updateScene(scene.id, { title: event.target.value })}
              aria-label={t("storyboardSceneTitle")}
              className="h-8 bg-card font-medium"
            />
            <Textarea
              value={scene.description}
              disabled={isLocked}
              rows={3}
              placeholder={t("storyboardDescriptionPlaceholder")}
              onChange={(event) => updateScene(scene.id, { description: event.target.value })}
              aria-label={t("storyboardDescription")}
              className={cn(
                "min-h-20 resize-none bg-card text-sm",
                !scene.description.trim() && "border-destructive/60"
              )}
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("storyboardCaption")}</p>
              <Input
                value={scene.caption ?? ""}
                disabled={isLocked}
                placeholder={t("storyboardCaptionPlaceholder")}
                onChange={(event) =>
                  updateScene(scene.id, { caption: event.target.value || null })
                }
                aria-label={t("storyboardCaption")}
                className="h-8 bg-card text-sm"
              />
            </div>
          </li>
        ))}

        <li>
          <button
            type="button"
            disabled={isLocked}
            onClick={addScene}
            className="flex h-full min-h-24 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t("addScene")}
          </button>
        </li>
      </ol>

      <div className="flex shrink-0 flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center">
        <p className={cn("flex-1 text-xs", hasEmptyScene ? "text-destructive" : "text-muted-foreground")}>
          {hasEmptyScene ? t("storyboardDescriptionRequired") : t("storyboardApproveHint")}
        </p>
        <Button
          type="button"
          disabled={isLocked || hasEmptyScene || scenes.length === 0}
          onClick={onApprove}
        >
          <Sparkles className="h-4 w-4" />
          {t("approveStoryboard")}
        </Button>
      </div>

      {isRevising && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/70 backdrop-blur-[2px] animate-in fade-in duration-300">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-sm font-medium">{t("revisingStoryboard")}</span>
        </div>
      )}
    </div>
  );
}
