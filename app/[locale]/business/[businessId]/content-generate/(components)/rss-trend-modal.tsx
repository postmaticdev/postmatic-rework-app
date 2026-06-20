"use client";

import { FilterQuery, Pagination } from "@/models/api/base-response.type";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GenerateFormSelectRss } from "./generate-form-select-rss";

interface RssTrendModalProps {
  filterQuery: Partial<FilterQuery>;
  hasSelectedRss: boolean;
  isOpen: boolean;
  onClose: () => void;
  pagination: Pagination;
  setFilterQuery: (query: Partial<FilterQuery>) => void;
  title: string;
}

export function RssTrendModal({
  filterQuery,
  hasSelectedRss,
  isOpen,
  onClose,
  pagination,
  setFilterQuery,
  title,
}: RssTrendModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <GenerateFormSelectRss onArticleSelected={onClose} />
        </div>
        {!hasSelectedRss && pagination.total !== 0 && (
          <DialogFooter>
            <PaginationControls
              pagination={pagination}
              setFilterQuery={setFilterQuery}
              filterQuery={filterQuery}
              className="border-t-0 pt-0"
            />
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
