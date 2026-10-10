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
          <Card key={avatar.id} className="p-4 cursor-default">
            <div className="flex flex-row gap-2 justify-between">
              <div className="flex flex-row gap-3">
                <div className="aspect-square w-20 h-20 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                  <Image
                    src={avatar.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                    alt={avatar.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="flex-1 min-w-0 flex items-center">
                  <div>
                    <p className="line-clamp-2 text-sm font-medium">{avatar.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {avatar.source === "knowledge"
                        ? t("avatarSourceKnowledge")
                        : t("avatarSourceBrowse")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
