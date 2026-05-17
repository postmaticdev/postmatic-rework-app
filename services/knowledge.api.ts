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
  BusinessConnectedPlatformApiRes,
  ConnectedPlatformAuthorizeUrlRes,
  ConnectPlatformAccountRes,
  PendingConnectedPlatformOauthRes,
  PlatformEnum,
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

type BackendBusinessKnowledgeRes = BusinessKnowledgeRes & {
  primaryLogoUrl?: string | null;
  websiteUrl?: string | null;
  businessPhone?: string | null;
  countryCode?: string | null;
  businessRootId?: string | number;
};

type BackendProductKnowledgeRes = Omit<ProductKnowledgeRes, "images"> & {
  id: string | number;
  businessRootId?: string | number;
  imageUrls?: string[];
  images?: string[];
};

type BackendRssRes = Omit<RssRes, "masterRssId" | "masterRss"> & {
  id: string | number;
  appRssId?: string | number;
  masterRssId?: string | number;
  businessRootId?: string | number;
  appRssFeed?: {
    id: string | number;
    title: string;
    publisher?: string;
    appRssCategory?: {
      id: string | number;
      name: string;
    };
  };
  masterRss?: RssRes["masterRss"];
};

const mapBusinessKnowledge = (
  business?: Partial<BackendBusinessKnowledgeRes> | null
): BusinessKnowledgeRes => {
  const item = business ?? {};

  return {
    id: String(item.id ?? item.businessRootId ?? ""),
    primaryLogo: item.primaryLogo ?? item.primaryLogoUrl ?? "",
    secondaryLogo: item.secondaryLogo ?? "",
    name: item.name ?? "",
    category: item.category ?? "",
    description: item.description ?? "",
    visionMission: item.visionMission ?? "",
    website: item.website ?? item.websiteUrl ?? "",
    websiteUrl: item.websiteUrl ?? "",
    businessPhone: item.businessPhone ?? "",
    countryCode: item.countryCode
      ? item.countryCode.startsWith("+")
        ? item.countryCode
        : `+${item.countryCode}`
      : "+62",
    location: item.location ?? "",
    uniqueSellingPoint: item.uniqueSellingPoint ?? "",
    colorTone: item.colorTone ?? "",
    rootBusinessId: String(item.rootBusinessId ?? item.businessRootId ?? ""),
    deletedAt: item.deletedAt ?? null,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
  };
};

const sanitizePhone = (phone: string) =>
  phone.replace(/[^\d]/g, "").replace(/^0+/, "");

const sanitizeCountryCode = (countryCode: string) =>
  countryCode.replace(/[^\d]/g, "") || "62";

const toBusinessKnowledgePayload = (formData: BusinessKnowledgePld) => ({
  primaryLogoUrl: formData.primaryLogo,
  name: formData.name,
  category: formData.category,
  description: formData.description,
  ...(formData.website.trim() ? { websiteUrl: formData.website.trim() } : {}),
  colorTone: formData.colorTone,
  businessPhone: sanitizePhone(formData.businessPhone),
  countryCode: sanitizeCountryCode(formData.countryCode),
});

const mapProductKnowledge = (
  product?: Partial<BackendProductKnowledgeRes> | null
): ProductKnowledgeRes => {
  const item = product ?? {};

  return {
    id: String(item.id ?? ""),
    name: item.name ?? "",
    category: item.category ?? "",
    description: item.description ?? "",
    currency: item.currency ?? "IDR",
    price: Number(item.price ?? 0),
    images: item.images ?? item.imageUrls ?? [],
    rootBusinessId: String(item.rootBusinessId ?? item.businessRootId ?? ""),
    deletedAt: item.deletedAt ?? "",
    createdAt: item.createdAt ?? "",
    updatedAt: item.updatedAt ?? "",
  };
};

const toProductKnowledgePayload = (formData: ProductKnowledgePld) => ({
  name: formData.name,
  category: formData.category,
  description: formData.description,
  currency: formData.currency,
  imageUrls: formData.images ?? [],
  price: Number(formData.price),
});

const toRoleKnowledgePayload = (formData: RoleKnowledgePld) => ({
  hashtags: formData.hashtags.map((hashtag) =>
    hashtag.startsWith("#") ? hashtag : `#${hashtag}`
  ),
  targetAudience: formData.targetAudience,
  tone: formData.tone,
});

const mapRssKnowledge = (rss?: Partial<BackendRssRes> | null): RssRes => {
  const item = rss ?? {};
  const feed = item.masterRss ?? {
    id: String(item.appRssFeed?.id ?? item.appRssId ?? item.masterRssId ?? ""),
    title: item.appRssFeed?.title ?? "",
    publisher: item.appRssFeed?.publisher ?? "",
    masterRssCategory: {
      id: String(item.appRssFeed?.appRssCategory?.id ?? ""),
      name: item.appRssFeed?.appRssCategory?.name ?? "",
    },
  };

  return {
    id: String(item.id ?? ""),
    title: item.title ?? "",
    isActive: item.isActive ?? true,
    rootBusinessId: String(item.rootBusinessId ?? item.businessRootId ?? ""),
    deletedAt: item.deletedAt ?? "",
    createdAt: item.createdAt ?? "",
    updatedAt: item.updatedAt ?? "",
    masterRssId: String(item.masterRssId ?? item.appRssId ?? feed.id ?? ""),
    masterRss: {
      ...feed,
      id: String(feed.id),
      masterRssCategory: {
        ...feed.masterRssCategory,
        id: String(feed.masterRssCategory?.id ?? ""),
        name: feed.masterRssCategory?.name ?? "",
      },
    },
  };
};

const toRssPayload = (formData: AddRssPld) => ({
  title: formData.title,
  isActive: formData.isActive,
  appRssFeedId: formData.masterRssId,
});

// ============================== BUSINESS KNOWLEDGE ==============================

const businessKnowledgeService = {
  getById: (businessId: string) => {
    return api.get<BaseResponse<BusinessKnowledgeRes>>(
      `/business/knowledge/${businessId}`
    ).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: mapBusinessKnowledge(res.data.data as BackendBusinessKnowledgeRes),
      },
    }));
  },

  upsert: (businessId: string, formData: BusinessKnowledgePld) => {
    return api.post<BaseResponse<BusinessKnowledgeRes>>(
      `/business/knowledge/${businessId}`,
      toBusinessKnowledgePayload(formData)
    ).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: mapBusinessKnowledge(res.data.data as BackendBusinessKnowledgeRes),
      },
    }));
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
  getStatus(_businessId: string, _productKnowledgeId: string) {
    return Promise.resolve({
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "PRODUCT_ADVANCED_FIELDS_LOCAL_DEFAULT",
        data: {
          businessKnowledge: {
            name: true,
            category: true,
            description: true,
            location: false,
            uniqueSellingPoint: false,
            visionMission: false,
            website: true,
            logo: true,
            colorTone: true,
          },
          productKnowledge: {
            name: true,
            category: true,
            description: true,
            price: true,
          },
          roleKnowledge: {
            hashtags: true,
          },
        },
      },
    }) as ReturnType<typeof api.get<BaseResponse<AdvancedGenerate>>>;
  },
  getAll: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    return api.get<BaseResponseFiltered<ProductKnowledgeRes[]>>(
      `/business/product/${businessId}`,
      { params: filterQuery }
    ).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: (Array.isArray(res.data.data) ? res.data.data : []).map(
          mapProductKnowledge
        ),
      },
    }));
  },

  create: (businessId: string, formData: ProductKnowledgePld) => {
    return api.post<BaseResponse<ProductKnowledgeRes>>(
      `/business/product/${businessId}`,
      toProductKnowledgePayload(formData)
    ).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: mapProductKnowledge(res.data.data as BackendProductKnowledgeRes),
      },
    }));
  },
  update: (businessId: string, productId: string, formData: ProductKnowledgePld) => {
    return api.put<BaseResponse<ProductKnowledgeRes>>(
      `/business/product/${businessId}/${productId}`,
      toProductKnowledgePayload(formData)
    ).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: mapProductKnowledge(res.data.data as BackendProductKnowledgeRes),
      },
    }));
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
      toRoleKnowledgePayload(formData)
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
    ).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: (Array.isArray(res.data.data) ? res.data.data : []).map(
          mapRssKnowledge
        ),
      },
    }));
  },
  create: (businessId: string, formData: AddRssPld) => {
    return api.post<BaseResponse<RssRes>>(
      `/business/rss-subscription/${businessId}`,
      toRssPayload(formData)
    ).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: mapRssKnowledge(res.data.data as BackendRssRes),
      },
    }));
  },

  update: (businessId: string, rssKnId: string, formData: AddRssPld) => {
    return api.put<BaseResponse<RssRes>>(
      `/business/rss-subscription/${businessId}/${rssKnId}`,
      toRssPayload(formData)
    ).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: mapRssKnowledge(res.data.data as BackendRssRes),
      },
    }));
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

const mapConnectedPlatform = (
  item: BusinessConnectedPlatformApiRes
): PlatformRes => {
  const { socialPlatform, connectedPlatform } = item;
  const isConnected = !!connectedPlatform;

  return {
    name: socialPlatform.name,
    platform: socialPlatform.platformCode,
    image: socialPlatform.logo,
    status: isConnected
      ? "connected"
      : socialPlatform.isActive
      ? "unconnected"
      : "unavailable",
    accountDisplayName: connectedPlatform?.platformUserName ?? null,
    accountDisplayImage: connectedPlatform?.platformIconUrl ?? null,
    connectUrl: null,
    disconnectUrl: isConnected
      ? `/business/connected-platform/${connectedPlatform.businessRootId}/${connectedPlatform.platformCode}`
      : null,
    accountId: connectedPlatform?.platformUserId ?? null,
  };
};

const platformService = {
  getAll: (businessId: string, from?: string) => {
    return api
      .get<BaseResponse<BusinessConnectedPlatformApiRes[]>>(
        `/business/connected-platform/${businessId}`,
        { params: { from } }
      )
      .then((res) => {
        const mapped = (res.data.data ?? []).map(mapConnectedPlatform);
        return {
          ...res,
          data: {
            ...res.data,
            data: mapped,
          },
        } as unknown as Awaited<ReturnType<typeof api.get<BaseResponse<PlatformRes[]>>>>;
      });
  },
  getAuthorizeUrl: (businessId: string, platform: PlatformEnum) => {
    return api.get<BaseResponse<ConnectedPlatformAuthorizeUrlRes>>(
      `/business/connected-platform/${businessId}/oauth/${platform}/authorize-url`
    );
  },
  getPendingOauth: (businessId: string, tempCode: string) => {
    return api.get<BaseResponse<PendingConnectedPlatformOauthRes>>(
      `/business/connected-platform/${businessId}/oauth/pending/${tempCode}`
    );
  },
  connectAccount: (businessId: string, tempCodeAccount: string) => {
    return api.post<BaseResponse<ConnectPlatformAccountRes>>(
      `/business/connected-platform/${businessId}/connect-account`,
      { tempCodeAccount }
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

export const usePlatformKnowledgeGetAuthorizeUrl = () => {
  return useMutation({
    mutationFn: ({
      businessId,
      platform,
    }: {
      businessId: string;
      platform: PlatformEnum;
    }) => platformService.getAuthorizeUrl(businessId, platform),
  });
};

export const usePlatformKnowledgeGetPendingOauth = (
  businessId: string,
  tempCode: string | null
) => {
  return useQuery({
    queryKey: ["platformKnowledgePendingOauth", businessId, tempCode],
    queryFn: () => platformService.getPendingOauth(businessId, tempCode || ""),
    enabled: !!businessId && !!tempCode,
  });
};

export const usePlatformKnowledgeConnectAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      tempCodeAccount,
    }: {
      businessId: string;
      tempCodeAccount: string;
    }) => platformService.connectAccount(businessId, tempCodeAccount),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["platformKnowledge"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentAutoGenerateGetSettings"],
      });
    },
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
