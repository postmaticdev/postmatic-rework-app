"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useContentImageWatermarkGet } from "@/services/content/content.api";
import { Download, Loader2 } from "lucide-react";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { showToast } from "@/helper/show-toast";
import { ImageWatermarkRes } from "@/models/api/content/image.type";
import { useContentGenerate } from "@/contexts/content-generate-context";

const WATERMARK_POLL_INTERVAL_MS = 1500;
const WATERMARK_POLL_TIMEOUT_MS = 15000;
const ACCESS_RESOLUTION_POLL_INTERVAL_MS = 250;
const ACCESS_RESOLUTION_TIMEOUT_MS = 20000;

type WatermarkStatus =
  | "idle"
  | "loading"
  | "ready"
  | "pending"
  | "paid"
  | "missing-id"
  | "error";

type ResolvedWatermarkResult = {
  url: string;
  isWatermarkedDownload: boolean;
};

type GeneratedImageViewerProps = {
  imageUrl: string;
  imageItemId?: number;
  alt: string;
  protectFromContextMenu?: boolean;
  className?: string;
  width?: number;
  height?: number;
};

export function GeneratedImageViewer({
  imageUrl,
  imageItemId,
  alt,
  protectFromContextMenu = false,
  className,
  width = 800,
  height = 800,
}: GeneratedImageViewerProps) {
  const { aiModels } = useContentGenerate();
  const { mutateAsync: getImageWatermark } = useContentImageWatermarkGet();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [watermarkStatus, setWatermarkStatus] =
    useState<WatermarkStatus>("idle");
  const [watermarkedImageUrl, setWatermarkedImageUrl] = useState<string | null>(
    null
  );
  const [resolvedDownloadUrl, setResolvedDownloadUrl] = useState<string | null>(
    null
  );
  const [isWatermarkedDownload, setIsWatermarkedDownload] = useState(false);
  const watermarkRequestKeyRef = useRef<string | null>(null);
  const watermarkRequestPromiseRef =
    useRef<Promise<ResolvedWatermarkResult> | null>(null);
  const watermarkRequestModeRef = useRef<"preview" | "download" | null>(null);
  const aiModelsLoadingRef = useRef(aiModels.isLoading);

  const sleep = (ms: number) =>
    new Promise((resolve) => window.setTimeout(resolve, ms));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    aiModelsLoadingRef.current = aiModels.isLoading;
  }, [aiModels.isLoading]);

  const buildDownloadFileName = (sourceUrl: string, prefix: string) => {
    try {
      const pathname = new URL(sourceUrl).pathname;
      const extension = pathname.split(".").pop()?.toLowerCase();
      const safeExtension =
        extension && /^[a-z0-9]+$/.test(extension) ? extension : "png";

      return `${prefix}-${Date.now()}.${safeExtension}`;
    } catch {
      return `${prefix}-${Date.now()}.png`;
    }
  };

  const triggerBrowserDownload = (downloadHref: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = downloadHref;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadImageFile = async (downloadUrl: string, fileName: string) => {
    const response = await fetch(downloadUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);

    try {
      triggerBrowserDownload(objectUrl, fileName);
    } finally {
      window.URL.revokeObjectURL(objectUrl);
    }
  };

  const resolveWatermarkImage = useCallback(
    ({
      silent = false,
      waitForWatermark = false,
    }: {
      silent?: boolean;
      waitForWatermark?: boolean;
    } = {}): Promise<ResolvedWatermarkResult> => {
      if (!imageUrl) {
        return Promise.resolve({
          url: "",
          isWatermarkedDownload: false,
        });
      }

      if (!aiModels.isFreeUser) {
        const paidResult = {
          url: imageUrl,
          isWatermarkedDownload: false,
        };

        setResolvedDownloadUrl(paidResult.url);
        setIsWatermarkedDownload(false);
        setWatermarkStatus("paid");

        return Promise.resolve(paidResult);
      }

      const hasStableResolvedUrl =
        watermarkStatus === "ready" ||
        watermarkStatus === "paid" ||
        watermarkStatus === "missing-id";

      if (resolvedDownloadUrl && hasStableResolvedUrl) {
        return Promise.resolve({
          url: resolvedDownloadUrl,
          isWatermarkedDownload,
        });
      }

      const requestKey = `${imageItemId ?? "no-id"}-${imageUrl}`;

      const canReuseExistingRequest = Boolean(
        watermarkRequestPromiseRef.current &&
        watermarkRequestKeyRef.current === requestKey &&
        (!waitForWatermark || watermarkRequestModeRef.current === "download")
      );

      if (canReuseExistingRequest) {
        return watermarkRequestPromiseRef.current as Promise<ResolvedWatermarkResult>;
      }

      const requestPromise = (async () => {
        if (typeof imageItemId !== "number") {
          if (!silent) {
            showToast(
              "info",
              "ID gambar untuk watermark tidak ditemukan, download file original."
            );
          }

          const fallbackResult = {
            url: imageUrl,
            isWatermarkedDownload: false,
          };
          setResolvedDownloadUrl(fallbackResult.url);
          setIsWatermarkedDownload(fallbackResult.isWatermarkedDownload);
          setWatermarkStatus("missing-id");
          return fallbackResult;
        }

        setWatermarkStatus("loading");

        const maxAttempts = waitForWatermark
          ? Math.max(
            1,
            Math.ceil(
              WATERMARK_POLL_TIMEOUT_MS / WATERMARK_POLL_INTERVAL_MS
            ) + 1
          )
          : 1;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            const watermarkRes = await getImageWatermark({
              generatedImagePostItemId: imageItemId,
            });
            const watermarkData: ImageWatermarkRes | undefined =
              watermarkRes.data?.data;
            const watermarkUrl = watermarkData?.imageUrls?.[0];
            const canUseWatermark = Boolean(
              watermarkData?.generatedImagePostItemId === imageItemId &&
              watermarkData?.isWatermarked &&
              watermarkData?.isCached &&
              watermarkUrl
            );

            if (canUseWatermark && watermarkUrl) {
              setWatermarkedImageUrl(watermarkUrl);
              setResolvedDownloadUrl(watermarkUrl);
              setIsWatermarkedDownload(true);
              setWatermarkStatus("ready");

              return {
                url: watermarkUrl,
                isWatermarkedDownload: true,
              };
            }

            if (waitForWatermark && attempt < maxAttempts) {
              setWatermarkStatus("pending");
              await sleep(WATERMARK_POLL_INTERVAL_MS);
              continue;
            }

            const fallbackResult = {
              url: imageUrl,
              isWatermarkedDownload: false,
            };

            setIsWatermarkedDownload(false);
            setWatermarkStatus("pending");

            if (!silent) {
              showToast(
                "info",
                "Watermark belum siap, download file original untuk sementara."
              );
            }

            return fallbackResult;
          } catch {
            const isLastAttempt = attempt >= maxAttempts;

            if (!isLastAttempt && waitForWatermark) {
              setWatermarkStatus("pending");
              await sleep(WATERMARK_POLL_INTERVAL_MS);
              continue;
            }

            if (!silent) {
              showToast(
                "warning",
                "Gagal ambil watermark, download file original."
              );
            }

            setIsWatermarkedDownload(false);
            setWatermarkStatus("error");

            return {
              url: imageUrl,
              isWatermarkedDownload: false,
            };
          }
        }

        return {
          url: imageUrl,
          isWatermarkedDownload: false,
        };
      })();

      watermarkRequestKeyRef.current = requestKey;
      watermarkRequestPromiseRef.current = requestPromise;
      watermarkRequestModeRef.current = waitForWatermark ? "download" : "preview";

      return requestPromise.finally(() => {
        watermarkRequestPromiseRef.current = null;
        watermarkRequestModeRef.current = null;
      });
    },
    [
      aiModels.isFreeUser,
      getImageWatermark,
      imageItemId,
      imageUrl,
      isWatermarkedDownload,
      resolvedDownloadUrl,
      watermarkStatus,
    ]
  );

  useEffect(() => {
    setWatermarkStatus("idle");
    setWatermarkedImageUrl(null);
    setResolvedDownloadUrl(null);
    setIsWatermarkedDownload(false);
    watermarkRequestKeyRef.current = null;
    watermarkRequestPromiseRef.current = null;
    watermarkRequestModeRef.current = null;
  }, [imageItemId, imageUrl]);

  useEffect(() => {
    if (
      !isOpen ||
      aiModels.isLoading ||
      !imageUrl ||
      watermarkStatus !== "idle"
    ) {
      return;
    }

    void resolveWatermarkImage({
      silent: true,
      waitForWatermark: true,
    });
  }, [
    aiModels.isLoading,
    imageUrl,
    isOpen,
    resolveWatermarkImage,
    watermarkStatus,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const waitForAccessResolution = useCallback(async () => {
    if (!aiModelsLoadingRef.current) {
      return;
    }

    const maxAttempts = Math.max(
      1,
      Math.ceil(
        ACCESS_RESOLUTION_TIMEOUT_MS / ACCESS_RESOLUTION_POLL_INTERVAL_MS
      )
    );

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!aiModelsLoadingRef.current) {
        return;
      }

      await sleep(ACCESS_RESOLUTION_POLL_INTERVAL_MS);
    }

    throw new Error("ACCESS_RESOLUTION_TIMEOUT");
  }, []);

  const handleDownload = async () => {
    if (!imageUrl || isDownloading) return;

    setIsDownloading(true);
    try {
      await waitForAccessResolution();
      const { url: downloadUrl, isWatermarkedDownload } =
        await resolveWatermarkImage({ waitForWatermark: true });
      const fileName = buildDownloadFileName(
        downloadUrl,
        isWatermarkedDownload ? "generated-watermarked" : "generated"
      );

      try {
        await downloadImageFile(downloadUrl, fileName);
      } catch {
        triggerBrowserDownload(downloadUrl, fileName);
      }
    } catch {
      showToast(
        "error",
        "Gagal memverifikasi akses download gambar. Coba lagi sebentar."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const displayedImageUrl =
    watermarkedImageUrl || imageUrl || DEFAULT_PLACEHOLDER_IMAGE;
  const handleProtectedInteraction = (
    event:
      | React.MouseEvent<HTMLElement>
      | React.DragEvent<HTMLElement>
  ) => {
    if (!protectFromContextMenu) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const protectedImageStyle = protectFromContextMenu
    ? ({
      WebkitTouchCallout: "none",
      userSelect: "none",
    } as const)
    : undefined;

  const fullscreenPreview = isOpen ? (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[100] flex h-dvh w-screen items-center justify-center overflow-hidden bg-black/90"
      role="dialog"
      onClick={() => setIsOpen(false)}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Download image preview"
        aria-disabled={isDownloading || !imageUrl}
        className="absolute right-4 top-4 z-[101] size-12 rounded-full bg-primary text-white hover:bg-primary/80 hover:text-white"
        onClick={(event) => {
          event.stopPropagation();
          if (isDownloading || !imageUrl) return;
          void handleDownload();
        }}
      >
        {isDownloading ? (
          <Loader2 className="h-10 w-10 animate-spin" />
        ) : (
          <Download className="h-10 w-10" />
        )}
      </Button>

      <div
        className="flex h-dvh w-screen items-center justify-center overflow-hidden"
        onContextMenu={handleProtectedInteraction}
        onDragStart={handleProtectedInteraction}
      >
        <Image
          src={displayedImageUrl}
          alt={`${alt} fullscreen`}
          width={1440}
          height={1440}
          draggable={false}
          style={protectedImageStyle}
          className="h-auto max-h-[100dvh] w-auto max-w-[100vw] cursor-zoom-out object-contain shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="block w-full max-w-[360px] rounded-lg"
        onClick={() => setIsOpen(true)}
        onContextMenu={handleProtectedInteraction}
        onDragStart={handleProtectedInteraction}
      >
        <Image
          src={displayedImageUrl}
          alt={alt}
          width={width}
          height={height}
          draggable={false}
          style={protectedImageStyle}
          className={
            className ||
            "aspect-square w-full max-w-[360px] cursor-zoom-in rounded-lg border object-cover"
          }
        />
      </button>

      {isMounted && fullscreenPreview
        ? createPortal(fullscreenPreview, document.body)
        : null}
    </>
  );
}
