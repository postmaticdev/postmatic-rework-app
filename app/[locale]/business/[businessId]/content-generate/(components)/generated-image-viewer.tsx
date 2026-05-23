"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useContentImageWatermarkGet } from "@/services/content/content.api";
import { Download, Loader2, Maximize2 } from "lucide-react";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { showToast } from "@/helper/show-toast";

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
  const mGetImageWatermark = useContentImageWatermarkGet();

  const handleDownload = async () => {
    if (!imageUrl || isDownloading) return;

    setIsDownloading(true);
    try {
      let downloadUrl = imageUrl;

      if (imageItemId) {
        try {
          const watermarkRes = await mGetImageWatermark.mutateAsync({
            generatedImagePostItemId: imageItemId,
          });
          if (!watermarkRes.data?.data?.isWatermarked) {
            showToast(
              "info",
              "Watermark tidak tersedia untuk gambar ini, download file original."
            );
          }
          const watermarkUrl = watermarkRes.data?.data?.imageUrls?.[0];
          if (watermarkUrl) {
            downloadUrl = watermarkUrl;
          }
        } catch {
          showToast(
            "warning",
            "Gagal ambil watermark, download file original."
          );
          // Keep original URL when watermark endpoint fails.
        }
      } else {
        showToast(
          "info",
          "ID gambar untuk watermark tidak ditemukan, download file original."
        );
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

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
        <DialogContent className="max-h-[92vh] max-w-5xl p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-medium">
              <Maximize2 className="h-4 w-4" />
              Fullscreen Preview
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center overflow-auto">
            <Image
              src={imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
              alt={`${alt} fullscreen`}
              width={1440}
              height={1440}
              className="h-auto max-h-[72vh] w-auto rounded-lg border object-contain"
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
