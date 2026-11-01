"use client";

import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { useBusinessGridFilter } from "@/contexts/business-grid-context";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const SEARCH_DEBOUNCE_MS = 300;

export function ActionBar() {
  const router = useRouter();
  const t = useTranslations("actionBar");
  const handleNewBusiness = () => {
    router.push("/business/new-business");
  };

  const { filterQuery, setFilterQuery, viewMode, setViewMode } =
    useBusinessGridFilter();

  // Input lokal agar mengetik tidak memicu request per huruf; filter baru
  // dikirim setelah jeda dan selalu kembali ke halaman 1 (halaman lama bisa
  // melebihi jumlah halaman hasil pencarian).
  const [searchInput, setSearchInput] = useState(filterQuery.search || "");
  useEffect(() => {
    const nextSearch = searchInput.trim();
    if (nextSearch === (filterQuery.search || "")) return;
    const timeout = setTimeout(() => {
      setFilterQuery({ ...filterQuery, search: nextSearch, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput, filterQuery, setFilterQuery]);

  return (
    <div className="p-4 sm:p-6 border-b border-border">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="w-full sm:flex-1 flex items-center gap-2">
          <div className="w-full relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder={t("searchBusiness")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-muted/50 border-muted-foreground/20 focus:border-blue-500 w-full"
            />
          </div>

          {/* Mobile: satu tombol toggle grid/list di kanan search */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="sm:hidden shrink-0 text-muted-foreground hover:text-foreground"
            title={viewMode === "grid" ? t("listView") : t("galleryView")}
            aria-label={viewMode === "grid" ? t("listView") : t("galleryView")}
          >
            {viewMode === "grid" ? (
              <LayoutGrid className="w-4 h-4" />
            ) : (
              <List className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center rounded-lg border border-border bg-muted/40 p-1">
            <Button
              type="button"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-8 w-8 max-md:size-(--control-h-icon-sm) rounded-md transition-all",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={t("galleryView")}
              aria-label={t("galleryView")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 w-8 max-md:size-(--control-h-icon-sm) rounded-md transition-all",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={t("listView")}
              aria-label={t("listView")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleNewBusiness}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4" />
            {t("createBusiness")}
          </Button>
        </div>
      </div>
    </div>
  );
}

