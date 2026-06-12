import { api } from "@/config/api";
import { BaseResponse, FilterQuery } from "@/models/api/base-response.type";
import {
  AnalyticTokenUsageRes,
  TokenUsage,
} from "@/models/api/tier/token.type";
import { useQuery } from "@tanstack/react-query";

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
  getAnalyticUsage: (
    businessId: string,
    filterQuery?: Partial<FilterQuery>
  ) => {
    return api
      .get<BaseResponse<TokenUsageChartRes>>(
        `/generative-token/image-token/${businessId}/usage-chart`,
        { params: filterQuery }
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data?.data || []).map((item) => ({
            date: item.dateStart,
            Image: item.totalUsage,
            Video: 0,
            LiveStream: 0,
          })),
        },
      })) as unknown as ReturnType<
      typeof api.get<BaseResponse<AnalyticTokenUsageRes[]>>
    >;
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
          percentageUsage: data.totalToken
            ? Math.round((data.usedToken / data.totalToken) * 100)
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
  });
};

export const useTokenGetTokenUsage = (businessId: string) => {
  return useQuery({
    queryKey: ["tokenUsage", businessId],
    queryFn: () => tokenService.getTokenUsage(businessId),
    enabled: !!businessId,
  });
};
