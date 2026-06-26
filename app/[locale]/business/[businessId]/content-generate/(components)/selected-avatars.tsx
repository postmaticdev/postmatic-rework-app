"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useContentGenerate } from "@/contexts/content-generate-context";

export function SelectedAvatars() {
  const { form, isLoading } = useContentGenerate();
  const t = useTranslations("generationPanel");

  if (form.basic.selectedAvatars.length === 0) return null;

  return (
    <div className="space-y-2" id="selected-avatars">
      <h3 className="text-sm font-medium">{t("selectedAvatars")}</h3>
      <div className="space-y-3">
        {form.basic.selectedAvatars.map((avatar) => (
          <Card key={avatar.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={avatar.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                    alt={avatar.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {avatar.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {avatar.source === "knowledge"
                      ? t("avatarSourceKnowledge")
                      : t("avatarSourceBrowse")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={isLoading}
                onClick={() => {
                  const nextAvatars = form.basic.selectedAvatars.filter(
                    (item) => item.id !== avatar.id
                  );
                  form.setBasic({
                    ...form.basic,
                    selectedAvatars: nextAvatars,
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
