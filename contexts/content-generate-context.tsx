"use client";

import {
  ACCESS_TOKEN_KEY,
  NEXT_PUBLIC_ENABLE_CONTENT_FEATURES,
  NEXT_PUBLIC_ENABLE_SOCKET,
} from "@/constants";
import { showToast } from "@/helper/show-toast";
import { useTranslations } from "next-intl";
import { createSocket, destroySocket, getSocket } from "@/lib/socket";
import { FilterQuery, Pagination } from "@/models/api/base-response.type";
import {
  AdvancedGenerate,
  GenerateContentAdvanceBase,
  GenerateContentBase,
  GenerateContentRes,
  GenerateContentRssBase,
  ValidRatio,
} from "@/models/api/content/image.type";
import { ProductKnowledgeRes } from "@/models/api/knowledge/product.type";
import { RssArticleRes } from "@/models/api/library/rss.type";
import { AiModelRes } from "@/models/api/content/ai-model";
import {
  GetAllJob,
  JobData,
  JobStage,
  JobStatus,
} from "@/models/socket-content";
import {
  useContentDraftSaveDraftContent,
  useContentJobGetAllJob,
  useContentJobKnowledgeOnJob,
  useContentJobMaskOnJob,
  useContentJobRssOnJob,
  useContentAiModelGetAiModels,
} from "@/services/content/content.api";
import {
  useProductKnowledgeGetAll,
  useProductKnowledgeGetStatus,
} from "@/services/knowledge.api";
import {
  useLibraryRSSArticle,
  useLibraryTemplateDeleteSaved,
  useCreatorImageTemplates,
  useLibraryTemplateGetSaved,
  useLibraryTemplateSave,
  useLibraryTemplateGetProductCategory,
} from "@/services/library.api";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";

import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

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
  price: 0; // TODO: belum ada price
  type: "saved" | "published";
}

export type ContentMode = "knowledge" | "regenerate" | "mask" | "rss";
export type TabMode = "knowledge" | "rss";

interface BasicForm extends GenerateContentBase {
  productName: string;
  productImage: string;
  customCategory: string;
  customDesignStyle: string;
  referenceImageName: string | null;
  referenceImagePublisher: string | null;
  caption: string;
  model: string;
  imageSize: string | null;
}

interface ContentGenerateContext {
  // FORM
  form: {
    basic: BasicForm;
    advance: GenerateContentAdvanceBase;
    rss: GenerateContentRssBase | null;
    setBasic: (item: BasicForm) => void;
    setAdvance: (item: GenerateContentAdvanceBase) => void;
    onRssSelect: (item: GenerateContentRssBase | null) => void;
    enabledAdvance: AdvancedGenerate;
    setEnabledAdvance: (item: AdvancedGenerate) => void;
    mask: string | null;
    setMask: Dispatch<SetStateAction<string | null>>;
  };

  // SELECTED TEMPLATE
  selectedTemplate: Template | null;
  setSelectedTemplate: (template: Template | null) => void;

  // MODE / HELPER
  mode: ContentMode;
  setMode: (item: "knowledge" | "regenerate" | "mask" | "rss") => void;
  tab: TabMode;
  setTab: (item: TabMode) => void;
  isLoading: boolean;
  setIsLoading: (item: boolean) => void;

  // UNSAVE MODAL
  unsaveModal: {
    isOpen: boolean;
    item: Template | null;
    isLoading: boolean;
  };
  setUnsaveModal: (modal: {
    isOpen: boolean;
    item: Template | null;
    isLoading: boolean;
  }) => void;

  //   // TEMPLATE / LIBRARY
  savedTemplates: {
    contents: Template[];
    pagination: Pagination;
    filterQuery: Partial<FilterQuery>;
    setFilterQuery: (q: Partial<FilterQuery>) => void;
    isLoading: boolean;
  };
  publishedTemplates: {
    contents: Template[];
    pagination: Pagination;
    filterQuery: Partial<FilterQuery>;
    setFilterQuery: (q: Partial<FilterQuery>) => void;
    isLoading: boolean;
  };
  productKnowledges: {
    contents: ProductKnowledgeRes[];
    pagination: Pagination;
    filterQuery: Partial<FilterQuery>;
    setFilterQuery: (q: Partial<FilterQuery>) => void;
  };

  // Library
  rss: {
    articles: RssArticleRes[];
    pagination: Pagination;
    filterQuery: Partial<FilterQuery>;
    setFilterQuery: (q: Partial<FilterQuery>) => void;
  };

  // History
  histories: GetAllJob[];
  selectedHistory: JobData | null;
  selectedGeneratedImageUrl: string | null;
  onSelectHistory: (
    item: JobData | null,
    options?: { selectedImageUrl?: string | null }
  ) => void;
  onSelectGeneratedImage: (
    item: JobData,
    imageUrl: string,
    options?: { attachForEdit?: boolean }
  ) => void;

  // AI Models
  aiModels: {
    models: AiModelRes[];
    selectedModel: AiModelRes | null;
    validRatios: string[];
    isLoading: boolean;
  };

  // Draft saved state
  isDraftSaved: boolean;
  setIsDraftSaved: (saved: boolean) => void;

  //   // HANDLER
  onSaveUnsave: (item: Template) => void;
  onConfirmUnsave: () => void;
  onCloseUnsaveModal: () => void;
  onSelectProduct: (item: ProductKnowledgeRes | null) => void;
  onSelectReferenceImage: (
    imageUrl: string,
    imageName: string | null,
    template?: Template
  ) => void;
  onSubmitGenerate: (overrides?: {
    mode?: ContentMode;
    maskUrl?: string;
  }) => void;
  onSaveDraft: () => void;
  onResetAdvance: () => void;
  onSelectAiModel: (model: AiModelRes) => void;

  // // Socket
  socketEvent: {
    isConnected: boolean;
  };
}

const initialEnabledAdvance: ContentGenerateContext["form"]["enabledAdvance"] =
  {
    businessKnowledge: {
      name: false,
      category: false,
      description: false,
      location: false,
      uniqueSellingPoint: false,
      visionMission: false,
      website: false,
      logo: false,
      colorTone: false,
    },
    productKnowledge: {
      name: false,
      category: false,
      description: false,
      price: false,
    },
    roleKnowledge: {
      hashtags: false,
    },
  };

const initialFormBasic: ContentGenerateContext["form"]["basic"] = {
  category: "Default",
  designStyle: "Default",
  productKnowledgeId: "",
  prompt: "",
  ratio: "1:1",
  referenceImage: null,
  productName: "",
  productImage: "",
  customCategory: "",
  customDesignStyle: "",
  referenceImageName: null,
  referenceImagePublisher: null,
  caption: "",
  model: "",
  imageSize: null,
};

const initialFormAdvance: GenerateContentAdvanceBase = {
  businessKnowledge: {
    category: false,
    description: false,
    location: false,
    name: false,
    uniqueSellingPoint: false,
    visionMission: false,
    website: false,
    logo: true,
    colorTone: true,
  },
  productKnowledge: {
    category: false,
    description: false,
    name: true,
    price: false,
  },
  roleKnowledge: {
    hashtags: false,
  },
};

const initialPagination: Pagination = {
  limit: 10,
  page: 1,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

const fallbackRatios = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
];

type CreatorImageCategory = {
  id: string | number;
  name: string;
};

type CreatorImageReference = {
  id: string | number;
  name: string;
  imageUrl: string | null;
  publisher: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  typeCategories?: CreatorImageCategory[];
  productCategories?: CreatorImageCategory[];
  createdAt: string;
  updatedAt: string;
};

const mapCreatorImageReference = (item: CreatorImageReference): Template => ({
  id: String(item.id),
  name: item.name,
  imageUrl: item.imageUrl || "",
  categories: item.typeCategories?.map((category) => category.name) || [],
  productCategories:
    item.productCategories?.map((category) => category.name) || [],
  publisher: item.publisher || {
    id: "",
    name: "Postmatic",
    image: null,
  },
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  price: 0,
  type: "published",
});

const getBrowserAccessToken = () => {
  if (typeof window === "undefined") return null;

  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ACCESS_TOKEN_KEY}=`))
    ?.split("=")[1];

  return cookieToken
    ? decodeURIComponent(cookieToken)
    : localStorage.getItem(ACCESS_TOKEN_KEY);
};

const pickDefaultAiModel = (models: AiModelRes[]) =>
  models.find((model) => model.name === "gemini-3-pro-image-preview") ||
  models[0] ||
  null;

const notLoadingJobStatus: JobStatus[] = ["done", "error"];
const notLoadingJobStages: JobStage[] = ["done", "error"];

function upsertJobIntoHistory(groups: GetAllJob[], incoming: JobData) {
  let jobWasUpdated = false;
  let jobWasInserted = false;

  const updatedGroups = groups.map((group) => {
    const exists = group.jobs.some((job) => job.id === incoming.id);
    if (exists) {
      jobWasUpdated = true;
      return {
        ...group,
        latestUpdate: incoming.updatedAt,
        latestImage:
          incoming.result?.images?.[0] ||
          incoming.product?.images?.[0] ||
          group.latestImage,
        jobs: group.jobs.map((job) =>
          job.id === incoming.id ? incoming : job
        ),
      };
    }

    const belongsToGroup =
      group.productKnowledgeId === incoming.input.productKnowledgeId;
    if (belongsToGroup && !jobWasInserted) {
      jobWasInserted = true;
      return {
        ...group,
        latestUpdate: incoming.updatedAt,
        latestImage:
          incoming.result?.images?.[0] ||
          incoming.product?.images?.[0] ||
          group.latestImage,
        jobs: [...group.jobs, incoming],
      };
    }

    return group;
  });

  if (jobWasUpdated || jobWasInserted) {
    return updatedGroups;
  }

  return [
    {
      productKnowledgeId: incoming.input.productKnowledgeId,
      latestUpdate: incoming.updatedAt,
      latestImage:
        incoming.result?.images?.[0] || incoming.product?.images?.[0] || "",
      name: incoming.product?.name || "",
      jobs: [incoming],
    },
    ...groups,
  ];
}

const ContentGenerateContext = createContext<
  ContentGenerateContext | undefined
>(undefined);

export const ContentGenerateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  /**
   *
   * GLOBAL
   *
   */
  const { businessId } = useParams() as { businessId: string };
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const t = useTranslations();
  const browserPathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const isContentGenerateRoute =
    pathname.includes("content-generate") ||
    browserPathname.includes("content-generate");
  const contentFeaturesEnabled =
    NEXT_PUBLIC_ENABLE_CONTENT_FEATURES && isContentGenerateRoute;
  const selectedHistoryRouteId = searchParams.get("selectedHistoryId");
  const selectedHistoryRouteImage = searchParams.get("selectedHistoryImage");
  const shouldFetchHistories =
    contentFeaturesEnabled &&
    Boolean(selectedHistoryRouteId || selectedHistoryRouteImage);
  /**
   *
   * LIBRARY HISTORY
   *
   */

  const { data: historiesRes, refetch: refetchHistories } =
    useContentJobGetAllJob(businessId, shouldFetchHistories);
  const { data: productCategoriesData } = useLibraryTemplateGetProductCategory(
    contentFeaturesEnabled
  );
  const { data: aiModelsRes, isLoading: isLoadingAiModels } =
    useContentAiModelGetAiModels(contentFeaturesEnabled);

  const [histories, setHistories] = useState<GetAllJob[]>([]);
  const lastHistoryRouteRefetchKeyRef = useRef<string | null>(null);
  const lastAppliedHistoryRouteKeyRef = useRef<string | null>(null);

  //DEBUG
  const flattenedHistories = useMemo(() => {
    return histories.flatMap((item) => item.jobs);
  }, [histories]);
  const findMaskGenerated = useMemo(() => {
    return flattenedHistories.find((item) => item.type === "mask");
  }, [flattenedHistories]);
  console.log("findMaskGenerated", findMaskGenerated);

  useEffect(() => {
    if (historiesRes) {
      const serverGroups = historiesRes?.data?.data || [];
      setHistories((prev) => {
        const serverJobIds = new Set(
          serverGroups.flatMap((group) => group.jobs.map((job) => job.id))
        );
        const localPendingJobs = prev
          .flatMap((group) => group.jobs)
          .filter(
            (job) =>
              !serverJobIds.has(job.id) &&
              job.status !== "done" &&
              job.status !== "error"
          );

        return localPendingJobs.reduce(
          (groups, job) => upsertJobIntoHistory(groups, job),
          serverGroups
        );
      });
    }
  }, [historiesRes]);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedGeneratedImageUrl, setSelectedGeneratedImageUrl] = useState<
    string | null
  >(null);
  const selectedHistory = useMemo(() => {
    if (!selectedJobId) return null;
    return (
      histories
        .flatMap((item) => item.jobs)
        .find((job) => job.id === selectedJobId) || null
    );
  }, [histories, selectedJobId]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(false);
  
  // AI Models state
  const [selectedAiModel, setSelectedAiModel] = useState<AiModelRes | null>(null);

  // Set default AI model when models are loaded
  useEffect(() => {
    if (aiModelsRes?.data?.data && aiModelsRes.data.data.length > 0 && !selectedAiModel) {
      const defaultModel = pickDefaultAiModel(aiModelsRes.data.data);
      if (!defaultModel) return;
      setSelectedAiModel(defaultModel);
      setFormBasic(prev => ({
        ...prev,
        model: defaultModel.name,
        ratio: (defaultModel.validRatios?.[0] || prev.ratio || fallbackRatios[0]) as ValidRatio,
        imageSize: defaultModel.imageSizes?.[0] || null,
      }));
    }
  }, [aiModelsRes, selectedAiModel]);

  // Get valid ratios from selected model
  const validRatios = useMemo(() => {
    const model =
      selectedAiModel ||
      pickDefaultAiModel(aiModelsRes?.data?.data || []);

    return model?.validRatios?.length ? model.validRatios : fallbackRatios;
  }, [aiModelsRes?.data?.data, selectedAiModel]);

  const onSelectHistory = useCallback((
    item: JobData | null,
    options?: { selectedImageUrl?: string | null }
  ) => {
    if (item) {
      setMode("regenerate");
      const activeImageUrl =
        options?.selectedImageUrl || item?.result?.images[0] || null;
      
      // Find and set the AI model from history
      const modelFromHistory = aiModelsRes?.data?.data?.find(
        model => model.name === item?.input?.model
      );
      if (modelFromHistory) {
        setSelectedAiModel(modelFromHistory);
      }
      
      setFormBasic((prev) => ({
        ...prev,
        prompt: "",
        referenceImageName: "",
        caption: item?.result?.caption || "",
        productKnowledgeId: item?.input?.productKnowledgeId || "",
        productName: item?.product?.name || "",
        productImage: activeImageUrl || "",
        category: item?.input?.category || "other",
        customCategory: item?.input?.category || "",
        designStyle: item?.input?.designStyle || "",
        customDesignStyle: item?.input?.designStyle || "",
        referenceImage: activeImageUrl || "",
        ratio: (item?.result?.ratio || "1:1") as ValidRatio,
        model: item?.input?.model || "",
        imageSize:
          item?.input?.imageSize ||
          modelFromHistory?.imageSizes?.[0] ||
          null,
      }));
      setSelectedJobId(item.id);
      setSelectedGeneratedImageUrl(activeImageUrl);
      setFormAdvance(initialFormAdvance);
      setFormRss(null);
      setMode("regenerate");
      setTab("knowledge");
    } else {
      const defaultModel =
        pickDefaultAiModel(aiModelsRes?.data?.data || []) ||
        selectedAiModel;
      if (defaultModel) {
        setSelectedAiModel(defaultModel);
      }
      setMode("knowledge");
      setTab("knowledge");
      setSelectedJobId(null);
      setSelectedGeneratedImageUrl(null);
      form.setBasic({
        ...initialFormBasic,
        model: defaultModel?.name || initialFormBasic.model,
          ratio: (defaultModel?.validRatios?.[0] ||
          initialFormBasic.ratio ||
          fallbackRatios[0]) as ValidRatio,
        imageSize: defaultModel?.imageSizes?.[0] || null,
      });
      form.setAdvance(initialFormAdvance);
    }
    setFormRss(null);
    setIsDraftSaved(false); // Reset draft saved state when selecting new history
  }, [aiModelsRes, selectedAiModel]);

  const onSelectGeneratedImage = useCallback(
    (
      item: JobData,
      imageUrl: string,
      options?: { attachForEdit?: boolean }
    ) => {
      const modelFromHistory = aiModelsRes?.data?.data?.find(
        (model) => model.name === item?.input?.model
      );
      if (modelFromHistory) {
        setSelectedAiModel(modelFromHistory);
      }

      setFormBasic((prev) => ({
        ...prev,
        prompt: options?.attachForEdit ? "" : prev.prompt,
        referenceImageName: options?.attachForEdit ? "Selected image" : "",
        caption: item?.result?.caption || prev.caption || "",
        productKnowledgeId: item?.input?.productKnowledgeId || "",
        productName: item?.product?.name || "",
        productImage: imageUrl,
        category: item?.input?.category || "other",
        customCategory: item?.input?.category || "",
        designStyle: item?.input?.designStyle || "",
        customDesignStyle: item?.input?.designStyle || "",
        referenceImage: imageUrl,
        ratio: (item?.result?.ratio || "1:1") as ValidRatio,
        model: item?.input?.model || prev.model,
        imageSize:
          item?.input?.imageSize ||
          modelFromHistory?.imageSizes?.[0] ||
          prev.imageSize ||
          null,
      }));
      setSelectedJobId(item.id);
      setSelectedGeneratedImageUrl(imageUrl);
      setFormAdvance(initialFormAdvance);
      setFormRss(null);
      setMode("regenerate");
      setTab("knowledge");
      setIsDraftSaved(false);
    },
    [aiModelsRes]
  );

  /**
   *
   * LIBRARY RSS (client-side pagination)
   *
   */
  const { data: rssArtRes } = useLibraryRSSArticle(
    businessId,
    contentFeaturesEnabled
  );

  // state query (hanya simpan apa yang perlu dari filter/pagination di client)
  const [rssQuery, setRssQuery] = useState<Partial<FilterQuery>>({
    limit: 10,
    page: 1,
    // opsional: q / search / sort
    // q: "",
  });

  // semua artikel dari server (tanpa pagination)
  const allArticles: RssArticleRes[] = useMemo(
    () => rssArtRes?.data?.data ?? [],
    [rssArtRes?.data?.data]
  );

  // opsional: filter/search di client
  const filteredArticles = useMemo(() => {
    const q = rssQuery.search?.toString().trim().toLowerCase();
    if (!q) return allArticles;
    return allArticles.filter((a) => {
      // sesuaikan field yang ingin dicari
      const title = a.title?.toLowerCase() ?? "";
      const source = a.publisher?.toLowerCase() ?? "";
      return title.includes(q) || source.includes(q);
    });
  }, [allArticles, rssQuery]);

  // turunkan pagination dari total & query
  const rssPagination: Pagination = useMemo(() => {
    const limit = Math.max(1, Number(rssQuery.limit) || 10);
    const total = filteredArticles.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    // clamp page supaya selalu valid
    let page = Number(rssQuery.page) || 1;
    page = Math.min(Math.max(1, page), totalPages);

    return {
      limit,
      page,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }, [filteredArticles.length, rssQuery.limit, rssQuery.page]);

  // potong artikel berdasarkan page & limit
  const pagedArticles: RssArticleRes[] = useMemo(() => {
    const { page, limit } = rssPagination;
    const start = (page - 1) * limit;
    const end = start + limit;
    return filteredArticles.slice(start, end);
  }, [filteredArticles, rssPagination]);

  // setter filterQuery yang merge + clamp bila perlu
  const setFilterQuery = useCallback(
    (q: Partial<FilterQuery>) => {
      setRssQuery((prev) => {
        const next = { ...prev, ...q };
        const limit = Math.max(1, Number(next.limit) || 10);
        const totalPages = Math.max(
          1,
          Math.ceil((filteredArticles.length || 0) / limit)
        );
        let page = Number(next.page) || 1;
        // jika limit berubah (menyusut), pastikan page tetap valid
        page = Math.min(Math.max(1, page), totalPages);
        return { ...next, limit, page };
      });
    },
    [filteredArticles.length]
  );

  const rss: ContentGenerateContext["rss"] = {
    articles: pagedArticles,
    pagination: rssPagination,
    filterQuery: rssQuery,
    setFilterQuery,
  };

  const onRssSelect = (item: GenerateContentRssBase | null) => {
    setSelectedJobId(null);
    setFormRss(item);
    setFormBasic({
      ...formBasic,
    });
    setMode("rss");
    setTab("rss");
  };

  /**
   *
   * FORM
   *
   */
  const [formBasic, setFormBasic] =
    useState<ContentGenerateContext["form"]["basic"]>(initialFormBasic);
  const [formAdvance, setFormAdvance] =
    useState<ContentGenerateContext["form"]["advance"]>(initialFormAdvance);
  const [formRss, setFormRss] =
    useState<ContentGenerateContext["form"]["rss"]>(null);
  const [enabledAdvance, setEnableAdvance] = useState<
    ContentGenerateContext["form"]["enabledAdvance"]
  >(initialEnabledAdvance);
  const [formMask, setFormMask] =
    useState<ContentGenerateContext["form"]["mask"]>(null);
  const { data: productKnowledgeRes } = useProductKnowledgeGetStatus(
    businessId,
    formBasic?.productKnowledgeId
  );

  useEffect(() => {
    if (productKnowledgeRes) {
      setEnableAdvance(productKnowledgeRes.data.data);
    }
  }, [productKnowledgeRes]);

  const form: ContentGenerateContext["form"] = {
    advance: formAdvance,
    basic: formBasic,
    rss: formRss,
    setBasic: setFormBasic,
    setAdvance: setFormAdvance,
    onRssSelect: onRssSelect,
    enabledAdvance: enabledAdvance,
    setEnabledAdvance: setEnableAdvance,
    mask: formMask,
    setMask: setFormMask,
  };

  /**
   *
   * MODE / HELPER
   *
   */
  const [mode, setMode] = useState<ContentGenerateContext["mode"]>("knowledge");
  const [tab, setTab] = useState<ContentGenerateContext["tab"]>("knowledge");
  const [loadingState, setLoadingState] =
    useState<ContentGenerateContext["isLoading"]>(false);
  const setIsLoading = (item: boolean) => {
    setLoadingState(item);
  };

  useEffect(() => {
    const selectedHistoryId = searchParams.get("selectedHistoryId");
    const selectedHistoryImage = searchParams.get("selectedHistoryImage");
    const routeKey = `${selectedHistoryId || ""}|${selectedHistoryImage || ""}`;

    if (!selectedHistoryId && !selectedHistoryImage) {
      lastAppliedHistoryRouteKeyRef.current = null;
      lastHistoryRouteRefetchKeyRef.current = null;
      return;
    }
    setMode("regenerate");
    setTab("knowledge");

    if (lastAppliedHistoryRouteKeyRef.current === routeKey) {
      return;
    }

    const findMatchingJob = (groups: GetAllJob[] | undefined) => {
      const jobs = groups?.flatMap((item) => item.jobs) || [];

      return jobs.find((job) => {
        if (selectedHistoryId && job.id === selectedHistoryId) return true;
        if (!selectedHistoryImage) return false;

        return job.result?.images?.some((image) => image === selectedHistoryImage);
      });
    };

    const matchedJob = findMatchingJob(histories);
    if (matchedJob) {
      setLoadingState(false);
      lastAppliedHistoryRouteKeyRef.current = routeKey;
      onSelectHistory(matchedJob, { selectedImageUrl: selectedHistoryImage });
      return;
    }

    if (lastHistoryRouteRefetchKeyRef.current === routeKey) return;
    lastHistoryRouteRefetchKeyRef.current = routeKey;

    let isActive = true;

    refetchHistories().then((result) => {
      if (!isActive) return;

      const refreshedMatch = findMatchingJob(result.data?.data?.data);
      if (refreshedMatch) {
        setLoadingState(false);
        lastAppliedHistoryRouteKeyRef.current = routeKey;
        onSelectHistory(refreshedMatch, {
          selectedImageUrl: selectedHistoryImage,
        });
      }
    });

    return () => {
      isActive = false;
    };
  }, [
    histories,
    onSelectHistory,
    refetchHistories,
    searchParams,
  ]);

  /**
   *
   * UNSAVE MODAL
   *
   */
  const [unsaveModal, setUnsaveModal] = useState<
    ContentGenerateContext["unsaveModal"]
  >({
    isOpen: false,
    item: null,
    isLoading: false,
  });

  const isLoading =
    loadingState ||
    !notLoadingJobStatus.includes(selectedHistory?.status || "done") ||
    !notLoadingJobStages.includes(selectedHistory?.stage || "done");

  /**
   *
   * PUBLISHED
   *
   */
  const [publishedPagination, setPublishedPagination] =
    useState<Pagination>(initialPagination);
  const [publishedQuery, setPublishedQuery] = useState<Partial<FilterQuery>>({
    limit: 7,
    page: 1,
    search: "",
    sortBy: "createdAt",
    sort: "desc",
  });
  
  // Fetch all data when category filter is applied, otherwise use normal pagination
  const publishedApiQuery = useMemo(() => {
    if (publishedQuery.productCategory) {
      // Fetch all data for client-side filtering and pagination
      return {
        ...publishedQuery,
        limit: 999, // Fetch all data
        page: 1,
      };
    }
    return publishedQuery;
  }, [publishedQuery]);
  
  const { data: publishedRes, isLoading: isLoadingPublished } =
    useCreatorImageTemplates(publishedApiQuery, contentFeaturesEnabled);
  const [publishedFallback, setPublishedFallback] = useState<{
    contents: Template[];
    pagination: Pagination | null;
  }>({
    contents: [],
    pagination: null,
  });

  useEffect(() => {
    if (!contentFeaturesEnabled) return;

    const controller = new AbortController();
    const { productCategory, category, ...rest } = publishedApiQuery;
    const params = new URLSearchParams();

    Object.entries(rest).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      params.set(key, String(value));
    });
    params.set("published", "true");
    if (productCategory) params.set("category", String(productCategory));
    if (category) params.set("typeCategoryId", String(category));

    const token = getBrowserAccessToken();

    fetch(`/api/backend/creator/image?${params.toString()}`, {
      signal: controller.signal,
      headers: token ? { "X-Postmatic-AccessToken": token } : undefined,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`creator/image ${response.status}`);
        return response.json();
      })
      .then((body) => {
        if (controller.signal.aborted) return;
        const rawData = Array.isArray(body?.data) ? body.data : [];
        setPublishedFallback({
          contents: rawData.map(mapCreatorImageReference),
          pagination: body?.pagination || null,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load creator image references", error);
      });

    return () => controller.abort();
  }, [contentFeaturesEnabled, publishedApiQuery]);

  useEffect(() => {
    const publishedResData = publishedRes?.data?.data || [];
    const fallbackTotal = publishedFallback.contents.length;

    if (!publishedRes && !publishedFallback.pagination && fallbackTotal === 0) {
      return;
    }

    setPublishedPagination(
      publishedRes?.data?.pagination ||
        publishedFallback.pagination || {
          ...initialPagination,
          limit: Number(publishedQuery.limit) || initialPagination.limit,
          page: Number(publishedQuery.page) || initialPagination.page,
          total: publishedResData.length || fallbackTotal,
          totalPages: publishedResData.length || fallbackTotal ? 1 : 0,
        }
    );
  }, [publishedFallback, publishedQuery.limit, publishedQuery.page, publishedRes]);
  const publishedData: Template[] =
    publishedRes?.data.data?.length
      ? publishedRes.data.data
      : publishedFallback.contents;

  // Client-side filtering by productCategory if server-side filtering is not working
  const allFilteredPublishedData = useMemo(() => {
    if (!publishedQuery.productCategory) {
      return publishedData;
    }
    
    // Find the product category name by ID
    const selectedCategory = productCategoriesData?.data?.data?.find(
      (cat) => cat.id === publishedQuery.productCategory
    );
    
    if (!selectedCategory) {
      return publishedData;
    }
    
    // Filter templates that have the selected product category
    return publishedData.filter(template => 
      template.productCategories.includes(selectedCategory.indonesianName)
    );
  }, [publishedData, publishedQuery.productCategory, productCategoriesData]);

  // Apply client-side pagination when category filter is active
  const { paginatedData: filteredPublishedData, pagination: adjustedPublishedPagination } = useMemo(() => {
    // If category filter is applied, do client-side pagination
    if (publishedQuery.productCategory) {
      const limit = publishedQuery.limit || 10;
      const page = publishedQuery.page || 1;
      const total = allFilteredPublishedData.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      
      // Slice data for current page
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedData = allFilteredPublishedData.slice(start, end);
      
      const pagination: Pagination = {
        limit,
        page,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
      
      return { paginatedData, pagination };
    }
    
    // Otherwise use server-side pagination
    return { paginatedData: allFilteredPublishedData, pagination: publishedPagination };
  }, [allFilteredPublishedData, publishedQuery.productCategory, publishedQuery.limit, publishedQuery.page, publishedPagination]);

  const publishedTemplates: ContentGenerateContext["publishedTemplates"] = {
    contents: filteredPublishedData,
    pagination: adjustedPublishedPagination,
    filterQuery: publishedQuery,
    setFilterQuery: setPublishedQuery,
    isLoading: isLoadingPublished,
  };

  /**
   *
   * SAVED
   *
   */
  const [savedPagination, setSavedPagination] =
    useState<Pagination>(initialPagination);
  const [savedQuery, setSavedQuery] = useState<Partial<FilterQuery>>({
    limit: 10,
    page: 1,
    sortBy: "createdAt",
    sort: "desc",
  });
  
  // Fetch all data when category filter is applied, otherwise use normal pagination
  const savedApiQuery = useMemo(() => {
    if (savedQuery.productCategory) {
      // Fetch all data for client-side filtering and pagination
      return {
        ...savedQuery,
        limit: 999, // Fetch all data
        page: 1,
      };
    }
    return savedQuery;
  }, [savedQuery]);
  
  const { data: savedRes, isLoading: isLoadingSaved } =
    useLibraryTemplateGetSaved(businessId, savedApiQuery, contentFeaturesEnabled);
  useEffect(() => {
    if (savedRes) {
      setSavedPagination(savedRes?.data?.pagination);
    }
  }, [savedRes]);
  const savedData: Template[] = (savedRes?.data.data || []).map((item) => {

    return {
      id: item?.templateImageContent?.id,
      name: item?.name,
      imageUrl: item?.imageUrl,
      categories: item?.templateImageContent?.templateImageCategories.map((cat) => cat.name) || [],
      productCategories: item?.templateImageContent?.templateProductCategories.map((cat) => cat.indonesianName) || [],
      price: 0,
      publisher: item?.templateImageContent?.publisher || {
        id: "",
        name: "Postmatic",
        image: null,
      },
      type: "saved",
      createdAt: item?.createdAt,
      updatedAt: item?.updatedAt,
    };
  });

  // Client-side filtering by productCategory for saved templates
  const allFilteredSavedData = useMemo(() => {
    if (!savedQuery.productCategory) {
      return savedData;
    }
    
    // Find the product category name by ID
    const selectedCategory = productCategoriesData?.data?.data?.find(
      (cat) => cat.id === savedQuery.productCategory
    );
    
    if (!selectedCategory) {
      return savedData;
    }
    
    // Filter templates that have the selected product category
    return savedData.filter(template => 
      template.productCategories.includes(selectedCategory.indonesianName)
    );
  }, [savedData, savedQuery.productCategory, productCategoriesData]);

  // Apply client-side pagination when category filter is active
  const { paginatedData: filteredSavedData, pagination: adjustedSavedPagination } = useMemo(() => {
    // If category filter is applied, do client-side pagination
    if (savedQuery.productCategory) {
      const limit = savedQuery.limit || 10;
      const page = savedQuery.page || 1;
      const total = allFilteredSavedData.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      
      // Slice data for current page
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedData = allFilteredSavedData.slice(start, end);
      
      const pagination: Pagination = {
        limit,
        page,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
      
      return { paginatedData, pagination };
    }
    
    // Otherwise use server-side pagination
    return { paginatedData: allFilteredSavedData, pagination: savedPagination };
  }, [allFilteredSavedData, savedQuery.productCategory, savedQuery.limit, savedQuery.page, savedPagination]);

  const savedTemplates: ContentGenerateContext["savedTemplates"] = {
    contents: filteredSavedData,
    pagination: adjustedSavedPagination,
    filterQuery: savedQuery,
    setFilterQuery: setSavedQuery,
    isLoading: isLoadingSaved,
  };

  /**
   *
   * PRODUCT KNOWLEDGES
   *
   */
  const [productPagination, setProductPagination] =
    useState<Pagination>(initialPagination);
  const [productQuery, setProductQuery] = useState<Partial<FilterQuery>>({
    limit: 10,
    page: 1,
    sortBy: "name",
    sort: "asc",
  });
  const { data: productRes } = useProductKnowledgeGetAll(
    businessId,
    productQuery,
    contentFeaturesEnabled
  );
  useEffect(() => {
    if (productRes) {
      setProductPagination(productRes?.data?.pagination || initialPagination);
    }
  }, [productRes]);
  const products = productRes?.data?.data || [];

  const productKnowledges: ContentGenerateContext["productKnowledges"] = {
    contents: products,
    pagination: productPagination,
    filterQuery: productQuery,
    setFilterQuery: setProductQuery,
  };

  /**
   *
   * HANDLER
   *
   */

  const mSave = useLibraryTemplateSave();
  const mUnsave = useLibraryTemplateDeleteSaved();
  const onSaveUnsave = async (item: Template) => {
    try {
      switch (item.type) {
        case "published":
          const resPub = await mSave.mutateAsync({
            businessId,
            formData: {
              templateImageContentId: item.id,
            },
          });
          showToast("success", resPub.data.responseMessage);
          break;
        case "saved":
          // Show confirmation modal for saved items
          setUnsaveModal({
            isOpen: true,
            item: item,
            isLoading: false,
          });
          break;
      }
    } catch {}
  };

  const onConfirmUnsave = async () => {
    if (!unsaveModal.item) return;

    try {
      setUnsaveModal((prev) => ({ ...prev, isLoading: true }));

      const resSaved = await mUnsave.mutateAsync({
        businessId,
        templateId: unsaveModal.item.id,
      });

      showToast("success", resSaved.data.responseMessage);

      // Close modal
      setUnsaveModal({
        isOpen: false,
        item: null,
        isLoading: false,
      });
    } catch {
      setUnsaveModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const onCloseUnsaveModal = () => {
    setUnsaveModal({
      isOpen: false,
      item: null,
      isLoading: false,
    });
  };

  const onSelectProduct = (item: ProductKnowledgeRes | null) => {
    if (item) {
      form.setBasic({
        ...form.basic,
        productKnowledgeId: item.id,
        productName: item.name,
        productImage: item.images?.[0] || "",
        customCategory: "",
        customDesignStyle: "",
      });
    }
  };

  const onSelectReferenceImage = (
    imageUrl: string,
    imageName: string | null,
    template?: Template
  ) => {
    form.setBasic({
      ...form.basic,
      referenceImage: imageUrl,
      referenceImageName: imageName,
      referenceImagePublisher: template?.publisher?.name || null,
    });

    // Set selected template for visual feedback
    if (template) {
      setSelectedTemplate(template);
    }

    // Add automatic scrolling to generation panel on mobile
    setTimeout(() => {
      const generationPanelElement =
        document.getElementById("generation-panel");
      if (generationPanelElement && window.innerWidth < 768) {
        generationPanelElement.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const onResetAdvance = () => {
    setFormAdvance(initialFormAdvance);
  };

  const onSelectAiModel = (model: AiModelRes) => {
    setSelectedAiModel(model);
    setFormBasic((prev) => ({
      ...prev,
      model: model.name,
      ratio: (model.validRatios?.[0] || "1:1") as ValidRatio, // Set to first valid ratio
      imageSize: model.imageSizes?.[0] || null,
    }));
  };

  /**
   *
   * HANDLER GENERATE
   *
   */
  const mGenerateKnowledge = useContentJobKnowledgeOnJob();
  const mGenerateRss = useContentJobRssOnJob();
  const mGenerateMask = useContentJobMaskOnJob();

  const onSubmitGenerate = async (overrides?: {
    mode?: ContentMode;
    maskUrl?: string;
  }) => {
    try {
      if (isLoading) return; // tetap cegah spam
      setIsLoading(true);

      const effMode = overrides?.mode ?? mode;

      switch (effMode) {
        case "knowledge":
          const resKnowledge = await mGenerateKnowledge.mutateAsync({
            businessId,
            formData: {
              designStyle:
                form.basic.designStyle === "other"
                  ? form.basic.customDesignStyle
                  : form.basic.designStyle,
              category:
                form.basic.category === "other"
                  ? form.basic.customCategory
                  : form.basic.category,
              advancedGenerate: form.advance,
              ratio: form.basic.ratio,
              prompt: form.basic.prompt,
              productKnowledgeId: form.basic.productKnowledgeId,
              referenceImage: form.basic.referenceImage,
              model: form.basic.model,
              imageSize: form.basic.imageSize,
            },
          });

          const knowledgeJobId = resKnowledge.data.data.jobId;

          await afterSubmitGenerate(knowledgeJobId, {
            id: knowledgeJobId,
            type: "knowledge",
            rootBusinessId: businessId,
            status: "processing",
            stage: "processing",
            progress: 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            input: {
              rss: null,
              ratio: form.basic.ratio,
              prompt: form.basic.prompt,
              caption: form.basic.caption,
              category:
                form.basic.category === "other"
                  ? form.basic.customCategory
                  : form.basic.category,
              designStyle:
                form.basic.designStyle === "other"
                  ? form.basic.customDesignStyle
                  : form.basic.designStyle || "",
              referenceImage: form.basic.referenceImage,
              advancedGenerate: form.advance,
              productKnowledgeId: form.basic.productKnowledgeId,
              model: form.basic.model,
              imageSize: form.basic.imageSize,
            },
            error: null,
            product: {
              name: form.basic.productName,
              description: "",
              category: "",
              currency: "IDR",
              price: 0,
              images: form.basic.productImage ? [form.basic.productImage] : [],
            },
            result: null,
          });

          showToast(
            "success",
            t("toast.contentGeneration.waiting")
          );
          break;
        case "rss":
          if (!form.rss) {
            showToast("error", t("toast.validation.selectRSS"));
            return;
          }
          const resRss = await mGenerateRss.mutateAsync({
            businessId,
            formData: {
              productKnowledgeId: form.basic.productKnowledgeId,
              referenceImage: form.basic.referenceImage,
              ratio: form.basic.ratio,
              prompt: form.basic.prompt,
              designStyle:
                form.basic.designStyle === "other"
                  ? form.basic.customDesignStyle
                  : form.basic.designStyle,
              category:
                form.basic.category === "other"
                  ? form.basic.customCategory
                  : form.basic.category,
              advancedGenerate: form.advance,
              rss: form.rss,
              model: form.basic.model,
              imageSize: form.basic.imageSize,
            },
          });

          const rssJobId = resRss?.data?.data?.jobId;

          await afterSubmitGenerate(rssJobId, {
            id: rssJobId,
            type: "rss",
            rootBusinessId: businessId,
            status: "processing",
            stage: "processing",
            progress: 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            input: {
              rss: form.rss,
              ratio: form.basic.ratio,
              prompt: form.basic.prompt,
              caption: form.basic.caption,
              category:
                form.basic.category === "other"
                  ? form.basic.customCategory
                  : form.basic.category,
              designStyle:
                form.basic.designStyle === "other"
                  ? form.basic.customDesignStyle
                  : form.basic.designStyle || "",
              referenceImage: form.basic.referenceImage,
              advancedGenerate: form.advance,
              productKnowledgeId: form.basic.productKnowledgeId,
              model: form.basic.model,
              imageSize: form.basic.imageSize,
            },
            error: null,
            product: {
              name: form.basic.productName,
              description: "",
              category: "",
              currency: "IDR",
              price: 0,
              images: form.basic.productImage ? [form.basic.productImage] : [],
            },
            result: null,
          });

          showToast(
            "success",
            t("toast.contentGeneration.waiting")
          );
          break;
        case "regenerate":
          if (
            !selectedHistory ||
            !(selectedGeneratedImageUrl || selectedHistory.result?.images[0])
          ) {
            showToast("error", t("toast.validation.selectHistory"));
            return;
          }
          const regenerateReferenceImage =
            selectedGeneratedImageUrl || selectedHistory.result?.images[0] || "";
          const regeneratePrompt = form.basic.prompt || "";
          const regenerateCaption = form.basic.caption || "";
          const resRegenerate = await mGenerateKnowledge.mutateAsync({
            businessId,
            formData: {
              productKnowledgeId: selectedHistory.input.productKnowledgeId,
              designStyle:
                (form.basic.designStyle === "other"
                  ? form.basic.customDesignStyle
                  : form.basic.designStyle) || "",
              category:
                (form.basic.category === "other"
                  ? form.basic.customCategory
                  : form.basic.category) || "",
              advancedGenerate: form.advance,
              referenceImage: regenerateReferenceImage,
              prompt: regeneratePrompt,
              ratio: form.basic.ratio,
              model: form.basic.model,
              imageSize: form.basic.imageSize,
            },
          });

          const regenerateJobId = resRegenerate.data.data.jobId;

          await afterSubmitGenerate(regenerateJobId, {
            ...selectedHistory,
            id: regenerateJobId,
            type: "regenerate",
            status: "processing",
            stage: "processing",
            progress: 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            input: {
              ...selectedHistory.input,
              prompt: regeneratePrompt,
              caption: regenerateCaption,
              referenceImage: regenerateReferenceImage,
              ratio: form.basic.ratio,
              model: form.basic.model,
              imageSize: form.basic.imageSize,
            },
            result: null,
            error: null,
          });
          setFormBasic((prev) => ({ ...prev, prompt: "" }));

          showToast(
            "success",
            t("toast.contentGeneration.waiting")
          );
          break;
        case "mask":
          if (!form.mask && !overrides?.maskUrl) {
            showToast("error", t("toast.validation.selectMask"));
            return;
          }
          if (!selectedHistory) {
            showToast("error", t("toast.validation.selectHistory"));
            return;
          }
          const resMask = await mGenerateMask.mutateAsync({
            businessId,
            formData: {
              mask: form.mask || overrides?.maskUrl || "",
              prompt: form.basic.prompt || "",
              referenceImage:
                selectedGeneratedImageUrl ||
                selectedHistory?.result?.images[0] ||
                "",
              caption:
                form.basic.caption || selectedHistory?.result?.caption || "",
              ratio: form.basic.ratio,
              designStyle:
                (form.basic.designStyle === "other"
                  ? form.basic.customDesignStyle
                  : form.basic.designStyle) || "",
              category:
                (form.basic.category === "other"
                  ? form.basic.customCategory
                  : form.basic.category) || "",
              productKnowledgeId:
                selectedHistory?.result?.productKnowledgeId || "",
              model: form.basic.model,
              imageSize: form.basic.imageSize,
            },
          });
          await afterSubmitGenerate(resMask?.data?.data?.jobId);
          showToast(
            "success",
            t("toast.contentGeneration.waiting")
          );
          break;
        default:
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const afterSubmitGenerate = async (
    jobId: string,
    optimisticJob?: JobData
  ) => {
    if (optimisticJob) {
      setHistories((prev) =>
        upsertJobIntoHistory(prev, optimisticJob)
      );
      setSelectedJobId(optimisticJob.id);
      setSelectedGeneratedImageUrl(null);
      setMode("regenerate");
      setTab("knowledge");
    }

    const refetchHistoriesRes = await refetchHistories();
    const flattenedHistories = refetchHistoriesRes.data?.data?.data?.flatMap(
      (item) => item.jobs
    );
    const findJob: JobData | undefined = flattenedHistories?.find(
      (job) => job.id === jobId
    );
    if (findJob) {
      setSelectedJobId(findJob.id);
      setSelectedGeneratedImageUrl(findJob.result?.images[0] || null);
      setMode("regenerate");
      setTab("knowledge");
      setIsDraftSaved(false); // Reset draft saved state when new content is generated
    } else if (optimisticJob) {
      setHistories((prev) => upsertJobIntoHistory(prev, optimisticJob));
      setIsDraftSaved(false);
    }
  };

  /**
   *
   * HANDLER SAVE DRAFT
   *
   */

  const mSaveDraft = useContentDraftSaveDraftContent();
  const onSaveDraft = async () => {
    try {
      if (!selectedHistory) {
        showToast("error", t("toast.validation.selectDataToSave"));
        return;
      }
      const resSaveDraft = await mSaveDraft.mutateAsync({
        businessId,
        formData: {
          caption: form.basic.caption || selectedHistory?.result?.caption || "",
          category:
            selectedHistory?.result?.category ||
            selectedHistory?.input.category ||
            "",
          designStyle:
            selectedHistory?.result?.designStyle ||
            selectedHistory?.input.designStyle ||
            "",
          ratio:
            selectedHistory?.result?.ratio ||
            selectedHistory?.input.ratio ||
            "",
          images: selectedGeneratedImageUrl
            ? [selectedGeneratedImageUrl]
            : selectedHistory?.result?.images?.[0]
            ? [selectedHistory.result.images[0]]
            : selectedHistory?.result?.images || [],
          productKnowledgeId: selectedHistory?.input.productKnowledgeId || "",
          referenceImages: selectedHistory?.input.referenceImage
            ? [selectedHistory?.input.referenceImage]
            : [],
        },
      });
      showToast("success", resSaveDraft.data.responseMessage);
      setIsDraftSaved(true); // Set draft saved state to true after successful save
    } catch {}
  };

  /**
   *
   * HANDLER SOCKET
   *
   */
  const [isConnected, setIsConnected] = useState(false);
  const rbRef = useRef<string | null>(null);
  const router = useRouter();
  const joinRoom = useCallback((rb?: string | null) => {
    const s = getSocket();
    if (!s || !s.connected) return;
    if (!rb) return;
    s.emit("join:business", rb);
  }, []);

  // private function
  const toastFinal = useCallback(
    (job: JobData) => {
      const phase = job.stage;
      const isFinal = phase === "done" || phase === "error";
      if (!isFinal) return;

  
      const title =
        phase === "done" ? t("toast.contentGeneration.completed") : t("toast.contentGeneration.failed");
      const desc =
        phase === "error"
          ? job.error?.message ?? t("toast.contentGeneration.errorOccurred")
          : t("toast.contentGeneration.completedWithProduct", { productName: job.product?.name ?? "" });

      toast(title, {
        description: desc,
        action: {
          label: "Open",
          onClick: () => {
            if (!pathname.includes("content-generate")) {
              router.push(`/business/${businessId}/content-generate`);
            }
            onSelectHistory(job);
          },
        },
      });
    },
    [onSelectHistory, businessId, router, pathname]
  );

  const updateJobData = useCallback((incoming: JobData) => {
    setHistories((prev) => upsertJobIntoHistory(prev, incoming));
  }, []);

  /** ===== Socket lifecycle ===== */
  useEffect(() => {
    if (!NEXT_PUBLIC_ENABLE_SOCKET || !pathname.includes("content-generate")) {
      setIsConnected(false);
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(ACCESS_TOKEN_KEY)
        : null;
    const socket = createSocket({ token });

    const onConnect = () => {
      console.log("connect");
      setIsConnected(true);
      const rb = rbRef.current ?? businessId;
      console.log("rb", rb);
      if (rb) joinRoom(rb);
    };
    const onDisconnect = () => {
      console.log("disconnect");
      setIsConnected(false);
    };
    const onReconnect = () => {
      console.log("reconnect");
      setIsConnected(true);
      const rb = rbRef.current ?? businessId;
      if (rb) joinRoom(rb);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("reconnect", onReconnect);

    /** === EVENT: imagegen:update (SIMPAN SEMUA PROGRESS) === */
    socket.on("imagegen:update", (job: JobData) => {
      updateJobData(job);

      // Toast + notifikasi hanya saat final
      const phase = job.stage;
      if (phase === "done" || phase === "error") {
        queryClient.invalidateQueries({
          queryKey: ["contentJobGetAllJob"],
        });
        if (pathname.includes("content-generate")) {
          onSelectHistory(job);
        } else {
          toastFinal(job);
        }
      }
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("reconnect", onReconnect);
      socket.off("imagegen:update");
      destroySocket();
    };
  }, [businessId, joinRoom, toastFinal, updateJobData]);

  const socketEvent: ContentGenerateContext["socketEvent"] = {
    isConnected,
  };

  useEffect(() => {
    if (!contentFeaturesEnabled || !selectedHistory) return;

    const isFinal =
      notLoadingJobStatus.includes(selectedHistory.status) &&
      notLoadingJobStages.includes(selectedHistory.stage);
    if (isFinal || isConnected) return;

    const intervalId = window.setInterval(async () => {
      const result = await refetchHistories();
      const refreshedGroups = result.data?.data?.data || [];
      const refreshedJob =
        refreshedGroups
          .flatMap((group) => group.jobs)
          .find((job) => job.id === selectedHistory.id) || null;

      if (!refreshedJob) return;

      setHistories((prev) => upsertJobIntoHistory(prev, refreshedJob));
      setSelectedGeneratedImageUrl(refreshedJob.result?.images?.[0] || null);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [
    contentFeaturesEnabled,
    isConnected,
    refetchHistories,
    selectedHistory,
  ]);

  const aiModels: ContentGenerateContext["aiModels"] = {
    models: aiModelsRes?.data?.data || [],
    selectedModel: selectedAiModel,
    validRatios,
    isLoading: isLoadingAiModels,
  };

  return (
    <ContentGenerateContext.Provider
      value={{
        form,
        mode,
        setMode,
        tab,
        setTab,
        publishedTemplates,
        savedTemplates,
        unsaveModal,
        setUnsaveModal,
        onSaveUnsave,
        onConfirmUnsave,
        onCloseUnsaveModal,
        onSelectProduct,
        rss,
        productKnowledges,
        onSelectReferenceImage,
        onSubmitGenerate,
        histories,
        selectedHistory,
        selectedGeneratedImageUrl,
        onSelectHistory,
        onSelectGeneratedImage,
        selectedTemplate,
        setSelectedTemplate,
        isLoading,
        onSaveDraft,
        setIsLoading,
        onResetAdvance,
        isDraftSaved,
        setIsDraftSaved,
        socketEvent,
        aiModels,
        onSelectAiModel,
      }}
    >
      {children}
    </ContentGenerateContext.Provider>
  );
};

export const useContentGenerate = () => {
  const context = useContext(ContentGenerateContext);
  if (!context) {
    throw new Error(
      "useContentGenerate must be used within a CheckoutProvider"
    );
  }
  return context;
};
