import { api } from "@/config/api";
import {
  BaseResponse,
  BaseResponseFiltered,
  FilterQuery,
} from "@/models/api/base-response.type";
import {
  RssArticleRes,
  RssCategoryRes,
  RssLibraryRes,
} from "@/models/api/library/rss.type";
import {
  PublishedTemplateRes,
  SavedTemplatePld,
  SavedTemplateRes,
  TemplateCategoryRes,
  TemplateProductCategoryRes,
} from "@/models/api/library/template.type";
import { TimezoneRes } from "@/models/api/library/time.type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type CreatorCategory = {
  id: string | number;
  name: string;
  indonesianName?: string;
  totalData?: number;
};

type CreatorImage = {
  id: string | number;
  name: string;
  imageUrl: string | null;
  isPublished?: boolean;
  price?: number;
  publisher: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  typeCategories?: CreatorCategory[];
  productCategories?: CreatorCategory[];
  templateImageCategories?: CreatorCategory[];
  templateProductCategories?: CreatorCategory[];
  savedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatorImageTemplate = {
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
};

const getArrayData = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }

  return [];
};

const mapTemplateCategory = (category: CreatorCategory): TemplateCategoryRes => ({
  id: String(category.id),
  name: category.name,
  _count: { templateImageContents: category.totalData ?? 0 },
});

const mapTemplateProductCategory = (
  category: CreatorCategory
): TemplateProductCategoryRes => ({
  id: String(category.id),
  indonesianName: category.name,
  _count: { templateImageContents: category.totalData ?? 0 },
});

const mapPublishedTemplate = (template: CreatorImage): PublishedTemplateRes => ({
  id: String(template.id),
  name: template.name,
  imageUrl: template.imageUrl || "",
  publisher: template.publisher,
  templateImageCategories: (
    template.typeCategories ||
    template.templateImageCategories ||
    []
  ).map((category) => ({
    id: String(category.id),
    name: category.name,
  })),
  templateProductCategories: (
    template.productCategories ||
    template.templateProductCategories ||
    []
  ).map((category) => ({
      id: String(category.id),
      indonesianName: category.indonesianName || category.name,
    })),
  createdAt: template.createdAt,
  updatedAt: template.updatedAt,
});

const mapCreatorImageTemplate = (
  template: CreatorImage,
  type: "saved" | "published"
): CreatorImageTemplate => ({
  id: String(template.id),
  name: template.name,
  imageUrl: template.imageUrl || "",
  categories: (
    template.typeCategories ||
    template.templateImageCategories ||
    []
  ).map((category) => category.name),
  productCategories: (
    template.productCategories ||
    template.templateProductCategories ||
    []
  ).map((category) => category.indonesianName || category.name),
  price: 0,
  publisher: template.publisher || {
    id: "",
    name: "Postmatic",
    image: null,
  },
  type,
  createdAt: template.createdAt,
  updatedAt: template.updatedAt,
});

const getCreatorImageTemplates = (filterQuery?: Partial<FilterQuery>) => {
  const { productCategory, category, ...rest } = filterQuery || {};

  return api
    .get<BaseResponseFiltered<CreatorImage[]>>(`/creator/image`, {
      params: {
        ...rest,
        published: true,
        category: productCategory || undefined,
        typeCategoryId: category || undefined,
      },
    })
    .then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: getArrayData<CreatorImage>(res.data.data).map((template) =>
          mapCreatorImageTemplate(template, "published")
        ),
      },
    })) as unknown as ReturnType<
    typeof api.get<BaseResponseFiltered<CreatorImageTemplate[]>>
  >;
};

const mapSavedTemplate = (template: CreatorImage): SavedTemplateRes => ({
  name: template.name,
  imageUrl: template.imageUrl || "",
  createdAt: template.savedAt || template.createdAt,
  updatedAt: template.updatedAt,
  templateImageContent: {
    id: String(template.id),
    publisher: template.publisher,
    templateImageCategories: (template.typeCategories || []).map((category) => ({
      id: String(category.id),
      name: category.name,
    })),
    templateProductCategories: (template.productCategories || []).map(
      (category) => ({
        id: String(category.id),
        indonesianName: category.name,
      })
    ),
  },
});

const mapRssLibrary = (rss: RssLibraryRes): RssLibraryRes => ({
  ...rss,
  id: String(rss.id),
  masterRssCategoryId: String(rss.masterRssCategoryId),
});

const mapRssCategory = (category: RssCategoryRes): RssCategoryRes => ({
  ...category,
  id: String(category.id),
});

// ============================== LIBRARY ==============================

const libraryService = {
  RSSArticle: (_businessId: string) => {
    return Promise.resolve({
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "RSS_ARTICLE_ENDPOINT_NOT_AVAILABLE",
        data: [],
      },
    }) as unknown as ReturnType<typeof api.get<BaseResponse<RssArticleRes[]>>>;
  },
  RSSData: (filterQuery?: Partial<FilterQuery>) => {
    return api.get<BaseResponse<RssLibraryRes[]>>(`/app/rss`, {
      params: filterQuery,
    }).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: (Array.isArray(res.data.data) ? res.data.data : []).map(
          mapRssLibrary
        ),
      },
    }));
  },
  RSSCategory: () => {
    return api.get<BaseResponse<RssCategoryRes[]>>(`/app/rss/category`).then(
      (res) => ({
        ...res,
        data: {
          ...res.data,
          data: (Array.isArray(res.data.data) ? res.data.data : []).map(
            mapRssCategory
          ),
        },
      })
    );
  },
  time: () => {
    return api.get<BaseResponse<TimezoneRes[]>>(`/app/timezone`);
  },
};

export const useLibraryRSSArticle = (businessId: string, enabled = true) => {
  return useQuery({
    queryKey: ["libraryRSSArticle"],
    queryFn: () => libraryService.RSSArticle(businessId),
    enabled: enabled && !!businessId,
  });
};

export const useLibraryRSSData = (filterQuery?: Partial<FilterQuery>) => {
  return useQuery({
    queryKey: ["libraryRSSData", filterQuery],
    queryFn: () => libraryService.RSSData(filterQuery),
  });
};

export const useLibraryRSSCategory = () => {
  return useQuery({
    queryKey: ["libraryRSSCategory"],
    queryFn: () => libraryService.RSSCategory(),
  });
};
export const useLibraryTime = () => {
  return useQuery({
    queryKey: ["libraryTime"],
    queryFn: () => libraryService.time(),
  });
};

// ============================== TEMPLATE ==============================

const templateService = {
  saveTemplate: (businessId: string, formData: SavedTemplatePld) => {
    return api.post<BaseResponse<SavedTemplateRes[]>>(
      `/creator/business-creator-image/${businessId}`,
      { creatorImageId: Number(formData.templateImageContentId) }
    );
  },
  getSaved: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    return api
      .get<BaseResponseFiltered<CreatorImage[]>>(
        `/creator/business-saved-creator-image/${businessId}`,
        { params: filterQuery }
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data || []).map(mapSavedTemplate),
        },
      })) as unknown as ReturnType<
      typeof api.get<BaseResponseFiltered<SavedTemplateRes[]>>
    >;
  },
  getPublished: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    const { productCategory, category, ...rest } = filterQuery || {};
    return api
      .get<BaseResponseFiltered<CreatorImage[]>>(`/creator/image`, {
        params: {
          ...rest,
          published: true,
          category: productCategory || undefined,
          typeCategoryId: category || undefined,
        },
      })
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: getArrayData<CreatorImage>(res.data.data).map(
            (template) => mapCreatorImageTemplate(template, "published")
          ),
        },
      })) as unknown as ReturnType<
      typeof api.get<BaseResponseFiltered<CreatorImageTemplate[]>>
    >;
  },
  getCategory: () => {
    return api
      .get<BaseResponse<CreatorCategory[]>>(`/app/category-creator-image/type`)
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data || []).map(mapTemplateCategory),
        },
      })) as unknown as ReturnType<
      typeof api.get<BaseResponse<TemplateCategoryRes[]>>
    >;
  },
  getProductCategory: () => {
    return api
      .get<BaseResponse<CreatorCategory[]>>(`/app/category-creator-image/product`)
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data || []).map(mapTemplateProductCategory),
        },
      })) as unknown as ReturnType<
      typeof api.get<BaseResponse<TemplateProductCategoryRes[]>>
    >;
  },
  deleteSaved: (idBusiness: string, templateId: string) => {
    return api.delete<BaseResponse>(
      `/creator/business-creator-image/${idBusiness}/${templateId}`
    );
  },
};

export const useLibraryTemplateSave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: SavedTemplatePld;
    }) => templateService.saveTemplate(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["libraryTemplateSaved"],
      });
      queryClient.invalidateQueries({
        queryKey: ["libraryTemplatePublished"],
      });
    },
  });
};

export const useLibraryTemplateGetSaved = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>,
  enabled = true
) => {
  return useQuery({
    queryKey: ["libraryTemplateSaved", businessId, filterQuery],
    queryFn: () => templateService.getSaved(businessId, filterQuery),
    enabled: enabled && !!businessId,
  });
};

export const useLibraryTemplateGetPublished = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>,
  enabled = true
) => {
  return useQuery({
    queryKey: ["libraryTemplatePublished", businessId, filterQuery],
    queryFn: () => getCreatorImageTemplates(filterQuery),
    enabled: enabled && !!businessId,
    refetchOnMount: "always",
  });
};

export const useCreatorImageTemplates = (
  filterQuery?: Partial<FilterQuery>,
  enabled = true
) => {
  return useQuery({
    queryKey: ["creatorImageTemplates", filterQuery],
    queryFn: () => getCreatorImageTemplates(filterQuery),
    enabled,
    refetchOnMount: "always",
  });
};

export const useLibraryTemplateGetCategory = (enabled = true) => {
  return useQuery({
    queryKey: ["libraryTemplateCategory"],
    queryFn: () => templateService.getCategory(),
    enabled,
  });
};

export const useLibraryTemplateGetProductCategory = (enabled = true) => {
  return useQuery({
    queryKey: ["libraryTemplateProductCategory"],
    queryFn: () => templateService.getProductCategory(),
    enabled,
  });
};


export const useLibraryTemplateDeleteSaved = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      templateId,
    }: {
      businessId: string;
      templateId: string;
    }) => templateService.deleteSaved(businessId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["libraryTemplateSaved"],
      });
      queryClient.invalidateQueries({
        queryKey: ["libraryTemplatePublished"],
      });
    },
  });
};
