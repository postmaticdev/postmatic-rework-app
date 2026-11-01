"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  useCreatorDesigns,
  useCreatorDesignCreate,
  useCreatorDesignUpdate,
  useCreatorDesignDelete,
} from "@/services/creator.api";
import {
  CreatorDesign,
  CreateDesignRequest,
  GetDesignsQuery,
} from "@/models/api/creator/design";
import { Pagination, FilterQuery, initialPagination } from "@/models/api/base-response.type";
import { showToast } from "@/helper/show-toast";
import { useTranslations } from "next-intl";

interface CreatorDesignContextType {
  // State
  designs: CreatorDesign[];
  isLoading: boolean;
  isSubmitting: boolean;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  editingDesign: CreatorDesign | null;
  query: GetDesignsQuery;
  pagination: Pagination;
  filterQuery: Partial<FilterQuery>;
  
  // Form state
  formData: CreateDesignRequest;
  setFormData: React.Dispatch<React.SetStateAction<CreateDesignRequest>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  
  // Actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (design: CreatorDesign) => void;
  closeEditModal: () => void;
  setQuery: (query: GetDesignsQuery | ((prev: GetDesignsQuery) => GetDesignsQuery)) => void;
  
  // Form actions
  handleCreateDesign: () => Promise<void>;
  handleUpdateDesign: () => Promise<void>;
  handlePublishToggle: (designId: string, isPublished: boolean) => Promise<void>;
  handleDeleteDesign: (designId: string) => Promise<void>;
  
  // Form validation
  validateForm: () => boolean;
  resetForm: () => void;
}

const CreatorDesignContext = createContext<CreatorDesignContextType | undefined>(undefined);

const initialFormData: CreateDesignRequest = {
  name: "",
  imageUrl: "",
  price: 0,
  isPublished: true,
  currency: "IDR",
  templateImageCategoryIds: [],
  templateProductCategoryIds: [],
};

export function CreatorDesignProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("creatorDesign");
  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<CreatorDesign | null>(null);
  const [query, setQuery] = useState<GetDesignsQuery>({});
  const [formData, setFormData] = useState<CreateDesignRequest>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // API hooks
  const { data: designsResponse, isLoading } = useCreatorDesigns(query);
  const createMutation = useCreatorDesignCreate();
  const updateMutation = useCreatorDesignUpdate();
  const deleteMutation = useCreatorDesignDelete();

  const designs = useMemo(
    () => designsResponse?.data?.data || [],
    [designsResponse?.data?.data]
  );
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const pagination = designsResponse?.data?.pagination || initialPagination;
  const filterQuery = designsResponse?.data?.filterQuery || {};

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, []);

  // Modal actions
  const openCreateModal = useCallback(() => {
    resetForm();
    setIsCreateModalOpen(true);
  }, [resetForm]);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    resetForm();
  }, [resetForm]);

  const openEditModal = useCallback((design: CreatorDesign) => {
    setEditingDesign(design);
    setFormData({
      name: design.name,
      imageUrl: design.imageUrl,
      currency: design.currency,
      price: design.price,
      isPublished: design.isPublished,
      templateImageCategoryIds: design.templateImageCategories.map(cat => cat.id),
      templateProductCategoryIds: design.templateProductCategories.map(cat => cat.id),
    });
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingDesign(null);
    resetForm();
  }, [resetForm]);

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("validation.nameRequired");
    }

    if (!formData.imageUrl.trim()) {
      newErrors.imageUrl = t("validation.imageRequired");
    }

    // if (formData.price && formData.price < 0) {
    //   newErrors.price = "Harga tidak boleh negatif";
    // }

    if (!formData.templateImageCategoryIds || formData.templateImageCategoryIds.length === 0) {
      newErrors.templateImageCategoryIds = t("validation.categoryRequired");
    }

    if (!formData.templateProductCategoryIds || formData.templateProductCategoryIds.length === 0) {
      newErrors.templateProductCategoryIds = t("validation.tagRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  // API actions
  const handleCreateDesign = useCallback(async () => {
    if (createMutation.isPending || !validateForm()) return;

    try {
      await createMutation.mutateAsync(formData);
      showToast("success", t("toast.created"));
      closeCreateModal();
    } catch {
      showToast("error", t("toast.createFailed"));
    }
  }, [formData, validateForm, createMutation, closeCreateModal, t]);

  const handleUpdateDesign = useCallback(async () => {
    if (!editingDesign || updateMutation.isPending || !validateForm()) return;

    try {
      await updateMutation.mutateAsync({
        templateImageContentId: editingDesign.id,
        formData,
      });
      showToast("success", t("toast.updated"));
      closeEditModal();
    } catch {
      showToast("error", t("toast.updateFailed"));
    }
  }, [editingDesign, formData, validateForm, updateMutation, closeEditModal, t]);

  const handlePublishToggle = useCallback(async (designId: string, isPublished: boolean) => {
    const design = designs.find((item) => item.id === designId);
    if (!design) return;

    try {
      await updateMutation.mutateAsync({
        templateImageContentId: designId,
        formData: {
          imageUrl: design.imageUrl,
          isPublished,
          name: design.name,
          price: design.price,
          templateImageCategoryIds: design.templateImageCategories.map(
            (category) => category.id
          ),
          templateProductCategoryIds: design.templateProductCategories.map(
            (category) => category.id
          ),
        },
      });
      showToast("success", isPublished ? t("toast.published") : t("toast.unpublished"));
    } catch {
      showToast("error", t("toast.publishToggleFailed"));
    }
  }, [designs, updateMutation, t]);

  const handleDeleteDesign = useCallback(async (designId: string) => {
    try {
      await deleteMutation.mutateAsync(designId);
      showToast("success", t("toast.deleted"));
    } catch {
      showToast("error", t("toast.deleteFailed"));
    }
  }, [deleteMutation, t]);

  const contextValue: CreatorDesignContextType = {
    // State
    designs,
    isLoading,
    isSubmitting,
    isCreateModalOpen,
    isEditModalOpen,
    editingDesign,
    query,
    pagination,
    filterQuery,
    
    // Form state
    formData,
    setFormData,
    errors,
    setErrors,
    
    // Actions
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    setQuery,
    
    // Form actions
    handleCreateDesign,
    handleUpdateDesign,
    handlePublishToggle,
    handleDeleteDesign,
    
    // Form validation
    validateForm,
    resetForm,
  };

  return (
    <CreatorDesignContext.Provider value={contextValue}>
      {children}
    </CreatorDesignContext.Provider>
  );
}

export function useCreatorDesign() {
  const context = useContext(CreatorDesignContext);
  if (context === undefined) {
    throw new Error("useCreatorDesign must be used within a CreatorDesignProvider");
  }
  return context;
}
