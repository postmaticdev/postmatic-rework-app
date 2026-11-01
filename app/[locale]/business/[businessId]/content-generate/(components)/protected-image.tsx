"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { useOptionalContentGenerate } from "@/contexts/content-generate-context";
import { useContentImageWatermarkGet } from "@/services/content/content.api";
import { ImageWatermarkRes } from "@/models/api/content/image.type";
import { cn } from "@/lib/utils";

const WATERMARK_POLL_INTERVAL_MS = 2000;
const WATERMARK_POLL_MAX_ATTEMPTS = 30;

type WatermarkFetcher = (generatedImagePostItemId: number) => Promise<{
  data?: { data?: ImageWatermarkRes };
}>;

// Shared across components so the chat, preview and carousel showing the same
// image don't each poll the watermark endpoint. Keyed by item and shown URL: a grid
// tile's watermark is rebuilt from its upscale, so the one made from the small tile
// must not be reused once the upscaled URL is shown.
const watermarkUrlCache = new Map<string, string>();
const watermarkRequests = new Map<string, Promise<string | null>>();
const watermarkCacheKey = (imageItemId: number, imageUrl: string) =>
  `${imageItemId}|${imageUrl}`;
const EMPTY_HISTORIES: NonNullable<
  ReturnType<typeof useOptionalContentGenerate>
>["histories"] = [];

const requestWatermarkUrl = (
  imageItemId: number,
  imageUrl: string,
  fetchWatermark: WatermarkFetcher
): Promise<string | null> => {
  const cacheKey = watermarkCacheKey(imageItemId, imageUrl);
  const cachedUrl = watermarkUrlCache.get(cacheKey);
  if (cachedUrl) return Promise.resolve(cachedUrl);

  const pendingRequest = watermarkRequests.get(cacheKey);
  if (pendingRequest) return pendingRequest;

  const request = (async () => {
    for (let attempt = 1; attempt <= WATERMARK_POLL_MAX_ATTEMPTS; attempt += 1) {
      try {
        const res = await fetchWatermark(imageItemId);
        const watermarkData = res.data?.data;
        const watermarkUrl = watermarkData?.imageUrls?.[0];
        if (
          watermarkData?.generatedImagePostItemId === imageItemId &&
          watermarkData.isWatermarked &&
          watermarkData.isCached &&
          watermarkUrl
        ) {
          watermarkUrlCache.set(cacheKey, watermarkUrl);
          return watermarkUrl;
        }
      } catch {}

      if (attempt < WATERMARK_POLL_MAX_ATTEMPTS) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, WATERMARK_POLL_INTERVAL_MS)
        );
      }
    }

    return null;
  })().finally(() => {
    watermarkRequests.delete(cacheKey);
  });

  watermarkRequests.set(cacheKey, request);
  return request;
};

export type ProtectedImageStatus = "ready" | "pending" | "unavailable";

/**
 * Resolves the URL that may be shown for an image. Free users only ever get the
 * watermarked version of a generated image, so the original never reaches the
 * browser (DOM or network). Paid users and non-generated images (uploads,
 * products, avatars) pass through unchanged.
 */
export function useProtectedImageUrl(
  imageUrl?: string | null,
  imageItemId?: number
): { src: string | null; status: ProtectedImageStatus } {
  // Outside the content-generate page (e.g. the scheduler's own uploads) there
  // are no generated images to protect, so everything passes through.
  const contentGenerate = useOptionalContentGenerate();
  const histories = contentGenerate?.histories ?? EMPTY_HISTORIES;
  const isAccessLoading = contentGenerate?.aiModels.isLoading ?? false;
  const isFreeUser = contentGenerate?.aiModels.isFreeUser ?? false;
  const { mutateAsync: getImageWatermark } = useContentImageWatermarkGet();
  const getImageWatermarkRef = useRef(getImageWatermark);
  getImageWatermarkRef.current = getImageWatermark;
  const [watermark, setWatermark] = useState<{
    cacheKey: string;
    url: string | null;
  } | null>(null);

  const generatedImage = useMemo(() => {
    if (!imageUrl) return null;
    for (const group of histories) {
      for (const job of group.jobs) {
        // Grid tiles are also shown by their upscaled URL, which belongs to the same item.
        let imageIndex = job.result?.images?.indexOf(imageUrl) ?? -1;
        if (imageIndex < 0) {
          imageIndex = job.result?.upscaledImages?.indexOf(imageUrl) ?? -1;
        }
        if (imageIndex >= 0) {
          return { imageItemId: job.result?.imageItemIds?.[imageIndex] };
        }
      }
    }
    return null;
  }, [histories, imageUrl]);

  const isGeneratedImage = Boolean(generatedImage) || typeof imageItemId === "number";
  const resolvedImageItemId = imageItemId ?? generatedImage?.imageItemId;
  const needsWatermark =
    Boolean(imageUrl) && isGeneratedImage && (isAccessLoading || isFreeUser);

  useEffect(() => {
    if (
      !needsWatermark ||
      isAccessLoading ||
      !imageUrl ||
      typeof resolvedImageItemId !== "number"
    ) {
      return;
    }

    let isActive = true;
    const cacheKey = watermarkCacheKey(resolvedImageItemId, imageUrl);
    void requestWatermarkUrl(resolvedImageItemId, imageUrl, (id) =>
      getImageWatermarkRef.current({ generatedImagePostItemId: id })
    ).then((url) => {
      if (isActive) setWatermark({ cacheKey, url });
    });

    return () => {
      isActive = false;
    };
  }, [imageUrl, isAccessLoading, needsWatermark, resolvedImageItemId]);

  if (!imageUrl) return { src: null, status: "unavailable" };
  if (!needsWatermark) return { src: imageUrl, status: "ready" };
  // Access isn't known yet, or the item id is still being hydrated: wait
  // instead of risking a load of the original.
  if (isAccessLoading || typeof resolvedImageItemId !== "number") {
    return { src: null, status: "pending" };
  }

  const cacheKey = watermarkCacheKey(resolvedImageItemId, imageUrl);
  const watermarkUrl =
    watermarkUrlCache.get(cacheKey) ??
    (watermark?.cacheKey === cacheKey ? watermark.url : undefined);
  if (watermarkUrl) return { src: watermarkUrl, status: "ready" };
  if (watermarkUrl === null) return { src: null, status: "unavailable" };
  return { src: null, status: "pending" };
}

type ProtectedImageProps = {
  src?: string | null;
  imageItemId?: number;
  alt: string;
  fit?: "cover" | "contain";
  // Applied to the wrapper; size the image through it.
  className?: string;
  canvasClassName?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

/**
 * Renders an image onto a canvas so its URL never appears in the DOM. The image
 * is loaded without CORS, which taints the canvas and makes toDataURL /
 * getImageData throw, and right-click / drag are blocked by an overlay.
 */
export function ProtectedImage({
  src,
  imageItemId,
  alt,
  fit = "cover",
  className,
  canvasClassName,
  style,
  onClick,
}: ProtectedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { src: safeSrc, status } = useProtectedImageUrl(src, imageItemId);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!safeSrc) return;

    let isActive = true;
    const img = new window.Image();
    img.onload = () => {
      if (!isActive) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
    };
    img.src = safeSrc;

    return () => {
      isActive = false;
    };
  }, [safeSrc]);

  const blockInteraction = (
    event: React.MouseEvent<HTMLElement> | React.DragEvent<HTMLElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      // isolate keeps the overlay's z-index from covering sibling buttons.
      className={cn("relative isolate overflow-hidden", className)}
      style={style}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        className={cn("pointer-events-none block h-full w-full", canvasClassName)}
        style={{ objectFit: fit, WebkitUserSelect: "none", userSelect: "none" }}
      />
      {status !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-secondary text-muted-foreground">
          {status === "pending" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImageOff className="h-5 w-5" />
          )}
        </div>
      )}
      <div
        className="absolute inset-0 z-10 bg-transparent"
        onContextMenu={blockInteraction}
        onDragStart={blockInteraction}
      />
    </div>
  );
}
