"use client";

import { Dispatch, SetStateAction, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Info, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { showToast } from "@/helper/show-toast";
import { helperService } from "@/services/helper.api";

interface UploadPhotoProps {
  label: string;
  onImageChange?:
    | Dispatch<SetStateAction<string | null>>
    | ((url: string | null) => void);
  currentImage?: string | null;
  onImagesChange?:
    | Dispatch<SetStateAction<string[]>>
    | ((urls: string[]) => void);
  currentImages?: string[];
  multiple?: boolean;
  error?: string;
  onFocus?: () => void;
  emptyText?: string;
  uploadingText?: string;
}

export function UploadPhoto({
  label,
  onImageChange,
  currentImage,
  onImagesChange,
  currentImages = [],
  multiple = false,
  error,
  onFocus,
  emptyText = "Upload Photo",
  uploadingText = "Uploading...",
}: UploadPhotoProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [previews, setPreviews] = useState<string[]>(currentImages);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  useEffect(() => {
    setPreviews(currentImages);
  }, [currentImages]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const autoId = useId();
  const inputId = `upload-${autoId}`;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = Array.from(event.target.files || []);

      if (files.length > 0) {
        setIsUploading(true);
        const uploadedImages = await Promise.all(
          files.map((file) => helperService.uploadSingleImage({ image: file }))
        );

        if (multiple) {
          const nextImages = Array.from(
            new Set([...previews, ...uploadedImages])
          );
          onImagesChange?.(nextImages);
          setPreviews(nextImages);
        } else {
          const response = uploadedImages[0] || null;
          onImageChange?.(response);
          setPreview(response);
        }
      } else {
        if (multiple) {
          setPreviews([]);
          onImagesChange?.([]);
        } else {
          setPreview(null);
          onImageChange?.(null);
        }
      }
    } catch (error) {
      showToast("error", error);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const nextImages = previews.filter((_, index) => index !== indexToRemove);
    setPreviews(nextImages);
    onImagesChange?.(nextImages);
  };

  if (multiple) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground" htmlFor={inputId}>
          {label}
        </Label>

        <div className="flex flex-wrap gap-3">
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
                <span className="text-center text-sm">{uploadingText}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <span className="text-center text-sm">{emptyText}</span>
              </div>
            )}
          </div>

          {previews.map((imageUrl, index) => (
            <div key={`${imageUrl}-${index}`} className="relative">
              <Image
                src={imageUrl}
                alt={`Preview ${index + 1}`}
                width={400}
                height={400}
                className="h-32 w-32 rounded-lg object-cover sm:h-40 sm:w-40"
                unoptimized
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -right-2 -top-2 h-7 w-7 rounded-full"
                onClick={() => handleRemoveImage(index)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple
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
