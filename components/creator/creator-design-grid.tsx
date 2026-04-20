"use client";

import { CreatorDesignCard } from "./creator-design-card";
import { CreatorDesign } from "@/models/api/creator/design";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { NoContent } from "@/components/base/no-content";
import { ChartNoAxesCombined } from "lucide-react";
import { SearchNotFound } from "../base/search-not-found";
import { useTranslations } from "next-intl";
import { PaginationControls } from "../ui/pagination-controls";
import { Pagination, FilterQuery } from "@/models/api/base-response.type";

interface CreatorDesignGridProps {
  designs: CreatorDesign[];
  isLoading: boolean;
  searchQuery: string;
  pagination: Pagination;
  filterQuery: Partial<FilterQuery>;
  setFilterQuery: (query: Partial<FilterQuery>) => void;
}

export function CreatorDesignGrid({ designs, isLoading, searchQuery, pagination, filterQuery, setFilterQuery }: CreatorDesignGridProps) {
  const t = useTranslations("creatorDesignInformation");
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="group transition-all duration-300 hover:scale-105 bg-card border-border shadow-sm">
            <CardContent className="py-4 md:py-6">
              <div className="space-y-3">
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }



  return (
    designs.length === 0 && searchQuery === "" ? (
      <NoContent
        icon={ChartNoAxesCombined}
        title={t("noDesignFound")}
        titleDescription={t("noDesignFoundDescription")}
        onButtonClick={() => {}} // This will be handled by the parent component
      />
    ) : designs.length === 0 ? (
      <SearchNotFound description="" />
    ) : (
      <div className="space-y-6">

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {designs.map((design) => (
        <CreatorDesignCard key={design.id} design={design} />
      ))}
    </div>
    <PaginationControls
    pagination={pagination}
    filterQuery={filterQuery}
    setFilterQuery={setFilterQuery}
    />
    </div>
    )
  );
}
