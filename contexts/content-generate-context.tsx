"use client";

import {
  ACCESS_TOKEN_KEY,
  MAX_CAROUSEL_IMAGES,
  NEXT_PUBLIC_API_ORIGIN,
  NEXT_PUBLIC_ENABLE_CONTENT_FEATURES,
  NEXT_PUBLIC_ENABLE_SOCKET,
  SELECTED_IMAGE_REFERENCE_NAME,
} from "@/constants";
import { showToast } from "@/helper/show-toast";
import { haptic } from "@/lib/haptics";
import { useTranslations } from "next-intl";
import {
  createSocket,
  RealtimeEnvelope,
} from "@/lib/socket";
import {
  getSchedulerDraftMarkers,
  upsertSchedulerDraftMarker,
} from "@/lib/scheduler-draft-markers";
import { getNextSchedulableDate } from "@/lib/schedule-date-time";
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
  isFreeUserAllowedAiModel,
  isGridAiModel,
  pickDefaultAiModel,
  pickFreeUserAiModel,
} from "@/models/api/content/ai-model";
import {
  GetAllJob,
  JobData,
  JobStage,
  JobStatus,
  Result,
} from "@/models/socket-content";
import {
  imagePostChatService,
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
  // Images picked via "Use Content", in carousel order. More than one means a carousel post.
  selectedContentImages: string[];
  onToggleContentImage: (item: JobData, imageUrl: string) => void;

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

const getBackendApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!NEXT_PUBLIC_API_ORIGIN) return `/api${normalizedPath}`;

  return new URL(`/api${normalizedPath}`, NEXT_PUBLIC_API_ORIGIN).toString();
};

const pickPreferredAiModel = (models: AiModelRes[], isFreeUser: boolean) =>
  (isFreeUser ? pickFreeUserAiModel(models) : null) ||
  pickDefaultAiModel(models);

/** Free users keep a history model they may use; otherwise they fall back to their default free model. */
const pickHistoryAiModel = (
  models: AiModelRes[],
  modelFromHistory: AiModelRes | undefined,
  isFreeUser: boolean
) =>
  isFreeUser && !isFreeUserAllowedAiModel(modelFromHistory)
    ? pickFreeUserAiModel(models) || modelFromHistory
    : modelFromHistory;

const notLoadingJobStatus: JobStatus[] = ["done", "error"];
const notLoadingJobStages: JobStage[] = ["done", "error"];

const sleep = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const REALTIME_IMAGE_ITEM_HYDRATION_ATTEMPTS = 5;
const REALTIME_IMAGE_ITEM_HYDRATION_INTERVAL_MS = 1500;

function formatCurrentTimeInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  now.setSeconds(0, 0);

  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

// The backend rejects a publishAt in the past, so background draft edits get
// the same "next minute" adjustment as draft creation.
function resolveSchedulerDraftDateTime(date: string, time: string) {
  const scheduledAt = new Date(`${date}T${time}`);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return getNextSchedulableDate().toISOString();
  }
  return scheduledAt.toISOString();
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
  /** Item IDs parallel to imageUrls, sent once the result is saved. */
  imageItemIds?: number[] | null;
};

type RealtimeImageUpscaleData = {
  chatSessionId: number;
  generatedImagePostItemId: number;
  upscaleStatus: string;
  upscaledImageUrl: string | null;
};

const IMAGE_UPSCALE_EVENT_TYPE = "generative_content.chat.image_upscale";

const isGridResult = (result?: Result | null) => (result?.gridSize ?? 1) > 1;

/** Item ID of a result image, matched on the original or the upscaled URL. */
function findResultImageItemId(result: Result | null | undefined, imageUrl?: string | null) {
  if (!result || !imageUrl) return undefined;
  let index = result.images.indexOf(imageUrl);
  if (index < 0) index = result.upscaledImages?.indexOf(imageUrl) ?? -1;
  return index >= 0 ? result.imageItemIds?.[index] : undefined;
}

/** Latest finished result of a chat session: the bubble the backend replies to when none is picked. */
function findLatestChatResult(groups: GetAllJob[], chatSessionId: number) {
  const jobs = groups
    .flatMap((group) => group.jobs)
    .filter(
      (job) =>
        job.input.chatSessionId === chatSessionId &&
        job.status === "done" &&
        Boolean(job.result?.images?.length)
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  return jobs[0]?.result || null;
}

const isFinalUpscaleStatus = (status?: string | null) =>
  status === "success" || status === "failed";

/** Merges a refetched result into the current one without undoing upscale events received meanwhile. */
function mergeHydratedResult(current: Result, hydrated: Result): Result {
  const sameImages = hydrated.images.length === current.images.length;
  return {
    ...current,
    imageItemIds: hydrated.imageItemIds,
    gridSize: hydrated.gridSize ?? current.gridSize,
    upscaledImages: sameImages
      ? current.images.map(
          (_, index) =>
            current.upscaledImages?.[index] || hydrated.upscaledImages?.[index] || null
        )
      : current.upscaledImages,
    upscaleStatuses: sameImages
      ? current.images.map((_, index) => {
          const currentStatus = current.upscaleStatuses?.[index] ?? null;
          return isFinalUpscaleStatus(currentStatus)
            ? currentStatus
            : hydrated.upscaleStatuses?.[index] ?? currentStatus;
        })
      : current.upscaleStatuses,
  };
}

/**
 * A full chat snapshot merged over a job already in history. The snapshot wins, except that item ids
 * missing from it are kept and an upscale an event already finished is not rolled back to pending by
 * a snapshot requested before that event.
 */
function mergeRestoredResult(existing: Result, restored: Result): Result {
  const imageItemIds = restored.imageItemIds?.length
    ? restored.imageItemIds
    : existing.imageItemIds;
  const sameImages =
    restored.images.length === existing.images.length &&
    restored.images.every((image, index) => image === existing.images[index]);
  if (!sameImages) return { ...restored, imageItemIds };

  const upscale = mergeHydratedResult(existing, restored);
  return {
    ...restored,
    imageItemIds,
    upscaledImages: upscale.upscaledImages,
    upscaleStatuses: upscale.upscaleStatuses,
  };
}

/** Applies a tile upscale event to the job holding that item. Original URLs stay the image identity. */
function applyImageUpscaleToHistories(groups: GetAllJob[], payload: RealtimeImageUpscaleData) {
  let changed = false;
  const nextGroups = groups.map((group) => {
    let groupChanged = false;
    const jobs = group.jobs.map((job) => {
      const result = job.result;
      const index = result?.imageItemIds?.indexOf(payload.generatedImagePostItemId) ?? -1;
      if (!result || index < 0) return job;

      const upscaledImages = result.images.map((_, i) => result.upscaledImages?.[i] ?? null);
      const upscaleStatuses = result.images.map((_, i) => result.upscaleStatuses?.[i] ?? null);
      upscaleStatuses[index] = payload.upscaleStatus;
      if (payload.upscaledImageUrl) {
        upscaledImages[index] = payload.upscaledImageUrl;
      }
      groupChanged = true;
      return { ...job, result: { ...result, upscaledImages, upscaleStatuses } };
    });
    if (!groupChanged) return group;
    changed = true;
    return { ...group, jobs };
  });
  return changed ? nextGroups : groups;
}

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

/** Tiles per side of a grid bubble, derived from the highest tile position (a failed tile upload may be missing). */
function getBubbleGridSize(
  bubble?: ImagePostChatRes["bubbles"][number] | null
) {
  const positions = (bubble?.images || [])
    .map((item) => item.gridPosition)
    .filter((position): position is number => typeof position === "number");
  if (!positions.length) return undefined;
  return Math.max(2, Math.ceil(Math.sqrt(Math.max(...positions) + 1)));
}

// The backend keeps the tile a follow-up iterated on only in the job payload, not on the bubble, so
// a reloaded chat cannot tell which tile of a replied grid was used. The tile is remembered here per
// user bubble; without it the replied grid shows no reference instead of every tile.
const GRID_REPLY_TILE_STORAGE_KEY = "content-generate:grid-reply-tiles";
const GRID_REPLY_TILE_LIMIT = 200;

function readGridReplyTiles(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(GRID_REPLY_TILE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function rememberGridReplyTile(userBubbleId: number, imageUrl: string) {
  try {
    const entries = Object.entries(readGridReplyTiles()).filter(
      ([id]) => id !== String(userBubbleId)
    );
    entries.push([String(userBubbleId), imageUrl]);
    window.localStorage.setItem(
      GRID_REPLY_TILE_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(entries.slice(-GRID_REPLY_TILE_LIMIT)))
    );
  } catch {
    // Storage unavailable: a reload then shows no reference for this follow-up.
  }
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
  const gridReplyTiles = readGridReplyTiles();

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
    // A replied grid holds every tile, but the follow-up used only one of them.
    const replyReferenceImages =
      getBubbleGridSize(replyBubble) !== undefined
        ? uniqueImageUrls([gridReplyTiles[String(userBubble.id)]])
        : getBubbleImageUrls(replyBubble);
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
    const firstPromptAdditionalImages = productImage ? [] : userPromptImages;
    const resultBubbleImages = (systemBubble?.images || []).filter((item) =>
      Boolean(item.imageUrl)
    );
    const resultImages = resultBubbleImages.map((item) => item.imageUrl);
    const resultUpscaledImages = resultBubbleImages.map(
      (item) => item.upscaledImageUrl || null
    );
    const resultUpscaleStatuses = resultBubbleImages.map(
      (item) => item.upscaleStatus || null
    );
    const resultGridSize = getBubbleGridSize(systemBubble);
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
            gridSize: resultGridSize,
            upscaledImages: resultUpscaledImages,
            upscaleStatuses: resultUpscaleStatuses,
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
  prompt,
}: {
  /** Localized first-generation prompt (`contentGenerateScheduler.firstGeneratePrompt`). */
  prompt: string;
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
      prompt,
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
  // Realtime handlers read the model list through a ref so they stay stable.
  const aiModelsListRef = useRef<AiModelRes[]>([]);
  useEffect(() => {
    aiModelsListRef.current = aiModelsRes?.data?.data || [];
  }, [aiModelsRes]);
  const getModelGridSize = useCallback((modelName?: string | null) => {
    const model = aiModelsListRef.current.find(
      (item) => item.name === modelName || String(item.id) === String(modelName)
    );
    return isGridAiModel(model) ? model?.gridSize : undefined;
  }, []);
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
              job.status !== "error" && String(job.rootBusinessId) === String(businessId)
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
  const [selectedContentImages, setSelectedContentImages] = useState<string[]>(
    []
  );
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
    () => pickFreeUserAiModel(aiModelsRes?.data?.data || []),
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
      const effectiveModel = pickHistoryAiModel(
        aiModelsRes?.data?.data || [],
        modelFromHistory,
        isFreeUser
      );
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
      setSelectedContentImages(activeImageUrl ? [activeImageUrl] : []);
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
      setSelectedContentImages([]);
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
      const effectiveModel = pickHistoryAiModel(
        aiModelsRes?.data?.data || [],
        modelFromHistory,
        isFreeUser
      );
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
        referenceImageName: options?.attachForEdit ? SELECTED_IMAGE_REFERENCE_NAME : "",
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

  // A single selection follows the primary image (e.g. a new result becomes the
  // used content). A carousel selection survives new generations and edits;
  // only onSelectHistory (history pick / reset form) clears it.
  useEffect(() => {
    setSelectedContentImages((current) => {
      if (current.length > 1) return current;
      return selectedGeneratedImageUrl ? [selectedGeneratedImageUrl] : [];
    });
  }, [selectedGeneratedImageUrl]);

  const onToggleContentImage = useCallback(
    (item: JobData, imageUrl: string) => {
      if (!selectedContentImages.includes(imageUrl)) {
        if (selectedContentImages.length === 0) {
          onSelectGeneratedImage(item, imageUrl);
          return;
        }
        if (selectedContentImages.length >= MAX_CAROUSEL_IMAGES) return;
        setSelectedContentImages([...selectedContentImages, imageUrl]);
        return;
      }

      // Keep at least one image selected.
      if (selectedContentImages.length === 1) return;

      const remainingImages = selectedContentImages.filter(
        (selectedUrl) => selectedUrl !== imageUrl
      );
      setSelectedContentImages(remainingImages);
      // The primary can sit outside a carousel selection after a new result;
      // re-anchor it once it no longer matches what the preview shows.
      const isPrimaryKept =
        !!selectedGeneratedImageUrl &&
        remainingImages.includes(selectedGeneratedImageUrl);
      if (
        isPrimaryKept ||
        (remainingImages.length > 1 && imageUrl !== selectedGeneratedImageUrl)
      ) {
        return;
      }

      const nextPrimaryUrl = remainingImages[0];
      const nextPrimaryJob = histories
        .flatMap((group) => group.jobs)
        .find((job) => job.result?.images?.includes(nextPrimaryUrl));
      if (nextPrimaryJob) {
        onSelectGeneratedImage(nextPrimaryJob, nextPrimaryUrl);
      } else {
        setSelectedGeneratedImageUrl(nextPrimaryUrl);
      }
    },
    [
      histories,
      onSelectGeneratedImage,
      selectedContentImages,
      selectedGeneratedImageUrl,
    ]
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
  // Mirror of isRestoringSchedulerChat for effects that must not re-run when
  // it changes (re-running would re-enable the loader after a restore ends).
  const isRestoringSchedulerChatRef = useRef(false);
  useEffect(() => {
    isRestoringSchedulerChatRef.current = isRestoringSchedulerChat;
  }, [isRestoringSchedulerChat]);
  // Route key of the scheduler-chat restore that was started; the restore
  // runs once per key, and only that run may clear the loader.
  const schedulerRestoreKeyRef = useRef<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!shouldRestoreSchedulerChat) {
      if (isRestoringSchedulerChatRef.current) {
        setLoadingState(false);
      }
      isRestoringSchedulerChatRef.current = false;
      setIsRestoringSchedulerChat(false);
      setSchedulerDraftPost(null);
      setSchedulerChatSeed(null);
      syncedSchedulerImageRef.current = null;
      return;
    }

    setMode("regenerate");
    setTab("knowledge");
    setSchedulerDraftPost({
      id: Number(routeScheduledPostId),
      chatSessionId: Number(routeChatSessionId),
    });
    // Show the loader before paint only when this route still needs a
    // restore; the restore effect below clears it on every exit path.
    const restoreKeyPrefix = `${routeScheduledPostId}|${routeChatSessionId}|`;
    if (
      lastAppliedHistoryRouteKeyRef.current?.startsWith(restoreKeyPrefix) ||
      schedulerRestoreKeyRef.current?.startsWith(restoreKeyPrefix)
    ) {
      return;
    }
    setLoadingState(true);
    isRestoringSchedulerChatRef.current = true;
    setIsRestoringSchedulerChat(true);
  }, [
    routeChatSessionId,
    routeScheduledPostId,
    shouldRestoreSchedulerChat,
  ]);

  // Latest values read by the scheduler-chat restore when its request
  // resolves; kept in a ref so the restore effect doesn't re-run (and cancel
  // the in-flight restore) every time histories/form change.
  const schedulerRestoreInputsRef = useRef({
    histories,
    formBasic,
    productImageById,
  });
  useEffect(() => {
    schedulerRestoreInputsRef.current = {
      histories,
      formBasic,
      productImageById,
    };
  }, [formBasic, histories, productImageById]);

  useEffect(() => {
    if (!routeChatSessionId || !routeScheduledPostId) {
      schedulerRestoreKeyRef.current = null;
      return;
    }
    const selectedHistoryImage = searchParams.get("selectedHistoryImage");
    const scheduleDate = searchParams.get("scheduleDate");
    const routeKey = `${routeScheduledPostId}|${routeChatSessionId}|${selectedHistoryImage || ""}`;

    const finishRestore = () => {
      if (isRestoringSchedulerChatRef.current) {
        setLoadingState(false);
      }
      isRestoringSchedulerChatRef.current = false;
      setIsRestoringSchedulerChat(false);
    };

    if (lastAppliedHistoryRouteKeyRef.current === routeKey) {
      schedulerRestoreKeyRef.current = routeKey;
      finishRestore();
      return;
    }

    // Run the restore once per route key; a re-run of this effect for the
    // same key must neither restart nor cancel the in-flight restore.
    if (schedulerRestoreKeyRef.current === routeKey) return;
    schedulerRestoreKeyRef.current = routeKey;
    const isActive = () => schedulerRestoreKeyRef.current === routeKey;

    setMode("regenerate");
    setTab("knowledge");
    setLoadingState(true);
    isRestoringSchedulerChatRef.current = true;
    setIsRestoringSchedulerChat(true);
    setSchedulerDraftPost({
      id: Number(routeScheduledPostId),
      chatSessionId: Number(routeChatSessionId),
    });

    const applyFallbackRestore = () => {
      if (!isActive() || !selectedHistoryImage) return;

      const { formBasic: restoreFormBasic, productImageById: restoreProductImageById } =
        schedulerRestoreInputsRef.current;
      const productKnowledgeId = routeBusinessProductId || "";
      const routeDraftMarker = getSchedulerDraftMarkers(businessId).find(
        (marker) => marker.draftId === String(routeScheduledPostId)
      );
      const originalProductImage =
        (productKnowledgeId
          ? restoreProductImageById.get(String(productKnowledgeId))
          : "") || "";
      const fallbackProductImage =
        routeDraftMarker?.productImage ||
        originalProductImage ||
        restoreFormBasic.productImage;
      const fallbackReferenceImage =
        routeDraftMarker?.referenceImage || restoreFormBasic.referenceImage;
      const restoredCaption = routeDraftMarker?.caption || restoreFormBasic.caption;
      const restoredSeed = {
        productImage: fallbackProductImage || null,
        referenceImage: fallbackReferenceImage || null,
        avatarImages: routeDraftMarker?.avatarImages || [],
        productKnowledgeId: productKnowledgeId || null,
      };
      const fallbackJob = buildSchedulerFallbackChatJob({
        prompt: t("contentGenerateScheduler.firstGeneratePrompt"),
        scheduledPostId: routeScheduledPostId,
        businessId,
        chatSessionId: Number(routeChatSessionId),
        productKnowledgeId,
        imageUrl: selectedHistoryImage,
        productImage: fallbackProductImage,
        referenceImage: fallbackReferenceImage,
        avatarImages: routeDraftMarker?.avatarImages || [],
        model: restoreFormBasic.model,
        ratio: restoreFormBasic.ratio,
        imageSize: restoreFormBasic.imageSize,
        productName: restoreFormBasic.productName,
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
    };

    refetchRouteChat().then((result) => {
      if (!isActive()) return;
      // refetch() resolves (does not throw) on request errors.
      if (result.isError) {
        applyFallbackRestore();
        return;
      }

      const {
        histories: restoreHistories,
        formBasic: restoreFormBasic,
        productImageById: restoreProductImageById,
      } = schedulerRestoreInputsRef.current;
      const productKnowledgeId = routeBusinessProductId || "";
      const routeDraftMarker = getSchedulerDraftMarkers(businessId).find(
        (marker) => marker.draftId === String(routeScheduledPostId)
      );
      const originalProductImage =
        (productKnowledgeId
          ? restoreProductImageById.get(String(productKnowledgeId))
          : "") || "";
      const chat = result.data?.data?.data;
      if (!chat && !selectedHistoryImage) return;
      const existingThreadJobs = restoreHistories
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
        restoreFormBasic.referenceImage;
      const seedProductImage =
        originalProductImage ||
        routeDraftMarker?.productImage ||
        seedJob?.product?.images?.[0] ||
        selectedHistoryImage ||
        restoreFormBasic.productImage;
      const restoredCaption = routeDraftMarker?.caption || restoreFormBasic.caption;
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
            model: restoreFormBasic.model,
            ratio: restoreFormBasic.ratio,
            imageSize: restoreFormBasic.imageSize,
            productName: restoreFormBasic.productName,
            productImage: seedProductImage,
            referenceImage: seedReferenceImage,
            avatarImages: routeDraftMarker?.avatarImages || [],
            caption: restoredCaption,
          })
        : [
            buildSchedulerFallbackChatJob({
              prompt: t("contentGenerateScheduler.firstGeneratePrompt"),
              scheduledPostId: routeScheduledPostId,
              businessId,
              chatSessionId: Number(routeChatSessionId),
              productKnowledgeId,
              imageUrl: selectedHistoryImage || "",
              productImage: seedProductImage,
              referenceImage: seedReferenceImage,
              avatarImages: routeDraftMarker?.avatarImages || [],
              model: restoreFormBasic.model,
              ratio: restoreFormBasic.ratio,
              imageSize: restoreFormBasic.imageSize,
              productName: restoreFormBasic.productName,
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
              ? mergeRestoredResult(existingJob.result, job.result)
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
      applyFallbackRestore();
    }).finally(() => {
      // Clears the loader on every exit path (including early returns) of
      // the restore that is still current for this route.
      if (!isActive()) return;
      finishRestore();
    });
  }, [
    businessId,
    refetchRouteChat,
    routeBusinessProductId,
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

  // The provider outlives the page (it sits in the locale layout), so leaving the generator route
  // resets the selection here. Done on the route change rather than on page unmount, which Strict
  // Mode simulates and which would cancel an in-flight draft-chat restore.
  const onSelectHistoryRef = useRef(onSelectHistory);
  useEffect(() => {
    onSelectHistoryRef.current = onSelectHistory;
  }, [onSelectHistory]);
  const wasContentGenerateRouteRef = useRef(isContentGenerateRoute);
  useEffect(() => {
    if (wasContentGenerateRouteRef.current && !isContentGenerateRoute) {
      onSelectHistoryRef.current(null);
    }
    wasContentGenerateRouteRef.current = isContentGenerateRoute;
  }, [isContentGenerateRoute]);

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

    fetch(getBackendApiUrl(`/creator/library?${params.toString()}`), {
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

  const savedApiQuery = useMemo(() => {
    return {
      ...savedQuery,
      limit: 999,
      page: 1,
    };
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

    const start = 0;
    const end = page * limit;
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

  // Apply client-side pagination
  const { paginatedData: filteredSavedData, pagination: adjustedSavedPagination } = useMemo(() => {
    const limit = savedQuery.limit || 10;
    const page = savedQuery.page || 1;
    const total = allFilteredSavedData.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    
    // Slice data for current page from 0 to accumulate for infinite scroll
    const start = 0;
    const end = page * limit;
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
  }, [
    allFilteredSavedData,
    savedQuery.limit,
    savedQuery.page,
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
    // Klik referensi yang sudah terpilih = unselect
    if (form.basic.referenceImage === imageUrl) {
      form.setBasic({
        ...form.basic,
        referenceImage: null,
        referenceImageName: null,
        referenceImagePublisher: null,
      });
      setSelectedTemplate(null);
      return;
    }

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
    // Sending a message starts a PAID generation, so only retry when the
    // server explicitly said the chat isn't ready yet (404/425). A 409 or any
    // other status is final. Without a status (network error/timeout) the
    // request may still have reached the server: check the chat first and only
    // resend when our user bubble isn't there.
    let lastError: unknown;
    const sendStartedAt = Date.now();
    const sentPrompt = (formData.prompt || "").trim();
    // Bubbles already shown before this send can't be the one we just sent.
    const knownJobIds = new Set(
      histories.flatMap((group) => group.jobs.map((job) => job.id))
    );

    const findDeliveredMessage = async () => {
      const chatRes = await imagePostChatService.getChatById(
        businessId,
        chatSessionId
      );
      const bubbles = chatRes.data?.data?.bubbles || [];
      const userBubbles = bubbles.filter((bubble) => bubble.role === "user");
      const latestUserBubble = userBubbles[userBubbles.length - 1];
      if (!latestUserBubble) return null;

      const createdAt = new Date(latestUserBubble.createdAt).getTime();
      const isRecent =
        Number.isNaN(createdAt) || createdAt >= sendStartedAt - 5 * 60 * 1000;
      const isSamePrompt =
        (latestUserBubble.prompt || "").trim() === sentPrompt;
      const isSameReply =
        !formData.bubbleChatId ||
        latestUserBubble.replyToBubbleId == null ||
        Number(latestUserBubble.replyToBubbleId) ===
          Number(formData.bubbleChatId);
      const isNewBubble = !knownJobIds.has(`chat-${latestUserBubble.id}`);
      if (!isRecent || !isSamePrompt || !isSameReply || !isNewBubble) {
        return null;
      }

      const systemBubble =
        bubbles.find(
          (bubble) =>
            bubble.role === "system" &&
            bubble.replyToBubbleId === latestUserBubble.id
        ) || null;
      return {
        data: {
          data: {
            userBubble: latestUserBubble,
            systemBubble,
            processState: "processing",
          },
        },
      } as Awaited<ReturnType<typeof mSendImageChatMessage.mutateAsync>>;
    };

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

        if (status === 404 || status === 425) {
          continue;
        }
        if (status) {
          break;
        }

        // No status: find out whether the message was actually received.
        let delivered: Awaited<ReturnType<typeof findDeliveredMessage>>;
        try {
          delivered = await findDeliveredMessage();
        } catch {
          // Can't verify -> don't risk a second charge.
          break;
        }
        if (delivered) {
          return delivered;
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

    let scheduledAt: Date;
    if (scheduleDate) {
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      if (Number.isNaN(scheduledAt.getTime())) {
        showToast("error", t("contentGenerateScheduler.scheduleTimePassed"));
        return true;
      }
    } else {
      scheduledAt = new Date();
    }
    
    const currentDate = new Date();
    if (scheduledAt <= currentDate) {
      currentDate.setMinutes(currentDate.getMinutes() + 1);
      currentDate.setSeconds(0, 0);
      scheduledAt = currentDate;
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
            dateTime: scheduledAt.toISOString(),
            status: "draft",
            withChatAI: true,
            shareAsReference: true,
            businessProductId: form.basic.productKnowledgeId,
          },
        })
      ).data.data;

    const chatSessionId = draft.chatSessionId;
    if (!chatSessionId) {
      showToast("error", t("contentGenerateScheduler.chatSessionUnavailable"));
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
      (isFirstSchedulerBubble ? t("contentGenerateScheduler.firstGeneratePrompt") : "");
    const firstRss =
      isFirstSchedulerBubble && effMode === "rss" ? form.rss : null;
    // The image attached for editing is what the composer shows, so it decides the reply. The
    // selected job can move on without it (a running job's realtime progress selects that job), so
    // the replied bubble is the job that owns the attached image.
    const attachedEditImage =
      form.basic.referenceImageName === SELECTED_IMAGE_REFERENCE_NAME
        ? form.basic.referenceImage || selectedGeneratedImageUrl || null
        : null;
    const replyJob = attachedEditImage
      ? histories
          .flatMap((group) => group.jobs)
          .find(
            (job) =>
              job.input.chatSessionId === chatSessionId &&
              (job.result?.images?.includes(attachedEditImage) ||
                job.result?.upscaledImages?.includes(attachedEditImage))
          ) || selectedHistory
      : null;
    const selectedSystemBubbleId =
      typeof replyJob?.input?.systemBubbleId === "number"
        ? replyJob.input.systemBubbleId
        : undefined;
    const replyBubbleChatId =
      selectedSystemBubbleId && Number.isFinite(selectedSystemBubbleId)
        ? selectedSystemBubbleId
        : undefined;
    const selectedReplyReferenceImage = replyBubbleChatId ? attachedEditImage : null;
    const replyImageItemId = replyBubbleChatId
      ? findResultImageItemId(replyJob?.result, selectedReplyReferenceImage)
      : undefined;
    // A follow-up to a grid result must name the tile to iterate on. Without an explicit reply the
    // backend answers the latest result, so that one is checked too.
    if (!isFirstSchedulerBubble) {
      const replyResult = replyBubbleChatId
        ? replyJob?.result
        : findLatestChatResult(histories, chatSessionId);
      if (isGridResult(replyResult) && !replyImageItemId) {
        showToast("error", t("contentGenerateScheduler.gridTileRequired"));
        return true;
      }
    }
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
      date: scheduleDate || "",
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
      generatedImagePostItemId: replyImageItemId,
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
                  t("contentGenerateScheduler.imageChatNotReady")
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
    if (replyImageItemId && selectedReplyReferenceImage) {
      rememberGridReplyTile(userBubble.id, selectedReplyReferenceImage);
    }
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
      date: scheduleDate || "",
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
          dateTime: scheduledAt.toISOString(),
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
      await submitSchedulerChatGenerate(
        effMode,
        overrides?.additionalImages || [],
        {
          model: effectiveModel,
          ratio: effectiveRatio,
          imageSize: effectiveImageSize,
        }
      );
    } catch (error) {
      console.error(error);
      showToast("error", t("toast.contentGeneration.failed"));
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

  const generationHapticKeysRef = useRef(new Set<string>());

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
          progressStep: payload.progressStep || fallbackJob.progressStep,
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
                imageItemIds: payload.imageItemIds?.length
                  ? payload.imageItemIds
                  : fallbackJob.result?.imageItemIds,
                gridSize:
                  fallbackJob.result?.gridSize ??
                  (resultImages.length > 1
                    ? getModelGridSize(fallbackJob.input.model)
                    : undefined),
                upscaledImages: fallbackJob.result?.upscaledImages,
                upscaleStatuses: fallbackJob.result?.upscaleStatuses,
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

      // Grid results are refetched too, to load the tile upscale statuses.
      const needsImageItemIdHydration = Boolean(
        nextResolvedJob.status === "done" &&
          latestImage &&
          (!nextResolvedJob.result?.imageItemIds?.length ||
            isGridResult(nextResolvedJob.result))
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
                    setHistories((prev) => {
                      // Upscale events may have updated the job since this refetch started.
                      const currentJob =
                        prev
                          .flatMap((group) => group.jobs)
                          .find((job) => job.id === nextResolvedJob.id) ||
                        nextResolvedJob;
                      return upsertJobIntoHistory(prev, {
                        ...currentJob,
                        input: {
                          ...currentJob.input,
                          systemBubbleId:
                            hydratedSystemBubbleId ??
                            currentJob.input.systemBubbleId ??
                            null,
                        },
                        result: currentJob.result
                          ? mergeHydratedResult(currentJob.result, hydratedResult)
                          : hydratedResult,
                      });
                    });
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
            dateTime: resolveSchedulerDraftDateTime(
              scheduleDateParam,
              scheduleTimeParam || formatCurrentTimeInput()
            ),
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
      getModelGridSize,
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
      if (message.type === IMAGE_UPSCALE_EVENT_TYPE) {
        const upscale = message.data as RealtimeImageUpscaleData | undefined;
        if (upscale && Number.isFinite(upscale.generatedImagePostItemId)) {
          setHistories((prev) => applyImageUpscaleToHistories(prev, upscale));
        }
        return;
      }
      if (message.type !== "generative_content.chat.progress") return;

      const payload = message.data as
        | RealtimeGenerativeChatProgressData
        | undefined;
      if (!payload) return;

      // Getaran halus saat generate selesai (berhasil/gagal), sekali per job.
      if (payload.processState === "success" || payload.processState === "failed") {
        const hapticKey = `${payload.userBubbleId}:${payload.processState}`;
        if (!generationHapticKeysRef.current.has(hapticKey)) {
          generationHapticKeysRef.current.add(hapticKey);
          haptic(payload.processState === "success" ? "success" : "error");
        }
      }

      applyRealtimeChatProgressRef.current(payload);
    };

    socket.on("open", handleOpen);
    socket.on("close", handleClose);
    socket.on("message", handleMessage);

    return () => {
      socket.off("open", handleOpen);
      socket.off("close", handleClose);
      socket.off("message", handleMessage);
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

    // Guards async interval callbacks of this effect run: a response that
    // arrives after the selection/deps changed must not override newer state.
    let isActive = true;

    const isSchedulerChatJob = selectedHistory.id.startsWith("chat-");
    if (isSchedulerChatJob) {
      const activeSchedulerDraftPost = schedulerDraftPost;
      const activeChatSessionId =
        activeRealtimeChatSessionId || activeSchedulerDraftPost?.chatSessionId;
      if (!activeSchedulerDraftPost || activeChatSessionId == null) return;

      // With a live socket the realtime events drive progress; keep a slow
      // fallback poll anyway so a missed event can't leave the job stuck.
      const pollIntervalMs =
        isConnected && activeRealtimeChatSessionId ? 20000 : 5000;

      const intervalId = window.setInterval(async () => {
        const result = await refetchSchedulerChat().catch(() => null);
        if (!isActive || !result) return;

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
                ? mergeRestoredResult(existingJob.result, job.result)
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
          await mEditScheduledPost
            .mutateAsync({
              businessId,
              idScheduler: activeSchedulerDraftPost.id,
              formData: {
                imageUrl: latestImage,
                caption: persistedCaption,
                platforms: [],
                dateTime: resolveSchedulerDraftDateTime(
                  scheduleDateParam,
                  scheduleTimeParam || formatCurrentTimeInput()
                ),
                status: "draft",
                withChatAI: true,
                shareAsReference: true,
                businessProductId: selectedHistory.input.productKnowledgeId,
                chatSessionId: activeChatSessionId,
              },
            })
            .catch((error) => {
              // Background draft sync; don't leave an unhandled rejection.
              console.error("Failed to sync scheduler draft image:", error);
            });
        }
      }, pollIntervalMs);

      return () => {
        isActive = false;
        window.clearInterval(intervalId);
      };
    }

    const intervalId = window.setInterval(async () => {
      const result = await refetchHistories().catch(() => null);
      if (!isActive || !result) return;
      const refreshedGroups = result.data?.data?.data || [];
      const refreshedJob =
        refreshedGroups
          .flatMap((group) => group.jobs)
          .find((job) => job.id === selectedHistory.id) || null;

      if (!refreshedJob) return;

      setHistories((prev) => upsertJobIntoHistory(prev, refreshedJob));
      setSelectedGeneratedImageUrl(refreshedJob.result?.images?.[0] || null);
    }, 5000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
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
        selectedContentImages,
        onToggleContentImage,
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

// For shared components that also render outside the content-generate page.
export const useOptionalContentGenerate = () =>
  useContext(ContentGenerateContext);

export const useContentGenerate = () => {
  const context = useContext(ContentGenerateContext);
  if (!context) {
    throw new Error(
      "useContentGenerate must be used within a CheckoutProvider"
    );
  }
  return context;
};
