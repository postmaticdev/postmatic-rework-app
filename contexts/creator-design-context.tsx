"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  useCreatorDesigns,
  useCreatorDesignCreate,
  useCreatorDesignUpdate,
  useCreatorDesignPublish,
  useCreatorDesignDelete,
} from "@/services/creator.api";
import {
  CreatorDesign,
  CreateDesignRequest,
  UpdateDesignRequest,
  PublishDesignRequest,
  GetDesignsQuery,
} from "@/models/api/creator/design";
import { Pagination, FilterQuery, initialPagination } from "@/models/api/base-response.type";
import { showToast } from "@/helper/show-toast";

interface CreatorDesignContextType {
  // State
  designs: CreatorDesign[];
  isLoading: boolean;
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
  const publishMutation = useCreatorDesignPublish();
  const deleteMutation = useCreatorDesignDelete();

  const designs = designsResponse?.data?.data || [];
  const pagination = designsResponse?.data?.pagination || initialPagination;
  const filterQuery = designsResponse?.data?.filterQuery || {};

  // Modal actions
  const openCreateModal = useCallback(() => {
    resetForm();
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    resetForm();
  }, []);

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
  }, []);

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nama design harus diisi";
    }

    if (!formData.imageUrl.trim()) {
      newErrors.imageUrl = "Gambar referensi harus diupload";
    }

    // if (formData.price && formData.price < 0) {
    //   newErrors.price = "Harga tidak boleh negatif";
    // }

    if (!formData.templateImageCategoryIds || formData.templateImageCategoryIds.length === 0) {
      newErrors.templateImageCategoryIds = "Kategori gambar harus dipilih";
    }

    if (!formData.templateProductCategoryIds || formData.templateProductCategoryIds.length === 0) {
      newErrors.templateProductCategoryIds = "Kategori produk harus dipilih";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, []);

  // API actions
  const handleCreateDesign = useCallback(async () => {
    if (!validateForm()) return;

    try {
      await createMutation.mutateAsync(formData);
      showToast("success", "Design berhasil dibuat");
      closeCreateModal();
    } catch (error) {
      showToast("error", "Gagal membuat design");
    }
  }, [formData, validateForm, createMutation, closeCreateModal]);

  const handleUpdateDesign = useCallback(async () => {
    if (!editingDesign || !validateForm()) return;

    try {
      await updateMutation.mutateAsync({
        templateImageContentId: editingDesign.id,
        formData,
      });
      showToast("success", "Design berhasil diperbarui");
      closeEditModal();
    } catch (error) {
      showToast("error", "Gagal memperbarui design");
    }
  }, [editingDesign, formData, validateForm, updateMutation, closeEditModal]);

  const handlePublishToggle = useCallback(async (designId: string, isPublished: boolean) => {
    try {
      await publishMutation.mutateAsync({
        templateImageContentId: designId,
        formData: { isPublished },
      });
      showToast("success", `Design berhasil ${isPublished ? "dipublikasikan" : "disembunyikan"}`);
    } catch (error) {
      showToast("error", "Gagal mengubah status publikasi");
    }
  }, [publishMutation]);

  const handleDeleteDesign = useCallback(async (designId: string) => {
    try {
      await deleteMutation.mutateAsync(designId);
      showToast("success", "Design berhasil dihapus");
    } catch (error) {
      showToast("error", "Gagal menghapus design");
    }
  }, [deleteMutation]);

  const contextValue: CreatorDesignContextType = {
    // State
    designs,
    isLoading,
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
