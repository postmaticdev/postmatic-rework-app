"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooterWithButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useDateFormat } from "@/hooks/use-date-format";
import { dateFormat } from "@/helper/date-format";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useContentAutoGenerateGetHistories } from "@/services/content/content.api";
import { LogoLoader } from "@/components/base/logo-loader";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  FilterQuery,
  initialPagination,
} from "@/models/api/base-response.type";
import { AutoGenerateHistoriesQuery } from "@/models/api/content/auto-generate";

interface AutoGenerateHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AutoGenerateHistoryModal({
  isOpen,
  onClose,
}: AutoGenerateHistoryModalProps) {
  const m = useTranslations("modal");
  const { formatDate } = useDateFormat();
  const { businessId } = useParams() as { businessId: string };
  const [query, setQuery] = useState<AutoGenerateHistoriesQuery>({
    sortBy: "createdAt",
    limit: 10,
    page: 1,
    sort: "desc",
  });

  const { data: historiesData, isLoading } = useContentAutoGenerateGetHistories(
    businessId,
    query
  );

  const histories = historiesData?.data?.data || [];

  const handleSetQuery = (newQuery: Partial<FilterQuery>) => {
    setQuery(prev => ({
      ...prev,
      page: newQuery.page ?? prev.page,
      limit: newQuery.limit ?? prev.limit,
      sortBy: newQuery.sortBy ?? prev.sortBy,
      sort: (newQuery.sort as 'asc' | 'desc') ?? prev.sort,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="">
        {/* Header */}
        <DialogHeader>
          <div>
            <DialogTitle>{m("autoGenerateHistoryTitle")}</DialogTitle>
            <DialogDescription>
              {m("autoGenerateHistoryDescription")}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LogoLoader />
            </div>
          ) : histories.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">{m("noHistoryFound")}</p>
            </div>
          ) : (
            histories.map((history) => (
              <div
                className="border rounded-lg bg-background-secondary"
                key={history.id}
              >
                <div className="p-4">
                  <div className="flex  flex-col sm:flex-row sm:items-start gap-3">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={
                          history.generatedImageContent?.images[0] ||
                          history.productKnowledge?.images[0] ||
                          DEFAULT_PLACEHOLDER_IMAGE
                        }
                        alt={history.productKnowledge?.name || ""}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-2">
                        <h4 className="font-semibold">
                          {history.productKnowledge?.name || "Unknown Product"}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              history.status === "success"
                                ? "bg-green-500 hover:bg-green-600"
                                : history.status === "failed"
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-yellow-500 hover:bg-yellow-600"
                            )}
                          >
                            {history.status}
                          </Badge>
                          {history.status === "failed" && (
                            <Badge variant="outline">{history.code}</Badge>
                          )}
                          {history.generatedImageContent?.ratio && (
                            <Badge variant="outline">
                              {history.generatedImageContent.ratio}
                            </Badge>
                          )}
                          {history.generatedImageContent?.designStyle && (
                            <Badge variant="outline">
                              {history.generatedImageContent.designStyle}
                            </Badge>
                          )}
                          {history.generatedImageContent?.category && (
                            <Badge variant="outline">
                              {history.generatedImageContent.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(new Date(history.createdAt))}{" "}
                            {dateFormat.getHhMm(new Date(history.createdAt))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {history.generatedImageContent?.caption && (
                    <div className="mt-2">
                      <span className="text-sm break-words">
                        {history.generatedImageContent.caption}
                      </span>
                    </div>
                  )}
                  {history.message && (
                    <div className="mt-2">
                      <span className="text-sm break-words text-red-500">
                        {history.message}
                      </span>
                    </div>
                  )}
                  {history.generatedImageContent?.postedImageContents &&
                    history.generatedImageContent.postedImageContents.length >
                      0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">
                          {m("postedTo")}:
                        </span>
                        {history.generatedImageContent.postedImageContents.map(
                          (posted) => (
                            <span key={posted.id} className="text-xs">
                              {mapEnumPlatform.getPlatformIcon(
                                posted.platform as PlatformEnum
                              )}
                            </span>
                          )
                        )}
                      </div>
                    )}
                </div>
              </div>
            ))
          )}
          <PaginationControls
                  pagination={
                    historiesData?.data?.pagination || initialPagination
                  }
                  filterQuery={query}
                  setFilterQuery={handleSetQuery}
                />
        </div>

        <DialogFooterWithButton buttonMessage={m("close")} onClick={onClose} />
      </DialogContent>
    </Dialog>
  );
}
