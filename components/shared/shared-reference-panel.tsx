"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, Upload, Loader2 } from "lucide-react";
import {
  PaginationControls,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  onSelectReferenceImage: (imageUrl: string, imageName: string | null, template?: Template) => void;
  onSaveUploadedReference: (payload: {
    imageUrl: string;
    name: string;
  }) => Promise<void>;
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
  onSelectReferenceImage,
  onSaveUploadedReference,
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
  const tCard = useTranslations("templateCard");
  const { data: categoriesRes } = useLibraryTemplateGetCategory();
  const categories = categoriesRes?.data?.data || [];
  const [activeTab, setActiveTab] = useState<"reference" | "saved">(
    "reference"
  );

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);
  const [prepareUploadError, setPrepareUploadError] = useState<string | null>(null);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [uploadedReferenceName, setUploadedReferenceName] = useState("");

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTemplateForModal, setSelectedTemplateForModal] = useState<Template | null>(
    null
  );

  const closeNameDialog = useCallback(() => {
    setIsNameDialogOpen(false);
    setPrepareUploadError(null);
    setIsPreparingUpload(false);
  }, []);

  const resetNameDialog = useCallback(() => {
    closeNameDialog();
    setUploadedReferenceName("");
  }, [closeNameDialog]);

  const uploadReferenceFile = useCallback(
    async (file: File) => {
      const trimmedName = uploadedReferenceName.trim();
      if (!trimmedName) {
        setPrepareUploadError(t("referenceNameRequired"));
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      let progressInterval: ReturnType<typeof setInterval> | null = null;

      try {
        progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 20, 90));
        }, 300);

        const response = await helperService.uploadSingleImage({
          image: file,
        });

        if (progressInterval) {
          clearInterval(progressInterval);
        }

        setUploadProgress(100);

        try {
        await onSaveUploadedReference({
          imageUrl: response,
          name: trimmedName,
        });

        showToast("success", t("imageUploadedSuccessfully"));
        resetNameDialog();
        } catch (saveError) {
          console.error("Save uploaded reference error:", saveError);
          showToast("error", t("failedToSaveReference"));
        }
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
        showToast("error", t("failedToUploadImage"));
      } finally {
        if (progressInterval) {
          clearInterval(progressInterval);
        }

        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1000);
      }
    },
    [onSaveUploadedReference, resetNameDialog, t, uploadedReferenceName]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        closeNameDialog();
        await uploadReferenceFile(e.target.files[0]);
        e.target.value = "";
      }
    },
    [closeNameDialog, uploadReferenceFile]
  );

  const handleCardClick = useCallback(() => {
    if (!isUploading) {
      setPrepareUploadError(null);
      setIsNameDialogOpen(true);
    }
  }, [isUploading]);

  const handleContinueToFilePicker = useCallback(() => {
    const trimmedName = uploadedReferenceName.trim();
    if (!trimmedName) {
      setPrepareUploadError(t("referenceNameRequired"));
      return;
    }

    setIsPreparingUpload(true);
    setPrepareUploadError(null);

    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }

    setTimeout(() => {
      setIsPreparingUpload(false);
    }, 300);
  }, [t, uploadedReferenceName]);

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
                  className={` w-full rounded-lg overflow-hidden border-2 border-dashed transition-colors flex items-center justify-center ${
                    isUploading
                      ? "border-blue-300 bg-background"
                      : "border-border bg-background-secondary cursor-pointer hover:border-blue-300"
                  }`}
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
                          {t("uploadImage")}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">{t("enterNameFirst")}</p>
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

      <Dialog
        open={isNameDialogOpen}
        onOpenChange={(open) => {
          if (isPreparingUpload) return;
          if (!open) {
            resetNameDialog();
            return;
          }
          setIsNameDialogOpen(true);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("saveUploadedReferenceTitle")}</DialogTitle>
            <DialogDescription>
              {t("saveUploadedReferenceDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4 sm:p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("referenceNameLabel")}</p>
              <Input
                value={uploadedReferenceName}
                onChange={(e) => {
                  setUploadedReferenceName(e.target.value);
                  if (prepareUploadError) {
                    setPrepareUploadError(null);
                  }
                }}
                placeholder={t("referenceNamePlaceholder")}
                disabled={isPreparingUpload}
              />
              {prepareUploadError && (
                <p className="text-sm text-destructive">{prepareUploadError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex w-full justify-end gap-3">
              <Button
                variant="outline"
                onClick={resetNameDialog}
                disabled={isPreparingUpload}
              >
                {t("cancelSaveReference")}
              </Button>
              <Button
                onClick={handleContinueToFilePicker}
                disabled={isPreparingUpload}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                {isPreparingUpload ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("selectingImage")}
                  </>
                ) : (
                  t("continueToUpload")
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

