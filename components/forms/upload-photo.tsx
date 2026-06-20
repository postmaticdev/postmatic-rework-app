"use client";

import { Dispatch, SetStateAction, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Info, Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { showToast } from "@/helper/show-toast";
import { helperService } from "@/services/helper.api";

interface UploadPhotoProps {
  label: string;
  onImageChange:
    | Dispatch<SetStateAction<string | null>>
    | ((url: string | null) => void);
  currentImage?: string | null;
  error?: string;
  onFocus?: () => void;
  emptyText?: string;
  uploadingText?: string;
}

export function UploadPhoto({
  label,
  onImageChange,
  currentImage,
  error,
  onFocus,
  emptyText = "Upload Photo",
  uploadingText = "Uploading...",
}: UploadPhotoProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const autoId = useId();
  const inputId = `upload-${autoId}`;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0] || null;

      if (file) {
        setIsUploading(true);
        const response = await helperService.uploadSingleImage({ image: file });
        onImageChange(response);
        setPreview(response);
      } else {
        setPreview(null);
        onImageChange(null);
      }
    } catch (error) {
      showToast("error", error);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground" htmlFor={inputId}>
        {label}
      </Label>

      <div
        role="button"
        tabIndex={0}
        className={`flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 transition-colors hover:bg-muted/30 sm:h-40 sm:w-40 ${
          error ? "border-red-500" : "border-muted-foreground/25"
        }`}
        onClick={() => {
          onFocus?.();
          inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">{uploadingText}</span>
          </div>
        ) : preview ? (
          <Image
            src={preview}
            alt="Preview"
            width={400}
            height={400}
            className="h-full w-full rounded-lg object-cover"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-sm">{emptyText}</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-1">
          <Info className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}
