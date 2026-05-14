import { api } from "@/config/api";
import {
  ProfilePld,
  ProfileRes,
  UpdatePasswordPld,
} from "@/models/api/auth/profile.type";
import { BaseResponse } from "@/models/api/base-response.type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const authProfileService = {
  getProfile: () => {
    return api.get<BaseResponse<ProfileRes>>(`/account/profile`).then((res) => {
      const profile = res.data.data as ProfileRes & { imageUrl?: string | null };
      res.data.data = {
        ...profile,
        image: profile.image ?? profile.imageUrl ?? null,
      };
      return res;
    });
  },
  updateProfile: (formData: ProfilePld) => {
    return api.put<BaseResponse<ProfileRes>>("/account/profile", {
      countryCode: formData.countryCode,
      countrycode: formData.countryCode,
      description: formData.description,
      imageUrl: formData.image,
      imageurl: formData.image,
      name: formData.name,
      phone: formData.phone,
    });
  },
  logout: (sessionId?: string) => {
    return api.post<BaseResponse<null>>("/account/session/logout", {
      sessionId,
    });
  },
  logoutAll: () => {
    return api.post<BaseResponse<null>>("/account/session/logout-all");
  },
  changePassword: (formData: UpdatePasswordPld) => {
    return api.put<BaseResponse<null>>("/account/profile/password", formData);
  },
};

export const useAuthProfileGetProfile = () => {
  return useQuery({
    queryKey: ["authProfile"],
    queryFn: () => authProfileService.getProfile(),
  });
};

export const useAuthProfileUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: ProfilePld) =>
      authProfileService.updateProfile(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authProfile"] });
    },
  });
};

export const useAuthProfileLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId?: string) => authProfileService.logout(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authProfile"] });
    },
  });
};

export const useAuthProfileLogoutAll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authProfileService.logoutAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authProfile"] });
    },
  });
};

export const useAuthProfileChangePassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: UpdatePasswordPld) =>
      authProfileService.changePassword(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authProfile"] });
    },
  });
};
