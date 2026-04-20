"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCreatorDesign } from "@/contexts/creator-design-context";
import { CreatorDesignGrid } from "@/components/creator/creator-design-grid";
import { CreatorDesignFormModal } from "@/components/creator/creator-design-form-modal";

export function CreatorDesignInformation() {
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslations("creatorDesignInformation");
  
  const {
    designs,
    isLoading,
    setQuery,
    openCreateModal,
    pagination,
    filterQuery,
  } = useCreatorDesign();

  // Update search query in context when search changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setQuery((prev) => ({
        ...prev,
        search: searchQuery || undefined,
      }));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, setQuery]);

  return (
    <>
      <Card>
        <CardContent className="py-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            {t("title")}
          </h2>

          {/* Search and Create Section */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("searchPlaceholder")}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              onClick={openCreateModal}
            >
              <Plus className="w-4 h-4" />
              {t("createNew")}
            </Button>
          </div>

          {/* Designs Grid */}
          <CreatorDesignGrid 
            designs={designs} 
            isLoading={isLoading} 
            searchQuery={searchQuery}
            pagination={pagination}
            filterQuery={filterQuery}
            setFilterQuery={setQuery}
          />
        </CardContent>
      </Card>

      {/* Form Modal */}
      <CreatorDesignFormModal />
    </>
  );
}
