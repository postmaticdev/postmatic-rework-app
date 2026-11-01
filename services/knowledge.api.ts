import { api } from "@/config/api";
import {
  BaseResponse,
  BaseResponseFiltered,
  FilterQuery,
  Pagination,
} from "@/models/api/base-response.type";
import { AdvancedGenerate } from "@/models/api/content/image.type";
import {
  BusinessAvatarDeleteRes,
  BusinessAvatarPld,
  BusinessAvatarRes,
} from "@/models/api/knowledge/avatar.type";
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
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

// Backend caps list `limit` at 50 (default 10), so knowledge-base lists are paged.
const KNOWLEDGE_LIST_PAGE_SIZE = 50;

const getNextListPage = (lastPage: { data: { pagination?: Pagination } }) =>
  lastPage.data.pagination?.hasNextPage
    ? lastPage.data.pagination.page + 1
    : undefined;

// Keep showing the previous results while a new search loads, but never
// carry them over to another business.
const keepPreviousForBusiness =
  (businessId: string) =>
  <T>(previousData: T | undefined, previousQuery?: { queryKey: readonly unknown[] }) =>
    previousQuery?.queryKey[1] === businessId ? previousData : undefined;

// The knowledge-base components toast their own errors (with field-level
// validation messages); rethrowing here skips the global mutation toast so the
// same error is not shown twice.
const rethrowWithoutGlobalToast = (error: unknown) => {
  throw error;
};

type BackendBusinessKnowledgeRes = BusinessKnowledgeRes & {
  primaryLogoUrl?: string | null;
  websiteUrl?: string | null;
  businessPhone?: string | null;
  countryCode?: string | null;
  businessRootId?: string | number;
};

type BackendBusinessAvatarRes = Omit<
  BusinessAvatarRes,
  "appAvatarId" | "rootBusinessId"
> & {
  id: string | number;
  appAvatarId?: string | number | null;
  businessRootId?: string | number;
  rootBusinessId?: string | number;
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
    url?: string;
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

const mapBusinessAvatar = (
  avatar?: Partial<BackendBusinessAvatarRes> | null
): BusinessAvatarRes => {
  const item = avatar ?? {};

  return {
    id: String(item.id ?? ""),
    name: item.name ?? "",
    imageUrl: item.imageUrl ?? "",
    appAvatarId:
      item.appAvatarId === undefined || item.appAvatarId === null
        ? null
        : String(item.appAvatarId),
    rootBusinessId: String(item.rootBusinessId ?? item.businessRootId ?? ""),
    deletedAt: item.deletedAt ?? null,
    createdAt: item.createdAt ?? "",
    updatedAt: item.updatedAt ?? "",
  };
};

const toBusinessAvatarPayload = (formData: BusinessAvatarPld) => ({
  name: formData.name,
  imageUrl: formData.imageUrl,
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
    url: item.appRssFeed?.url ?? "",
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
  appRssFeedId: Number(formData.masterRssId),
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["businessKnowledge"],
      });
      // Business name/logo shown in the header and business list come from these queries.
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      queryClient.invalidateQueries({
        queryKey: ["business", variables.businessId],
      });
    },
    onError: (error) => {
      throw error;
    },
  });
};

// ============================== AVATAR KNOWLEDGE ==============================

const businessAvatarService = {
  getAll: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    return api
      .get<BaseResponseFiltered<BusinessAvatarRes[]>>(
        `/business/avatar/${businessId}`,
        {
          params: filterQuery,
        }
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (Array.isArray(res.data.data) ? res.data.data : []).map(
            mapBusinessAvatar
          ),
        },
      }));
  },

  create: (businessId: string, formData: BusinessAvatarPld) => {
    return api
      .post<BaseResponse<BusinessAvatarRes>>(
        `/business/avatar/${businessId}`,
        toBusinessAvatarPayload(formData)
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: mapBusinessAvatar(res.data.data as BackendBusinessAvatarRes),
        },
      }));
  },

  update: (
    businessId: string,
    avatarId: string,
    formData: BusinessAvatarPld
  ) => {
    return api
      .put<BaseResponse<BusinessAvatarRes>>(
        `/business/avatar/${businessId}/${avatarId}`,
        toBusinessAvatarPayload(formData)
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: mapBusinessAvatar(res.data.data as BackendBusinessAvatarRes),
        },
      }));
  },

  delete: (businessId: string, avatarId: string) => {
    return api
      .delete<BaseResponse<BusinessAvatarDeleteRes>>(
        `/business/avatar/${businessId}/${avatarId}`
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: mapBusinessAvatar(res.data.data as BackendBusinessAvatarRes),
        },
      }));
  },
};

export const useBusinessAvatarGetAll = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>,
  enabled = true
) => {
  return useQuery({
    queryKey: ["businessAvatar", businessId, filterQuery],
    queryFn: () => businessAvatarService.getAll(businessId, filterQuery),
    enabled: enabled && !!businessId,
  });
};

export const useBusinessAvatarInfinite = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>
) => {
  return useInfiniteQuery({
    queryKey: ["businessAvatar", businessId, "infinite", filterQuery],
    queryFn: ({ pageParam }) =>
      businessAvatarService.getAll(businessId, {
        ...filterQuery,
        page: pageParam,
        limit: KNOWLEDGE_LIST_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: getNextListPage,
    placeholderData: keepPreviousForBusiness(businessId),
    enabled: !!businessId,
  });
};

export const useBusinessAvatarCreate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: BusinessAvatarPld;
    }) => businessAvatarService.create(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["businessAvatar"],
      });
    },
    onError: rethrowWithoutGlobalToast,
  });
};

export const useBusinessAvatarUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      avatarId,
      formData,
    }: {
      businessId: string;
      avatarId: string;
      formData: BusinessAvatarPld;
    }) => businessAvatarService.update(businessId, avatarId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["businessAvatar"],
      });
    },
    onError: rethrowWithoutGlobalToast,
  });
};

export const useBusinessAvatarDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      avatarId,
    }: {
      businessId: string;
      avatarId: string;
    }) => businessAvatarService.delete(businessId, avatarId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["businessAvatar"],
      });
    },
    onError: rethrowWithoutGlobalToast,
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
    queryKey: ["productKnowledgeStatus", businessId, productKnowledgeId],
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
    queryKey: ["productKnowledge", businessId, filterQuery],
    queryFn: () => productKnowledgeService.getAll(businessId, filterQuery),
    enabled: enabled && !!businessId,
  });
};

export const useProductKnowledgeInfinite = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>
) => {
  return useInfiniteQuery({
    queryKey: ["productKnowledge", businessId, "infinite", filterQuery],
    queryFn: ({ pageParam }) =>
      productKnowledgeService.getAll(businessId, {
        ...filterQuery,
        page: pageParam,
        limit: KNOWLEDGE_LIST_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: getNextListPage,
    placeholderData: keepPreviousForBusiness(businessId),
    enabled: !!businessId,
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
    onError: rethrowWithoutGlobalToast,
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
    onError: rethrowWithoutGlobalToast,
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
    onError: rethrowWithoutGlobalToast,
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
    return api.get<BaseResponseFiltered<RssRes[]>>(
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

export const useRssKnowledgeInfinite = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>
) => {
  return useInfiniteQuery({
    queryKey: ["rssKnowledge", businessId, "infinite", filterQuery],
    queryFn: ({ pageParam }) =>
      rssKnowledgeService.getById(businessId, {
        ...filterQuery,
        page: pageParam,
        limit: KNOWLEDGE_LIST_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: getNextListPage,
    placeholderData: keepPreviousForBusiness(businessId),
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
    onError: rethrowWithoutGlobalToast,
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
    onError: rethrowWithoutGlobalToast,
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
    onError: rethrowWithoutGlobalToast,
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
    id: connectedPlatform?.id ?? null,
    requiresReconnect: isConnected
      ? connectedPlatform.requiresReconnect ??
        connectedPlatform.platformMetadata?.requiresReconnect === true
      : false,
  };
};

const platformService = {
  getAll: (businessId: string) => {
    return api
      .get<BaseResponse<BusinessConnectedPlatformApiRes[]>>(
        `/business/connected-platform/${businessId}`
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
  // `from` adalah halaman tujuan setelah akun platform dipilih di auth;
  // tanpa ini backend kembali ke root workspace (daftar bisnis).
  getAuthorizeUrl: (businessId: string, platform: PlatformEnum, from?: string) => {
    return api.get<BaseResponse<ConnectedPlatformAuthorizeUrlRes>>(
      `/business/connected-platform/${businessId}/oauth/${platform}/authorize-url`,
      { params: from ? { from } : undefined }
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
  disconnect: (businessId: string, platformId: number) => {
    return api.delete<BaseResponse<null>>(
      `/business/connected-platform/${businessId}/${platformId}`
    );
  },
};

export const usePlatformKnowledgeGetAll = (
  businessId: string
) => {
  return useQuery({
    queryKey: ["platformKnowledge", businessId],
    queryFn: () => platformService.getAll(businessId),
    enabled: !!businessId,
    // Connections change outside this tab (OAuth on the auth site, another
    // owner, token revoked), so recheck when the user comes back to the tab.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const usePlatformKnowledgeGetAuthorizeUrl = () => {
  return useMutation({
    mutationFn: ({
      businessId,
      platform,
      from,
    }: {
      businessId: string;
      platform: PlatformEnum;
      from?: string;
    }) => platformService.getAuthorizeUrl(businessId, platform, from),
    onError: rethrowWithoutGlobalToast,
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
    // The temp code is single-use and short-lived: never serve it from cache.
    gcTime: 0,
  });
};

// Returned from onSuccess so the mutation stays pending until the list has
// refetched; otherwise the old state flashes back for a moment. A failed
// connect/disconnect usually means the list is stale (already connected or
// disconnected elsewhere), so errors refresh it too.
const invalidatePlatformQueries = (
  queryClient: ReturnType<typeof useQueryClient>
) => {
  queryClient.invalidateQueries({ queryKey: ["contentAutoGenerateGetSettings"] });
  return queryClient.invalidateQueries({ queryKey: ["platformKnowledge"] });
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
    onSuccess: () => invalidatePlatformQueries(queryClient),
    onError: (error) => {
      invalidatePlatformQueries(queryClient);
      rethrowWithoutGlobalToast(error);
    },
  });
};

export const usePlatformKnowledgeDisconnect = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      platformId,
    }: {
      businessId: string;
      platformId: number;
    }) => platformService.disconnect(businessId, platformId),
    onSuccess: () => invalidatePlatformQueries(queryClient),
    onError: (error) => {
      invalidatePlatformQueries(queryClient);
      rethrowWithoutGlobalToast(error);
    },
  });
};
