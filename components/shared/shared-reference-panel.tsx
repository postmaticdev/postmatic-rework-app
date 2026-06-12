"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, Upload, Loader2 } from "lucide-react";
import {
  PaginationControls,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { helperService } from "@/services/helper.api";
import { useLibraryTemplateGetCategory } from "@/services/library.api";
import { showToast } from "@/helper/show-toast";
import { TemplateGridSkeleton } from "@/components/grid-skeleton/template-grid-skeleton";
import { useTranslations } from "next-intl";
import { SharedTemplateCard } from "@/components/shared/shared-template-card";
import { SharedReferenceFullviewModal } from "@/components/shared/shared-reference-fullview-modal";
import { SearchNotFound } from "@/components/base/search-not-found";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";

import { Pagination, FilterQuery } from "@/models/api/base-response.type";

// Template interface that works for both contexts
export interface Template {
  id: string;
  name: string;
  imageUrl: string;
  categories: string[];
  productCategories: string[];
  publisher: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  price: 0;
  type: "saved" | "published";
}

interface SharedReferencePanelProps {
  publishedTemplates: {
    contents: Template[];
    pagination: Pagination;
    filterQuery: Partial<FilterQuery>;
    setFilterQuery: (q: Partial<FilterQuery>) => void;
    isLoading: boolean;
  };
  savedTemplates: {
    contents: Template[];
    pagination: Pagination;
    filterQuery: Partial<FilterQuery>;
    setFilterQuery: (q: Partial<FilterQuery>) => void;
    isLoading: boolean;
  };
  form: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    basic: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setBasic: (item: any) => void;
  };
  onSelectReferenceImage: (imageUrl: string, imageName: string | null, template?: Template) => void;
  onSaveUnsave?: (template: Template) => void;
  onConfirmUnsave?: () => void;
  onCloseUnsaveModal?: () => void;
  unsaveModal?: {
    isOpen: boolean;
    item: Template | null;
    isLoading: boolean;
  };
  isLoading: boolean;
  selectedTemplate: Template | null;
  showSearchNotFound?: boolean;
  onAutoGenerate?: boolean;
}

export function SharedReferencePanel({
  publishedTemplates,
  savedTemplates,
  form,
  onSelectReferenceImage,
  onSaveUnsave,
  onConfirmUnsave,
  onCloseUnsaveModal,
  unsaveModal,
  isLoading,
  selectedTemplate,
  showSearchNotFound = false,
  onAutoGenerate = false,
}: SharedReferencePanelProps) {
  const t = useTranslations("referencePanel");
  const tToast = useTranslations();
  const tCard = useTranslations("templateCard");
  const { data: categoriesRes } = useLibraryTemplateGetCategory();
  const categories = categoriesRes?.data?.data || [];
  const [activeTab, setActiveTab] = useState<"reference" | "saved">(
    "reference"
  );

  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTemplateForModal, setSelectedTemplateForModal] = useState<Template | null>(
    null
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setIsUploading(true);
      setUploadProgress(0);

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 20, 90));
        }, 300);

        // Handle file upload here
        console.log("Uploading file:", file.name);
        const response = await helperService.uploadSingleImage({
          image: file,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        form.setBasic({
          ...form.basic,
          referenceImage: response,
          referenceImageName: file.name
        });

        // Show success message
        showToast("success", tToast("toast.content.imageUploadSuccess"));

        // Scroll to the selected reference image after a short delay
        setTimeout(() => {
          const selectedRef = document.getElementById('selected-reference-image');
          if (selectedRef) {
            selectedRef.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
      } catch (err) {
        console.error("Upload error:", err);
        showToast("error", tToast("toast.content.imageUploadFailed"));
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1000); // Keep the 100% progress visible briefly
      }
    }
  }, [form, tToast]);

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setIsUploading(true);
        setUploadProgress(0);

        try {
          // Simulate progress
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 20, 90));
          }, 300);

          // Handle file upload here
          console.log("Uploading file:", file.name);
          const response = await helperService.uploadSingleImage({
            image: file,
          });

          clearInterval(progressInterval);
          setUploadProgress(100);

          form.setBasic({
            ...form.basic,
            referenceImage: response,
            referenceImageName: file.name
          });

          // Show success message
          showToast("success", t("imageUploadedSuccessfully"));

          // Scroll to the selected reference image after a short delay
          setTimeout(() => {
            const selectedRef = document.getElementById('selected-reference-image');
            if (selectedRef) {
              selectedRef.scrollIntoView({ behavior: 'smooth' });
            }
          }, 500);
        } catch (err) {
          console.error("Upload error:", err);
          showToast("error", t("failedToUploadImage"));
        } finally {
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
          }, 1000); // Keep the 100% progress visible briefly
        }
      }
    },
    [form, t]
  );

  const handleCardClick = useCallback(() => {
    if (!isUploading) {
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    }
  }, [isUploading]);

  const onDetail = useCallback((item: Template | null) => {
    setSelectedTemplateForModal(item);
    setIsDetailDialogOpen(true);
  }, []);

  const renderSearchControls = (
    placeholder: string,
    templates: {
      filterQuery: Partial<FilterQuery>;
      setFilterQuery: (q: Partial<FilterQuery>) => void;
    }
  ) => (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        placeholder={placeholder}
        value={templates.filterQuery?.search || ""}
        onChange={(e) =>
          templates.setFilterQuery({
            ...templates.filterQuery,
            search: e.target.value,
            page: 1,
          })
        }
        className="pl-10 pr-40 sm:pr-48"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <Select
          value={templates.filterQuery?.category || "all"}
          onValueChange={(value: string) =>
            templates.setFilterQuery({
              ...templates.filterQuery,
              category: value === "all" ? undefined : value,
              page: 1,
            })
          }
        >
          <SelectTrigger
            aria-label={t("filterCategory")}
            className="h-8 w-32 rounded-l-none border-0 border-l border-border bg-transparent px-3 text-xs text-muted-foreground shadow-none hover:text-foreground focus:ring-0 focus:ring-offset-0 sm:w-40"
          >
            <SelectValue placeholder={t("filterCategory")} />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tab Bar */}
      <div className="shrink-0 p-4 sm:p-6">
        <div className="flex justify-center">
          <div className={`flex  rounded-lg  w-full ${onAutoGenerate ? "bg-card" : "bg-background"}`}>
            <button
              onClick={() => setActiveTab("reference")}
              className={`px-4 py-3 text-sm font-medium rounded-md transition-colors w-1/2 ${activeTab === "reference"
                ? "bg-blue-500 text-white"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {t("reference")}
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`px-4 py-3 text-sm font-medium rounded-md transition-colors w-1/2 ${activeTab === "saved"
                ? "bg-blue-500 text-white"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {t("savedReference")}
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
        {activeTab === "reference" && (
          <div className="space-y-4">
            {/* Search Bar */}
            {renderSearchControls(t("searchPlaceholder"), publishedTemplates)}

            {/* Template Grid */}
            {publishedTemplates.isLoading ? (
              <TemplateGridSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {publishedTemplates?.contents.map((template, index) => (
                  <SharedTemplateCard
                    item={template}
                    key={index + template.id}
                    onDetail={onDetail}
                    onSelectReferenceImage={onSelectReferenceImage}
                    onSaveUnsave={onSaveUnsave}
                    isLoading={isLoading}
                    selectedTemplate={selectedTemplate}
                  />
                ))}
              </div>
            )}
            {showSearchNotFound && publishedTemplates.contents.length === 0 && (
              <SearchNotFound description="" />
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="space-y-4">
            {/* Search Bar */}
            {renderSearchControls(t("searchPlaceholderSaved"), savedTemplates)}

            {/* Saved References Grid */}
            {savedTemplates.isLoading ? (
              <TemplateGridSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Upload Card */}

                <div
                  className={` w-full rounded-lg overflow-hidden border-2 border-dashed transition-colors flex items-center justify-center ${dragActive
                    ? "border-blue-500 bg-background"
                    : isUploading
                      ? "border-blue-300 bg-background"
                      : "border-border bg-background-secondary cursor-pointer hover:border-blue-300"
                    }`}
                  onDragEnter={!isUploading ? handleDrag : undefined}
                  onDragLeave={!isUploading ? handleDrag : undefined}
                  onDragOver={!isUploading ? handleDrag : undefined}
                  onDrop={!isUploading ? handleDrop : undefined}
                  onClick={!isUploading ? handleCardClick : undefined}
                >
                  <div className="flex flex-col items-center justify-center text-center p-4 w-full">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-8 w-8 text-blue-500 mb-2 animate-spin" />
                        <p className="text-sm text-blue-600 mb-2">
                          {t("uploadingImage")}
                        </p>
                        <div className="w-full max-w-xs bg-background rounded-full h-2.5 mb-1">
                          <div
                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500">{uploadProgress}%</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          {t("dragAndDropImage")}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">{t("orClickToBrowse")}</p>
                        <input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileInput}
                          disabled={isUploading}
                        />
                      </>
                    )}
                  </div>
                </div>


                {savedTemplates?.contents?.map((reference, index) => (
                  <SharedTemplateCard
                    item={reference}
                    key={index + reference.id}
                    onDetail={onDetail}
                    onSelectReferenceImage={onSelectReferenceImage}
                    onSaveUnsave={onSaveUnsave}
                    isLoading={isLoading}
                    selectedTemplate={selectedTemplate}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t bg-card px-4 py-3 sm:px-6">
        <PaginationControls
          pagination={
            activeTab === "reference"
              ? publishedTemplates.pagination
              : savedTemplates.pagination
          }
          filterQuery={
            activeTab === "reference"
              ? publishedTemplates.filterQuery
              : savedTemplates.filterQuery
          }
          setFilterQuery={
            activeTab === "reference"
              ? publishedTemplates.setFilterQuery
              : savedTemplates.setFilterQuery
          }
          className="border-t-0 pt-0"
        />
      </div>

      {/* Detail Reference Dialog */}
      <SharedReferenceFullviewModal
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        template={selectedTemplateForModal}
        onSelectReferenceImage={onSelectReferenceImage}
        onSaveUnsave={onSaveUnsave}
      />

      {/* Unsave Confirmation Modal */}
      {unsaveModal && (
        <DeleteConfirmationModal
          isOpen={unsaveModal.isOpen}
          onClose={onCloseUnsaveModal || (() => { })}
          onConfirm={onConfirmUnsave || (() => { })}
          title={tCard("unsaveConfirmationTitle")}
          description={tCard("unsaveConfirmationDescription")}
          itemName={unsaveModal.item?.name || ""}
          isLoading={unsaveModal.isLoading}
        />
      )}
    </div>
  );
}

