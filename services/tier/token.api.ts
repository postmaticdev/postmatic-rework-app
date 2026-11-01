import { api } from "@/config/api";
import { BaseResponse, FilterQuery } from "@/models/api/base-response.type";
import {
  TokenUsage,
  TokenUsageChartPoint,
} from "@/models/api/tier/token.type";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

type TokenUsageChartRes = {
  rangeStart: string;
  rangeEnd: string;
  limit: number;
  data: {
    dateStart: string;
    dateEnd: string;
    totalUsage: number;
  }[];
};

const tokenService = {
  // usage-chart only reports the total OUT tokens per bucket. Every token spent
  // today goes to image content (image + caption); video has no token flow yet.
  getAnalyticUsage: (
    businessId: string,
    filterQuery?: Partial<FilterQuery>
  ): Promise<TokenUsageChartPoint[]> => {
    return api
      .get<BaseResponse<TokenUsageChartRes>>(
        `/generative-token/image-token/${businessId}/usage-chart`,
        {
          params: {
            dateStart: filterQuery?.dateStart,
            dateEnd: filterQuery?.dateEnd,
            limit: filterQuery?.limit,
          },
        }
      )
      .then((res) =>
        (res.data.data?.data || []).map((item) => ({
          date: item.dateStart,
          dateEnd: item.dateEnd,
          image: item.totalUsage,
          video: 0,
        }))
      );
  },
  getTokenUsage: (businessId: string) => {
    return api
      .get<
        BaseResponse<{
          availableToken: number;
          usedToken: number;
          totalToken: number;
        }>
      >(`/generative-token/image-token/${businessId}/status`)
      .then((res) => {
        const data = res.data.data;
        (res.data as unknown as BaseResponse<TokenUsage>).data = {
          availableToken: data.availableToken,
          totalValidToken: data.totalToken,
          totalUsedToken: data.usedToken,
          // Keep two decimals; the card renders "31.00%" style values.
          percentageUsage: data.totalToken
            ? Math.round((data.usedToken / data.totalToken) * 10000) / 100
            : 0,
        };
        return res as unknown as Awaited<
          ReturnType<typeof api.get<BaseResponse<TokenUsage>>>
        >;
      });
  },
};

export const useTokenGetAnalyticUsage = (
  businessId: string,
  filterQuery?: Partial<FilterQuery>
) => {
  return useQuery({
    queryKey: ["tokenAnalyticUsage", businessId, filterQuery],
    queryFn: () => tokenService.getAnalyticUsage(businessId, filterQuery),
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
};

export const useTokenGetTokenUsage = (businessId: string) => {
  return useQuery({
    queryKey: ["tokenUsage", businessId],
    queryFn: () => tokenService.getTokenUsage(businessId),
    enabled: !!businessId,
  });
};
