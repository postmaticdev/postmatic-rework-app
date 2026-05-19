import { api } from "@/config/api";
import { BaseResponse, FilterQuery } from "@/models/api/base-response.type";
import {
  CountPostRes,
  PostOverviewRes,
  UpcomingPostRes,
} from "@/models/api/content/overview";
import { useQuery } from "@tanstack/react-query";

type NewScheduledPost = {
  id: number;
  publishAt: string;
  status: string;
  withChatAI?: boolean;
  caption: string | null;
  imageUrl: string | null;
  chatSessionId?: number | null;
  businessProductId?: number | null;
  platforms: UpcomingPostRes["platforms"];
  businessRootId: number;
};

type NewScheduledPostCalendar = {
  month: string;
  days: {
    date: string;
    items: NewScheduledPost[];
  }[];
};

const mapScheduledPost = (item: NewScheduledPost): UpcomingPostRes => ({
  id: item.id,
  date: item.publishAt,
  status: item.status,
  withChatAI: item.withChatAI ?? false,
  chatSessionId: item.chatSessionId ?? null,
  businessProductId: item.businessProductId ?? null,
  images: item.imageUrl ? [item.imageUrl] : [],
  platforms: item.platforms || [],
  type: "manual",
  title: item.caption || "Scheduled post",
  schedulerManualPostingId: item.id,
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
    createdAt: item.publishAt,
    updatedAt: item.publishAt,
  },
});

const isVisibleScheduledPost = (item: NewScheduledPost) => {
  const status = item.status?.toLowerCase();
  return status === "ready" || (status === "draft" && Boolean(item.imageUrl));
};

const overviewService = {
  getPostOverview: (businessId: string) => {
    return api.get<BaseResponse<PostOverviewRes>>(
      `/generative-content/image-post-common/${businessId}/overview`
    );
  },
  getCountPosted: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    return Promise.resolve({
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "POSTED_COUNT_NOT_AVAILABLE",
        data: { total: 0, detail: {} },
      },
    }) as unknown as ReturnType<typeof api.get<BaseResponse<CountPostRes>>>;
  },
  getCountUpcoming: (
    businessId: string,
    filterQuery?: Partial<FilterQuery>
  ) => {
    return overviewService.getUpcoming(businessId, filterQuery).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: {
          total: res.data.data.length,
          detail: {},
        },
      },
    })) as unknown as ReturnType<typeof api.get<BaseResponse<CountPostRes>>>;
  },
  getUpcoming: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    const dateStart = filterQuery?.dateStart;
    const dateEnd = filterQuery?.dateEnd;
    const monthSearch =
      dateStart && dateEnd && dateStart.slice(0, 7) === dateEnd.slice(0, 7)
        ? dateStart.slice(0, 7)
        : null;

    if (monthSearch) {
      return api
        .get<BaseResponse<NewScheduledPostCalendar>>(
          `/generative-content/image-post-scheduled/${businessId}/calendar-view`,
          { params: { search: monthSearch } }
        )
        .then((res) => ({
          ...res,
          data: {
            ...res.data,
            data: (res.data.data?.days || [])
              .flatMap((day) => day.items || [])
              .filter(isVisibleScheduledPost)
              .map(mapScheduledPost),
          },
        })) as unknown as ReturnType<
        typeof api.get<BaseResponse<UpcomingPostRes[]>>
      >;
    }

    return api
      .get<BaseResponse<NewScheduledPost[]>>(
        `/generative-content/image-post-scheduled/${businessId}`
      )
      .then((res) => {
        const items = (res.data.data || [])
          .filter(isVisibleScheduledPost)
          .filter((item) => {
            const date = item.publishAt.slice(0, 10);
            return (!dateStart || date >= dateStart) && (!dateEnd || date <= dateEnd);
          })
          .map(mapScheduledPost);

        return {
          ...res,
          data: {
            ...res.data,
            data: items,
          },
        };
      }) as unknown as ReturnType<
      typeof api.get<BaseResponse<UpcomingPostRes[]>>
    >;
  },
};

export const useContentPostCommonGetOverview = (businessId: string) => {
  return useQuery({
    queryKey: ["contentPostCommonOverview", businessId],
    queryFn: () => overviewService.getPostOverview(businessId),
    enabled: !!businessId,
  });
};

export const useContentOverviewGetCountPosted = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>
) => {
  return useQuery({
    queryKey: ["contentOverviewCountPosted", businessId, filterQuery],
    queryFn: () => overviewService.getCountPosted(businessId, filterQuery),
    enabled: !!businessId,
  });
};

export const useContentOverviewGetCountUpcoming = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>
) => {
  return useQuery({
    queryKey: ["contentOverviewCountUpcoming", businessId, filterQuery],
    queryFn: () => overviewService.getCountUpcoming(businessId, filterQuery),
  });
};

export const useContentOverviewGetUpcoming = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>
) => {
  return useQuery({
    queryKey: ["contentOverviewUpcoming", businessId, filterQuery],
    queryFn: () => overviewService.getUpcoming(businessId, filterQuery),
  });
};
