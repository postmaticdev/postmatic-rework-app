import { api } from "@/config/api";
import { BaseResponse, FilterQuery } from "@/models/api/base-response.type";
import {
  DeleteContentRes,
  DirectPostContentPld,
  DirectPostContentRes,
  EditContentPld,
  GenerateContentBasicPld as GenerateContentKnowledgePld,
  GenerateContentMaskPld,
  GenerateContentRegeneratePld,
  GenerateContentRssPld,
  ImageContentRes,
  PostedImageRes,
  RepostContentPld,
  SaveContentPld,
  SaveContentRes,
  SetReadyToPostRes,
  PersonalContentPld,
  EnhanceCaptionPld,
  EnhanceCaptionRes,
  ImagePostChatRes,
  ImagePostChatSessionRes,
  SendImageChatMessagePld,
  SendImageChatMessageRes,
} from "@/models/api/content/image.type";
import { AiModelRes } from "@/models/api/content/ai-model";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import {
  AutoSchedulerPld,
  AutoSchedulerRes,
  AutoSchedulerUpserRes,
  QueuePld,
  QueuePostingRes,
  QueueRes,
  TimezoneSettingPld,
  TimezoneSettingRes,
} from "@/models/api/content/scheduler.type";
import {
  AutoGenerateSettingsResponse,
  AutoGeneratePreferenceResponse,
  AutoGenerateScheduleResponse,
  CreateAutoGenerateScheduleRequest,
  UpdateAutoGenerateScheduleRequest,
  AutoGenerateHistoriesResponse,
  AutoGenerateHistoriesQuery,
} from "@/models/api/content/auto-generate";
import { GetAllJob, JobRes } from "@/models/socket-content";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type NewRepetitionItem = {
  id: number;
  day: number;
  time: string;
  businessRootId: number;
  businessProductId: number;
  appGenerativeImageModelId: number;
  modelName: string;
  platforms: string[];
  additionalPrompt: string | null;
  additionalImages: string[];
  createdAt: string;
  updatedAt: string;
};

type NewRepetitionDay = {
  day: number;
  items: NewRepetitionItem[];
};

type NewScheduledPost = {
  id: number;
  businessRootId: number;
  businessProductId?: number | null;
  publishAt: string;
  status: string;
  caption: string | null;
  imageUrl: string | null;
  withChatAI?: boolean;
  chatSessionId?: number | null;
  platforms: string[];
  createdAt: string;
  updatedAt: string;
};

type NewImagePost = {
  id: number;
  status: string;
  errorLog: string | null;
  businessRootId: number;
  businessProductId: number;
  recordedModelName: string;
  mode: string;
  ratio: string;
  additionalPrompt: string | null;
  designStyle: string | null;
  category: string | null;
  referenceImageUrl: string | null;
  imageSize: string | null;
  items: { imageUrl: string; tokenUsed: number }[];
  caption: { captionText: string; tokenUsed: number } | null;
  createdAt: string;
  updatedAt: string;
};

type NewBusinessImageContent = {
  id: number;
  businessRootId: number;
  businessProductId: number | null;
  caption: string | null;
  type: string;
  readyToPost: boolean;
  category: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
};

type NewGenerativeImageModel = {
  id: number;
  model: string;
  label: string;
  image: string | null;
  provider: string;
  isActive: boolean;
  validRatios: string[];
  imageSizes: string[] | null;
  createdAt: string;
  updatedAt: string;
};

type NewImagePostCreateRes = {
  id: number;
  status: string;
  mode: string;
  numOfImages: number;
  createdAt: string;
};

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const emptyAdvancedGenerate = {
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

const formatPublishAt = (dateTime: string) => {
  const date = new Date(dateTime);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const mapRepetitionToAutoScheduler = (
  businessId: string,
  days: NewRepetitionDay[]
): AutoSchedulerRes => ({
  id: Number(businessId),
  isAutoPosting: days.some((day) => day.items.length > 0),
  rootBusinessId: businessId,
  schedulerAutoPostings: days.map((day) => ({
    dayId: day.day,
    day: dayNames[day.day] || String(day.day),
    isActive: day.items.length > 0,
    schedulerAutoPostingTimes: day.items.map((item) => ({
      hhmm: item.time,
      platforms: item.platforms as PlatformEnum[],
    })),
  })),
});

const mapRepetitionToAutoGenerateSettings = (
  days: NewRepetitionDay[]
): AutoGenerateSettingsResponse["data"] => ({
  preference: { isActive: days.some((day) => day.items.length > 0) },
  schedules: days.map((day) => ({
    day: day.day,
    schedules: day.items.map((item) => ({
      id: String(item.id),
      isActive: true,
      day: item.day,
      time: item.time,
      platforms: item.platforms as PlatformEnum[],
      model: item.modelName,
      designStyle: "",
      ratio: "1:1",
      referenceImages: item.additionalImages || [],
      category: "",
      additionalPrompt: item.additionalPrompt,
      productKnowledgeId: String(item.businessProductId),
      rootBusinessId: String(item.businessRootId),
      advBusinessName: false,
      advBusinessCategory: false,
      advBusinessDescription: false,
      advBusinessLocation: false,
      advBusinessLogo: false,
      advBusinessUniqueSellingPoint: false,
      advBusinessWebsite: false,
      advBusinessVisionMission: false,
      advBusinessColorTone: false,
      advProductName: false,
      advProductCategory: false,
      advProductDescription: false,
      advProductPrice: false,
      advRoleHashtags: false,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  })),
});

const mapScheduledToQueue = (item: NewScheduledPost): QueueRes => ({
  id: item.id,
  date: item.publishAt,
  platforms: item.platforms,
  rootBusinessId: String(item.businessRootId),
  generatedImageContentId: item.imageUrl || String(item.id),
  imageUrl: item.imageUrl,
  status: item.status,
  chatSessionId: item.chatSessionId ?? null,
});

const mapImagePostStatus = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "success") {
    return { status: "done" as const, stage: "done" as const, progress: 100 };
  }

  if (normalizedStatus === "failed" || normalizedStatus === "error") {
    return { status: "error" as const, stage: "error" as const, progress: 100 };
  }

  if (normalizedStatus === "pending") {
    return {
      status: "processing" as const,
      stage: "processing" as const,
      progress: 10,
    };
  }

  return { status: "queued" as const, stage: "queued" as const, progress: 0 };
};

const mapImagePostMode = (mode: string) => {
  if (mode === "regenerate" || mode === "mask" || mode === "rss") {
    return mode;
  }

  return "knowledge";
};

const mapImagePostToJobGroup = (post: NewImagePost): GetAllJob => {
  const images = post.items.map((item) => item.imageUrl);
  const caption = post.caption?.captionText || "";
  const mappedStatus = mapImagePostStatus(post.status);

  return {
    productKnowledgeId: String(post.businessProductId),
    latestUpdate: post.updatedAt,
    latestImage: images[0] || "",
    name: "",
    jobs: [
      {
        id: String(post.id),
        type: mapImagePostMode(post.mode),
        rootBusinessId: String(post.businessRootId),
        status: mappedStatus.status,
        stage: mappedStatus.stage,
        progress: mappedStatus.progress,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        input: {
          rss: null,
          ratio: post.ratio as never,
          prompt: post.additionalPrompt,
          caption,
          category: post.category || "",
          designStyle: post.designStyle || "",
          referenceImage: post.referenceImageUrl,
          advancedGenerate: emptyAdvancedGenerate,
          productKnowledgeId: String(post.businessProductId),
          model: post.recordedModelName,
          imageSize: post.imageSize,
        },
        error: post.errorLog
          ? { message: post.errorLog, stack: null, attempt: 1 }
          : null,
        product: {
          name: "",
          description: "",
          category: "",
          currency: "IDR",
          price: 0,
          images,
        },
        result: {
          images,
          ratio: post.ratio as never,
          category: post.category || "",
          designStyle: post.designStyle || "",
          caption,
          referenceImages: post.referenceImageUrl ? [post.referenceImageUrl] : [],
          productKnowledgeId: String(post.businessProductId),
          tokenUsed:
            (post.items || []).reduce((sum, item) => sum + item.tokenUsed, 0) +
            (post.caption?.tokenUsed || 0),
        },
      },
    ],
  };
};

const mapBusinessImageContent = (
  item: NewBusinessImageContent
): ImageContentRes => ({
  id: String(item.id),
  images: item.imageUrls || [],
  ratio: "1:1",
  category: item.category || "",
  designStyle: "",
  caption: item.caption || "",
  readyToPost: item.readyToPost,
  productKnowledgeId: item.businessProductId ? String(item.businessProductId) : "",
  rootBusinessId: String(item.businessRootId),
  deletedAt: "",
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  postedImageContents: [],
  platforms: [],
});

const toBusinessImagePayload = (
  formData: Partial<SaveContentPld & EditContentPld> & {
    readyToPost?: boolean;
    type?: string;
  }
) => ({
  type: formData.type || "personal",
  imageUrls: formData.images || [],
  caption: formData.caption || "",
  category: formData.category || "",
  readyToPost: formData.readyToPost ?? false,
});

const mapAiModel = (model: NewGenerativeImageModel): AiModelRes => ({
  id: String(model.id),
  name: model.model,
  label: model.label,
  description: model.label,
  provider: model.provider,
  image: model.image,
  isActive: model.isActive,
  validRatios: Array.isArray(model.validRatios) ? model.validRatios : [],
  imageSizes: Array.isArray(model.imageSizes) ? model.imageSizes : [],
});

const mapImagePostCreateToJob = (post: NewImagePostCreateRes): JobRes => ({
  jobId: String(post.id),
});

const resolveImageModelId = async (model: string) => {
  const directId = Number(model);
  if (Number.isFinite(directId) && directId > 0) return directId;

  const res = await api.get<BaseResponse<NewGenerativeImageModel>>(
    `/app/generative-image-model/${encodeURIComponent(model)}/model`
  );
  return res.data.data.id;
};

const toImagePostPayload = async (
  mode: "generate" | "regenerate" | "mask",
  formData:
    | GenerateContentKnowledgePld
    | GenerateContentRssPld
    | GenerateContentRegeneratePld
    | GenerateContentMaskPld
) => {
  const modelId = await resolveImageModelId(formData.model);
  const data = formData as GenerateContentKnowledgePld &
    Partial<GenerateContentRssPld & GenerateContentRegeneratePld & GenerateContentMaskPld>;

  return {
    mode,
    ratio: data.ratio,
    productKnowledgeId: Number(data.productKnowledgeId),
    appGenerativeImageModelId: modelId,
    numOfImages: 1,
    additionalPrompt: data.prompt || "",
    designStyle: data.designStyle || "",
    category: data.category || "",
    referenceImage: data.referenceImage || "",
    maskImage: data.mask || "",
    imageSize: data.imageSize || undefined,
    currentCaption: data.caption || undefined,
    rss: data.rss || undefined,
    advanceGenerate: data.advancedGenerate || undefined,
  };
};

// ============================== DRAFT ==============================

const draftService = {
  getAllDraftImage: (
    businessId: string,
    filterQuery?: Partial<FilterQuery>
  ) => {
    return api
      .get<BaseResponse<NewBusinessImageContent[]>>(
        `/business/image-content/${businessId}`,
        { params: filterQuery }
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data || []).map(mapBusinessImageContent),
        },
      })) as unknown as ReturnType<
      typeof api.get<BaseResponse<ImageContentRes[]>>
    >;
  },

  saveDraftContent: (businessId: string, formData: SaveContentPld) => {
    return api
      .post<BaseResponse<NewBusinessImageContent>>(
        `/business/image-content/${businessId}`,
        toBusinessImagePayload({ ...formData, type: "generated" })
      )
      .then((res) => ({
        ...res,
        data: { ...res.data, data: mapBusinessImageContent(res.data.data) },
      })) as unknown as ReturnType<
      typeof api.post<BaseResponse<SaveContentRes>>
    >;
  },

  editDraftContent: (
    businessId: string,
    generatedImageContentId: string,
    formData: EditContentPld
  ) => {
    return api
      .put<BaseResponse<NewBusinessImageContent>>(
        `/business/image-content/${businessId}/${generatedImageContentId}`,
        toBusinessImagePayload(formData)
      )
      .then((res) => ({
        ...res,
        data: { ...res.data, data: mapBusinessImageContent(res.data.data) },
      })) as unknown as ReturnType<
      typeof api.put<BaseResponse<SaveContentRes>>
    >;
  },

  setReadyToPost: (businessId: string, generateId: string) => {
    return api
      .put<BaseResponse<NewBusinessImageContent>>(
        `/business/image-content/${businessId}/${generateId}`,
        { readyToPost: true }
      )
      .then((res) => ({
        ...res,
        data: { ...res.data, data: mapBusinessImageContent(res.data.data) },
      })) as unknown as ReturnType<
      typeof api.patch<BaseResponse<SetReadyToPostRes>>
    >;
  },

  directPostFromDraft: (businessId: string, formData: DirectPostContentPld) => {
    return Promise.resolve({
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "DIRECT_POST_NOT_AVAILABLE",
        data: [],
      },
    }) as unknown as ReturnType<
      typeof api.post<BaseResponse<DirectPostContentRes[]>>
    >;
  },
  deleteDraft: (generatedImageContentId: string) => {
    return Promise.resolve({
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "DELETE_DRAFT_NOT_AVAILABLE",
        data: { id: generatedImageContentId },
      },
    }) as unknown as ReturnType<
      typeof api.delete<BaseResponse<DeleteContentRes>>
    >;
  },
};

export const useContentDraftGetAllDraftImage = (
  idData: string,
  filterQuery?: Partial<FilterQuery>
) => {
  return useQuery({
    queryKey: ["contentDraftGetAllDraftImage", idData, filterQuery],
    queryFn: () => draftService.getAllDraftImage(idData, filterQuery),
  });
};

export const useContentDraftSaveDraftContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: SaveContentPld;
    }) => draftService.saveDraftContent(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentDraftGetAllDraftImage"],
      });
    },
  });
};

export const useContentDraftEditDraftContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      generatedImageContentId,
      formData,
    }: {
      businessId: string;
      generatedImageContentId: string;
      formData: EditContentPld;
    }) =>
      draftService.editDraftContent(
        businessId,
        generatedImageContentId,
        formData
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentDraftGetAllDraftImage"],
      });
    },
  });
};

export const useContentDraftSetReadyToPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      generatedImageContentId,
    }: {
      businessId: string;
      generatedImageContentId: string;
    }) => draftService.setReadyToPost(businessId, generatedImageContentId),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["contentDraftGetAllDraftImage"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewCountUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentPostedGetAllPostedImage"],
      });
    },
  });
};

export const useContentDraftDirectPostFromDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: DirectPostContentPld;
    }) => draftService.directPostFromDraft(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentDraftGetAllDraftImage"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewCountUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentPostedGetAllPostedImage"],
      });
    },
  });
};

export const useContentDraftDeleteDraft = (generatedImageContentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => draftService.deleteDraft(generatedImageContentId),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["contentDraftGetAllDraftImage"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewCountUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentPostedGetAllPostedImage"],
      });
    },
  });
};

// ============================== POSTED ==============================

// ============================== PERSONAL (MANUAL UPLOAD) ==============================
const personalService = {
  createPersonalContent: (
    businessId: string,
    formData: PersonalContentPld
  ) => {
    return api
      .post<BaseResponse<NewBusinessImageContent>>(
        `/business/image-content/${businessId}`,
        toBusinessImagePayload({
          images: formData.images,
          caption: formData.caption,
          type: "personal",
          readyToPost: false,
        })
      )
      .then((res) => ({
        ...res,
        data: { ...res.data, data: mapBusinessImageContent(res.data.data) },
      })) as unknown as ReturnType<
      typeof api.post<BaseResponse<ImageContentRes>>
    >;
  },
};

export const useContentPersonalCreate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: PersonalContentPld;
    }) => personalService.createPersonalContent(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentDraftGetAllDraftImage"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentPostedGetAllPostedImage"],
      });
    },
  });
};

// ============================== POSTED ==============================

// ============================== CAPTION ==============================
const captionService = {
  enhanceCaption: (businessId: string, formData: EnhanceCaptionPld) => {
    return api.post<BaseResponse<EnhanceCaptionRes>>(
      `/content/caption/enhance/${businessId}`,
      formData
    );
  },
};

export const useContentCaptionEnhance = () => {
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: EnhanceCaptionPld;
    }) => captionService.enhanceCaption(businessId, formData),
  });
};

// ============================== IMAGE POST AI CHAT ==============================
const imagePostChatService = {
  getAllChats: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    return api.get<BaseResponse<ImagePostChatSessionRes[]>>(
      `/generative-content/chat/${businessId}`,
      { params: filterQuery }
    );
  },
  getChatById: (businessId: string, chatSessionId: string | number) => {
    return api.get<BaseResponse<ImagePostChatRes>>(
      `/generative-content/chat/${businessId}/${chatSessionId}`
    );
  },
  sendImageMessage: async (
    businessId: string,
    chatSessionId: string | number,
    formData: SendImageChatMessagePld
  ) => {
    const modelId = await resolveImageModelId(formData.model);

    return api.post<BaseResponse<SendImageChatMessageRes>>(
      `/generative-content/chat/${businessId}/${chatSessionId}/send-message-image`,
      {
        modelId,
        additionalImages: formData.additionalImages || [],
        prompt: formData.prompt,
        ratio: formData.ratio || undefined,
        bubbleChatId: formData.bubbleChatId || undefined,
        rss: formData.rss || undefined,
      }
    );
  },
};

export const useContentImagePostChatGetAll = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>,
  enabled = true
) => {
  return useQuery({
    queryKey: ["contentImagePostChatGetAll", businessId, filterQuery],
    queryFn: () => imagePostChatService.getAllChats(businessId, filterQuery),
    enabled: enabled && !!businessId,
  });
};

export const useContentImagePostChatGetById = (
  businessId: string,
  chatSessionId?: string | number | null,
  enabled = true
) => {
  return useQuery({
    queryKey: ["contentImagePostChatGetById", businessId, chatSessionId],
    queryFn: () =>
      imagePostChatService.getChatById(businessId, chatSessionId as string | number),
    enabled: enabled && !!businessId && !!chatSessionId,
  });
};

export const useContentImagePostChatSendImageMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      chatSessionId,
      formData,
    }: {
      businessId: string;
      chatSessionId: string | number;
      formData: SendImageChatMessagePld;
    }) =>
      imagePostChatService.sendImageMessage(
        businessId,
        chatSessionId,
        formData
      ),
    onSuccess: (_, { businessId, chatSessionId }) => {
      queryClient.invalidateQueries({
        queryKey: ["contentImagePostChatGetById", businessId, chatSessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentImagePostChatGetAll", businessId],
      });
    },
  });
};

// ============================== POSTED ==============================

const postedService = {
  getAllPostedImage: (
    businessId: string,
    filterQuery?: Partial<FilterQuery>
  ) => {
    return api
      .get<BaseResponse<NewBusinessImageContent[]>>(
        `/business/image-content/${businessId}`,
        { params: filterQuery }
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data || [])
            .filter((item) => item.readyToPost)
            .map((item) => ({
              ...mapBusinessImageContent(item),
              postedImageContents: [],
              platforms: [],
            })),
        },
      })) as unknown as ReturnType<
      typeof api.get<BaseResponse<PostedImageRes[]>>
    >;
  },
  repost: (businessId: string, formData: RepostContentPld) => {
    return Promise.resolve({
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "REPOST_NOT_AVAILABLE",
        data: null,
      },
    }) as unknown as ReturnType<typeof api.post<BaseResponse<PostedImageRes>>>;
  },
};

export const useContentPostedGetAllPostedImage = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>
) => {
  return useQuery({
    queryKey: ["contentPostedGetAllPostedImage", businessId, filterQuery],
    queryFn: () => postedService.getAllPostedImage(businessId, filterQuery),
  });
};

export const useContentPostedRepost = (businessId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: RepostContentPld) =>
      postedService.repost(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentPostedGetAllPostedImage", businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewCountUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewUpcoming"],
      });
    },
  });
};

// ============================== SCHEDULER AUTO ==============================

const schedulerAutoService = {
  getSettings: (businessId: string) => {
    return api
      .get<BaseResponse<NewRepetitionDay[]>>(
        `/generative-content/image-post-repetition/${businessId}`
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: mapRepetitionToAutoScheduler(businessId, res.data.data || []),
        },
      })) as unknown as ReturnType<
      typeof api.get<BaseResponse<AutoSchedulerRes>>
    >;
  },
  upsertSetting: (businessId: string, formData: AutoSchedulerPld) => {
    const activeItems = formData.schedulerAutoPostings.flatMap((day) =>
      day.isActive
        ? day.schedulerAutoPostingTimes.map((time) => ({
            dayId: day.dayId,
            time,
          }))
        : []
    );
    return Promise.all(
      activeItems.map((item) =>
        api.post<BaseResponse<NewRepetitionItem>>(
          `/generative-content/image-post-repetition/${businessId}`,
          {
            day: item.dayId,
            time: item.time.hhmm,
            platforms: item.time.platforms,
          }
        )
      )
    ).then(() => ({
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "SUCCESS_UPDATE_IMAGE_POST_REPETITION",
        data: {
          ...mapRepetitionToAutoScheduler(businessId, []),
          isAutoPosting: activeItems.length > 0,
        },
      },
    })) as unknown as ReturnType<
      typeof api.post<BaseResponse<AutoSchedulerUpserRes>>
    >;
  },
};

export const useContentSchedulerAutoGetSettings = (businessId: string) => {
  return useQuery({
    queryKey: ["contentSchedulerAutoGetSettings", businessId],
    queryFn: () => schedulerAutoService.getSettings(businessId),
    enabled: !!businessId,
  });
};

export const useContentSchedulerAutoUpsertSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: AutoSchedulerPld;
    }) => schedulerAutoService.upsertSetting(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentSchedulerAutoGetSettings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewCountUpcoming"],
      });
    },
  });
};

// ============================== SCHEDULER MANUAL ==============================

const schedulerManualService = {
  getAllQueue: (businessId: string) => {
    return api
      .get<BaseResponse<NewScheduledPost[]>>(
        `/generative-content/image-post-scheduled/${businessId}`
      )
      .then((res) => {
        const groups = new Map<string, QueuePostingRes["posts"]>();
        (res.data.data || []).forEach((item) => {
          const date = item.publishAt.slice(0, 10);
          groups.set(date, [
            ...(groups.get(date) || []),
            {
              id: item.id,
              date: item.publishAt,
              platforms: item.platforms,
              rootBusinessId: String(item.businessRootId),
              generatedImageContentId: String(item.id),
              generatedImageContent: {
                id: String(item.id),
                images: item.imageUrl ? [item.imageUrl] : [],
                ratio: "1:1",
                category: "",
                designStyle: "",
                caption: item.caption || "",
                productKnowledgeId: "",
                rootBusinessId: String(item.businessRootId),
                deletedAt: "",
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              },
            },
          ]);
        });
        return {
          ...res,
          data: {
            ...res.data,
            data: Array.from(groups.entries()).map(([date, posts]) => ({
              date,
              posts,
            })),
          },
        };
      }) as unknown as ReturnType<
      typeof api.get<BaseResponse<QueuePostingRes[]>>
    >;
  },
  addToQueue: (businessId: string, formData: QueuePld) => {
    return api
      .post<BaseResponse<NewScheduledPost>>(
        `/generative-content/image-post-scheduled/${businessId}`,
        {
          imageUrl: formData.imageUrl || formData.generatedImageContentId,
          caption: formData.caption,
          status: formData.status || "ready",
          withChatAI: formData.withChatAI || undefined,
          businessProductId: formData.businessProductId
            ? Number(formData.businessProductId)
            : undefined,
          chatSessionId: formData.chatSessionId || undefined,
          platforms: formData.platforms,
          publishAt: formatPublishAt(formData.dateTime),
        }
      )
      .then((res) => ({
        ...res,
        data: { ...res.data, data: mapScheduledToQueue(res.data.data) },
      })) as unknown as ReturnType<typeof api.post<BaseResponse<QueueRes>>>;
  },
  editFromQueue: (
    businessId: string,
    idScheduler: number,
    formData: QueuePld
  ) => {
    return api
      .put<BaseResponse<NewScheduledPost>>(
        `/generative-content/image-post-scheduled/${businessId}/${idScheduler}`,
        {
          imageUrl: formData.imageUrl || formData.generatedImageContentId,
          caption: formData.caption,
          status: formData.status || "ready",
          withChatAI: formData.withChatAI || undefined,
          businessProductId: formData.businessProductId
            ? Number(formData.businessProductId)
            : undefined,
          chatSessionId: formData.chatSessionId || undefined,
          platforms: formData.platforms,
          publishAt: formatPublishAt(formData.dateTime),
        }
      )
      .then((res) => ({
        ...res,
        data: { ...res.data, data: mapScheduledToQueue(res.data.data) },
      })) as unknown as ReturnType<typeof api.put<BaseResponse<QueueRes>>>;
  },
  remove: (businessId: string, idScheduler: number) => {
    return api
      .delete<BaseResponse<NewScheduledPost>>(
        `/generative-content/image-post-scheduled/${businessId}/${idScheduler}`
      )
      .then((res) => ({
        ...res,
        data: { ...res.data, data: mapScheduledToQueue(res.data.data) },
      })) as unknown as ReturnType<typeof api.delete<BaseResponse<QueueRes>>>;
  },
};

export const useContentSchedulerManualGetAllQueue = (businessId: string) => {
  return useQuery({
    queryKey: ["contentSchedulerManualGetAllQueue", businessId],
    queryFn: () => schedulerManualService.getAllQueue(businessId),
  });
};

export const useContentSchedulerManualAddToQueue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: QueuePld;
    }) => schedulerManualService.addToQueue(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentSchedulerManualGetAllQueue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentDraftGetAllDraftImage"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewCountUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewUpcoming"],
      });
    },
  });
};
export const useContentSchedulerManualEditQueue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      idScheduler,
      formData,
    }: {
      businessId: string;
      idScheduler: number;
      formData: QueuePld;
    }) =>
      schedulerManualService.editFromQueue(businessId, idScheduler, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentSchedulerManualGetAllQueue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentDraftGetAllDraftImage"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewCountUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewUpcoming"],
      });
    },
  });
};

export const useContentSchedulerManualRemove = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      idScheduler,
    }: {
      businessId: string;
      idScheduler: number;
    }) => schedulerManualService.remove(businessId, idScheduler),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({
        queryKey: [
          "contentSchedulerManualGetAllQueue",
          data.data.rootBusinessId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewCountUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentOverviewUpcoming"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentDraftGetAllDraftImage"],
      });
    },
  });
};

// ============================== TIMEZONE ==============================

export const timezoneSchedulerService = {
  getTimezone: (businessId: string) => {
    return api.get<BaseResponse<TimezoneSettingRes>>(
      `/business/timezone-pref/${businessId}`
    );
  },
  upsertTimezone: (businessId: string, formData: TimezoneSettingPld) => {
    return api.post<BaseResponse<TimezoneSettingRes>>(
      `/business/timezone-pref/${businessId}`,
      formData
    );
  },
};

export const useContentSchedulerTimezoneGetTimezone = (businessId: string) => {
  return useQuery({
    queryKey: ["contentSchedulerTimezoneGetTimezone", businessId],
    queryFn: () => timezoneSchedulerService.getTimezone(businessId),
  });
};

export const useContentSchedulerTimezoneUpsertTimezone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: TimezoneSettingPld;
    }) => timezoneSchedulerService.upsertTimezone(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentSchedulerTimezoneGetTimezone"],
      });
    },
  });
};

// ============================== AIMODEL ==============================

const aiModelService = {
  getAiModels: () => {
    return api
      .get<BaseResponse<NewGenerativeImageModel[]>>(
        `/app/generative-image-model`
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data || [])
            .filter((model) => model.isActive !== false)
            .map(mapAiModel),
        },
      })) as unknown as ReturnType<typeof api.get<BaseResponse<AiModelRes[]>>>;
  },
};

export const useContentAiModelGetAiModels = (enabled = true) => {
  return useQuery({
    queryKey: ["contentAiModelGetAiModels"],
    queryFn: () => aiModelService.getAiModels(),
    enabled,
  });
};

// ============================== JOB ==============================
export const jobContentService = {
  getAllJob: (businessId: string) => {
    return api
      .get<BaseResponse<NewImagePost[]>>(
        `/generative-content/image-post/${businessId}`,
        { params: { page: 1, limit: 100 } }
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data || []).map(mapImagePostToJobGroup),
        },
      }))
      .catch((error) => {
        const status = error?.response?.status ?? error?.status;

        if (status === 404) {
          return {
            data: {
              metaData: { code: 200, message: "OK" },
              responseMessage: "GET_IMAGE_POST_EMPTY",
              data: [],
            },
          };
        }

        throw error;
      }) as unknown as ReturnType<typeof api.get<BaseResponse<GetAllJob[]>>>;
  },
  knowledgeOnJob: (
    businessId: string,
    formData: GenerateContentKnowledgePld
  ) => {
    return toImagePostPayload("generate", formData).then((payload) =>
      api
        .post<BaseResponse<NewImagePostCreateRes>>(
          `/generative-content/image-post/${businessId}`,
          payload
        )
        .then((res) => ({
          ...res,
          data: { ...res.data, data: mapImagePostCreateToJob(res.data.data) },
        }))
    ) as unknown as ReturnType<typeof api.post<BaseResponse<JobRes>>>;
  },
  rssOnJob: (businessId: string, formData: GenerateContentRssPld) => {
    return toImagePostPayload("generate", formData).then((payload) =>
      api
        .post<BaseResponse<NewImagePostCreateRes>>(
          `/generative-content/image-post/${businessId}`,
          payload
        )
        .then((res) => ({
          ...res,
          data: { ...res.data, data: mapImagePostCreateToJob(res.data.data) },
        }))
    ) as unknown as ReturnType<typeof api.post<BaseResponse<JobRes>>>;
  },
  regenerateOnJob: (
    businessId: string,
    formData: GenerateContentRegeneratePld
  ) => {
    return toImagePostPayload("regenerate", formData).then((payload) =>
      api
        .post<BaseResponse<NewImagePostCreateRes>>(
          `/generative-content/image-post/${businessId}`,
          payload
        )
        .then((res) => ({
          ...res,
          data: { ...res.data, data: mapImagePostCreateToJob(res.data.data) },
        }))
    ) as unknown as ReturnType<typeof api.post<BaseResponse<JobRes>>>;
  },

  maskOnJob: (businessId: string, formData: GenerateContentMaskPld) => {
    return toImagePostPayload("mask", formData).then((payload) =>
      api
        .post<BaseResponse<NewImagePostCreateRes>>(
          `/generative-content/image-post/${businessId}`,
          payload
        )
        .then((res) => ({
          ...res,
          data: { ...res.data, data: mapImagePostCreateToJob(res.data.data) },
        }))
    ) as unknown as ReturnType<typeof api.post<BaseResponse<JobRes>>>;
  },
  deleteHistoryJob: (rootBusinessId: string, jobId: string) => {
    return api.delete<BaseResponse<null>>(
      `/generative-content/image-post/${rootBusinessId}/${jobId}`
    );
  },
};

export const useContentJobGetAllJob = (businessId: string, enabled = true) => {
  return useQuery({
    queryKey: ["contentJobGetAllJob", businessId],
    queryFn: () => jobContentService.getAllJob(businessId),
    enabled: enabled && !!businessId,
  });
};

export const useContentJobKnowledgeOnJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: GenerateContentKnowledgePld;
    }) => jobContentService.knowledgeOnJob(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentJobGetAllJob"],
      });
    },
  });
};

export const useContentJobRssOnJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: GenerateContentRssPld;
    }) => jobContentService.rssOnJob(businessId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentJobGetAllJob"],
      });
    },
  });
};

export const useContentJobRegenerateOnJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: GenerateContentRegeneratePld;
    }) => jobContentService.regenerateOnJob(businessId, formData),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["contentJobGetAllJob"],
      });
    },
  });
};

export const useContentJobMaskOnJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: GenerateContentMaskPld;
    }) => jobContentService.maskOnJob(businessId, formData),
    onSuccess: ({}) => {
      queryClient.invalidateQueries({
        queryKey: ["contentJobGetAllJob"],
      });
    },
  });
};

export const useContentJobDeleteHistoryJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rootBusinessId, jobId }: { rootBusinessId: string; jobId: string }) => jobContentService.deleteHistoryJob(rootBusinessId, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contentJobGetAllJob"],
      });
    },
  });
};

// ============================== AUTO GENERATE ==============================

const autoGenerateService = {
  getSettings: (businessId: string) => {
    return api
      .get<BaseResponse<NewRepetitionDay[]>>(
        `/generative-content/image-post-repetition/${businessId}`
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: mapRepetitionToAutoGenerateSettings(res.data.data || []),
        },
      })) as unknown as ReturnType<typeof api.get<AutoGenerateSettingsResponse>>;
  },
  updatePreference: (businessId: string, isActive: boolean) => {
    return Promise.resolve({
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "AUTO_GENERATE_PREFERENCE_LOCAL_ONLY",
        data: { isActive },
      },
    }) as unknown as ReturnType<typeof api.patch<AutoGeneratePreferenceResponse>>;
  },
  createSchedule: (businessId: string, formData: CreateAutoGenerateScheduleRequest) => {
    return api.post<AutoGenerateScheduleResponse>(
      `/generative-content/image-post-repetition/${businessId}`,
      {
        appGenerativeImageModelId: Number(formData.model) || undefined,
        businessProductId: Number(formData.productKnowledgeId),
        day: formData.day,
        time: formData.time,
        additionalPrompt: formData.additionalPrompt,
        additionalImages: formData.referenceImages,
        platforms: formData.platforms,
      }
    );
  },
  updateSchedule: (businessId: string, scheduleId: string, formData: UpdateAutoGenerateScheduleRequest) => {
    return api.put<AutoGenerateScheduleResponse>(
      `/generative-content/image-post-repetition/${businessId}/${scheduleId}`,
      {
        appGenerativeImageModelId: Number(formData.model) || undefined,
        businessProductId: Number(formData.productKnowledgeId),
        day: formData.day,
        time: formData.time,
        additionalPrompt: formData.additionalPrompt,
        additionalImages: formData.referenceImages,
        platforms: formData.platforms,
      }
    );
  },
  deleteSchedule: (businessId: string, scheduleId: string) => {
    return api.delete<AutoGenerateScheduleResponse>(
      `/generative-content/image-post-repetition/${businessId}/${scheduleId}`
    );
  },
  getHistories: (businessId: string, query?: AutoGenerateHistoriesQuery) => {
    return api.get<AutoGenerateHistoriesResponse>(
      `/generative-content/image-post/${businessId}`,
      { params: query }
    );
  },
  getScheduleById: (businessId: string, scheduleId: string) => {
    return api.get<AutoGenerateScheduleResponse>(
      `/generative-content/image-post-repetition/${businessId}/${scheduleId}`
    );
  },
};

export const useContentAutoGenerateGetSettings = (
  businessId: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["contentAutoGenerateGetSettings", businessId],
    queryFn: () => autoGenerateService.getSettings(businessId),
    enabled: enabled && !!businessId,
  });
};

export const useContentAutoGenerateUpdatePreference = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, isActive }: { businessId: string; isActive: boolean }) =>
      autoGenerateService.updatePreference(businessId, isActive),
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({
        queryKey: ["contentAutoGenerateGetSettings", businessId],
      });
    },
  });
};

export const useContentAutoGenerateCreateSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, formData }: { businessId: string; formData: CreateAutoGenerateScheduleRequest }) =>
      autoGenerateService.createSchedule(businessId, formData),
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({
        queryKey: ["contentAutoGenerateGetSettings", businessId],
      });
    },
  });
};

export const useContentAutoGenerateUpdateSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, scheduleId, formData }: { businessId: string; scheduleId: string; formData: UpdateAutoGenerateScheduleRequest }) =>
      autoGenerateService.updateSchedule(businessId, scheduleId, formData),
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({
        queryKey: ["contentAutoGenerateGetSettings", businessId],
      });
    },
  });
};

export const useContentAutoGenerateDeleteSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, scheduleId }: { businessId: string; scheduleId: string }) =>
      autoGenerateService.deleteSchedule(businessId, scheduleId),
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({
        queryKey: ["contentAutoGenerateGetSettings", businessId],
      });
    },
  });
};

export const useContentAutoGenerateGetHistories = (businessId: string, query?: AutoGenerateHistoriesQuery) => {
  return useQuery({
    queryKey: ["contentAutoGenerateGetHistories", businessId, query],
    queryFn: () => autoGenerateService.getHistories(businessId, query),
    enabled: !!businessId,
  });
};

export const useContentAutoGenerateGetScheduleById = (businessId: string, scheduleId: string) => {
  return useQuery({
    queryKey: ["contentAutoGenerateGetScheduleById", businessId, scheduleId],
    queryFn: () => autoGenerateService.getScheduleById(businessId, scheduleId),
    enabled: !!businessId && !!scheduleId,
  });
};
