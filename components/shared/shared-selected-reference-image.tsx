"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

interface SharedSelectedReferenceImageProps {
  referenceImage: string | null;
  referenceImageName: string | null;
  referenceImagePublisher?: string | null;
  onRemove: () => void;
  isLoading?: boolean;
  idSelector?: string;
}

export const SharedSelectedReferenceImage = ({
  referenceImage,
  referenceImageName,
  referenceImagePublisher,
  onRemove,
  isLoading = false,
  idSelector = "selected-reference-image"
}: SharedSelectedReferenceImageProps) => {
  const t = useTranslations("generationPanel");

  if (!referenceImage) return null;

  return (
    <div className="space-y-2" id={idSelector}>
      <h3 className="font-medium text-sm">{t("selectedReferenceImage")}</h3>
      <Card className="p-4">
        <div className="flex flex-row gap-2 justify-between">
          <div className="flex flex-row gap-3">
            <div className="aspect-square w-20 h-20 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
              <Image
                src={referenceImage}
                alt={referenceImageName || ""}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="mb-2 line-clamp-2 text-sm">{referenceImageName}</p>
              {referenceImagePublisher && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  Publisher: {referenceImagePublisher}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="destructive"
              size="lg"
              className="h-20 w-20 flex-shrink-0"
              onClick={onRemove}
              disabled={isLoading}
            >
              <Trash2 className="size-8" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

