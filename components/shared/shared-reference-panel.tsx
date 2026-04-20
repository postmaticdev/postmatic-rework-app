"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Upload, Loader2 } from "lucide-react";
import {
  PaginationControls,
  PaginationWithControls,
} from "@/components/ui/pagination";
import { helperService } from "@/services/helper.api";
import { showToast } from "@/helper/show-toast";
import { TemplateGridSkeleton } from "@/components/grid-skeleton/template-grid-skeleton";
import { useLibraryTemplateGetProductCategory } from "@/services/library.api";
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

  const { data: productCategoriesData } = useLibraryTemplateGetProductCategory();

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

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="p-4 sm:p-6">
        <div className="flex justify-center">
          <div className={`flex  rounded-lg  w-full ${onAutoGenerate ? "bg-card" : "bg-background"}`}>
            <button
              onClick={() => setActiveTab("reference")}
              className={`px-4 py-3 text-sm font-medium rounded-md transition-colors w-1/2 ${
                activeTab === "reference"
                  ? "bg-blue-500 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("reference")}
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`px-4 py-3 text-sm font-medium rounded-md transition-colors w-1/2 ${
                activeTab === "saved"
                  ? "bg-blue-500 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("savedReference")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-6 overflow-y-auto">
        {activeTab === "reference" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={publishedTemplates.filterQuery?.search || ""}
                onChange={(e) =>
                  publishedTemplates.setFilterQuery({
                    ...publishedTemplates?.filterQuery,
                    search: e.target.value,
                  })
                }
                className="pl-10"
              />
            </div>

            {/* Pagination Controls */}
            <PaginationWithControls
              pagination={publishedTemplates.pagination}
              filterQuery={publishedTemplates.filterQuery}
              currData={publishedTemplates.contents.length}
              setFilterQuery={publishedTemplates.setFilterQuery}
              productCategories={productCategoriesData?.data?.data || []}
              showSort={true}
            />

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
            <PaginationControls
              pagination={publishedTemplates.pagination}
              filterQuery={publishedTemplates.filterQuery}
              setFilterQuery={publishedTemplates.setFilterQuery}
            />
          </div>
        )}

        {activeTab === "saved" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t("searchPlaceholderSaved")}
                value={savedTemplates.filterQuery?.search || ""}
                onChange={(e) =>
                  savedTemplates.setFilterQuery({
                    ...savedTemplates?.filterQuery,
                    search: e.target.value,
                  })
                }
                className="pl-10"
              />
            </div>

            <PaginationWithControls
              pagination={savedTemplates.pagination}
              filterQuery={savedTemplates.filterQuery}
              currData={savedTemplates.contents.length}
              setFilterQuery={savedTemplates.setFilterQuery}
              productCategories={productCategoriesData?.data?.data || []}
              showSort={false}
            />
            {/* Saved References Grid */}
            {savedTemplates.isLoading ? (
              <TemplateGridSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Upload Card */}
                
                  <div
                    className={` w-full rounded-lg overflow-hidden border-2 border-dashed transition-colors flex items-center justify-center ${
                      dragActive
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
            <PaginationControls
              pagination={savedTemplates.pagination}
              filterQuery={savedTemplates.filterQuery}
              setFilterQuery={savedTemplates.setFilterQuery}
            />
          </div>
        )}
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
          onClose={onCloseUnsaveModal || (() => {})}
          onConfirm={onConfirmUnsave || (() => {})}
          title={tCard("unsaveConfirmationTitle")}
          description={tCard("unsaveConfirmationDescription")}
          itemName={unsaveModal.item?.name || ""}
          isLoading={unsaveModal.isLoading}
        />
      )}
    </div>
  );
}

