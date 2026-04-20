// components/ColorPickerField.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

interface ColorPickerFieldProps {
  label: string;
  /** 6-char hex without '#', e.g. "FF00FF" */
  value?: string;
  /** onChange must return 6-char hex without '#', e.g. "FF00FF" */
  onChange: (value: string) => void;
  error?: string;
  onFocus?: () => void;
}

function toHashHex(input?: string) {
  const raw = (input ?? "").trim().replace(/^#/, "");
  const isValidLen = raw.length === 3 || raw.length === 6 || raw.length === 8;
  // fallback gray-200
  return `#${isValidLen ? raw : "e5e7eb"}`;
}

function stripHash(inputWithHash: string) {
  return inputWithHash.replace(/^#/, "").toUpperCase();
}

export function ColorPickerField({
  label,
  value,
  onChange,
  error,
  onFocus,
}: ColorPickerFieldProps) {
  const colorHash = useMemo(() => toHashHex(value), [value]);
  const preview = colorHash;
  
  // Local state untuk input hex
  const [hexInput, setHexInput] = useState(stripHash(preview));

  // Sync hexInput dengan value prop (ketika color picker digunakan)
  useEffect(() => {
    setHexInput(stripHash(preview));
  }, [preview]);

  const  t  = useTranslations("colorPicker");

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>

      <div className="flex gap-4 items-start" onFocus={onFocus}>
        <HexColorPicker
          color={colorHash}
          onChange={(next) => {
            const nextNoHash = stripHash(next);
            // Hindari update tak perlu (mencegah render storm)
            if (nextNoHash !== (value ?? "").toUpperCase()) {
              onChange(nextNoHash); // kirim balik TANPA '#'
            }
          }}
        />

        <div className="flex flex-col items-start gap-2">
          <Label className="text-sm font-medium text-foreground">{t("previewColor")}</Label>
          <div
            className="border-2 border-border rounded-md w-25 h-15"
            style={{ backgroundColor: preview }}
            aria-label={`preview ${preview}`}
            title={preview}
          />
          <Label className="text-sm font-medium text-foreground">{t("setHex")}</Label>
          <Input
            type="text"
            value={hexInput}
            onChange={(e) => {
              const inputValue = e.target.value.toUpperCase().replace(/[^0-9A-F]/g, "");
              setHexInput(inputValue);
              
              // Validasi: harus 3, 6, atau 8 karakter
              if (inputValue.length === 3 || inputValue.length === 6 || inputValue.length === 8) {
                onChange(inputValue);
              }
            }}
            onBlur={() => {
              // Sinkronisasi dengan value saat blur
              setHexInput(stripHash(preview));
            }}
            placeholder="FFFFFF"
            maxLength={6}
            className="w-24 text-xs text-center font-mono"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1">
          <Info className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}
