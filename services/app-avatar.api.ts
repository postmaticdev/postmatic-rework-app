import { api } from "@/config/api";
import {
  BaseResponseFiltered,
  FilterQuery,
} from "@/models/api/base-response.type";
import { AppAvatarRes } from "@/models/api/app-avatar";
import { useQuery } from "@tanstack/react-query";

type BackendAppAvatarRes = Omit<AppAvatarRes, "id"> & {
  id: string | number;
};

const mapAppAvatar = (
  avatar?: Partial<BackendAppAvatarRes> | null
): AppAvatarRes => {
  const item = avatar ?? {};

  return {
    id: String(item.id ?? ""),
    name: item.name ?? "",
    imageUrl: item.imageUrl ?? "",
    isActive: item.isActive ?? false,
    createdAt: item.createdAt ?? "",
    updatedAt: item.updatedAt ?? "",
  };
};

const appAvatarService = {
  getAll: (filterQuery?: Partial<FilterQuery>) => {
    return api
      .get<BaseResponseFiltered<AppAvatarRes[]>>("/app/avatar", {
        params: filterQuery,
      })
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (Array.isArray(res.data.data) ? res.data.data : []).map(
            mapAppAvatar
          ),
        },
      }));
  },
};

export const useAppAvatarGetAll = (
  filterQuery?: Partial<FilterQuery>,
  enabled = true
) => {
  return useQuery({
    queryKey: ["appAvatar", filterQuery],
    queryFn: () => appAvatarService.getAll(filterQuery),
    enabled,
  });
};
