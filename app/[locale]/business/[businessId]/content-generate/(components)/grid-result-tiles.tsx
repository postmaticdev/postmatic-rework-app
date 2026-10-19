"use client";

import { Check, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { cn } from "@/lib/utils";
import { GeneratedImageViewer } from "./generated-image-viewer";

type GridResultTilesProps = {
  jobId: string;
  gridSize: number;
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
  labels: {
    edit: string;
    useContent: string;
    contentUsed: string;
    imageAlt: (index: number) => string;
  };
};

export function GridResultTiles({
  jobId,
  gridSize,
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
  labels,
}: GridResultTilesProps) {
  const aspectRatio = ratio ? ratio.replace(":", "/") : "1/1";

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
    >
      {images.map((image, index) => {
        const displayUrl =
          upscaledImages?.[index] || image || DEFAULT_PLACEHOLDER_IMAGE;
        const status = upscaleStatuses?.[index];
        const order = selectionIndex(image);
        const selected = order >= 0;
        const editing = isEditing(image) || isEditing(displayUrl);

        return (
          <div
            key={`${jobId}-tile-${index}`}
            data-grid-tile
            className={cn(
              "relative rounded-lg",
              selected &&
                "ring-2 ring-blue-600 ring-offset-2 ring-offset-background"
            )}
          >
            <GeneratedImageViewer
              imageUrl={displayUrl}
              imageItemId={imageItemIds?.[index]}
              alt={labels.imageAlt(index + 1)}
              protectFromContextMenu
              className="w-full cursor-zoom-in rounded-lg border object-cover"
              style={{ aspectRatio }}
            />
            {status === "pending" || status === "processing" ? (
              <span
                className="pointer-events-none absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm"
                title="Upscaling"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                HD
              </span>
            ) : status === "success" ? (
              <span className="pointer-events-none absolute left-1 top-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm">
                HD
              </span>
            ) : null}
            <div className="absolute bottom-1 right-1 flex gap-1">
              {!editing && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background"
                  title={labels.edit}
                  aria-label={`${labels.edit} ${index + 1}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const tileImage = event.currentTarget
                      .closest("[data-grid-tile]")
                      ?.querySelector("canvas, img");
                    onEdit(
                      image,
                      displayUrl,
                      tileImage?.getBoundingClientRect() ?? null
                    );
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                className={cn(
                  "h-7 w-7 shadow-sm",
                  selected
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-background/80 text-foreground backdrop-blur-sm hover:bg-background"
                )}
                title={selected ? labels.contentUsed : labels.useContent}
                aria-label={`${selected ? labels.contentUsed : labels.useContent} ${index + 1}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onUse(image);
                }}
              >
                {selected && showSelectionOrder ? (
                  <span className="text-[11px] font-semibold leading-none">
                    {order + 1}
                  </span>
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
