import { api } from "@/config/api";
import {
  BaseResponse,
  BaseResponseFiltered,
  FilterQuery,
} from "@/models/api/base-response.type";
import { AdvancedGenerate } from "@/models/api/content/image.type";
import {
  BusinessKnowledgePld,
  BusinessKnowledgeRes,
} from "@/models/api/knowledge/business.type";
import {
  PlatformEnum,
  PlatformPld,
  PlatformRes,
} from "@/models/api/knowledge/platform.type";
import {
  ProductKnowledgeDeleteRes,
  ProductKnowledgePld,
  ProductKnowledgeRes,
} from "@/models/api/knowledge/product.type";
import {
  RoleKnowledgePld,
  RoleKnowledgeRes,
} from "@/models/api/knowledge/role.type";
import { AddRssPld, RssRes } from "@/models/api/knowledge/rss.type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================== BUSINESS KNOWLEDGE ==============================

const businessKnowledgeService = {
  getById: (businessId: string) => {
    return api.get<BaseResponse<BusinessKnowledgeRes>>(
      `/business/knowledge/${businessId}`
    );
  },

  upsert: (businessId: string, formData: BusinessKnowledgePld) => {
    return api.post<BaseResponse<BusinessKnowledgeRes>>(
      `/business/knowledge/${businessId}`,
      { ...formData, secondaryLogo: null }
    );
  },
};

export const useBusinessKnowledgeGetById = (businessId: string) => {
  return useQuery({
    queryKey: ["businessKnowledge", businessId],
    queryFn: () => businessKnowledgeService.getById(businessId),
    enabled: !!businessId,
  });
};

export const useBusinessKnowledgeUpsert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: BusinessKnowledgePld;
    }) => businessKnowledgeService.upsert(businessId, formData),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["businessKnowledge"],
      });
    },
    onError: (error) => {
      throw error;
    },
  });
};

// ============================== PRODUCT KNOWLEDGE ==============================

const productKnowledgeService = {
  getStatus(businessId: string, productKnowledgeId: string) {
    return api.get<BaseResponse<AdvancedGenerate>>(
      `/knowledge/product/${businessId}/${productKnowledgeId}`
    );
  },
  getAll: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    return api.get<BaseResponseFiltered<ProductKnowledgeRes[]>>(
      `/business/product/${businessId}`,
      { params: filterQuery }
    );
  },

  create: (businessId: string, formData: ProductKnowledgePld) => {
    return api.post<BaseResponse<ProductKnowledgeRes>>(
      `/business/product/${businessId}`,
      {
        ...formData,
        imageUrls: formData.images,
        price: Number(formData.price),
      }
    );
  },
  update: (businessId: string, productId: string, formData: ProductKnowledgePld) => {
    return api.put<BaseResponse<ProductKnowledgeRes>>(
      `/business/product/${businessId}/${productId}`,
      {
        ...formData,
        imageUrls: formData.images,
        price: Number(formData.price),
      }
    );
  },

  delete: (businessId: string, productId: string) => {
    return api.delete<BaseResponse<ProductKnowledgeDeleteRes>>(
      `/business/product/${businessId}/${productId}`
    );
  },
};

export const useProductKnowledgeGetStatus = (
  businessId: string,
  productKnowledgeId: string
) => {
  return useQuery({
    queryKey: ["productKnowledgeStatus", productKnowledgeId],
    queryFn: () =>
      productKnowledgeService.getStatus(businessId, productKnowledgeId),
    enabled: !!businessId && !!productKnowledgeId,
  });
};

export const useProductKnowledgeGetAll = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>,
  enabled = true
) => {
  return useQuery({
    queryKey: ["productKnowledge", filterQuery],
    queryFn: () => productKnowledgeService.getAll(businessId, filterQuery),
    enabled: enabled && !!businessId,
  });
};

export const useProductKnowledgeCreate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: ProductKnowledgePld;
    }) => productKnowledgeService.create(businessId, formData),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["productKnowledge"],
      });
    },
  });
};

export const useProductKnowledgeUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      productId,
      formData,
    }: {
      businessId: string;
      productId: string;
      formData: ProductKnowledgePld;
    }) => productKnowledgeService.update(businessId, productId, formData),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["productKnowledge"],
      });
    },
  });
};

export const useProductKnowledgeDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      productId,
    }: {
      businessId: string;
      productId: string;
    }) => productKnowledgeService.delete(businessId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["productKnowledge"],
      });
    },
  });
};

// ============================== ROLE KNOWLEDGE ==============================

const roleKnowledgeService = {
  getById: (businessId: string) => {
    return api.get<BaseResponse<RoleKnowledgeRes>>(
      `/business/role/${businessId}`
    );
  },

  upsert: (businessId: string, formData: RoleKnowledgePld) => {
    return api.post<BaseResponse<RoleKnowledgeRes>>(
      `/business/role/${businessId}`,
      { ...formData }
    );
  },
};

export const useRoleKnowledgeGetById = (businessId: string) => {
  return useQuery({
    queryKey: ["roleKnowledge", businessId],
    queryFn: () => roleKnowledgeService.getById(businessId),
    enabled: !!businessId,
  });
};

export const useRoleKnowledgeUpsert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: RoleKnowledgePld;
    }) => roleKnowledgeService.upsert(businessId, formData),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["roleKnowledge"],
      });
    },
    onError: (error) => {
      throw error;
    },
  });
};

// ============================== RSS KNOWLEDGE ==============================

const rssKnowledgeService = {
  getById: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    return api.get<BaseResponse<RssRes[]>>(
      `/business/rss-subscription/${businessId}`,
      {
        params: filterQuery,
      }
    );
  },
  create: (businessId: string, formData: AddRssPld) => {
    return api.post<BaseResponse<RssRes>>(
      `/business/rss-subscription/${businessId}`,
      formData
    );
  },

  update: (businessId: string, rssKnId: string, formData: AddRssPld) => {
    return api.put<BaseResponse<RssRes>>(
      `/business/rss-subscription/${businessId}/${rssKnId}`,
      formData
    );
  },

  delete: (businessId: string, rssKnId: string) => {
    return api.delete<BaseResponse<RssRes>>(
      `/business/rss-subscription/${businessId}/${rssKnId}`
    );
  },
};

export const useRssKnowledgeGetById = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>
) => {
  return useQuery({
    queryKey: ["rssKnowledge", businessId, filterQuery],
    queryFn: () => rssKnowledgeService.getById(businessId, filterQuery),
    enabled: !!businessId,
  });
};

export const useRssKnowledgeCreate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: AddRssPld;
    }) => rssKnowledgeService.create(businessId, formData),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["rssKnowledge"],
      });
      queryClient.invalidateQueries({
        queryKey: ["libraryRSSArticle"],
      });
    },
  });
};

export const useRssKnowledgeUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      rssKnId,
      formData,
    }: {
      businessId: string;
      rssKnId: string;
      formData: AddRssPld;
    }) => rssKnowledgeService.update(businessId, rssKnId, formData),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["rssKnowledge"],
      });
      queryClient.invalidateQueries({
        queryKey: ["libraryRSSArticle"],
      });
    },
  });
};

export const useRssKnowledgeDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      rssKnowledgeId,
    }: {
      businessId: string;
      rssKnowledgeId: string;
    }) => rssKnowledgeService.delete(businessId, rssKnowledgeId),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["rssKnowledge"],
      });
      queryClient.invalidateQueries({
        queryKey: ["libraryRSSArticle"],
      });
    },
  });
};

// ============================== PLATFORM KNOWLEDGE ==============================

const platformService = {
  getAll: (businessId: string, from?: string) => {
    return api.get<BaseResponse<PlatformRes[]>>(
      `/business/connected-platform/${businessId}`,
      { params: { from } }
    );
  },
  disconnect: (businessId: string, platform: PlatformEnum) => {
    return api.post<BaseResponse<PlatformRes>>(
      `/business/connected-platform/${businessId}/${platform}`
    );
  },
};

export const usePlatformKnowledgeGetAll = (
  businessId: string,
  from?: string
) => {
  return useQuery({
    queryKey: ["platformKnowledge", businessId, from],
    queryFn: () => platformService.getAll(businessId, from),
    enabled: !!businessId,
  });
};

export const usePlatformKnowledgeDisconnect = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      platform,
    }: {
      businessId: string;
      platform: PlatformEnum;
    }) => platformService.disconnect(businessId, platform),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["platformKnowledge"],
      });
      queryClient.invalidateQueries({ queryKey: ["contentAutoGenerateGetSettings"] });
    },
  });
};
