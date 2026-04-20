"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import { useTemplateImageCategories } from "@/services/template-category.api";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageCategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  onFocus?: () => void;
}

export function ImageCategoryDropdown({
  value,
  onChange,
  placeholder = "Pilih kategori gambar",
  label = "Kategori Gambar",
  error,
  onFocus,
}: ImageCategoryDropdownProps) {
  const { data: categoriesResponse, isLoading } = useTemplateImageCategories();
  const categories = categoriesResponse?.data?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <select
        className={`flex p-2 h-10 w-full items-center rounded-md border bg-background dark:bg-card px-3 py-2 text-sm shadow-xs ring-offset-background transition-[color,box-shadow] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-input focus:ring-ring"
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        aria-invalid={!!error}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      
      {error && (
        <div className="flex items-center gap-1">
          <Info className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}
