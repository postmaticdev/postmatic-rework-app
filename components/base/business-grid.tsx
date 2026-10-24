"use client";

import { BusinessCard } from "@/components/base/business-card";
import { useBusinessGetAll } from "@/services/business.api";
import { useEffect, useState } from "react";
import { PaginationControls } from "../ui/pagination-controls";
import { MemberManagementModal } from "@/app/[locale]/business/[businessId]/settings/(components)/member-management-modal";
import { initialPagination } from "@/models/api/base-response.type";
import { ChartNoAxesCombined, RefreshCw } from "lucide-react";
import { NoContent } from "./no-content";
import { BusinessGridSkeleton } from "../grid-skeleton/business-grid-skeleton";
import { useBusinessGridFilter } from "@/contexts/business-grid-context";
import { useTranslations } from "next-intl";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

// Hanya kartu yang kemungkinan terlihat di layar pertama yang di-preload.
const PRIORITY_IMAGE_COUNT = 4;

export function BusinessGrid() {
  const { filterQuery, setFilterQuery, viewMode } = useBusinessGridFilter();

  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } =
    useBusinessGetAll(filterQuery);
  const businesses = data?.data?.data || [];
  const pagination = data?.data?.pagination || initialPagination;
  const t = useTranslations("businessGrid");

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null
  );

  // Setelah menghapus item terakhir di halaman terakhir, halaman aktif bisa
  // melebihi totalPages dan daftar tampil kosong; mundurkan ke halaman valid.
  const currentPage = filterQuery.page || 1;
  useEffect(() => {
    if (isPlaceholderData) return;
    if (pagination.totalPages > 0 && currentPage > pagination.totalPages) {
      setFilterQuery({ ...filterQuery, page: pagination.totalPages });
    }
  }, [
    isPlaceholderData,
    pagination.totalPages,
    currentPage,
    filterQuery,
    setFilterQuery,
  ]);

  const handleClickInvite = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setIsMemberModalOpen(true);
  };

  const hasLoadError = isError && !data;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Business Grid / List */}
      {isLoading ? (
        <BusinessGridSkeleton count={8} viewMode={viewMode} />
      ) : hasLoadError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <h3 className="text-lg font-medium text-muted-foreground">
            {t("errorTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("errorDescription")}
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            {t("retry")}
          </Button>
        </div>
      ) : businesses.length === 0 ? (
        <NoContent
          icon={ChartNoAxesCombined}
          title={t("emptyTitle")}
          titleDescription={t("emptyDescription")}
        />
      ) : (
        <div
          className={cn(
            "mt-4 md:mt-6 transition-opacity",
            viewMode === "list"
              ? "flex flex-col gap-3"
              : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6",
            isPlaceholderData && "opacity-60"
          )}
          aria-busy={isPlaceholderData}
        >
          {businesses.map((business, index) => (
            <BusinessCard
              key={business.id}
              business={business}
              variant={viewMode}
              priority={index < PRIORITY_IMAGE_COUNT}
              onClickInvite={() => handleClickInvite(business.id)}
            />
          ))}
        </div>
      )}

      {!hasLoadError && (
        <PaginationControls
          pagination={pagination}
          filterQuery={filterQuery}
          setFilterQuery={setFilterQuery}
        />
      )}

      <MemberManagementModal
        isOpen={isMemberModalOpen && selectedBusinessId !== null}
        onClose={() => {
          setIsMemberModalOpen(false);
          setSelectedBusinessId(null);
        }}
        businessIdFromProps={selectedBusinessId}
      />
    </div>
  );
}
