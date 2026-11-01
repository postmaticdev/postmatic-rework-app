"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { cn } from "@/lib/utils";
import { ProtectedImage } from "./protected-image";
import { useTranslations } from "next-intl";

type ContentCarouselPreviewProps = {
  images: string[];
  // CSS aspect-ratio, e.g. "4/5". Omit to fill the parent's height instead.
  aspectRatio?: string;
  imageFit?: "cover" | "contain";
  className?: string;
};

// Swipeable preview of a multi-image (carousel) post, styled after the
// Instagram / LinkedIn / Facebook carousel: arrows, slide counter and dots.
// Slides render through ProtectedImage (canvas, watermark for free users).
export function ContentCarouselPreview({
  images,
  aspectRatio,
  imageFit = "cover",
  className,
}: ContentCarouselPreviewProps) {
  const t = useTranslations("generationPanel");
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startScrollLeft: number } | null>(
    null
  );
  const previousCountRef = useRef(images.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastIndex = images.length - 1;

  const scrollToIndex = (index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;
    const nextIndex = Math.max(0, Math.min(lastIndex, index));
    track.scrollTo({ left: nextIndex * track.clientWidth, behavior });
  };

  // Jump to a newly added slide so the user sees it land in the carousel.
  useEffect(() => {
    if (images.length > previousCountRef.current) {
      scrollToIndex(images.length - 1);
    } else if (activeIndex > lastIndex) {
      scrollToIndex(lastIndex, "auto");
    }
    previousCountRef.current = images.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track?.clientWidth) return;
    setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  // Touch and trackpads scroll natively; mouse users get click-and-drag.
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !trackRef.current) return;
    dragRef.current = {
      startX: event.clientX,
      startScrollLeft: trackRef.current.scrollLeft,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !trackRef.current) return;
    trackRef.current.scrollLeft =
      dragRef.current.startScrollLeft - (event.clientX - dragRef.current.startX);
  };

  const handlePointerEnd = () => {
    const track = trackRef.current;
    if (!dragRef.current || !track) return;
    const dragDistance = track.scrollLeft - dragRef.current.startScrollLeft;
    const startIndex = Math.round(dragRef.current.startScrollLeft / track.clientWidth);
    // A short flick is enough to move one slide, like on mobile.
    const threshold = track.clientWidth * 0.15;
    const nextIndex =
      dragDistance > threshold
        ? startIndex + 1
        : dragDistance < -threshold
          ? startIndex - 1
          : startIndex;
    dragRef.current = null;
    setIsDragging(false);
    scrollToIndex(nextIndex);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollToIndex(activeIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollToIndex(activeIndex + 1);
    }
  };

  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden bg-background-secondary",
        !aspectRatio && "h-full",
        className
      )}
      style={aspectRatio ? { aspectRatio } : undefined}
      role="region"
      aria-roledescription={t("carouselRoleDescription")}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={trackRef}
        className={cn(
          "flex h-full w-full overflow-x-auto overscroll-x-contain scrollbar-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          isDragging ? "cursor-grabbing select-none" : "cursor-grab snap-x snap-mandatory"
        )}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {images.map((imageUrl, index) => (
          <div
            key={`${imageUrl}-${index}`}
            className="relative h-full w-full shrink-0 snap-center snap-always"
            aria-roledescription={t("slideRoleDescription")}
            aria-label={`${index + 1} / ${images.length}`}
          >
            <ProtectedImage
              src={imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
              alt={t("slideAlt", { index: index + 1 })}
              fit={imageFit}
              className="h-full w-full"
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white tabular-nums">
        {Math.min(activeIndex, lastIndex) + 1}/{images.length}
      </div>

      {activeIndex > 0 && (
        <button
          type="button"
          aria-label={t("previousSlide")}
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md transition-opacity hover:bg-white [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
          onClick={() => scrollToIndex(activeIndex - 1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {activeIndex < lastIndex && (
        <button
          type="button"
          aria-label={t("nextSlide")}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md transition-opacity hover:bg-white [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
          onClick={() => scrollToIndex(activeIndex + 1)}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {images.map((imageUrl, index) => (
          <button
            key={`dot-${imageUrl}-${index}`}
            type="button"
            aria-label={t("goToSlide", { index: index + 1 })}
            aria-current={index === activeIndex}
            className={cn(
              "h-1.5 rounded-full shadow-sm transition-all",
              index === activeIndex ? "w-4 bg-blue-500" : "w-1.5 bg-white/70 hover:bg-white"
            )}
            onClick={() => scrollToIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
