"use client";

import { Label } from "@/components/ui/label";
import { showToast } from "@/helper/show-toast";
import { helperService } from "@/services/helper.api";
import { Image as ImageIcon, Info, Loader2 } from "lucide-react";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useRef, useState, useId } from "react";

interface UploadPhotoProps {
  label: string;
  onImageChange:
    | Dispatch<SetStateAction<string | null>>
    | ((url: string | null) => void);
  currentImage?: string | null;
  error?: string;
  onFocus?: () => void;
}

export function UploadPhoto({
  label,
  onImageChange,
  currentImage,
  error,
  onFocus,
}: UploadPhotoProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);

  // ⬇️ sinkronkan jika currentImage berubah (mis. saat load data edit)
  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const autoId = useId(); // fallback id yang stabil
  const inputId = `upload-${autoId}`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0] || null;
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
      // reset value supaya memilih file yang sama dua kali tetap memicu onChange
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
        className={`w-32 h-32 sm:w-40 sm:h-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors ${
          error ? "border-red-500" : "border-muted-foreground/25"
        }`}
        onClick={() => {
          onFocus?.();
          inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Uploading...</span>
          </div>
        ) : preview ? (
          <Image
            src={preview}
            alt="Preview"
            width={400}
            height={400}
            className="w-full h-full object-cover rounded-lg"
            unoptimized   // ⬅️ hilangkan kalau domain sudah di next.config.js
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="w-8 h-8" />
            <span className="text-sm">Upload Photo</span>
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
          <Info className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}
