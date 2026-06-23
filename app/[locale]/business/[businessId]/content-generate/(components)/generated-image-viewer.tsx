"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useContentImageWatermarkGet } from "@/services/content/content.api";
import { Download, Loader2, Maximize2 } from "lucide-react";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { showToast } from "@/helper/show-toast";
import { ImageWatermarkRes } from "@/models/api/content/image.type";

const WATERMARK_POLL_INTERVAL_MS = 1500;
const WATERMARK_POLL_TIMEOUT_MS = 15000;

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
  const mGetImageWatermark = useContentImageWatermarkGet();
  const watermarkRequestKeyRef = useRef<string | null>(null);
  const watermarkRequestPromiseRef =
    useRef<Promise<ResolvedWatermarkResult> | null>(null);
  const watermarkRequestModeRef = useRef<"preview" | "download" | null>(null);

  const sleep = (ms: number) =>
    new Promise((resolve) => window.setTimeout(resolve, ms));

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
            const watermarkRes = await mGetImageWatermark.mutateAsync({
              generatedImagePostItemId: imageItemId,
            });
            const watermarkData: ImageWatermarkRes | undefined =
              watermarkRes.data?.data;
            const watermarkUrl = watermarkData?.imageUrls?.[0];
            const isPaidUser = watermarkData?.isFreeUser === false;
            const isFreeUser = watermarkData?.isFreeUser === true;
            const canUseWatermark = Boolean(
              watermarkData?.generatedImagePostItemId === imageItemId &&
                isFreeUser &&
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

            if (isPaidUser) {
              const paidResult = {
                url: imageUrl,
                isWatermarkedDownload: false,
              };

              setResolvedDownloadUrl(paidResult.url);
              setIsWatermarkedDownload(false);
              setWatermarkStatus("paid");
              return paidResult;
            }

            if (isFreeUser && waitForWatermark && attempt < maxAttempts) {
              setWatermarkStatus("pending");
              await sleep(WATERMARK_POLL_INTERVAL_MS);
              continue;
            }

            const fallbackResult = {
              url: imageUrl,
              isWatermarkedDownload: false,
            };

            setIsWatermarkedDownload(false);
            setWatermarkStatus(isFreeUser ? "pending" : "error");

            if (!silent) {
              showToast(
                "info",
                isFreeUser
                  ? "Watermark belum siap, download file original untuk sementara."
                  : "Watermark tidak tersedia untuk gambar ini, download file original."
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
      imageItemId,
      imageUrl,
      isWatermarkedDownload,
      mGetImageWatermark,
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
    if (!isOpen || !imageUrl || watermarkStatus !== "idle") return;

    void resolveWatermarkImage({ silent: true });
  }, [imageUrl, isOpen, resolveWatermarkImage, watermarkStatus]);

  const handleDownload = async () => {
    if (!imageUrl || isDownloading) return;

    setIsDownloading(true);
    try {
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
      showToast("error", "Gagal mendownload gambar.");
    } finally {
      setIsDownloading(false);
    }
  };

  const fullscreenImageUrl =
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
          src={imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className=""
          onContextMenu={handleProtectedInteraction}
          onDragStart={handleProtectedInteraction}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4" />
              Fullscreen Preview
            </DialogTitle>
            <DialogDescription>
              Download Image Preview
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 self-center">
            <Image
              src={fullscreenImageUrl}
              alt={`${alt} fullscreen`}
              width={1440}
              height={1440}
              draggable={false}
              style={protectedImageStyle}
              className="h-auto w-auto rounded-lg border object-contain"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading || !imageUrl}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
