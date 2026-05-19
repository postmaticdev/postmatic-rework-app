import { api } from "@/config/api";
import {
  BaseResponse,
  BaseResponseFiltered,
  FilterQuery,
} from "@/models/api/base-response.type";
import {
  WebsiteScrapperCreatePld,
  WebsiteScrapperHistoryItem,
} from "@/models/api/website-scrapper.type";
import { useMutation, useQuery } from "@tanstack/react-query";

export const websiteScrapperService = {
  getHistory: (filterQuery?: Partial<FilterQuery>) => {
    return api.get<BaseResponseFiltered<WebsiteScrapperHistoryItem[]>>(
      "/app/website-scrapper/business-information",
      { params: filterQuery }
    );
  },
  getHistoryById: (id: string | number) => {
    return api.get<BaseResponse<WebsiteScrapperHistoryItem>>(
      `/app/website-scrapper/business-information/${id}`
    );
  },
  create: (payload: WebsiteScrapperCreatePld) => {
    return api.post<BaseResponse<WebsiteScrapperHistoryItem>>(
      "/app/website-scrapper/business-information",
      payload
    );
  },
};

export const useWebsiteScrapperGetHistory = (
  filterQuery?: Partial<FilterQuery>,
  enabled = true
) => {
  return useQuery({
    queryKey: ["websiteScrapperHistory", filterQuery],
    queryFn: () => websiteScrapperService.getHistory(filterQuery),
    enabled,
  });
};

export const useWebsiteScrapperGetHistoryById = (
  id: string | number | null,
  enabled = true
) => {
  return useQuery({
    queryKey: ["websiteScrapperHistoryDetail", id],
    queryFn: () => websiteScrapperService.getHistoryById(String(id)),
    enabled: enabled && !!id,
  });
};

export const useWebsiteScrapperCreate = () => {
  return useMutation({
    mutationFn: (payload: WebsiteScrapperCreatePld) =>
      websiteScrapperService.create(payload),
  });
};
