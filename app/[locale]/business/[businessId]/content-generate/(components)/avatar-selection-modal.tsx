"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useAppAvatarGetAll } from "@/services/app-avatar.api";
import { useBusinessAvatarGetAll } from "@/services/knowledge.api";
import { SelectedAvatarOption } from "@/contexts/content-generate-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooterWithTwoButtons,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AvatarTab = "knowledge" | "browse";

interface AvatarSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (items: SelectedAvatarOption[]) => void;
  selectedAvatars: SelectedAvatarOption[];
}

export function AvatarSelectionModal({
  isOpen,
  onClose,
  onSave,
  selectedAvatars,
}: AvatarSelectionModalProps) {
  const { businessId } = useParams() as { businessId: string };
  const t = useTranslations("generationPanel");
  const avatarT = useTranslations("avatarKnowledge");
  const [activeTab, setActiveTab] = useState<AvatarTab>("knowledge");
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelected, setTempSelected] = useState<SelectedAvatarOption[]>([]);

  const { data: businessAvatarData, isLoading: isLoadingBusinessAvatars } =
    useBusinessAvatarGetAll(
      businessId,
      {
        limit: 100,
        page: 1,
        sortBy: "name",
        sort: "asc",
      },
      Boolean(businessId) && isOpen
    );
  const { data: appAvatarData, isLoading: isLoadingAppAvatars } =
    useAppAvatarGetAll(
      {
        limit: 100,
        page: 1,
        sortBy: "name",
        sort: "asc",
      },
      isOpen
    );

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setActiveTab("knowledge");
      return;
    }

    setTempSelected(selectedAvatars.slice(0, 1));
  }, [isOpen, selectedAvatars]);

  const businessAvatarOptions = useMemo<SelectedAvatarOption[]>(() => {
    return (businessAvatarData?.data.data || []).map((avatar) => ({
      id: `knowledge-${avatar.id}`,
      imageUrl: avatar.imageUrl,
      title: avatar.name,
      source: "knowledge",
    }));
  }, [businessAvatarData?.data.data]);

  const browseAvatarOptions = useMemo<SelectedAvatarOption[]>(() => {
    return (appAvatarData?.data?.data || []).map((avatar) => ({
      id: `browse-${avatar.id}`,
      imageUrl: avatar.imageUrl,
      title: avatar.name,
      source: "browse",
    }));
  }, [appAvatarData?.data?.data]);

  const currentOptions = useMemo(() => {
    const baseOptions =
      activeTab === "knowledge" ? businessAvatarOptions : browseAvatarOptions;
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) return baseOptions;

    return baseOptions.filter((avatar) =>
      avatar.title.toLowerCase().includes(normalizedQuery)
    );
  }, [activeTab, browseAvatarOptions, businessAvatarOptions, searchQuery]);

  const isLoading =
    activeTab === "knowledge" ? isLoadingBusinessAvatars : isLoadingAppAvatars;

  const toggleAvatar = (item: SelectedAvatarOption) => {
    setTempSelected((current) =>
      current.some((avatar) => avatar.id === item.id)
        ? []
        : [item]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("selectAvatar")}</DialogTitle>
          <DialogDescription>{t("selectAvatarDescription")}</DialogDescription>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("searchAvatarPlaceholder")}
              className="pl-10"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          <div className="flex overflow-x-auto rounded-lg bg-card p-1">
            {([
              { id: "knowledge", label: t("avatarTabKnowledge") },
              { id: "browse", label: t("avatarTabBrowse") },
            ] as const).map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={activeTab === tab.id ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1",
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{avatarT("loading")}</span>
              </div>
            </div>
          ) : currentOptions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {activeTab === "knowledge"
                ? t("noKnowledgeAvatar")
                : t("noBrowseAvatar")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {currentOptions.map((item) => {
                const isSelected = tempSelected.some(
                  (avatar) => avatar.id === item.id
                );

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
                    onClick={() => toggleAvatar(item)}
                  >
                    <div className="relative overflow-hidden">
                      <Image
                        src={item.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                        alt={item.title}
                        width={240}
                        height={180}
                        className="h-28 w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-110"
                      />
                      {isSelected ? (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-0.5 p-2.5">
                      <p className="line-clamp-1 text-xs font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.source === "knowledge"
                          ? t("avatarSourceKnowledge")
                          : t("avatarSourceBrowse")}
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
            message: t("applyAvatarSelection"),
            onClick: () => onSave(tempSelected.slice(0, 1)),
            className:
              tempSelected.length === 0
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
