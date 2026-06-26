"use client";

import {
  ACCESS_TOKEN_KEY,
  NEXT_PUBLIC_ENABLE_CONTENT_FEATURES,
  NEXT_PUBLIC_ENABLE_SOCKET,
} from "@/constants";
import { showToast } from "@/helper/show-toast";
import { useTranslations } from "next-intl";
import {
  createSocket,
  destroySocket,
  RealtimeEnvelope,
} from "@/lib/socket";
import {
  getSchedulerDraftMarkers,
  upsertSchedulerDraftMarker,
} from "@/lib/scheduler-draft-markers";
import { FilterQuery, Pagination } from "@/models/api/base-response.type";
import {
  AdvancedGenerate,
  GenerateContentAdvanceBase,
  GenerateContentBase,
  GenerateContentRssBase,
  ImagePostChatRes,
  VALID_RATIOS,
  ValidRatio,
  normalizeValidRatios,
} from "@/models/api/content/image.type";
import { ProductKnowledgeRes } from "@/models/api/knowledge/product.type";
import { RssArticleRes } from "@/models/api/library/rss.type";
import { AiModelRes } from "@/models/api/content/ai-model";
import {
  pickGptImageOneModel,
} from "@/models/api/content/ai-model";
import {
  GetAllJob,
  JobData,
  JobStage,
  JobStatus,
} from "@/models/socket-content";
import {
  useContentDraftSaveDraftContent,
  useContentImagePostChatGetById,
  useContentImagePostChatSendImageMessage,
  useContentJobGetAllJob,
  useContentJobKnowledgeOnJob,
  useContentJobMaskOnJob,
  useContentJobRssOnJob,
  useContentAiModelGetAiModels,
  useContentSchedulerManualAddToQueue,
  useContentSchedulerManualEditQueue,
} from "@/services/content/content.api";
import {
  useProductKnowledgeGetAll,
  useProductKnowledgeGetStatus,
} from "@/services/knowledge.api";
import {
  useLibraryRSSArticle,
  useLibraryTemplateDeleteSaved,
  useLibraryTemplateGetCategory,
  useCreatorImageTemplates,
  useLibraryTemplateGetSaved,
  useLibraryTemplateSave,
  useLibraryTemplateSaveOwnBusinessReferenceImage,
  useLibraryTemplateGetProductCategory,
} from "@/services/library.api";
import { useBusinessPurchaseGetHistory } from "@/services/purchase.api";
import { useParams, useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";

import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { translateApiResponseMessage } from "@/helper/api-response-message";

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
export interface SelectedAvatarOption {
  id: string;
  imageUrl: string;
  title: string;
  source: "knowledge" | "browse";
}

interface BasicForm extends GenerateContentBase {
  productName: string;
  productImage: string;
  selectedAvatars: SelectedAvatarOption[];
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
  isRestoringSchedulerChat: boolean;
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
  schedulerDraftPost: {
    id: number;
    chatSessionId: number | null;
  } | null;
  schedulerChatSeed: {
    productImage: string | null;
    referenceImage: string | null;
    avatarImages: string[];
    productKnowledgeId: string | null;
  } | null;
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
    isFreeUser: boolean;
    freeUserAllowedModel: AiModelRes | null;
  };

  // Draft saved state
  isDraftSaved: boolean;
  setIsDraftSaved: (saved: boolean) => void;

  //   // HANDLER
  onSaveUnsave: (item: Template) => void;
  onSaveUploadedReference: (payload: {
    imageUrl: string;
    name: string;
  }) => Promise<void>;
  onConfirmUnsave: () => void;
  onCloseUnsaveModal: () => void;
  onSelectProduct: (item: ProductKnowledgeRes | null) => void;
  onSelectAvatars: (items: SelectedAvatarOption[]) => void;
  onSelectReferenceImage: (
    imageUrl: string,
    imageName: string | null,
    template?: Template
  ) => void;
  onSubmitGenerate: (overrides?: {
    mode?: ContentMode;
    maskUrl?: string;
    additionalImages?: string[];
    model?: string;
    ratio?: ValidRatio;
    imageSize?: string | null;
  }) => Promise<void>;
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
  additionalImages: [],
  productName: "",
  productImage: "",
  selectedAvatars: [],
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

const fallbackRatios = [...VALID_RATIOS];

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

const pickPreferredAiModel = (models: AiModelRes[], isFreeUser: boolean) =>
  (isFreeUser ? pickGptImageOneModel(models) : null) ||
  pickDefaultAiModel(models);

const notLoadingJobStatus: JobStatus[] = ["done", "error"];
const notLoadingJobStages: JobStage[] = ["done", "error"];

const sleep = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const schedulerFirstGeneratePrompt =
  "Buat gambar konten promosi produk yang menarik untuk media sosial berdasarkan produk yang dipilih.";
const REALTIME_IMAGE_ITEM_HYDRATION_ATTEMPTS = 5;
const REALTIME_IMAGE_ITEM_HYDRATION_INTERVAL_MS = 1500;

function formatCurrentTimeInput() {
  const now = new Date();
  if (now.getSeconds() > 0 || now.getMilliseconds() > 0) {
    now.setMinutes(now.getMinutes() + 1);
  }
  now.setSeconds(0, 0);

  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

type RealtimeGenerativeChatProgressData = {
  businessRootId: number;
  chatSessionId: number;
  errorMessage: string | null;
  generatedImagePostId: number | null;
  imageUrls: string[];
  message: string;
  processState: "queued" | "processing" | "success" | "failed" | string;
  progressPercentage: number;
  progressStep: string;
  reason: string;
  systemBubbleId: number | null;
  updatedAt: string;
  userBubbleId: number;
};

function mapRealtimeProcessStateToJobStatus(processState: string): JobStatus {
  switch (processState) {
    case "success":
      return "done";
    case "failed":
      return "error";
    case "queued":
      return "queued";
    default:
      return "processing";
  }
}

function mapRealtimeProcessStateToJobStage(processState: string): JobStage {
  switch (processState) {
    case "success":
      return "done";
    case "failed":
      return "error";
    case "queued":
      return "queued";
    default:
      return "processing";
  }
}

function clampProgress(progress: number, processState: string) {
  if (processState === "success" || processState === "failed") {
    return 100;
  }

  return Math.max(0, Math.min(100, Math.round(progress)));
}

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

function removeJobsFromHistory(
  groups: GetAllJob[],
  shouldRemove: (job: JobData) => boolean
) {
  return groups
    .map((group) => ({
      ...group,
      jobs: group.jobs.filter((job) => !shouldRemove(job)),
    }))
    .filter((group) => group.jobs.length > 0);
}

function getBubbleImageUrls(
  bubble?: ImagePostChatRes["bubbles"][number] | null
) {
  return bubble?.images?.map((item) => item.imageUrl).filter(Boolean) || [];
}

function uniqueImageUrls(images: Array<string | null | undefined>) {
  return Array.from(new Set(images.filter(Boolean) as string[]));
}

function buildSelectedAvatarsFromUrls(images: string[]): SelectedAvatarOption[] {
  return uniqueImageUrls(images).map((imageUrl, index) => ({
    id: `history-avatar-${index}-${imageUrl}`,
    imageUrl,
    title: `Avatar ${index + 1}`,
    source: "browse" as const,
  }));
}

function resolveJobInputImages({
  avatarImageUrl,
  avatarImages = [],
  additionalImages,
  referenceImage,
  productImages,
}: {
  avatarImageUrl?: string | null;
  avatarImages?: string[];
  additionalImages?: string[] | null;
  referenceImage?: string | null;
  productImages?: string[];
}) {
  const normalizedAdditionalImages = uniqueImageUrls(additionalImages || []);
  const explicitAvatarImages = uniqueImageUrls([
    avatarImageUrl,
    ...(avatarImages || []),
  ]);
  const inferredAvatarImages = explicitAvatarImages.length
    ? explicitAvatarImages
    : mapSelectedAvatarsFromImages(normalizedAdditionalImages, {
        referenceImage,
        productImages,
      }).map((avatar) => avatar.imageUrl);
  const resolvedAvatarImages = uniqueImageUrls(inferredAvatarImages);

  return {
    avatarImages: resolvedAvatarImages,
    avatarImageUrl: resolvedAvatarImages[0] || null,
    selectedAvatars: buildSelectedAvatarsFromUrls(resolvedAvatarImages),
    additionalImages: normalizedAdditionalImages.filter(
      (imageUrl) => !resolvedAvatarImages.includes(imageUrl)
    ),
  };
}

function buildSchedulerChatJobs({
  chat,
  businessId,
  chatSessionId,
  productKnowledgeId,
  model,
  ratio,
  imageSize,
  productName,
  productImage,
  referenceImage,
  avatarImages = [],
  caption,
}: {
  chat: ImagePostChatRes;
  businessId: string;
  chatSessionId: number;
  productKnowledgeId: string;
  model: string;
  ratio: ValidRatio;
  imageSize?: string | null;
  productName?: string;
  productImage?: string;
  referenceImage?: string | null;
  avatarImages?: string[];
  caption?: string;
}): JobData[] {
  const bubbles = [...(chat.bubbles || [])].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
  const bubblesById = new Map(bubbles.map((bubble) => [bubble.id, bubble]));
  const userBubbles = bubbles.filter((bubble) => bubble.role === "user");

  return userBubbles.map((userBubble, index) => {
    const nextUser = userBubbles[index + 1];
    const systemBubble = bubbles.find((bubble) => {
      if (bubble.role !== "system") return false;
      const bubbleTime = new Date(bubble.createdAt).getTime();
      const userTime = new Date(userBubble.createdAt).getTime();
      const nextUserTime = nextUser
        ? new Date(nextUser.createdAt).getTime()
        : Number.POSITIVE_INFINITY;
      return bubbleTime >= userTime && bubbleTime < nextUserTime;
    });
    const replyBubble =
      userBubble.replyToBubble ||
      (userBubble.replyToBubbleId
        ? bubblesById.get(userBubble.replyToBubbleId)
        : null);
    const replyReferenceImages = getBubbleImageUrls(replyBubble);
    const userImages = getBubbleImageUrls(userBubble);
    const resolvedInputImages = resolveJobInputImages({
      avatarImageUrl: userBubble.avatarImageUrl,
      avatarImages: index === 0 ? avatarImages : [],
      additionalImages: userBubble.additionalImages || [],
      referenceImage,
      productImages: productImage ? [productImage] : [],
    });
    const userAdditionalImages = resolvedInputImages.additionalImages;
    const userPromptImages = Array.from(
      new Set([...replyReferenceImages, ...userImages, ...userAdditionalImages])
    );
    const referenceImages = userPromptImages.filter(
      (imageUrl) => imageUrl && imageUrl !== productImage
    );
    const effectiveReferenceImage =
      index === 0
        ? referenceImage || referenceImages[0] || null
        : replyReferenceImages[0] || userImages[0] || userAdditionalImages[0] || null;
    const firstPromptImages = productImage ? [productImage] : [];
    const firstPromptAdditionalImages: string[] = [];
    const resultImages =
      systemBubble?.images?.map((item) => item.imageUrl).filter(Boolean) || [];
    const resultImageItemIds = (systemBubble?.images || [])
      .map((item) => item.id)
      .filter((itemId): itemId is number => Number.isFinite(itemId));
    const effectiveRatio =
      (systemBubble?.imageRatio || userBubble.imageRatio || ratio || "1:1") as ValidRatio;
    const isError = Boolean(systemBubble?.errorMessage);

    return {
      id: `chat-${userBubble.id}`,
      type: "knowledge",
      rootBusinessId: businessId,
      status: isError ? "error" : resultImages.length ? "done" : "processing",
      stage: isError ? "error" : resultImages.length ? "done" : "processing",
      progress: isError || resultImages.length ? 100 : 10,
      createdAt: userBubble.createdAt,
      updatedAt: systemBubble?.updatedAt || userBubble.updatedAt,
      input: {
        rss: null,
        ratio: effectiveRatio,
        prompt: userBubble.prompt || "",
        caption: caption || "",
        chatSessionId,
        avatarImageUrl: resolvedInputImages.avatarImageUrl,
        avatarImages: resolvedInputImages.avatarImages,
        additionalImages: index === 0 ? firstPromptAdditionalImages : userPromptImages,
        systemBubbleId: systemBubble?.id || null,
        category: "",
        designStyle: "",
        referenceImage: effectiveReferenceImage,
        advancedGenerate: initialFormAdvance,
        productKnowledgeId,
        model: model || String(userBubble.appGenerativeImageModelId || ""),
        imageSize,
      },
      error: systemBubble?.errorMessage
        ? { message: systemBubble.errorMessage, stack: null, attempt: 1 }
        : null,
      product: {
        name: productName || "",
        description: "",
        category: "",
        currency: "IDR",
        price: 0,
        images: index === 0 ? firstPromptImages : userPromptImages,
      },
      result: resultImages.length
        ? {
            images: resultImages,
            imageItemIds: resultImageItemIds.length
              ? resultImageItemIds
              : undefined,
            ratio: effectiveRatio,
            category: "",
            designStyle: "",
            caption: caption || "",
            referenceImages: [],
            productKnowledgeId,
            tokenUsed: 0,
          }
        : null,
    } satisfies JobData;
  });
}

function buildSchedulerFallbackChatJob({
  scheduledPostId,
  businessId,
  chatSessionId,
  productKnowledgeId,
  imageUrl,
  productImage,
  referenceImage,
  avatarImages = [],
  model,
  ratio,
  imageSize,
  productName,
  caption,
}: {
  scheduledPostId: string;
  businessId: string;
  chatSessionId?: number | null;
  productKnowledgeId: string;
  imageUrl: string;
  productImage?: string | null;
  referenceImage?: string | null;
  avatarImages?: string[];
  model: string;
  ratio: ValidRatio;
  imageSize?: string | null;
  productName?: string;
  caption?: string;
}): JobData {
  const now = new Date().toISOString();

  return {
    id: `chat-scheduled-${scheduledPostId}`,
    type: "knowledge",
    rootBusinessId: businessId,
    status: "done",
    stage: "done",
    progress: 100,
    createdAt: now,
    updatedAt: now,
    input: {
      rss: null,
      ratio,
      prompt: schedulerFirstGeneratePrompt,
      caption: caption || "",
      chatSessionId: chatSessionId ?? null,
      avatarImageUrl: avatarImages[0] || null,
      avatarImages,
      additionalImages: [],
      systemBubbleId: null,
      category: "",
      designStyle: "",
      referenceImage: referenceImage || null,
      advancedGenerate: initialFormAdvance,
      productKnowledgeId,
      model,
      imageSize,
    },
    error: null,
    product: {
      name: productName || "",
      description: "",
      category: "",
      currency: "IDR",
      price: 0,
      images: productImage ? [productImage] : [],
    },
    result: imageUrl
      ? {
          images: [imageUrl],
          ratio,
          category: "",
          designStyle: "",
          caption: caption || "",
          referenceImages: [],
          productKnowledgeId,
          tokenUsed: 0,
        }
      : null,
  } satisfies JobData;
}

function mapSelectedAvatarsFromImages(
  images: string[] | undefined,
  options?: {
    referenceImage?: string | null;
    productImages?: string[];
  }
): SelectedAvatarOption[] {
  const productImages = options?.productImages || [];

  return buildSelectedAvatarsFromUrls(
    (images || []).filter(
      (imageUrl) =>
        Boolean(imageUrl) &&
        imageUrl !== options?.referenceImage &&
        !productImages.includes(imageUrl)
    )
  );
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
  const pathname = usePathname();
  const t = useTranslations();
  const browserPathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const isContentGenerateRoute =
    pathname.includes("content-generate") ||
    browserPathname.includes("content-generate");
  const contentFeaturesEnabled =
    NEXT_PUBLIC_ENABLE_CONTENT_FEATURES && isContentGenerateRoute;
  const contentGenerateFormDataEnabled = isContentGenerateRoute;
  const scheduleDateParam = searchParams.get("scheduleDate");
  const scheduleTimeParam = searchParams.get("scheduleTime");
  const selectedHistoryRouteId = searchParams.get("selectedHistoryId");
  const selectedHistoryRouteImage = searchParams.get("selectedHistoryImage");
  const routeChatSessionId = searchParams.get("chatSessionId");
  const routeScheduledPostId = searchParams.get("editSchedulerManualPostingId");
  const routeBusinessProductId = searchParams.get("businessProductId");
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
  const { data: templateCategoriesData } = useLibraryTemplateGetCategory(
    contentFeaturesEnabled
  );
  const { data: productCategoriesData } = useLibraryTemplateGetProductCategory(
    contentFeaturesEnabled
  );
  const { data: aiModelsRes, isLoading: isLoadingAiModels } =
    useContentAiModelGetAiModels(contentGenerateFormDataEnabled);
  const billingHistoryFilterQuery = useMemo<Partial<FilterQuery>>(
    () => ({
      page: 1,
      limit: 1000,
      sort: "desc",
      sortBy: "createdAt",
      category: "",
      search: "",
    }),
    []
  );
  const {
    data: billingHistoryRes,
    isLoading: isLoadingBillingHistory,
    isFetching: isFetchingBillingHistory,
  } = useBusinessPurchaseGetHistory(businessId, billingHistoryFilterQuery);
  const { refetch: refetchRouteChat } = useContentImagePostChatGetById(
    businessId,
    routeChatSessionId,
    false
  );
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
    contentGenerateFormDataEnabled
  );
  const { data: allProductsRes } = useProductKnowledgeGetAll(
    businessId,
    {
      limit: 100,
      page: 1,
      sortBy: "name",
      sort: "asc",
    },
    contentGenerateFormDataEnabled
  );
  const productImageById = useMemo(
    () =>
      new Map(
        (allProductsRes?.data?.data || []).map((product) => [
          product.id,
          product.images?.[0] || "",
        ])
      ),
    [allProductsRes?.data?.data]
  );

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
  const selectedHistoryRef = useRef<JobData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [schedulerDraftPost, setSchedulerDraftPost] = useState<{
    id: number;
    chatSessionId: number | null;
  } | null>(null);
  const schedulerDraftPostRef = useRef<{
    id: number;
    chatSessionId: number | null;
  } | null>(null);
  const [schedulerChatSeed, setSchedulerChatSeed] = useState<{
    productImage: string | null;
    referenceImage: string | null;
    avatarImages: string[];
    productKnowledgeId: string | null;
  } | null>(null);
  const syncedSchedulerImageRef = useRef<string | null>(null);
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(false);

  useEffect(() => {
    selectedHistoryRef.current = selectedHistory;
  }, [selectedHistory]);

  useEffect(() => {
    schedulerDraftPostRef.current = schedulerDraftPost;
  }, [schedulerDraftPost]);

  useEffect(() => {
    setSchedulerDraftPost(null);
    setSchedulerChatSeed(null);
    syncedSchedulerImageRef.current = null;
  }, [scheduleDateParam]);
  
  // AI Models state
  const [selectedAiModel, setSelectedAiModel] = useState<AiModelRes | null>(null);
  const hasManualAiModelSelectionRef = useRef(false);
  const hasSuccessfulBillingPayment = useMemo(
    () =>
      (billingHistoryRes?.data?.data || []).some(
        (transaction) => transaction.status === "Success"
      ),
    [billingHistoryRes?.data?.data]
  );
  const hasResolvedBillingHistory =
    Boolean(billingHistoryRes) ||
    (!isLoadingBillingHistory && !isFetchingBillingHistory);
  const isFreeUser = useMemo(() => {
    if (!hasResolvedBillingHistory) {
      return true;
    }

    return !hasSuccessfulBillingPayment;
  }, [hasResolvedBillingHistory, hasSuccessfulBillingPayment]);
  const freeUserAllowedModel = useMemo(
    () => pickGptImageOneModel(aiModelsRes?.data?.data || []),
    [aiModelsRes?.data?.data]
  );

  // Set default AI model when models are loaded
  useEffect(() => {
    if (!hasResolvedBillingHistory || !aiModelsRes?.data?.data?.length) {
      return;
    }

    const defaultModel = pickPreferredAiModel(aiModelsRes.data.data, isFreeUser);
    if (!defaultModel) return;

    const shouldApplyDefault =
      !selectedAiModel ||
      (!hasManualAiModelSelectionRef.current &&
        selectedAiModel.name !== defaultModel.name);

    if (!shouldApplyDefault) {
      return;
    }

    const defaultModelRatios = normalizeValidRatios(defaultModel.validRatios);
    setSelectedAiModel(defaultModel);
    setFormBasic((prev) => ({
      ...prev,
      model: defaultModel.name,
      ratio: (defaultModelRatios[0] || prev.ratio || fallbackRatios[0]) as ValidRatio,
      imageSize: defaultModel.imageSizes?.[0] || null,
    }));
  }, [aiModelsRes, hasResolvedBillingHistory, isFreeUser, selectedAiModel]);

  // Get valid ratios from selected model
  const validRatios = useMemo(() => {
    if (!hasResolvedBillingHistory) {
      return normalizeValidRatios(selectedAiModel?.validRatios);
    }

    const model =
      selectedAiModel ||
      pickPreferredAiModel(aiModelsRes?.data?.data || [], isFreeUser);

    return normalizeValidRatios(model?.validRatios);
  }, [
    aiModelsRes?.data?.data,
    hasResolvedBillingHistory,
    isFreeUser,
    selectedAiModel,
  ]);

  const onSelectHistory = useCallback((
    item: JobData | null,
    options?: { selectedImageUrl?: string | null }
  ) => {
    if (item) {
      setMode("regenerate");
      const activeImageUrl =
        options?.selectedImageUrl || item?.result?.images[0] || null;
      const resolvedInputImages = resolveJobInputImages({
        avatarImageUrl: item?.input?.avatarImageUrl,
        avatarImages: item?.input?.avatarImages,
        additionalImages: item?.input?.additionalImages,
        referenceImage: item?.input?.referenceImage,
        productImages: item?.product?.images || [],
      });
      
      // Find and set the AI model from history
      const modelFromHistory = aiModelsRes?.data?.data?.find(
        model => model.name === item?.input?.model
      );
      const effectiveModel =
        isFreeUser
          ? pickGptImageOneModel(aiModelsRes?.data?.data || []) ||
            modelFromHistory
          : modelFromHistory;
      hasManualAiModelSelectionRef.current = false;
      const effectiveModelRatios = normalizeValidRatios(
        effectiveModel?.validRatios
      );
      const nextRatio = effectiveModelRatios.includes(
        item?.result?.ratio as ValidRatio
      )
        ? (item?.result?.ratio as ValidRatio)
        : effectiveModelRatios[0] || fallbackRatios[0];
      if (effectiveModel) {
        setSelectedAiModel(effectiveModel);
      }
      
      setFormBasic((prev) => ({
        ...prev,
        prompt: "",
        referenceImageName: "",
        caption: item?.result?.caption || "",
        productKnowledgeId: item?.input?.productKnowledgeId || "",
        productName: item?.product?.name || "",
        productImage: activeImageUrl || "",
        selectedAvatars: resolvedInputImages.selectedAvatars,
        additionalImages: resolvedInputImages.additionalImages,
        category: item?.input?.category || "other",
        customCategory: item?.input?.category || "",
        designStyle: item?.input?.designStyle || "",
        customDesignStyle: item?.input?.designStyle || "",
        referenceImage: activeImageUrl || "",
        ratio: nextRatio,
        model: effectiveModel?.name || item?.input?.model || "",
        imageSize:
          effectiveModel?.imageSizes?.[0] ||
          item?.input?.imageSize ||
          null,
      }));
      setSelectedJobId(item.id);
      setSelectedGeneratedImageUrl(activeImageUrl);
      setFormAdvance(initialFormAdvance);
      setFormRss(null);
      setMode("regenerate");
      setTab("knowledge");
    } else {
      hasManualAiModelSelectionRef.current = false;
      const defaultModel =
        pickPreferredAiModel(aiModelsRes?.data?.data || [], isFreeUser) ||
        selectedAiModel;
      const defaultModelRatios = normalizeValidRatios(defaultModel?.validRatios);
      if (defaultModel) {
        setSelectedAiModel(defaultModel);
      }
      setMode("knowledge");
      setTab("knowledge");
      setSelectedJobId(null);
      setSelectedGeneratedImageUrl(null);
      setFormBasic({
        ...initialFormBasic,
        model: defaultModel?.name || initialFormBasic.model,
          ratio: (defaultModelRatios[0] ||
          initialFormBasic.ratio ||
          fallbackRatios[0]) as ValidRatio,
        imageSize: defaultModel?.imageSizes?.[0] || null,
      });
      setFormAdvance(initialFormAdvance);
    }
    setFormRss(null);
      setIsDraftSaved(false); // Reset draft saved state when selecting new history
      setSchedulerDraftPost(null);
      setSchedulerChatSeed(null);
  }, [aiModelsRes, isFreeUser, selectedAiModel]);

  const onSelectGeneratedImage = useCallback(
    (
      item: JobData,
      imageUrl: string,
      options?: { attachForEdit?: boolean }
    ) => {
      const modelFromHistory = aiModelsRes?.data?.data?.find(
        (model) => model.name === item?.input?.model
      );
      const effectiveModel =
        isFreeUser
          ? pickGptImageOneModel(aiModelsRes?.data?.data || []) ||
            modelFromHistory
          : modelFromHistory;
      hasManualAiModelSelectionRef.current = false;
      const effectiveModelRatios = normalizeValidRatios(
        effectiveModel?.validRatios
      );
      const resolvedInputImages = resolveJobInputImages({
        avatarImageUrl: item?.input?.avatarImageUrl,
        avatarImages: item?.input?.avatarImages,
        additionalImages: item?.input?.additionalImages,
        referenceImage: item?.input?.referenceImage,
        productImages: item?.product?.images || [],
      });
      const nextRatio = effectiveModelRatios.includes(
        item?.result?.ratio as ValidRatio
      )
        ? (item?.result?.ratio as ValidRatio)
        : effectiveModelRatios[0] || fallbackRatios[0];
      if (effectiveModel) {
        setSelectedAiModel(effectiveModel);
      }

      setFormBasic((prev) => ({
        ...prev,
        prompt: options?.attachForEdit ? "" : prev.prompt,
        referenceImageName: options?.attachForEdit ? "Selected image" : "",
        caption: item?.result?.caption || prev.caption || "",
        productKnowledgeId: item?.input?.productKnowledgeId || "",
        productName: item?.product?.name || "",
        productImage: imageUrl,
        selectedAvatars: resolvedInputImages.selectedAvatars,
        additionalImages: resolvedInputImages.additionalImages,
        category: item?.input?.category || "other",
        customCategory: item?.input?.category || "",
        designStyle: item?.input?.designStyle || "",
        customDesignStyle: item?.input?.designStyle || "",
        referenceImage: imageUrl,
        ratio: nextRatio,
        model: effectiveModel?.name || item?.input?.model || prev.model,
        imageSize:
          effectiveModel?.imageSizes?.[0] ||
          item?.input?.imageSize ||
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
    [aiModelsRes, isFreeUser]
  );

  /**
   *
   * LIBRARY RSS
   *
   */
  const [rssQuery, setRssQuery] = useState<Partial<FilterQuery>>({
    limit: 10,
    page: 1,
    sort: "desc",
    sortBy: "publishedAt",
  });

  const { data: rssArtRes } = useLibraryRSSArticle(
    businessId,
    {
      ...rssQuery,
      onlyWithImage: true,
    },
    contentFeaturesEnabled
  );

  const allArticles: RssArticleRes[] = useMemo(
    () => rssArtRes?.data?.data ?? [],
    [rssArtRes?.data?.data]
  );

  const rssPagination: Pagination = useMemo(() => {
    const serverPagination = rssArtRes?.data?.pagination;
    if (serverPagination) return serverPagination;

    return {
      ...initialPagination,
      limit: Number(rssQuery.limit) || initialPagination.limit,
      page: Number(rssQuery.page) || initialPagination.page,
    };
  }, [rssArtRes?.data?.pagination, rssQuery.limit, rssQuery.page]);

  const setFilterQuery = useCallback((q: Partial<FilterQuery>) => {
    setRssQuery((prev) => ({
      ...prev,
      ...q,
      page:
        (q.search !== undefined && q.search !== prev.search) ||
        (q.limit !== undefined && q.limit !== prev.limit) ||
        (q.sort !== undefined && q.sort !== prev.sort) ||
        (q.sortBy !== undefined && q.sortBy !== prev.sortBy)
          ? 1
          : q.page ?? prev.page,
    }));
  }, []);

  const rss: ContentGenerateContext["rss"] = {
    articles: allArticles,
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
  const [isRestoringSchedulerChat, setIsRestoringSchedulerChat] =
    useState(false);
  const setIsLoading = (item: boolean) => {
    setLoadingState(item);
  };
  const shouldRestoreSchedulerChat =
    Boolean(routeChatSessionId && routeScheduledPostId);

  useIsomorphicLayoutEffect(() => {
    if (!shouldRestoreSchedulerChat) {
      if (isRestoringSchedulerChat) {
        setLoadingState(false);
      }
      setIsRestoringSchedulerChat(false);
      setSchedulerDraftPost(null);
      setSchedulerChatSeed(null);
      syncedSchedulerImageRef.current = null;
      return;
    }

    setMode("regenerate");
    setTab("knowledge");
    setLoadingState(true);
    setIsRestoringSchedulerChat(true);
    setSchedulerDraftPost({
      id: Number(routeScheduledPostId),
      chatSessionId: Number(routeChatSessionId),
    });
  }, [
    isRestoringSchedulerChat,
    routeChatSessionId,
    routeScheduledPostId,
    shouldRestoreSchedulerChat,
  ]);

  useEffect(() => {
    if (!routeChatSessionId || !routeScheduledPostId) return;
    const selectedHistoryImage = searchParams.get("selectedHistoryImage");
    const scheduleDate = searchParams.get("scheduleDate");
    const routeKey = `${routeScheduledPostId}|${routeChatSessionId}|${selectedHistoryImage || ""}`;

    if (lastAppliedHistoryRouteKeyRef.current === routeKey) {
      setLoadingState(false);
      setIsRestoringSchedulerChat(false);
      return;
    }

    let isActive = true;
    setMode("regenerate");
    setTab("knowledge");
    setLoadingState(true);
    setIsRestoringSchedulerChat(true);
    setSchedulerDraftPost({
      id: Number(routeScheduledPostId),
      chatSessionId: Number(routeChatSessionId),
    });

    refetchRouteChat().then((result) => {
      if (!isActive) return;

      const productKnowledgeId = routeBusinessProductId || "";
      const routeDraftMarker = getSchedulerDraftMarkers(businessId).find(
        (marker) => marker.draftId === String(routeScheduledPostId)
      );
      const originalProductImage =
        (productKnowledgeId
          ? productImageById.get(String(productKnowledgeId))
          : "") || "";
      const chat = result.data?.data?.data;
      if (!chat && !selectedHistoryImage) return;
      const existingThreadJobs = histories
        .flatMap((group) => group.jobs)
        .filter(
          (job) =>
            job.id.startsWith("chat-") &&
            !job.id.startsWith("chat-pending-") &&
            job.input.chatSessionId === Number(routeChatSessionId)
        )
        .sort(
          (left, right) =>
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime()
        );
      const existingThreadJobsById = new Map(
        existingThreadJobs.map((job) => [job.id, job])
      );
      const seedJob = existingThreadJobs[0];
      const seedReferenceImage =
        seedJob?.input?.referenceImage ||
        routeDraftMarker?.referenceImage ||
        form.basic.referenceImage;
      const seedProductImage =
        originalProductImage ||
        routeDraftMarker?.productImage ||
        seedJob?.product?.images?.[0] ||
        selectedHistoryImage ||
        form.basic.productImage;
      const restoredCaption = routeDraftMarker?.caption || form.basic.caption;
      const restoredSeed = {
        productImage: seedProductImage || null,
        referenceImage: seedReferenceImage || null,
        avatarImages: routeDraftMarker?.avatarImages || [],
        productKnowledgeId: productKnowledgeId || null,
      };

      const restoredJobs = chat
        ? buildSchedulerChatJobs({
            chat,
            businessId,
            chatSessionId: Number(routeChatSessionId),
            productKnowledgeId,
            model: form.basic.model,
            ratio: form.basic.ratio,
            imageSize: form.basic.imageSize,
            productName: form.basic.productName,
            productImage: seedProductImage,
            referenceImage: seedReferenceImage,
            avatarImages: routeDraftMarker?.avatarImages || [],
            caption: restoredCaption,
          })
        : [
            buildSchedulerFallbackChatJob({
              scheduledPostId: routeScheduledPostId,
              businessId,
              chatSessionId: Number(routeChatSessionId),
              productKnowledgeId,
              imageUrl: selectedHistoryImage || "",
              productImage: seedProductImage,
              referenceImage: seedReferenceImage,
              avatarImages: routeDraftMarker?.avatarImages || [],
              model: form.basic.model,
              ratio: form.basic.ratio,
              imageSize: form.basic.imageSize,
              productName: form.basic.productName,
              caption: restoredCaption,
            }),
          ];
      const mergedRestoredJobs = restoredJobs.map((job, index) => {
        const existingJob = existingThreadJobsById.get(job.id);
        const isInitialSchedulerBubble = index === 0;
        return {
          ...job,
          input: {
            ...job.input,
            referenceImage:
              isInitialSchedulerBubble
                ? job.input.referenceImage || seedReferenceImage || null
                : job.input.referenceImage || existingJob?.input.referenceImage || null,
            avatarImageUrl:
              job.input.avatarImageUrl ||
              existingJob?.input.avatarImageUrl ||
              (isInitialSchedulerBubble
                ? routeDraftMarker?.avatarImages?.[0] || null
                : null),
            avatarImages:
              job.input.avatarImages?.length
                ? job.input.avatarImages
                : existingJob?.input.avatarImages?.length
                ? existingJob.input.avatarImages
                : isInitialSchedulerBubble
                ? routeDraftMarker?.avatarImages || []
                : [],
            additionalImages:
              isInitialSchedulerBubble
                ? job.input.additionalImages || []
                : job.input.additionalImages?.length
                ? job.input.additionalImages
                : existingJob?.input.additionalImages || [],
            systemBubbleId:
              typeof job.input.systemBubbleId === "number"
                ? job.input.systemBubbleId
                : existingJob?.input.systemBubbleId || null,
          },
          result:
            job.result && existingJob?.result
              ? {
                  ...job.result,
                  imageItemIds:
                    job.result.imageItemIds?.length
                      ? job.result.imageItemIds
                      : existingJob.result.imageItemIds,
                }
              : job.result || existingJob?.result || null,
          product: {
            ...job.product,
            images:
              isInitialSchedulerBubble
                ? seedProductImage
                  ? [seedProductImage]
                  : []
                : job.product.images.length > 0
                ? job.product.images
                : existingJob?.product.images || [],
          },
        };
      });
      if (mergedRestoredJobs.length === 0) return;

      const latestJob = mergedRestoredJobs[mergedRestoredJobs.length - 1];
      const imageUrl =
        latestJob.result?.images?.[0] ||
        selectedHistoryImage ||
        "";

      setHistories((prev) => {
        const withoutThread = removeJobsFromHistory(
          prev,
          (job) => job.id.startsWith("chat-pending-")
        );
        return mergedRestoredJobs.reduce(
          (groups, job) => upsertJobIntoHistory(groups, job),
          withoutThread
        );
      });
      setSelectedJobId(latestJob.id);
      setSelectedGeneratedImageUrl(imageUrl || null);
      setSchedulerChatSeed(restoredSeed);
      const restoredInputImages = resolveJobInputImages({
        avatarImages: routeDraftMarker?.avatarImages || [],
        additionalImages: latestJob.input.additionalImages,
        referenceImage: seedReferenceImage || null,
        productImages: seedProductImage ? [seedProductImage] : [],
      });
      setFormBasic((prev) => ({
        ...prev,
        productKnowledgeId,
        productImage: seedProductImage || prev.productImage,
        referenceImage: seedReferenceImage || prev.referenceImage,
        selectedAvatars: restoredInputImages.selectedAvatars,
        additionalImages: restoredInputImages.additionalImages,
        caption: restoredCaption,
        prompt: "",
      }));
      if (scheduleDate) {
        syncedSchedulerImageRef.current = imageUrl || null;
      }
      lastAppliedHistoryRouteKeyRef.current = routeKey;
    }).catch(() => {
      if (!isActive || !selectedHistoryImage) return;

      const productKnowledgeId = routeBusinessProductId || "";
      const routeDraftMarker = getSchedulerDraftMarkers(businessId).find(
        (marker) => marker.draftId === String(routeScheduledPostId)
      );
      const originalProductImage =
        (productKnowledgeId
          ? productImageById.get(String(productKnowledgeId))
          : "") || "";
      const fallbackProductImage =
        routeDraftMarker?.productImage ||
        originalProductImage ||
        form.basic.productImage;
      const fallbackReferenceImage =
        routeDraftMarker?.referenceImage || form.basic.referenceImage;
      const restoredCaption = routeDraftMarker?.caption || form.basic.caption;
      const restoredSeed = {
        productImage: fallbackProductImage || null,
        referenceImage: fallbackReferenceImage || null,
        avatarImages: routeDraftMarker?.avatarImages || [],
        productKnowledgeId: productKnowledgeId || null,
      };
      const fallbackJob = buildSchedulerFallbackChatJob({
        scheduledPostId: routeScheduledPostId,
        businessId,
        chatSessionId: Number(routeChatSessionId),
        productKnowledgeId,
        imageUrl: selectedHistoryImage,
        productImage: fallbackProductImage,
        referenceImage: fallbackReferenceImage,
        avatarImages: routeDraftMarker?.avatarImages || [],
        model: form.basic.model,
        ratio: form.basic.ratio,
        imageSize: form.basic.imageSize,
        productName: form.basic.productName,
        caption: restoredCaption,
      });

      setHistories((prev) => upsertJobIntoHistory(prev, fallbackJob));
      setSelectedJobId(fallbackJob.id);
      setSelectedGeneratedImageUrl(selectedHistoryImage);
      setSchedulerChatSeed(restoredSeed);
      const fallbackInputImages = resolveJobInputImages({
        avatarImages: routeDraftMarker?.avatarImages || [],
        additionalImages: fallbackJob.input.additionalImages,
        referenceImage: fallbackReferenceImage,
        productImages: fallbackProductImage ? [fallbackProductImage] : [],
      });
      setFormBasic((prev) => ({
        ...prev,
        productKnowledgeId,
        productImage: fallbackProductImage || prev.productImage,
        referenceImage: fallbackReferenceImage || prev.referenceImage,
        selectedAvatars: fallbackInputImages.selectedAvatars,
        additionalImages: fallbackInputImages.additionalImages,
        caption: restoredCaption,
        prompt: "",
      }));
      lastAppliedHistoryRouteKeyRef.current = routeKey;
    }).finally(() => {
      if (!isActive) return;
      setLoadingState(false);
      setIsRestoringSchedulerChat(false);
    });

    return () => {
      isActive = false;
    };
  }, [
    businessId,
    form.basic.caption,
    form.basic.imageSize,
    form.basic.model,
    form.basic.productImage,
    form.basic.productName,
    form.basic.ratio,
    form.basic.referenceImage,
    refetchRouteChat,
    routeBusinessProductId,
    histories,
    productImageById,
    routeChatSessionId,
    routeScheduledPostId,
    searchParams,
  ]);

  useEffect(() => {
    if (routeChatSessionId) return;
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
    routeChatSessionId,
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
  const [, setPublishedPagination] = useState<Pagination>(initialPagination);
  const [publishedQuery, setPublishedQuery] = useState<Partial<FilterQuery>>({
    limit: 10,
    page: 1,
    search: "",
    sortBy: "createdAt",
    sort: "desc",
  });
  
  // Fetch all published references so client-side hiding of saved items
  // still keeps each page filled correctly.
  const publishedApiQuery = useMemo(() => {
    return {
      ...publishedQuery,
      limit: 999,
      page: 1,
    };
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
    if (productCategory) params.set("category", String(productCategory));
    if (category) params.set("typeCategoryId", String(category));

    const token = getBrowserAccessToken();

    fetch(`/api/backend/creator/library?${params.toString()}`, {
      signal: controller.signal,
      headers: token ? { "X-Postmatic-AccessToken": token } : undefined,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`creator/library ${response.status}`);
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
    if (savedQuery.productCategory || savedQuery.category) {
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
      categories:
        item?.templateImageContent?.templateImageCategories.map((cat) => cat.name) ||
        [],
      productCategories:
        item?.templateImageContent?.templateProductCategories.map(
          (cat) => cat.indonesianName
        ) || [],
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
  const savedTemplateIds = useMemo(
    () => new Set(savedData.map((template) => template.id)),
    [savedData]
  );

  // Client-side filtering by productCategory if server-side filtering is not working
  const allFilteredPublishedData = useMemo(() => {
    let data = publishedData.filter((template) => !savedTemplateIds.has(template.id));
    
    if (publishedQuery.category) {
      // Find the template category name by ID
      const selectedCategory = templateCategoriesData?.data?.data?.find(
        (cat) => cat.id === publishedQuery.category
      );

      if (selectedCategory) {
        data = data.filter((template) =>
          template.categories.includes(selectedCategory.name)
        );
      }
    }
    
    if (publishedQuery.productCategory) {
      // Find the product category name by ID
      const selectedCategory = productCategoriesData?.data?.data?.find(
        (cat) => cat.id === publishedQuery.productCategory
      );
      
      if (selectedCategory) {
        data = data.filter(template => 
          template.productCategories.includes(selectedCategory.indonesianName)
        );
      }
    }
    
    return data;
  }, [
    publishedData,
    publishedQuery.category,
    publishedQuery.productCategory,
    productCategoriesData,
    savedTemplateIds,
    templateCategoriesData,
  ]);

  // Apply client-side pagination so hidden saved items do not leave empty slots.
  const { paginatedData: filteredPublishedData, pagination: adjustedPublishedPagination } = useMemo(() => {
    const limit = publishedQuery.limit || 10;
    const requestedPage = publishedQuery.page || 1;
    const total = allFilteredPublishedData.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);

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
  }, [
    allFilteredPublishedData,
    publishedQuery.limit,
    publishedQuery.page,
  ]);

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
  // Client-side filtering by productCategory for saved templates
  const allFilteredSavedData = useMemo(() => {
    let data = savedData;
    
    if (savedQuery.category) {
      // Find the template category name by ID
      const selectedCategory = templateCategoriesData?.data?.data?.find(
        (cat) => cat.id === savedQuery.category
      );

      if (selectedCategory) {
        data = data.filter((template) =>
          template.categories.includes(selectedCategory.name)
        );
      }
    }
    
    if (savedQuery.productCategory) {
      // Find the product category name by ID
      const selectedCategory = productCategoriesData?.data?.data?.find(
        (cat) => cat.id === savedQuery.productCategory
      );
      
      if (selectedCategory) {
        data = data.filter(template => 
          template.productCategories.includes(selectedCategory.indonesianName)
        );
      }
    }
    
    return data;
  }, [
    savedData,
    savedQuery.category,
    savedQuery.productCategory,
    productCategoriesData,
    templateCategoriesData,
  ]);

  // Apply client-side pagination when category filter is active
  const { paginatedData: filteredSavedData, pagination: adjustedSavedPagination } = useMemo(() => {
    // If category filter is applied, do client-side pagination
    if (savedQuery.productCategory || savedQuery.category) {
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
  }, [
    allFilteredSavedData,
    savedQuery.category,
    savedQuery.productCategory,
    savedQuery.limit,
    savedQuery.page,
    savedPagination,
  ]);

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
  const mSaveOwnBusinessReference =
    useLibraryTemplateSaveOwnBusinessReferenceImage();
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

  const onSelectAvatars = (items: SelectedAvatarOption[]) => {
    form.setBasic({
      ...form.basic,
      selectedAvatars: items,
    });
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

  const onSaveUploadedReference = async ({
    imageUrl,
    name,
  }: {
    imageUrl: string;
    name: string;
  }) => {
    const res = await mSaveOwnBusinessReference.mutateAsync({
      businessId,
      formData: {
        imageUrl,
        name,
      },
    });

    form.setBasic({
      ...form.basic,
      referenceImage: imageUrl,
      referenceImageName: name,
      referenceImagePublisher: null,
    });
    setSelectedTemplate(null);
    setSavedQuery((prev) => ({
      ...prev,
      page: 1,
    }));

    showToast("success", res.data.responseMessage);

    setTimeout(() => {
      const selectedRef = document.getElementById("selected-reference-image");
      if (selectedRef) {
        selectedRef.scrollIntoView({ behavior: "smooth" });
      }
    }, 500);
  };

  const onResetAdvance = () => {
    setFormAdvance(initialFormAdvance);
  };

  const onSelectAiModel = (model: AiModelRes) => {
    const modelRatios = normalizeValidRatios(model.validRatios);
    hasManualAiModelSelectionRef.current = true;
    setSelectedAiModel(model);
    setFormBasic((prev) => ({
      ...prev,
      model: model.name,
      ratio: modelRatios[0], // Set to first valid ratio
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
  const mCreateScheduledPost = useContentSchedulerManualAddToQueue();
  const mEditScheduledPost = useContentSchedulerManualEditQueue();
  const mSendImageChatMessage = useContentImagePostChatSendImageMessage();
  const { refetch: refetchSchedulerChat } = useContentImagePostChatGetById(
    businessId,
    schedulerDraftPost?.chatSessionId,
    false
  );

  const sendSchedulerChatMessageWithRetry = async (
    chatSessionId: string | number,
    formData: Parameters<
      typeof mSendImageChatMessage.mutateAsync
    >[0]["formData"]
  ) => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        if (attempt > 0) {
          await sleep(1000 * attempt);
        }

        return await mSendImageChatMessage.mutateAsync({
          businessId,
          chatSessionId,
          formData,
        });
      } catch (error) {
        lastError = error;
        const status =
          (error as { response?: { status?: number }; status?: number })
            ?.response?.status ||
          (error as { response?: { status?: number }; status?: number })
            ?.status;

        if (status && status !== 404 && status !== 409 && status !== 425) {
          break;
        }
      }
    }

    throw lastError;
  };

  const submitSchedulerChatGenerate = async (
    effMode: ContentMode,
    additionalImages: string[] = [],
    overrides?: {
      model?: string;
      ratio?: ValidRatio;
      imageSize?: string | null;
    }
  ) => {
    const scheduleDate = searchParams.get("scheduleDate");
    const scheduleTime = searchParams.get("scheduleTime") || formatCurrentTimeInput();

    if (!scheduleDate) return false;

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      showToast("error", t("contentGenerateScheduler.scheduleTimePassed"));
      return true;
    }

    if (!form.basic.productKnowledgeId) {
      showToast("error", t("toast.validation.selectProduct"));
      return true;
    }

    const isFirstSchedulerBubble = !selectedHistory;

    if (effMode === "rss" && !form.rss && isFirstSchedulerBubble) {
      showToast("error", t("toast.validation.selectRSS"));
      return true;
    }

    const draft =
      !isFirstSchedulerBubble && schedulerDraftPost
        ? schedulerDraftPost
        :
      (
        await mCreateScheduledPost.mutateAsync({
          businessId,
          formData: {
            caption: "",
            platforms: [],
            dateTime: new Date(`${scheduleDate}T${scheduleTime}`).toISOString(),
            status: "draft",
            withChatAI: true,
            shareAsReference: true,
            businessProductId: form.basic.productKnowledgeId,
          },
        })
      ).data.data;

    const chatSessionId = draft.chatSessionId;
    if (!chatSessionId) {
      showToast("error", "Chat session belum tersedia dari scheduled post.");
      return true;
    }

    const pendingJobId = `chat-pending-${draft.id}-${Date.now()}`;
    const now = new Date().toISOString();
    const effectiveModel = overrides?.model ?? form.basic.model;
    const effectiveRatio = overrides?.ratio ?? form.basic.ratio;
    const effectiveImageSize =
      overrides?.imageSize !== undefined
        ? overrides.imageSize
        : form.basic.imageSize;
    const firstPrompt =
      form.basic.prompt?.trim() ||
      (isFirstSchedulerBubble ? schedulerFirstGeneratePrompt : "");
    const firstRss =
      isFirstSchedulerBubble && effMode === "rss" ? form.rss : null;
    const selectedSystemBubbleId =
      form.basic.referenceImageName === "Selected image" &&
      typeof selectedHistory?.input?.systemBubbleId === "number"
        ? selectedHistory.input.systemBubbleId
        : undefined;
    const replyBubbleChatId =
      selectedSystemBubbleId && Number.isFinite(selectedSystemBubbleId)
        ? selectedSystemBubbleId
        : undefined;
    const selectedReplyReferenceImage =
      replyBubbleChatId && form.basic.referenceImageName === "Selected image"
        ? selectedGeneratedImageUrl || form.basic.referenceImage || null
        : null;
    const selectedAvatarImages = form.basic.selectedAvatars.map(
      (avatar) => avatar.imageUrl
    );
    const primaryAvatarImage =
      isFirstSchedulerBubble && selectedAvatarImages.length
        ? selectedAvatarImages[0]
        : undefined;
    const additionalAvatarImages =
      isFirstSchedulerBubble && selectedAvatarImages.length > 1
        ? selectedAvatarImages.slice(1)
        : [];
    const chatAdditionalImages = Array.from(
      new Set(
        (
          isFirstSchedulerBubble
            ? [
                form.basic.referenceImage,
                ...additionalAvatarImages,
                ...additionalImages,
              ]
            : additionalImages
        ).filter(Boolean) as string[]
      )
    );
    const visiblePromptImages = Array.from(
      new Set(
        (
          isFirstSchedulerBubble
            ? [form.basic.productImage, ...chatAdditionalImages]
            : [selectedReplyReferenceImage, ...chatAdditionalImages]
        ).filter(Boolean) as string[]
      )
    );
    const promptImages = Array.from(
      new Set(
        (
          isFirstSchedulerBubble
            ? [form.basic.productImage, ...chatAdditionalImages]
            : visiblePromptImages
        ).filter(Boolean) as string[]
      )
    );
    const baseChatJob: JobData = {
      id: pendingJobId,
      type: "knowledge",
      rootBusinessId: businessId,
      status: "processing",
      stage: "processing",
      progress: 10,
      createdAt: now,
      updatedAt: now,
      input: {
        rss: firstRss,
        ratio: effectiveRatio,
        prompt: firstPrompt,
        caption: form.basic.caption,
        chatSessionId,
        avatarImageUrl: primaryAvatarImage || null,
        avatarImages: selectedAvatarImages,
        additionalImages: chatAdditionalImages,
        category: "",
        designStyle: "",
        referenceImage: isFirstSchedulerBubble
          ? form.basic.referenceImage
          : selectedReplyReferenceImage || chatAdditionalImages[0] || null,
        advancedGenerate: initialFormAdvance,
        productKnowledgeId: form.basic.productKnowledgeId,
        model: effectiveModel,
        imageSize: effectiveImageSize,
      },
      error: null,
      product: {
        name: form.basic.productName,
        description: "",
        category: "",
        currency: "IDR",
        price: 0,
        images: visiblePromptImages.length ? visiblePromptImages : promptImages,
      },
      result: null,
    };
    const currentDraftMarker = getSchedulerDraftMarkers(businessId).find(
      (marker) => marker.draftId === String(draft.id)
    );
    const preservedProductImage =
      currentDraftMarker?.productImage ||
      (form.basic.productKnowledgeId
        ? productImageById.get(String(form.basic.productKnowledgeId))
        : "") ||
      form.basic.productImage ||
      null;
    const preservedReferenceImage =
      currentDraftMarker?.referenceImage ||
      (isFirstSchedulerBubble
        ? form.basic.referenceImage
        : selectedHistory?.input?.referenceImage || form.basic.referenceImage) ||
      null;

    upsertSchedulerDraftMarker(businessId, {
      draftId: String(draft.id),
      jobId: pendingJobId,
      date: scheduleDate,
      time: scheduleTime,
      image: form.basic.productImage || "",
      caption: form.basic.caption || "",
      productImage: preservedProductImage,
      referenceImage: preservedReferenceImage,
      avatarImages: selectedAvatarImages,
      chatSessionId: chatSessionId,
      businessProductId: form.basic.productKnowledgeId || null,
      createdAt: now,
    });

    setSchedulerDraftPost({
      id: draft.id,
      chatSessionId,
    });
    setSchedulerChatSeed({
      productImage: preservedProductImage,
      referenceImage: preservedReferenceImage,
      avatarImages: selectedAvatarImages,
      productKnowledgeId: form.basic.productKnowledgeId || null,
    });
    setHistories((prev) => upsertJobIntoHistory(prev, baseChatJob));
    setSelectedJobId(pendingJobId);
    setSelectedGeneratedImageUrl(null);
    setMode("regenerate");

    await sleep(500);

    const chatPayload = {
      model: effectiveModel,
      avatarImageUrl: primaryAvatarImage,
      additionalImages: chatAdditionalImages,
      prompt: firstPrompt,
      ratio: effectiveRatio,
      bubbleChatId: replyBubbleChatId,
      rss:
        isFirstSchedulerBubble && effMode === "rss"
          ? form.rss || undefined
          : undefined,
    };

    let chatRes: Awaited<ReturnType<typeof sendSchedulerChatMessageWithRetry>>;
    try {
      chatRes = await sendSchedulerChatMessageWithRetry(
        chatSessionId,
        chatPayload
      );
    } catch (error) {
      setHistories((prev) =>
        upsertJobIntoHistory(prev, {
          ...baseChatJob,
          status: "error",
          stage: "error",
          progress: 100,
          updatedAt: new Date().toISOString(),
          error: {
            message:
              translateApiResponseMessage(
                (error as { response?: { data?: { responseMessage?: string } } })
                  ?.response?.data?.responseMessage ||
                  (error as Error)?.message ||
                  "Image chat belum siap. Coba generate ulang."
              ),
            stack: null,
            attempt: 4,
          },
        })
      );
      showToast("error", error);
      return true;
    }

    const systemBubble = chatRes.data.data.systemBubble;
    const userBubble = chatRes.data.data.userBubble;
    const images =
      systemBubble?.images?.map((item) => item.imageUrl).filter(Boolean) || [];
    const chatJob: JobData = {
      ...baseChatJob,
      id: `chat-${userBubble.id}`,
      createdAt: userBubble.createdAt || baseChatJob.createdAt,
      status: images.length ? "done" : "processing",
      stage: images.length ? "done" : "processing",
      progress: images.length ? 100 : 10,
      updatedAt: systemBubble?.updatedAt || now,
      error: systemBubble?.errorMessage
        ? { message: systemBubble.errorMessage, stack: null, attempt: 1 }
        : null,
      input: {
        ...baseChatJob.input,
        systemBubbleId: systemBubble?.id || null,
      },
      result: images.length
        ? {
            images,
            imageItemIds: (systemBubble?.images || [])
              .map((item) => item.id)
              .filter((itemId): itemId is number => Number.isFinite(itemId)),
            ratio: effectiveRatio,
            category: "",
            designStyle: "",
            caption: form.basic.caption,
            referenceImages: [],
            productKnowledgeId: form.basic.productKnowledgeId,
            tokenUsed: 0,
          }
        : null,
    };

    upsertSchedulerDraftMarker(businessId, {
      draftId: String(draft.id),
      jobId: chatJob.id,
      date: scheduleDate,
      time: scheduleTime,
      image: images[0] || form.basic.productImage || "",
      caption: form.basic.caption || "",
      productImage: preservedProductImage,
      referenceImage: preservedReferenceImage,
      avatarImages: selectedAvatarImages,
      chatSessionId: chatSessionId,
      businessProductId: form.basic.productKnowledgeId || null,
      createdAt: chatJob.createdAt || now,
    });

    if (images.length) {
      await mEditScheduledPost.mutateAsync({
        businessId,
        idScheduler: draft.id,
        formData: {
          imageUrl: images[0],
          caption: form.basic.caption || "",
          platforms: [],
          dateTime: new Date(`${scheduleDate}T${scheduleTime}`).toISOString(),
          status: "draft",
          withChatAI: true,
          shareAsReference: true,
          businessProductId: form.basic.productKnowledgeId,
          chatSessionId,
        },
      });
    }

    setHistories((prev) =>
      upsertJobIntoHistory(
        removeJobsFromHistory(prev, (job) => job.id === pendingJobId),
        chatJob
      )
    );
    setSelectedJobId(chatJob.id);
    setSelectedGeneratedImageUrl(images[0] || null);
    setFormBasic((prev) => ({
      ...prev,
      prompt: "",
    }));
    showToast("success", t("toast.contentGeneration.waiting"));
    return true;
  };

  const onSubmitGenerate = async (overrides?: {
    mode?: ContentMode;
    maskUrl?: string;
    additionalImages?: string[];
    model?: string;
    ratio?: ValidRatio;
    imageSize?: string | null;
  }) => {
    try {
      if (isLoading) return; // tetap cegah spam
      setIsLoading(true);

      const effMode = overrides?.mode ?? mode;
      const effectiveModel = overrides?.model ?? form.basic.model;
      const effectiveRatio = overrides?.ratio ?? form.basic.ratio;
      const effectiveImageSize =
        overrides?.imageSize !== undefined
          ? overrides.imageSize
          : form.basic.imageSize;
      const selectedAvatarImages = form.basic.selectedAvatars.map(
        (avatar) => avatar.imageUrl
      );
      const handledBySchedulerChat = await submitSchedulerChatGenerate(
        effMode,
        overrides?.additionalImages || [],
        {
          model: effectiveModel,
          ratio: effectiveRatio,
          imageSize: effectiveImageSize,
        }
      );
      if (handledBySchedulerChat) return;

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
              ratio: effectiveRatio,
              prompt: form.basic.prompt,
              productKnowledgeId: form.basic.productKnowledgeId,
              referenceImage: form.basic.referenceImage,
              additionalImages: selectedAvatarImages,
              model: effectiveModel,
              imageSize: effectiveImageSize,
            },
          });

          const knowledgeJobId = resKnowledge.data.data.jobId;
          const knowledgeChatSessionId =
            resKnowledge.data.data.chatSessionId ?? null;

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
              ratio: effectiveRatio,
              prompt: form.basic.prompt,
              caption: form.basic.caption,
              chatSessionId: knowledgeChatSessionId,
              additionalImages: selectedAvatarImages,
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
              model: effectiveModel,
              imageSize: effectiveImageSize,
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
              ratio: effectiveRatio,
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
              additionalImages: selectedAvatarImages,
              model: effectiveModel,
              imageSize: effectiveImageSize,
            },
          });

          const rssJobId = resRss?.data?.data?.jobId;
          const rssChatSessionId = resRss?.data?.data?.chatSessionId ?? null;

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
              ratio: effectiveRatio,
              prompt: form.basic.prompt,
              caption: form.basic.caption,
              chatSessionId: rssChatSessionId,
              additionalImages: selectedAvatarImages,
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
              model: effectiveModel,
              imageSize: effectiveImageSize,
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
              additionalImages: Array.from(
                new Set([
                  ...(selectedHistory.input.additionalImages || []),
                  ...selectedAvatarImages,
                ].filter(Boolean))
              ),
              ratio: effectiveRatio,
              model: effectiveModel,
              imageSize: effectiveImageSize,
            },
          });

          const regenerateJobId = resRegenerate.data.data.jobId;
          const regenerateChatSessionId =
            resRegenerate.data.data.chatSessionId ?? null;

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
              chatSessionId:
                regenerateChatSessionId ?? selectedHistory.input.chatSessionId,
              referenceImage: regenerateReferenceImage,
              ratio: effectiveRatio,
              model: effectiveModel,
              imageSize: effectiveImageSize,
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
              ratio: effectiveRatio,
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
              model: effectiveModel,
              imageSize: effectiveImageSize,
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
  const inflightRealtimeImageItemHydrationRef = useRef(new Set<string>());
  const activeRealtimeChatSessionId = useMemo(() => {
    const selectedChatSessionId = selectedHistory?.input.chatSessionId;
    if (
      typeof selectedChatSessionId === "number" &&
      Number.isFinite(selectedChatSessionId)
    ) {
      return selectedChatSessionId;
    }

    const schedulerChatSessionId = schedulerDraftPost?.chatSessionId;
    if (
      typeof schedulerChatSessionId === "number" &&
      Number.isFinite(schedulerChatSessionId)
    ) {
      return schedulerChatSessionId;
    }

    const parsedRouteChatSessionId = Number(routeChatSessionId);
    if (
      Number.isFinite(parsedRouteChatSessionId) &&
      parsedRouteChatSessionId > 0
    ) {
      return parsedRouteChatSessionId;
    }

    return null;
  }, [
    routeChatSessionId,
    schedulerDraftPost?.chatSessionId,
    selectedHistory?.input.chatSessionId,
  ]);

  const applyRealtimeChatProgress = useCallback(
    (payload: RealtimeGenerativeChatProgressData) => {
      if (
        !Number.isFinite(payload.chatSessionId) ||
        !Number.isFinite(payload.userBubbleId)
      ) {
        return;
      }

      const nextJobId = `chat-${payload.userBubbleId}`;
      let latestJob: JobData | null = null;
      let latestImage = "";

      setHistories((prev) => {
        const flatJobs = prev.flatMap((group) => group.jobs);
        const selectedJob = selectedHistoryRef.current;
        const exactJob = flatJobs.find((job) => job.id === nextJobId) || null;
        const selectedPendingJob =
          selectedJob &&
          selectedJob.id.startsWith("chat-pending-") &&
          selectedJob.input.chatSessionId === payload.chatSessionId
            ? selectedJob
            : null;
        const fallbackJob =
          exactJob ||
          selectedPendingJob ||
          flatJobs.find(
            (job) =>
              job.id.startsWith("chat-") &&
              job.input.chatSessionId === payload.chatSessionId &&
              job.input.systemBubbleId === payload.systemBubbleId
          ) ||
          null;

        if (!fallbackJob) return prev;

        const nextStatus = mapRealtimeProcessStateToJobStatus(
          payload.processState
        );
        const nextStage = mapRealtimeProcessStateToJobStage(
          payload.processState
        );
        const resultImages = (payload.imageUrls || []).filter(Boolean);

        latestJob = {
          ...fallbackJob,
          id: nextJobId,
          rootBusinessId: String(payload.businessRootId || businessId),
          status: nextStatus,
          stage: nextStage,
          progress: clampProgress(
            payload.progressPercentage,
            payload.processState
          ),
          updatedAt: payload.updatedAt || new Date().toISOString(),
          input: {
            ...fallbackJob.input,
            chatSessionId: payload.chatSessionId,
            systemBubbleId:
              payload.systemBubbleId ?? fallbackJob.input.systemBubbleId ?? null,
          },
          error: payload.errorMessage
            ? {
                message: payload.errorMessage,
                stack: null,
                attempt: fallbackJob.error?.attempt || 1,
              }
            : nextStatus === "error"
            ? fallbackJob.error
            : null,
          result: resultImages.length
            ? {
                images: resultImages,
                imageItemIds: fallbackJob.result?.imageItemIds,
                ratio: fallbackJob.result?.ratio || fallbackJob.input.ratio,
                category: fallbackJob.result?.category || "",
                designStyle: fallbackJob.result?.designStyle || "",
                caption:
                  fallbackJob.result?.caption ||
                  fallbackJob.input.caption ||
                  "",
                referenceImages: fallbackJob.result?.referenceImages || [],
                productKnowledgeId:
                  fallbackJob.result?.productKnowledgeId ||
                  fallbackJob.input.productKnowledgeId,
                tokenUsed: fallbackJob.result?.tokenUsed || 0,
              }
            : fallbackJob.result,
        };

        latestImage = latestJob.result?.images?.[0] || "";

        const nextGroups =
          fallbackJob.id !== nextJobId
            ? removeJobsFromHistory(prev, (job) => job.id === fallbackJob.id)
            : prev;

        return upsertJobIntoHistory(nextGroups, latestJob);
      });

      const nextResolvedJob = latestJob as JobData | null;
      if (!nextResolvedJob) return;

      setSelectedJobId(nextResolvedJob.id);

      if (latestImage) {
        setSelectedGeneratedImageUrl(latestImage);
      }

      const needsImageItemIdHydration = Boolean(
        nextResolvedJob.status === "done" &&
          latestImage &&
          !nextResolvedJob.result?.imageItemIds?.length
      );

      if (needsImageItemIdHydration) {
        const hydrationKey = `${payload.chatSessionId}:${nextResolvedJob.id}`;

        if (!inflightRealtimeImageItemHydrationRef.current.has(hydrationKey)) {
          inflightRealtimeImageItemHydrationRef.current.add(hydrationKey);

          const selectedHistorySnapshot =
            selectedHistoryRef.current || nextResolvedJob;
          const resolvedInputImages = resolveJobInputImages({
            avatarImageUrl: selectedHistorySnapshot.input.avatarImageUrl,
            avatarImages: selectedHistorySnapshot.input.avatarImages,
            additionalImages: selectedHistorySnapshot.input.additionalImages,
            referenceImage: selectedHistorySnapshot.input.referenceImage,
            productImages: selectedHistorySnapshot.product.images || [],
          });

          void (async () => {
            try {
              for (
                let attempt = 1;
                attempt <= REALTIME_IMAGE_ITEM_HYDRATION_ATTEMPTS;
                attempt += 1
              ) {
                const result = await refetchSchedulerChat().catch(() => null);
                const chat = result?.data?.data?.data;

                if (chat) {
                  const hydratedJobs = buildSchedulerChatJobs({
                    chat,
                    businessId,
                    chatSessionId: payload.chatSessionId,
                    productKnowledgeId:
                      selectedHistorySnapshot.input.productKnowledgeId,
                    model: selectedHistorySnapshot.input.model,
                    ratio: selectedHistorySnapshot.input.ratio,
                    imageSize: selectedHistorySnapshot.input.imageSize,
                    productName: selectedHistorySnapshot.product.name,
                    productImage:
                      (selectedHistorySnapshot.input.productKnowledgeId
                        ? productImageById.get(
                            String(
                              selectedHistorySnapshot.input.productKnowledgeId
                            )
                          )
                        : "") ||
                      selectedHistorySnapshot.product.images[0] ||
                      "",
                    referenceImage:
                      selectedHistorySnapshot.input.referenceImage,
                    avatarImages: resolvedInputImages.avatarImages,
                    caption:
                      selectedHistorySnapshot.result?.caption ||
                      selectedHistorySnapshot.input.caption ||
                      "",
                  });

                  const hydratedJob =
                    hydratedJobs.find((job) => job.id === nextResolvedJob.id) ||
                    hydratedJobs.find(
                      (job) =>
                        job.input.systemBubbleId ===
                        (payload.systemBubbleId ?? null)
                    ) ||
                    null;

                  const hydratedResult = hydratedJob?.result ?? null;
                  const hydratedSystemBubbleId =
                    hydratedJob?.input.systemBubbleId ?? null;

                  if (hydratedResult?.imageItemIds?.length) {
                    setHistories((prev) =>
                      upsertJobIntoHistory(prev, {
                        ...nextResolvedJob,
                        input: {
                          ...nextResolvedJob.input,
                          systemBubbleId:
                            hydratedSystemBubbleId ??
                            nextResolvedJob.input.systemBubbleId ??
                            null,
                        },
                        result: nextResolvedJob.result
                          ? {
                              ...nextResolvedJob.result,
                              imageItemIds: hydratedResult.imageItemIds,
                            }
                          : hydratedResult,
                      })
                    );
                    return;
                  }
                }

                if (attempt < REALTIME_IMAGE_ITEM_HYDRATION_ATTEMPTS) {
                  await sleep(REALTIME_IMAGE_ITEM_HYDRATION_INTERVAL_MS);
                }
              }
            } finally {
              inflightRealtimeImageItemHydrationRef.current.delete(
                hydrationKey
              );
            }
          })();
        }
      }

      const activeSchedulerDraftPost = schedulerDraftPostRef.current;
      const currentSelectedHistory =
        selectedHistoryRef.current || nextResolvedJob;

      if (
        !latestImage ||
        !activeSchedulerDraftPost ||
        !scheduleDateParam ||
        syncedSchedulerImageRef.current === latestImage
      ) {
        return;
      }

      syncedSchedulerImageRef.current = latestImage;

      const currentDraftMarker = getSchedulerDraftMarkers(businessId).find(
        (marker) => marker.draftId === String(activeSchedulerDraftPost.id)
      );
      const persistedCaption =
        currentDraftMarker?.caption ||
        currentSelectedHistory.input.caption ||
        currentSelectedHistory.result?.caption ||
        "";
      const resolvedAvatarImages =
        currentDraftMarker?.avatarImages ||
        resolveJobInputImages({
          avatarImageUrl: currentSelectedHistory.input.avatarImageUrl,
          avatarImages: currentSelectedHistory.input.avatarImages,
          additionalImages: currentSelectedHistory.input.additionalImages,
          referenceImage: currentSelectedHistory.input.referenceImage,
          productImages: currentSelectedHistory.product.images || [],
        }).avatarImages;

      upsertSchedulerDraftMarker(businessId, {
        draftId: String(activeSchedulerDraftPost.id),
        jobId: nextResolvedJob.id,
        date: scheduleDateParam,
        time: scheduleTimeParam || formatCurrentTimeInput(),
        image: latestImage,
        caption: persistedCaption,
        productImage:
          currentDraftMarker?.productImage ||
          (currentSelectedHistory.input.productKnowledgeId
            ? productImageById.get(
                String(currentSelectedHistory.input.productKnowledgeId)
              )
            : "") ||
          null,
        referenceImage:
          currentDraftMarker?.referenceImage ||
          currentSelectedHistory.input.referenceImage ||
          null,
        avatarImages: resolvedAvatarImages,
        chatSessionId: payload.chatSessionId,
        businessProductId:
          currentSelectedHistory.input.productKnowledgeId || null,
        createdAt: nextResolvedJob.createdAt || new Date().toISOString(),
      });

      void mEditScheduledPost
        .mutateAsync({
          businessId,
          idScheduler: activeSchedulerDraftPost.id,
          formData: {
            imageUrl: latestImage,
            caption: persistedCaption,
            platforms: [],
            dateTime: new Date(
              `${scheduleDateParam}T${scheduleTimeParam || formatCurrentTimeInput()}`
            ).toISOString(),
            status: "draft",
            withChatAI: true,
            shareAsReference: true,
            businessProductId: currentSelectedHistory.input.productKnowledgeId,
            chatSessionId: payload.chatSessionId,
          },
        })
        .catch(() => null);
    },
    [
      businessId,
      productImageById,
      mEditScheduledPost,
      refetchSchedulerChat,
      scheduleDateParam,
      scheduleTimeParam,
    ]
  );
  const applyRealtimeChatProgressRef = useRef(applyRealtimeChatProgress);
  useEffect(() => {
    applyRealtimeChatProgressRef.current = applyRealtimeChatProgress;
  }, [applyRealtimeChatProgress]);

  /** ===== Socket lifecycle ===== */
  useEffect(() => {
    if (!NEXT_PUBLIC_ENABLE_SOCKET || !isContentGenerateRoute) {
      setIsConnected(false);
      return;
    }

    const token = getBrowserAccessToken();
    if (!token) {
      setIsConnected(false);
      return;
    }

    const socket = createSocket({ token });
    if (socket.connected) {
      setIsConnected(true);
    }

    const handleOpen = () => {
      setIsConnected(true);
    };
    const handleClose = () => {
      setIsConnected(false);
    };
    const handleMessage = (message: RealtimeEnvelope) => {
      if (message.type !== "generative_content.chat.progress") return;

      const payload = message.data as
        | RealtimeGenerativeChatProgressData
        | undefined;
      if (!payload) return;

      applyRealtimeChatProgressRef.current(payload);
    };

    socket.on("open", handleOpen);
    socket.on("close", handleClose);
    socket.on("message", handleMessage);

    return () => {
      socket.off("open", handleOpen);
      socket.off("close", handleClose);
      socket.off("message", handleMessage);
      destroySocket();
    };
  }, [isContentGenerateRoute]);

  useEffect(() => {
    if (!NEXT_PUBLIC_ENABLE_SOCKET || !activeRealtimeChatSessionId) return;

    const token = getBrowserAccessToken();
    if (!token) return;

    const socket = createSocket({ token });
    const topic = `generative_content.chat.${activeRealtimeChatSessionId}`;

    socket.subscribe(topic);

    return () => {
      socket.unsubscribe(topic);
    };
  }, [activeRealtimeChatSessionId]);

  const socketEvent: ContentGenerateContext["socketEvent"] = {
    isConnected,
  };

  useEffect(() => {
    if (!contentFeaturesEnabled || !selectedHistory) return;

    const isFinal =
      notLoadingJobStatus.includes(selectedHistory.status) &&
      notLoadingJobStages.includes(selectedHistory.stage);
    if (isFinal) return;

    const isSchedulerChatJob = selectedHistory.id.startsWith("chat-");
    if (isSchedulerChatJob) {
      if (isConnected && activeRealtimeChatSessionId) return;

      const activeSchedulerDraftPost = schedulerDraftPost;
      const activeChatSessionId =
        activeRealtimeChatSessionId || activeSchedulerDraftPost?.chatSessionId;
      if (!activeSchedulerDraftPost || activeChatSessionId == null) return;

      const intervalId = window.setInterval(async () => {
        const result = await refetchSchedulerChat().catch(() => null);
        if (!result) return;

        const chat = result.data?.data?.data;
        if (!chat) return;
        const existingThreadJobs = histories
          .flatMap((group) => group.jobs)
          .filter(
            (job) =>
              job.id.startsWith("chat-") &&
              !job.id.startsWith("chat-pending-") &&
              job.input.chatSessionId === activeChatSessionId
          )
          .sort(
            (left, right) =>
              new Date(left.createdAt).getTime() -
              new Date(right.createdAt).getTime()
          );
        const existingThreadJobsById = new Map(
          existingThreadJobs.map((job) => [job.id, job])
        );
        const seedJob = existingThreadJobs[0];
        const currentDraftMarker = getSchedulerDraftMarkers(businessId).find(
          (marker) => marker.draftId === String(activeSchedulerDraftPost.id)
        );
        const persistedCaption =
          currentDraftMarker?.caption || selectedHistory.input.caption || "";

        const chatJobs = buildSchedulerChatJobs({
          chat,
          businessId,
          chatSessionId: activeChatSessionId,
          productKnowledgeId: selectedHistory.input.productKnowledgeId,
          model: selectedHistory.input.model,
          ratio: selectedHistory.input.ratio,
          imageSize: selectedHistory.input.imageSize,
          productName: selectedHistory.product.name,
          productImage:
            (selectedHistory.input.productKnowledgeId
              ? productImageById.get(
                  String(selectedHistory.input.productKnowledgeId)
                )
              : "") ||
            seedJob?.product?.images?.[0] ||
            selectedHistory.product.images[0],
          referenceImage:
            seedJob?.input?.referenceImage || selectedHistory.input.referenceImage,
          avatarImages:
            currentDraftMarker?.avatarImages ||
            resolveJobInputImages({
              avatarImageUrl: selectedHistory.input.avatarImageUrl,
              avatarImages: selectedHistory.input.avatarImages,
              additionalImages: selectedHistory.input.additionalImages,
              referenceImage: selectedHistory.input.referenceImage,
              productImages: selectedHistory.product.images || [],
            }).avatarImages,
          caption: persistedCaption,
        });
        const mergedChatJobs = chatJobs.map((job, index) => {
          const existingJob = existingThreadJobsById.get(job.id);
          const isInitialSchedulerBubble = index === 0;
          const initialProductImage =
            (selectedHistory.input.productKnowledgeId
              ? productImageById.get(
                  String(selectedHistory.input.productKnowledgeId)
                )
              : "") ||
            seedJob?.product?.images?.[0] ||
            selectedHistory.product.images[0] ||
            "";
          const initialReferenceImage =
            seedJob?.input?.referenceImage || selectedHistory.input.referenceImage;
          return {
            ...job,
            input: {
              ...job.input,
              referenceImage:
                isInitialSchedulerBubble
                  ? job.input.referenceImage || initialReferenceImage || null
                  : job.input.referenceImage ||
                    existingJob?.input.referenceImage ||
                    null,
              avatarImageUrl:
                job.input.avatarImageUrl ||
                existingJob?.input.avatarImageUrl ||
                (isInitialSchedulerBubble
                  ? currentDraftMarker?.avatarImages?.[0] || null
                  : null),
              avatarImages:
                job.input.avatarImages?.length
                  ? job.input.avatarImages
                  : existingJob?.input.avatarImages?.length
                  ? existingJob.input.avatarImages
                  : isInitialSchedulerBubble
                  ? currentDraftMarker?.avatarImages || []
                  : [],
              additionalImages:
                isInitialSchedulerBubble
                  ? job.input.additionalImages || []
                  : job.input.additionalImages?.length
                  ? job.input.additionalImages
                  : existingJob?.input.additionalImages || [],
              systemBubbleId:
                typeof job.input.systemBubbleId === "number"
                  ? job.input.systemBubbleId
                  : existingJob?.input.systemBubbleId || null,
            },
            result:
              job.result && existingJob?.result
                ? {
                    ...job.result,
                    imageItemIds:
                      job.result.imageItemIds?.length
                        ? job.result.imageItemIds
                        : existingJob.result.imageItemIds,
                  }
                : job.result || existingJob?.result || null,
            product: {
              ...job.product,
              images:
                isInitialSchedulerBubble
                  ? initialProductImage
                    ? [initialProductImage]
                    : []
                  : job.product.images.length > 0
                  ? job.product.images
                  : existingJob?.product.images || [],
            },
          };
        });
        const latestJob = mergedChatJobs[mergedChatJobs.length - 1];
        const latestImage = latestJob?.result?.images?.[0] || "";

        if (!latestJob || latestJob.stage === "processing") {
          return;
        }

        setHistories((prev) => {
          const withoutThread = removeJobsFromHistory(
            prev,
            (job) => job.id.startsWith("chat-pending-")
          );
          return mergedChatJobs.reduce(
            (groups, job) => upsertJobIntoHistory(groups, job),
            withoutThread
          );
        });
        setSelectedJobId(latestJob.id);
        setSelectedGeneratedImageUrl(latestImage || null);

        if (
          latestImage &&
          syncedSchedulerImageRef.current !== latestImage &&
          scheduleDateParam
        ) {
          syncedSchedulerImageRef.current = latestImage;
          upsertSchedulerDraftMarker(businessId, {
            draftId: String(activeSchedulerDraftPost.id),
            jobId: latestJob.id,
            date: scheduleDateParam,
            time: scheduleTimeParam || formatCurrentTimeInput(),
            image: latestImage,
            caption: persistedCaption,
            productImage:
              currentDraftMarker?.productImage ||
              (selectedHistory.input.productKnowledgeId
                ? productImageById.get(
                    String(selectedHistory.input.productKnowledgeId)
                  )
                : "") ||
              null,
            referenceImage:
              currentDraftMarker?.referenceImage ||
              selectedHistory.input.referenceImage ||
              null,
            avatarImages:
              currentDraftMarker?.avatarImages ||
              resolveJobInputImages({
                avatarImageUrl: selectedHistory.input.avatarImageUrl,
                avatarImages: selectedHistory.input.avatarImages,
                additionalImages: selectedHistory.input.additionalImages,
                referenceImage: selectedHistory.input.referenceImage,
                productImages: selectedHistory.product.images || [],
              }).avatarImages,
            chatSessionId: activeChatSessionId,
            businessProductId: selectedHistory.input.productKnowledgeId || null,
            createdAt: latestJob.createdAt || new Date().toISOString(),
          });
          await mEditScheduledPost.mutateAsync({
            businessId,
            idScheduler: activeSchedulerDraftPost.id,
            formData: {
              imageUrl: latestImage,
              caption: persistedCaption,
              platforms: [],
              dateTime: new Date(
                `${scheduleDateParam}T${scheduleTimeParam || formatCurrentTimeInput()}`
              ).toISOString(),
              status: "draft",
              withChatAI: true,
              shareAsReference: true,
              businessProductId: selectedHistory.input.productKnowledgeId,
              chatSessionId: activeChatSessionId,
            },
          });
        }
      }, 5000);

      return () => window.clearInterval(intervalId);
    }

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
    activeRealtimeChatSessionId,
    contentFeaturesEnabled,
    isConnected,
    businessId,
    mEditScheduledPost,
    productImageById,
    refetchHistories,
    refetchSchedulerChat,
    scheduleDateParam,
    scheduleTimeParam,
    schedulerDraftPost,
    selectedHistory,
    histories,
  ]);

  const aiModels: ContentGenerateContext["aiModels"] = {
    models: aiModelsRes?.data?.data || [],
    selectedModel: selectedAiModel,
    validRatios,
    isLoading: isLoadingAiModels || !hasResolvedBillingHistory,
    isFreeUser,
    freeUserAllowedModel,
  };

  return (
    <ContentGenerateContext.Provider
      value={{
        form,
        mode,
        setMode,
        tab,
        setTab,
        isRestoringSchedulerChat,
        publishedTemplates,
        savedTemplates,
        unsaveModal,
        setUnsaveModal,
        onSaveUnsave,
        onSaveUploadedReference,
        onConfirmUnsave,
        onCloseUnsaveModal,
        onSelectProduct,
        onSelectAvatars,
        rss,
        productKnowledges,
        onSelectReferenceImage,
        onSubmitGenerate,
        histories,
        selectedHistory,
        selectedGeneratedImageUrl,
        schedulerDraftPost,
        schedulerChatSeed,
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
