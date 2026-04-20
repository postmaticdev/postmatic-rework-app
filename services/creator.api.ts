import { api } from "@/config/api";
import {
  CreateDesignRequest,
  UpdateDesignRequest,
  PublishDesignRequest,
  GetDesignsQuery,
  GetDesignsResponse,
  CreateDesignResponse,
  UpdateDesignResponse,
  PublishDesignResponse,
  DeleteDesignResponse,
} from "@/models/api/creator/design";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const creatorDesignService = {
  // Get own designs with pagination and filters
  getDesigns: (query: GetDesignsQuery = {}) => {
    const params = new URLSearchParams();
    
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.page) params.append("page", query.page.toString());
    if (query.search) params.append("search", query.search);
    if (query.category) params.append("category", query.category);
    if (query.sort) params.append("sort", query.sort);
    if (query.sortBy) params.append("sortBy", query.sortBy);

    return api.get<GetDesignsResponse>(`/creator/design?${params.toString()}`);
  },

  // Create a new design
  createDesign: (formData: CreateDesignRequest) => {
    return api.post<CreateDesignResponse>("/creator/design", {...formData, price: Number(0)});
  },

  // Update an existing design
  updateDesign: (templateImageContentId: string, formData: UpdateDesignRequest) => {
    return api.put<UpdateDesignResponse>(`/creator/design/${templateImageContentId}`, {...formData, price: Number(0)});
  },

  // Publish/Unpublish a design
  publishDesign: (templateImageContentId: string, formData: PublishDesignRequest) => {
    return api.patch<PublishDesignResponse>(`/creator/design/${templateImageContentId}`, formData);
  },

  // Delete a design
  deleteDesign: (templateImageContentId: string) => {
    return api.delete<DeleteDesignResponse>(`/creator/design/${templateImageContentId}`);
  },
};

// React Query hooks for creator designs
export const useCreatorDesigns = (query: GetDesignsQuery = {}) => {
  return useQuery({
    queryKey: ["creatorDesigns", query],
    queryFn: () => creatorDesignService.getDesigns(query),
  });
};

export const useCreatorDesignCreate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: CreateDesignRequest) =>
      creatorDesignService.createDesign(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatorDesigns"] });
    },
  });
};

export const useCreatorDesignUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ 
      templateImageContentId, 
      formData 
    }: { 
      templateImageContentId: string; 
      formData: UpdateDesignRequest 
    }) => creatorDesignService.updateDesign(templateImageContentId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatorDesigns"] });
    },
  });
};

export const useCreatorDesignPublish = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ 
      templateImageContentId, 
      formData 
    }: { 
      templateImageContentId: string; 
      formData: PublishDesignRequest 
    }) => creatorDesignService.publishDesign(templateImageContentId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatorDesigns"] });
    },
  });
};

export const useCreatorDesignDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateImageContentId: string) =>
      creatorDesignService.deleteDesign(templateImageContentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatorDesigns"] });
    },
  });
};

export default creatorDesignService;
