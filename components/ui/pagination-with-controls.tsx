"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination, FilterQuery } from "@/models/api/base-response.type";
import { TemplateProductCategoryRes } from "@/models/api/library/template.type";
import { useTranslations } from "next-intl";

/**
 * PaginationWithControls Component
 *
 * A comprehensive pagination component that includes sorting, filtering, and pagination controls.
 * Uses the Pagination and FilterQuery interfaces from base-response.type.ts for API consistency.
 *
 * Features:
 * - Sort by different fields (createdAt, updatedAt, name, downloads, rating)
 * - Sort order toggle (asc/desc) with visual indicators
 * - Items per page selection (5, 10, 20, 50)
 * - Results counter showing current range and total
 * - Responsive design with mobile-first approach
 * - Reusable and customizable sort options
 *
 * @param pagination - Pagination object containing page info
 * @param filterQuery - Filter query object containing search and sort parameters
 * @param onPageChange - Callback when page changes
 * @param onSortChange - Callback when sort parameters change
 * @param onLimitChange - Callback when items per page changes
 * @param totalItems - Total number of items (optional, for results counter)
 * @param className - Optional additional CSS classes
 * @param sortOptions - Custom sort options (optional)
 * @param limitOptions - Custom limit options (optional)
 */

interface PaginationWithControlsProps {
  pagination: Pagination;
  filterQuery?: Partial<FilterQuery>;
  setFilterQuery: (q: Partial<FilterQuery>) => void;
  sortOptions?: SortOption[];
  productCategories?: TemplateProductCategoryRes[];
  className?: string;
  currData: number;
  showSort?: boolean;
}

interface SortOption {
  label: string;
  value: string;
}

export function PaginationWithControls({
  pagination,
  filterQuery,
  className = "",
  sortOptions = [],
  productCategories = [],
  setFilterQuery,
  currData,
  showSort = true,
}: PaginationWithControlsProps) {
  const limitOptions = [5, 10, 20, 50];

  const sort = filterQuery?.productCategory || "all";


  // Generate sort options from product categories
  const productCategorySortOptions: SortOption[] = productCategories.map(category => ({
    label: category.indonesianName,
    value: category.id,
  }));

  const allSortOptions: SortOption[] = [
    {
      label: "Semua",
      value: "all",
    },
    ...sortOptions,
    ...productCategorySortOptions,
  ];

  const t = useTranslations("paginationControls");

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        {/* Sort Controls */}
        {showSort ? (
          <div className="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="flex gap-2">
              <Select
                value={sort}
                onValueChange={(value: string) =>
                  setFilterQuery({
                    ...filterQuery,
                    productCategory: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {allSortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              
            </div>
            <Select
              value={pagination?.limit.toString()}
              onValueChange={(value) => {
                setFilterQuery({
                  ...filterQuery,
                  limit: parseInt(value) || 10,
                });
              }}
            >
              <SelectTrigger className="w-[100px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {limitOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {/* Results Info */}

        <div className="text-xs text-muted-foreground">
          {t("showing")} {currData} {t("of")} {pagination.total} {t("results")}
        </div>
        {!showSort && (
          <Select
            value={pagination?.limit.toString()}
            onValueChange={(value) => {
              setFilterQuery({
                ...filterQuery,
                limit: parseInt(value) || 10,
              });
            }}
          >
            <SelectTrigger className="w-[100px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {limitOptions.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
