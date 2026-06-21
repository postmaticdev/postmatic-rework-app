import { api } from "@/config/api";
import {
  CreateDesignRequest,
  CreatorDesign,
  Publisher,
  UpdateDesignRequest,
  GetDesignsQuery,
  GetDesignsResponse,
  CreateDesignResponse,
  UpdateDesignResponse,
  DeleteDesignResponse,
} from "@/models/api/creator/design";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type CreatorImageCategoryApi = {
  id: string | number;
  name: string;
};

type CreatorImageApi = {
  id: string | number;
  name: string;
  imageUrl: string | null;
  isPublished?: boolean;
  price?: number;
  profileId?: string | null;
  publisher?: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  typeCategories?: CreatorImageCategoryApi[];
  productCategories?: CreatorImageCategoryApi[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    templateImageSaved?: number;
  };
};

const toNumberIds = (ids?: string[]) =>
  (ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id));

const mapPublisher = (design: CreatorImageApi): Publisher => ({
  id: design.publisher?.id ?? design.profileId ?? "",
  name: design.publisher?.name ?? "",
  image: design.publisher?.image ?? "",
});

const mapCreatorDesign = (design: CreatorImageApi): CreatorDesign => ({
  id: String(design.id),
  name: design.name ?? "",
  imageUrl: design.imageUrl ?? "",
  isPublished: design.isPublished ?? false,
  price: Number(design.price ?? 0),
  currency: "IDR",
  publisherId: design.publisher?.id ?? design.profileId ?? "",
  deletedAt: null,
  createdAt: design.createdAt,
  updatedAt: design.updatedAt,
  publisher: mapPublisher(design),
  templateImageCategories: (design.typeCategories ?? []).map((category) => ({
    id: String(category.id),
    name: category.name,
  })),
  templateProductCategories: (design.productCategories ?? []).map(
    (category) => ({
      id: String(category.id),
      indonesianName: category.name,
    })
  ),
  _count: {
    templateImageSaved: design._count?.templateImageSaved ?? 0,
  },
});

const invalidateCreatorImageQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["creatorDesigns"] });
  queryClient.invalidateQueries({ queryKey: ["creatorImageTemplates"] });
  queryClient.invalidateQueries({ queryKey: ["libraryTemplatePublished"] });
};

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

    return api
      .get<GetDesignsResponse>(`/creator/image?${params.toString()}`)
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: ((res.data.data ?? []) as unknown as CreatorImageApi[]).map(
            mapCreatorDesign
          ),
        },
      }));
  },

  // Create a new design
  createDesign: (formData: CreateDesignRequest) => {
    return api
      .post<CreateDesignResponse>("/creator/image", {
        imageUrl: formData.imageUrl,
        isPublished: formData.isPublished ?? true,
        name: formData.name,
        price: Number(0),
        productCategoryIds: toNumberIds(formData.templateProductCategoryIds),
        typeCategoryIds: toNumberIds(formData.templateImageCategoryIds),
      })
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: mapCreatorDesign(res.data.data as unknown as CreatorImageApi),
        },
      }));
  },

  // Update an existing design
  updateDesign: (templateImageContentId: string, formData: UpdateDesignRequest) => {
    return api
      .put<UpdateDesignResponse>(`/creator/image/${templateImageContentId}`, {
        imageUrl: formData.imageUrl,
        isPublished: formData.isPublished,
        name: formData.name,
        price: Number(0),
        productCategoryIds: toNumberIds(formData.templateProductCategoryIds),
        typeCategoryIds: toNumberIds(formData.templateImageCategoryIds),
      })
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: mapCreatorDesign(res.data.data as unknown as CreatorImageApi),
        },
      }));
  },

  // Delete a design
  deleteDesign: (templateImageContentId: string) => {
    return api.delete<DeleteDesignResponse>(`/creator/image/${templateImageContentId}`);
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
      invalidateCreatorImageQueries(queryClient);
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
      invalidateCreatorImageQueries(queryClient);
    },
  });
};

export const useCreatorDesignDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateImageContentId: string) =>
      creatorDesignService.deleteDesign(templateImageContentId),
    onSuccess: () => {
      invalidateCreatorImageQueries(queryClient);
    },
  });
};

export default creatorDesignService;
