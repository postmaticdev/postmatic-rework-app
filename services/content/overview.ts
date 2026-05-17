import { api } from "@/config/api";
import { BaseResponse, FilterQuery } from "@/models/api/base-response.type";
import { CountPostRes, UpcomingPostRes } from "@/models/api/content/overview";
import { useQuery } from "@tanstack/react-query";

type NewScheduledPost = {
  id: number;
  publishAt: string;
  status: string;
  caption: string | null;
  imageUrl: string | null;
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

const overviewService = {
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
