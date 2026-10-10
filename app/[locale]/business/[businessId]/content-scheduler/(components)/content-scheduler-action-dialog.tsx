"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Sparkles, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface ContentSchedulerActionDialogProps {
  isOpen: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onUpload: () => void;
  onBuildWithAi: () => void;
}

export function ContentSchedulerActionDialog({
  isOpen,
  selectedDate,
  onClose,
  onUpload,
  onBuildWithAi,
}: ContentSchedulerActionDialogProps) {
  const t = useTranslations("contentScheduler");
  const locale = useLocale();

  const formattedDate = selectedDate
    ? new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(selectedDate)
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t("chooseActionTitle")}</DialogTitle>
          <DialogDescription>{formattedDate}</DialogDescription>
        </DialogHeader>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:p-6">
          <button
            type="button"
            onClick={onUpload}
            className="rounded-3xl border border-border bg-background-secondary p-6 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <div className="text-lg font-semibold">{t("uploadFile")}</div>
              <p className="text-sm text-muted-foreground">
                {t("uploadFileDescription")}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onBuildWithAi}
            className="rounded-3xl border border-border bg-background-secondary p-6 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <div className="text-lg font-semibold">{t("buildWithAi")}</div>
              <p className="text-sm text-muted-foreground">
                {t("buildWithAiDescription")}
              </p>
            </div>
          </button>
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>{t("selectedScheduleDateHint")}</span>
          </div>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
