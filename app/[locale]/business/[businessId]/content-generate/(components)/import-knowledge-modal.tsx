"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooterWithTwoButtons,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type KnowledgeImageOption = {
  id: string;
  imageUrl: string;
  sourceLabel: string;
  title: string;
};

type KnowledgeTab = "logo" | "product" | "avatar";

interface ImportKnowledgeModalProps {
  isLoadingAvatars: boolean;
  isOpen: boolean;
  logoImageOptions: KnowledgeImageOption[];
  onAddSelected: (images: string[]) => void;
  onClose: () => void;
  productImageOptions: KnowledgeImageOption[];
  avatarImageOptions: KnowledgeImageOption[];
}

export function ImportKnowledgeModal({
  isLoadingAvatars,
  isOpen,
  logoImageOptions,
  onAddSelected,
  onClose,
  productImageOptions,
  avatarImageOptions,
}: ImportKnowledgeModalProps) {
  const avatarT = useTranslations("avatarKnowledge");
  const t = useTranslations("generationPanel");
  const [selectedKnowledgeImages, setSelectedKnowledgeImages] = useState<
    string[]
  >([]);
  const [activeKnowledgeTab, setActiveKnowledgeTab] =
    useState<KnowledgeTab>("logo");

  useEffect(() => {
    if (!isOpen) {
      setSelectedKnowledgeImages([]);
      setActiveKnowledgeTab("logo");
    }
  }, [isOpen]);

  const currentKnowledgeOptions = useMemo<KnowledgeImageOption[]>(() => {
    if (activeKnowledgeTab === "logo") return logoImageOptions;
    if (activeKnowledgeTab === "product") return productImageOptions;
    return avatarImageOptions;
  }, [activeKnowledgeTab, avatarImageOptions, logoImageOptions, productImageOptions]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("importFromKnowledgeTitle")}</DialogTitle>
          <DialogDescription>{t("importFromKnowledgeDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="flex flex-row justify-between overflow-x-auto rounded-lg bg-card p-1">
            {([
              { id: "logo", label: t("knowledgeTabLogo") },
              { id: "product", label: t("knowledgeTabProduct") },
              { id: "avatar", label: t("knowledgeTabAvatar") },
            ] as const).map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={activeKnowledgeTab === tab.id ? "default" : "ghost"}
                onClick={() => setActiveKnowledgeTab(tab.id)}
                className={cn(
                  "flex-1 p-5",
                  activeKnowledgeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {activeKnowledgeTab === "avatar" && isLoadingAvatars ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{avatarT("loading")}</span>
              </div>
            </div>
          ) : currentKnowledgeOptions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {activeKnowledgeTab === "logo"
                ? t("noLogoFound")
                : activeKnowledgeTab === "product"
                ? t("noProductImagesFound")
                : avatarT("notAvailableDescription")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {currentKnowledgeOptions.map((item) => {
                const isSelected = selectedKnowledgeImages.includes(item.imageUrl);

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "group overflow-hidden rounded-xl border bg-card text-left transition-all duration-300",
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                        : "border-border hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                    )}
                    onClick={() =>
                      setSelectedKnowledgeImages((current) =>
                        current.includes(item.imageUrl)
                          ? current.filter((imageUrl) => imageUrl !== item.imageUrl)
                          : [...current, item.imageUrl]
                      )
                    }
                  >
                    <div className="overflow-hidden">
                      <Image
                        src={item.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                        alt={item.title}
                        width={240}
                        height={180}
                        className="h-28 w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-110"
                      />
                    </div>
                    <div className="space-y-0.5 p-2.5">
                      <p className="line-clamp-1 text-xs font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.sourceLabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooterWithTwoButtons
          primaryButton={{
            message: t("addSelected"),
            onClick: () => {
              if (selectedKnowledgeImages.length === 0) return;
              onAddSelected(selectedKnowledgeImages);
            },
            className:
              selectedKnowledgeImages.length === 0
                ? "pointer-events-none opacity-50"
                : "",
          }}
          secondaryButton={{
            message: t("cancel"),
            onClick: onClose,
            variant: "outline",
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
