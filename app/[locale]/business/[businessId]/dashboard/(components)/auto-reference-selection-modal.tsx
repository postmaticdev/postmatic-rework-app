"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { AutoGenerateReferenceOption } from "@/contexts/auto-generate-context";
import {
  useCreatorImageTemplates,
  useLibraryTemplateGetSaved,
} from "@/services/library.api";
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

type ReferenceTab = "library" | "saved";

// One page is enough to pick from; the search narrows it down.
const REFERENCE_PAGE_LIMIT = 60;
const SEARCH_DEBOUNCE_MS = 400;

interface AutoReferenceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: AutoGenerateReferenceOption | null) => void;
  selectedReference: AutoGenerateReferenceOption | null;
}

/**
 * Picks the design reference of a repetition rule from the Postmatic library or the business's saved
 * references (own uploads included). Every option is a creator image, sent as referenceImageIds.
 */
export function AutoReferenceSelectionModal({
  isOpen,
  onClose,
  onSave,
  selectedReference,
}: AutoReferenceSelectionModalProps) {
  const { businessId } = useParams() as { businessId: string };
  const t = useTranslations("autoGenerate");
  const tPanel = useTranslations("generationPanel");
  const [activeTab, setActiveTab] = useState<ReferenceTab>("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tempSelected, setTempSelected] =
    useState<AutoGenerateReferenceOption | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setDebouncedSearch("");
      setActiveTab("library");
      return;
    }
    setTempSelected(selectedReference);
  }, [isOpen, selectedReference]);

  const query = useMemo(
    () => ({
      search: debouncedSearch,
      page: 1,
      limit: REFERENCE_PAGE_LIMIT,
      sortBy: "createdAt",
      sort: "desc",
    }),
    [debouncedSearch]
  );

  const { data: libraryRes, isLoading: isLoadingLibrary } = useCreatorImageTemplates(
    query,
    isOpen && activeTab === "library",
    businessId
  );
  const { data: savedRes, isLoading: isLoadingSaved } = useLibraryTemplateGetSaved(
    businessId,
    query,
    isOpen && activeTab === "saved"
  );

  const libraryOptions = useMemo<AutoGenerateReferenceOption[]>(
    () =>
      (libraryRes?.data?.data || []).map((item) => ({
        id: Number(item.id),
        name: item.name,
        imageUrl: item.imageUrl,
      })),
    [libraryRes?.data?.data]
  );
  const savedOptions = useMemo<AutoGenerateReferenceOption[]>(
    () =>
      (savedRes?.data?.data || []).map((item) => ({
        id: Number(item.templateImageContent?.id),
        name: item.name,
        imageUrl: item.imageUrl,
      })),
    [savedRes?.data?.data]
  );

  const options = (activeTab === "library" ? libraryOptions : savedOptions).filter(
    (item) => Number.isInteger(item.id) && item.id > 0 && item.imageUrl
  );
  const isLoading = activeTab === "library" ? isLoadingLibrary : isLoadingSaved;

  const toggleReference = (item: AutoGenerateReferenceOption) => {
    setTempSelected((current) => (current?.id === item.id ? null : item));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("selectDesignReference")}</DialogTitle>
          <DialogDescription>{t("selectDesignReferenceDescription")}</DialogDescription>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("searchDesignReference")}
              className="pl-10"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-6 sm:p-6">
          <div className="flex overflow-x-auto rounded-lg bg-card p-1">
            {([
              { id: "library", label: t("designReferenceTabLibrary") },
              { id: "saved", label: t("designReferenceTabSaved") },
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
                <span>{t("loadingDesignReference")}</span>
              </div>
            </div>
          ) : options.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t("noDesignReference")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {options.map((item) => {
                const isSelected = tempSelected?.id === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.name}
                    aria-label={item.name}
                    aria-pressed={isSelected}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-xl border bg-card transition-all duration-300",
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                        : "border-border hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                    )}
                    onClick={() => toggleReference(item)}
                  >
                    <Image
                      src={item.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                      alt={item.name}
                      width={240}
                      height={240}
                      unoptimized
                      className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-110"
                    />
                    {isSelected ? (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooterWithTwoButtons
          primaryButton={{
            message: t("applyDesignReference"),
            onClick: () => onSave(tempSelected),
            icon: <Check className="h-4 w-4" />,
            className: tempSelected === null ? "pointer-events-none opacity-50" : "",
          }}
          secondaryButton={{
            message: tPanel("cancel"),
            onClick: onClose,
            variant: "outline",
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
