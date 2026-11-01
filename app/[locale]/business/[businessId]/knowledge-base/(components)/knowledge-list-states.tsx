"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function KnowledgeListLoading({ label }: { label?: string }) {
  const t = useTranslations("knowledgeBase");

  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label ?? t("loading")}</span>
    </div>
  );
}

export function KnowledgeListError({
  onRetry,
  isRetrying = false,
}: {
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  const t = useTranslations("knowledgeBase");

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium text-muted-foreground">{t("loadFailedTitle")}</p>
      <p className="text-sm text-muted-foreground">
        {t("loadFailedDescription")}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-2"
      >
        <RefreshCw className={isRetrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {t("retry")}
      </Button>
    </div>
  );
}

export function KnowledgeListLoadMore({
  onLoadMore,
  isLoading,
}: {
  onLoadMore: () => void;
  isLoading: boolean;
}) {
  const t = useTranslations("knowledgeBase");

  return (
    <div className="flex justify-center pt-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onLoadMore}
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLoading ? t("loadingMore") : t("loadMore")}
      </Button>
    </div>
  );
}
