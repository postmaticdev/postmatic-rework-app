import { api } from "@/config/api";
import { BaseResponse, FilterQuery } from "@/models/api/base-response.type";
import {
  CountPostRes,
  PostOverviewRes,
  UpcomingPostRes,
} from "@/models/api/content/overview";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { useQuery } from "@tanstack/react-query";
import { dateManipulation } from "@/helper/date-manipulation";
import { getToastLocale } from "@/helper/api-response-message";
import { PUBLISH_POLL_INTERVAL_MS } from "@/helper/publish-status";

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

type NewImagePostUploadHistoryPlatform = {
  platformCode: PlatformEnum;
  jobStatus: string;
};

type NewImagePostUploadHistory = {
  publishAt: string;
  platforms: NewImagePostUploadHistoryPlatform[];
};

type UpcomingPostFilterQuery = Partial<FilterQuery> & {
  includeDrafts?: boolean;
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
  title: item.caption || (getToastLocale() === "en" ? "Scheduled post" : "Postingan terjadwal"),
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

const isVisibleScheduledPost = (
  item: NewScheduledPost,
  includeDrafts = true,
  includeFailed = false
) => {
  const status = item.status?.toLowerCase();
  return (
    status === "ready" ||
    // A schedule can fail before any publishing job exists (platform
    // disconnected, missing caption/image), so upload-history never lists it.
    (includeFailed &&
      (status === "failed" || status === "partial_published")) ||
    (includeDrafts &&
      status === "draft" &&
      (Boolean(item.imageUrl) ||
        Boolean(item.withChatAI) ||
        Boolean(item.chatSessionId)))
  );
};

// A READY post whose publish time has passed is being published by the worker.
// Older ones are treated as stuck so they don't keep the page polling.
const DUE_POST_WINDOW_MS = 30 * 60 * 1000;
const MAX_UPCOMING_REFETCH_MS = 10 * 60 * 1000;

// Poll every 30 s while a scheduled post is being published; otherwise wake
// up around the next publish time (at most every 10 min) so the calendar
// picks up the result. No READY post means no polling at all.
const getUpcomingRefetchInterval = (items: UpcomingPostRes[]) => {
  const now = Date.now();
  let nextPublishAt = Number.POSITIVE_INFINITY;

  for (const item of items) {
    if (item.status?.toLowerCase() !== "ready") continue;
    const publishAt = new Date(item.date).getTime();
    if (Number.isNaN(publishAt)) continue;
    if (publishAt <= now) {
      if (now - publishAt <= DUE_POST_WINDOW_MS) return PUBLISH_POLL_INTERVAL_MS;
      continue;
    }
    nextPublishAt = Math.min(nextPublishAt, publishAt);
  }

  if (!Number.isFinite(nextPublishAt)) return false;
  return Math.min(
    Math.max(nextPublishAt - now, PUBLISH_POLL_INTERVAL_MS),
    MAX_UPCOMING_REFETCH_MS
  );
};

const isWithinDateRange = (
  item: NewScheduledPost,
  dateStart?: string,
  dateEnd?: string
) => {
  // Compare on the local calendar date of the instant (dateStart/dateEnd are
  // local YYYY-MM-DD); slicing the ISO string would use the UTC date.
  const publishAt = new Date(item.publishAt);
  const date = Number.isNaN(publishAt.getTime())
    ? item.publishAt.slice(0, 10)
    : dateManipulation.ymd(publishAt);
  return (!dateStart || date >= dateStart) && (!dateEnd || date <= dateEnd);
};

const overviewService = {
  getPostOverview: (businessId: string) => {
    return api.get<BaseResponse<PostOverviewRes>>(
      `/generative-content/image-post-common/${businessId}/overview`
    );
  },
  getCountPosted: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    return api
      .get<BaseResponse<NewImagePostUploadHistory[]>>(
        `/generative-content/image-post-common/${businessId}/upload-history`,
        {
          params: {
            ...filterQuery,
            page: 1,
            limit: 1000,
          },
        }
      )
      .then((res) => {
        const successfulPosts = (res.data.data || []).filter((item) =>
          (item.platforms || []).some(
            (platform) => platform.jobStatus?.toLowerCase() === "success"
          )
        );
        const detail = successfulPosts.reduce<Partial<Record<PlatformEnum, number>>>(
          (acc, item) => {
            (item.platforms || []).forEach((platform) => {
              if (platform.jobStatus?.toLowerCase() !== "success") return;
              acc[platform.platformCode] = (acc[platform.platformCode] || 0) + 1;
            });
            return acc;
          },
          {}
        );

        return {
          ...res,
          data: {
            ...res.data,
            data: {
              total: successfulPosts.length,
              detail,
            },
          },
        };
      }) as unknown as ReturnType<typeof api.get<BaseResponse<CountPostRes>>>;
  },
  getCountUpcoming: (
    businessId: string,
    filterQuery?: UpcomingPostFilterQuery
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
  getUpcoming: (businessId: string, filterQuery?: UpcomingPostFilterQuery) => {
    const dateStart = filterQuery?.dateStart;
    const dateEnd = filterQuery?.dateEnd;
    const includeDrafts = filterQuery?.includeDrafts ?? true;
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
              .filter((item) => isWithinDateRange(item, dateStart, dateEnd))
              // Only the calendar (includeDrafts) shows failed schedules.
              .filter((item) =>
                isVisibleScheduledPost(item, includeDrafts, includeDrafts)
              )
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
          .filter((item) => isVisibleScheduledPost(item, includeDrafts))
          .filter((item) => isWithinDateRange(item, dateStart, dateEnd))
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
  filterQuery?: UpcomingPostFilterQuery
) => {
  return useQuery({
    queryKey: ["contentOverviewCountUpcoming", businessId, filterQuery],
    queryFn: () => overviewService.getCountUpcoming(businessId, filterQuery),
  });
};

export const useContentOverviewGetUpcoming = (
  businessId: string,
  filterQuery?: UpcomingPostFilterQuery
) => {
  return useQuery({
    queryKey: ["contentOverviewUpcoming", businessId, filterQuery],
    queryFn: () => overviewService.getUpcoming(businessId, filterQuery),
    enabled: !!businessId,
    refetchInterval: (query) =>
      getUpcomingRefetchInterval(query.state.data?.data.data || []),
    refetchIntervalInBackground: false,
  });
};
