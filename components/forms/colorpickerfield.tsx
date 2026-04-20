// components/ColorPickerField.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorPickerFieldProps {
  label: string;
  /** 6-char hex without '#', e.g. "FF00FF" */
  value?: string;
  /** onChange must return 6-char hex without '#', e.g. "FF00FF" */
  onChange: (value: string) => void;
  error?: string;
  onFocus?: () => void;
}

function normalizeHex(input?: string) {
  const raw = (input ?? "").trim().replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(raw) ? raw : "FAFAFA";
}

function toHashHex(input?: string) {
  return `#${normalizeHex(input)}`;
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
  const [hexInput, setHexInput] = useState(stripHash(colorHash));
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(stripHash(colorHash));
  }, [colorHash]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsPickerOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPickerOpen]);

  const emitChange = (next: string) => {
    const normalized = stripHash(next);
    const current = (value ?? "").trim().replace(/^#/, "").toUpperCase();
    if (normalized !== current) {
      onChange(normalized);
    }
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <Label className="text-sm text-foreground">{label}</Label>

      <div className="relative" onFocus={onFocus}>
        <div
          className={cn(
            "flex h-10 items-center overflow-hidden rounded-2xl border bg-background transition focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
            error ? "border-red-500" : "border-border"
          )}
        >
          <button
            type="button"
            aria-label={`Open color picker for ${label}`}
            aria-expanded={isPickerOpen}
            aria-haspopup="dialog"
            onClick={() => setIsPickerOpen((open) => !open)}
            className="flex h-14 items-center justify-center border-r border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-inset"
          >
            <span
              className="size-6 rounded-md border border-black/5 shadow-sm"
              style={{ backgroundColor: colorHash }}
              title={colorHash}
            />
          </button>

          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              #
            </span>
            <Input
              type="text"
              value={hexInput}
              onChange={(e) => {
                const inputValue = e.target.value
                  .toUpperCase()
                  .replace(/[^0-9A-F]/g, "")
                  .slice(0, 6);

                setHexInput(inputValue);

                if (inputValue.length === 6) {
                  emitChange(inputValue);
                }
              }}
              onBlur={() => {
                setHexInput(stripHash(colorHash));
              }}
              placeholder="FAFAFA"
              maxLength={6}
              className="h-14 border-0 bg-transparent pl-8 font-mono text-sm uppercase text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {isPickerOpen && (
          <div className="absolute left-0 top-full z-50 mt-3 rounded-2xl border border-border bg-background p-3 shadow-lg">
            <HexColorPicker
              color={colorHash}
              onChange={(next) => {
                emitChange(next);
                setHexInput(stripHash(next));
              }}
            />
          </div>
        )}
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
