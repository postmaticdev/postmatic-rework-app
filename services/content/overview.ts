import { api } from "@/config/api";
import {
  BaseResponse,
  BaseResponseFiltered,
  FilterQuery,
} from "@/models/api/base-response.type";
import {
  CountPostRes,
  PostOverviewRes,
  UpcomingPostRes,
} from "@/models/api/content/overview";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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

// The backend caps list endpoints at 50 rows per page.
const MAX_LIST_LIMIT = 50;

// The schedule list compares publish_at against dateEnd at 00:00 UTC, so ask for
// one extra day and let isWithinDateRange trim to the local calendar range.
const nextDayYmd = (ymd: string) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return dateManipulation.ymd(new Date(year, month - 1, day + 1));
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
  // The total comes from the overview counter (COUNT in SQL, no row limit). The
  // per-platform breakdown is derived from upload-history and only shown when
  // that one page holds the whole range, so it never under-reports.
  getCountPosted: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    const dateParams = {
      dateStart: filterQuery?.dateStart,
      dateEnd: filterQuery?.dateEnd,
    };
    return Promise.all([
      api.get<BaseResponse<PostOverviewRes>>(
        `/generative-content/image-post-common/${businessId}/overview`,
        { params: dateParams }
      ),
      api.get<BaseResponseFiltered<NewImagePostUploadHistory[]>>(
        `/generative-content/image-post-common/${businessId}/upload-history`,
        { params: { ...dateParams, page: 1, limit: MAX_LIST_LIMIT } }
      ),
    ]).then(([overviewRes, historyRes]) => {
      const history = historyRes.data.data || [];
      const isHistoryComplete =
        (historyRes.data.pagination?.total ?? history.length) <= history.length;
      const detail = isHistoryComplete
        ? history.reduce<Partial<Record<PlatformEnum, number>>>((acc, item) => {
            (item.platforms || []).forEach((platform) => {
              if (platform.jobStatus?.toLowerCase() !== "success") return;
              acc[platform.platformCode] = (acc[platform.platformCode] || 0) + 1;
            });
            return acc;
          }, {})
        : {};

      return {
        ...overviewRes,
        data: {
          ...overviewRes.data,
          data: {
            total: overviewRes.data.data?.totalSuccessfulPosted ?? 0,
            detail,
          },
        },
      };
    }) as unknown as ReturnType<typeof api.get<BaseResponse<CountPostRes>>>;
  },
  // READY schedules whose publish time is still ahead, counted by the backend.
  getCountUpcoming: (businessId: string, filterQuery?: Partial<FilterQuery>) => {
    return api
      .get<BaseResponse<PostOverviewRes>>(
        `/generative-content/image-post-common/${businessId}/overview`,
        {
          params: {
            dateStart: filterQuery?.dateStart,
            dateEnd: filterQuery?.dateEnd,
          },
        }
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: {
            total: res.data.data?.totalFutureReadySchedules ?? 0,
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
            // day.date is the backend's day in the business time zone; the
            // browser's local date of publishAt can differ near midnight.
            data: (res.data.data?.days || [])
              .filter(
                (day) =>
                  (!dateStart || day.date >= dateStart) &&
                  (!dateEnd || day.date <= dateEnd)
              )
              .flatMap((day) => day.items || [])
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
        `/generative-content/image-post-scheduled/${businessId}`,
        {
          // Without these the backend returns only its default first page
          // (10 newest rows), so posts inside the range went missing.
          params: {
            dateStart,
            dateEnd: dateEnd ? nextDayYmd(dateEnd) : undefined,
            status: includeDrafts ? undefined : "READY",
            sortBy: "publish_at",
            sort: "asc",
            page: 1,
            limit: MAX_LIST_LIMIT,
          },
        }
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
    placeholderData: keepPreviousData,
  });
};

export const useContentOverviewGetCountUpcoming = (
  businessId: string,
  filterQuery?: UpcomingPostFilterQuery
) => {
  return useQuery({
    queryKey: ["contentOverviewCountUpcoming", businessId, filterQuery],
    queryFn: () => overviewService.getCountUpcoming(businessId, filterQuery),
    enabled: !!businessId,
    placeholderData: keepPreviousData,
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
