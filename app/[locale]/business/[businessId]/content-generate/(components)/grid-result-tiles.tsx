"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Check, Loader2, Pencil, RefreshCw } from "lucide-react";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { cn } from "@/lib/utils";
import { GeneratedImageViewer } from "./generated-image-viewer";
import { ProtectedImage } from "./protected-image";

type GridResultTilesProps = {
  jobId: string;
  /** Original tile URLs; they stay the identity used for selection and follow-ups. */
  images: string[];
  /** Upscaled URLs parallel to images, shown once ready. */
  upscaledImages?: (string | null)[];
  upscaleStatuses?: (string | null)[];
  imageItemIds?: number[];
  ratio?: string;
  /** Position of the image in the content selection, or -1 when it is not selected. */
  selectionIndex: (image: string) => number;
  /** Shows the carousel order on selected tiles when more than one image is selected. */
  showSelectionOrder: boolean;
  isEditing: (image: string) => boolean;
  onUse: (image: string) => void;
  onEdit: (image: string, displayUrl: string, targetRect: DOMRect | null) => void;
  /** Asks for a new variation of a tile; the button is hidden without it. */
  onRegenerate?: (image: string) => void;
  regenerateDisabled?: boolean;
  labels: {
    edit: string;
    regenerate?: string;
    useContent: string;
    /** Visible text of the select button on the active variation. */
    selectContent: string;
    contentUsed: string;
    imageAlt: (index: number) => string;
  };
};

const isUpscaling = (status?: string | null) =>
  status === "pending" || status === "processing";

/**
 * Grid result as a gallery: the active variation large, every variation in a rail beside it.
 * The rail lists only the delivered tiles: tiles hidden by QA are not sent, so a 2x2 grid can show 3.
 */
export function GridResultTiles({
  jobId,
  images,
  upscaledImages,
  upscaleStatuses,
  imageItemIds,
  ratio,
  selectionIndex,
  showSelectionOrder,
  isEditing,
  onUse,
  onEdit,
  onRegenerate,
  regenerateDisabled,
  labels,
}: GridResultTilesProps) {
  const aspectRatio = ratio ? ratio.replace(":", "/") : "1/1";
  const [activeIndex, setActiveIndex] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const activeImage = images[active];
  const displayUrlAt = (index: number) =>
    upscaledImages?.[index] || images[index] || DEFAULT_PLACEHOLDER_IMAGE;

  const activeDisplayUrl = displayUrlAt(active);
  const activeStatus = upscaleStatuses?.[active];
  const activeOrder = activeImage ? selectionIndex(activeImage) : -1;
  const activeSelected = activeOrder >= 0;
  const activeEditing =
    Boolean(activeImage) &&
    (isEditing(activeImage) || isEditing(activeDisplayUrl));

  const focusThumb = (index: number) => {
    const next = Math.max(0, Math.min(images.length - 1, index));
    setActiveIndex(next);
    thumbRefs.current[next]?.focus();
  };

  const handleRailKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      focusThumb(active + 1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusThumb(active - 1);
    }
  };

  const glassCls =
    "bg-black/45 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

  return (
    <div className="flex w-full gap-2">
      {/* Active variation */}
      <div
        ref={mainRef}
        className="relative min-w-0 flex-1 overflow-hidden rounded-[1.3rem] border bg-background-secondary"
        style={{ aspectRatio }}
      >
        {activeImage ? (
          <GeneratedImageViewer
            key={`${jobId}-main-${active}`}
            imageUrl={activeDisplayUrl}
            imageItemId={imageItemIds?.[active]}
            alt={labels.imageAlt(active + 1)}
            protectFromContextMenu
            className="h-full w-full cursor-zoom-in object-cover"
            style={{ aspectRatio }}
          />
        ) : null}

        {isUpscaling(activeStatus) ? (
          <span
            className="pointer-events-none absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md"
            title="Upscaling"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            HD
          </span>
        ) : activeStatus === "success" ? (
          <span className="pointer-events-none absolute left-2 top-2 z-20 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
            HD
          </span>
        ) : null}

        {activeImage && onRegenerate ? (
          <button
            type="button"
            className={cn(
              "absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-50",
              glassCls
            )}
            title={labels.regenerate}
            aria-label={`${labels.regenerate} ${active + 1}`}
            disabled={regenerateDisabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRegenerate(activeImage);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {activeImage && !activeEditing ? (
          <button
            type="button"
            className={cn(
              "absolute bottom-2 left-2 z-20 inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold",
              glassCls
            )}
            aria-label={`${labels.edit} ${active + 1}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const mainImage = mainRef.current?.querySelector("canvas, img");
              onEdit(
                activeImage,
                activeDisplayUrl,
                mainImage?.getBoundingClientRect() ?? null
              );
            }}
          >
            <Pencil className="h-3 w-3" />
            {labels.edit}
          </button>
        ) : null}

        {activeImage ? (
          <button
            type="button"
            className={cn(
              "absolute bottom-2 right-2 z-20 inline-flex h-8 items-center gap-1.5 rounded-full pl-2 pr-3 text-xs font-semibold",
              activeSelected
                ? "bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                : glassCls
            )}
            title={activeSelected ? labels.contentUsed : labels.useContent}
            aria-pressed={activeSelected}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onUse(activeImage);
            }}
          >
            {activeSelected ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold leading-none text-blue-600">
                {showSelectionOrder ? activeOrder + 1 : <Check className="h-2.5 w-2.5" />}
              </span>
            ) : (
              <span aria-hidden className="h-4 w-4 rounded-full border-2 border-white" />
            )}
            {activeSelected ? labels.contentUsed : labels.selectContent}
          </button>
        ) : null}
      </div>

      {/* Variation rail; absolutely filled so its height follows the active image */}
      <div className="relative w-[19%] min-w-11 max-w-[60px] shrink-0">
        <div
          role="listbox"
          aria-orientation="vertical"
          className="absolute inset-0 flex flex-col gap-1.5 overflow-y-auto overscroll-contain p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onKeyDown={handleRailKeyDown}
        >
          {images.map((image, index) => {
            const isActive = index === active;
            const order = selectionIndex(image);

            return (
              <button
                key={`${jobId}-thumb-${index}`}
                ref={(el) => {
                  thumbRefs.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={isActive}
                aria-label={labels.imageAlt(index + 1)}
                tabIndex={isActive ? 0 : -1}
                className={cn(
                  "relative w-full shrink-0 overflow-hidden rounded-lg transition focus-visible:outline-none",
                  isActive
                    ? "ring-2 ring-blue-600 ring-offset-2 ring-offset-background"
                    : "opacity-80 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-600/60"
                )}
                style={{ aspectRatio }}
                onClick={() => setActiveIndex(index)}
              >
                <ProtectedImage
                  src={displayUrlAt(index)}
                  imageItemId={imageItemIds?.[index]}
                  alt=""
                  className="h-full w-full"
                />
                {order >= 0 ? (
                  <span className="pointer-events-none absolute right-1 top-1 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-semibold leading-none text-white shadow">
                    {showSelectionOrder ? order + 1 : <Check className="h-2.5 w-2.5" />}
                  </span>
                ) : null}
                {isUpscaling(upscaleStatuses?.[index]) ? (
                  <span className="pointer-events-none absolute bottom-1 left-1 z-20 rounded-full bg-black/45 p-0.5 text-white backdrop-blur-sm">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
