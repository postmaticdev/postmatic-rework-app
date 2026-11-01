"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Clapperboard, ImageOff, Loader2, Maximize2, Pencil, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { VideoStoryboard } from "@/models/api/content/video.type";

type StoryboardPreviewProps = {
  storyboard: VideoStoryboard;
  disabled: boolean;
  // A chat prompt is redrawing the storyboard.
  isRevising: boolean;
  // Changes are asked for in the chat; this takes the user there.
  onEdit: () => void;
  onApprove: () => void;
};

// Review step between the prompt and the render: the storyboard comes back as
// one image (a panel per scene). Approve it to render the video, or edit it
// through the chat, which returns a new image.
export function StoryboardPreview({
  storyboard,
  disabled,
  isRevising,
  onEdit,
  onApprove,
}: StoryboardPreviewProps) {
  const t = useTranslations("videoGenerator");
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  // Keyed by URL so a revised image starts loading again.
  const [loadState, setLoadState] = useState<{ url: string; status: "loaded" | "error" } | null>(
    null
  );
  const status = loadState?.url === storyboard.imageUrl ? loadState.status : "loading";
  const totalDuration = storyboard.scenes.reduce((sum, scene) => sum + scene.durationSec, 0);
  const isLocked = disabled || isRevising;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
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
          <p className="truncate text-xs text-muted-foreground">
            {t("storyboardSummary", { count: storyboard.scenes.length, duration: totalDuration })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={status !== "loaded"}
          onClick={() => setIsFullViewOpen(true)}
          title={t("viewFullStoryboard")}
          aria-label={t("viewFullStoryboard")}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 bg-background-secondary p-3 sm:p-4">
        {status === "loading" && <Skeleton className="absolute inset-3 rounded-xl sm:inset-4" />}
        {status === "error" ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            {t("storyboardImageError")}
          </div>
        ) : (
          <button
            type="button"
            className="group relative block h-full w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setIsFullViewOpen(true)}
            disabled={status !== "loaded"}
            aria-label={t("viewFullStoryboard")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote or data URL of any size */}
            <img
              key={storyboard.imageUrl}
              src={storyboard.imageUrl}
              alt={t("storyboardImageAlt")}
              draggable={false}
              onLoad={() => setLoadState({ url: storyboard.imageUrl, status: "loaded" })}
              onError={() => setLoadState({ url: storyboard.imageUrl, status: "error" })}
              className={cn(
                "h-full w-full object-contain transition-opacity duration-300",
                status === "loaded" ? "opacity-100" : "opacity-0"
              )}
            />
          </button>
        )}

        {isRevising && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/70 backdrop-blur-[2px] animate-in fade-in duration-300">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <span className="text-sm font-medium">{t("revisingStoryboard")}</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-xs text-muted-foreground">{t("storyboardApproveHint")}</p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="button" variant="outline" disabled={isLocked} onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            {t("editStoryboard")}
          </Button>
          <Button type="button" disabled={isLocked || status !== "loaded"} onClick={onApprove}>
            <Sparkles className="h-4 w-4" />
            {t("approveStoryboard")}
          </Button>
        </div>
      </div>

      <Dialog open={isFullViewOpen} onOpenChange={setIsFullViewOpen}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>{t("storyboardTitle")}</DialogTitle>
            <DialogDescription>
              {t("storyboardSummary", { count: storyboard.scenes.length, duration: totalDuration })}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 sm:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote or data URL of any size */}
            <img
              src={storyboard.imageUrl}
              alt={t("storyboardImageAlt")}
              className="h-auto w-full rounded-lg border"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
