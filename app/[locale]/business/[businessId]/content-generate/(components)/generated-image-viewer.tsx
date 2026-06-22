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

type GeneratedImageViewerProps = {
  imageUrl: string;
  imageItemId?: number;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

export function GeneratedImageViewer({
  imageUrl,
  imageItemId,
  alt,
  className,
  width = 800,
  height = 800,
}: GeneratedImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [watermarkedImageUrl, setWatermarkedImageUrl] = useState<string | null>(
    null
  );
  const [resolvedDownloadUrl, setResolvedDownloadUrl] = useState<string | null>(
    null
  );
  const [isWatermarkedDownload, setIsWatermarkedDownload] = useState(false);
  const mGetImageWatermark = useContentImageWatermarkGet();
  const watermarkRequestKeyRef = useRef<string | null>(null);
  const watermarkRequestPromiseRef = useRef<Promise<{
    url: string;
    isWatermarkedDownload: boolean;
  }> | null>(null);

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
    }: {
      silent?: boolean;
    } = {}) => {
      if (!imageUrl) {
        return Promise.resolve({
          url: "",
          isWatermarkedDownload: false,
        });
      }

      if (resolvedDownloadUrl) {
        return Promise.resolve({
          url: resolvedDownloadUrl,
          isWatermarkedDownload,
        });
      }

      const requestKey = `${imageItemId ?? "no-id"}-${imageUrl}`;

      if (
        watermarkRequestPromiseRef.current &&
        watermarkRequestKeyRef.current === requestKey
      ) {
        return watermarkRequestPromiseRef.current;
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
          return fallbackResult;
        }

        try {
          const watermarkRes = await mGetImageWatermark.mutateAsync({
            generatedImagePostItemId: imageItemId,
          });
          const watermarkData: ImageWatermarkRes | undefined =
            watermarkRes.data?.data;
          const watermarkUrl = watermarkData?.imageUrls?.[0];
          const isPaidUser = watermarkData?.isFreeUser === false;
          const canUseWatermark = Boolean(
            watermarkData?.generatedImagePostItemId === imageItemId &&
            watermarkData?.isFreeUser &&
              watermarkData?.isWatermarked &&
              watermarkData?.isCached &&
              watermarkUrl
          );

          const nextResult =
            canUseWatermark && watermarkUrl
              ? {
                  url: watermarkUrl,
                  isWatermarkedDownload: true,
                }
              : {
                  url: imageUrl,
                  isWatermarkedDownload: false,
                };

          if (nextResult.isWatermarkedDownload) {
            setWatermarkedImageUrl(nextResult.url);
          } else if (!silent && !isPaidUser) {
            showToast(
              "info",
              "Watermark tidak tersedia untuk gambar ini, download file original."
            );
          }

          setResolvedDownloadUrl(nextResult.url);
          setIsWatermarkedDownload(nextResult.isWatermarkedDownload);
          return nextResult;
        } catch {
          if (!silent) {
            showToast(
              "warning",
              "Gagal ambil watermark, download file original."
            );
          }

          const fallbackResult = {
            url: imageUrl,
            isWatermarkedDownload: false,
          };
          setResolvedDownloadUrl(fallbackResult.url);
          setIsWatermarkedDownload(fallbackResult.isWatermarkedDownload);
          return fallbackResult;
        } finally {
          watermarkRequestPromiseRef.current = null;
        }
      })();

      watermarkRequestKeyRef.current = requestKey;
      watermarkRequestPromiseRef.current = requestPromise;

      return requestPromise;
    },
    [
      imageItemId,
      imageUrl,
      isWatermarkedDownload,
      mGetImageWatermark,
      resolvedDownloadUrl,
    ]
  );

  useEffect(() => {
    setWatermarkedImageUrl(null);
    setResolvedDownloadUrl(null);
    setIsWatermarkedDownload(false);
    watermarkRequestKeyRef.current = null;
    watermarkRequestPromiseRef.current = null;
  }, [imageItemId, imageUrl]);

  useEffect(() => {
    if (!isOpen || !imageUrl || resolvedDownloadUrl) return;

    void resolveWatermarkImage({ silent: true });
  }, [imageUrl, isOpen, resolveWatermarkImage, resolvedDownloadUrl]);

  const handleDownload = async () => {
    if (!imageUrl || isDownloading) return;

    setIsDownloading(true);
    try {
      const { url: downloadUrl, isWatermarkedDownload } =
        await resolveWatermarkImage();
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

  return (
    <>
      <button
        type="button"
        className="block w-full max-w-[360px] rounded-lg"
        onClick={() => setIsOpen(true)}
      >
        <Image
          src={imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
          alt={alt}
          width={width}
          height={height}
          className={
            className ||
            "aspect-square w-full max-w-[360px] cursor-zoom-in rounded-lg border object-cover"
          }
        />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="">
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
