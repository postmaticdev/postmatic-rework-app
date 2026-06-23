import { api } from "@/config/api";
import {
  LogoutAllSessionRes,
  ProfilePld,
  ProfileRes,
  Session,
  SessionRes,
  UpdatePasswordPld,
} from "@/models/api/auth/profile.type";
import { BaseResponse } from "@/models/api/base-response.type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { REFRESH_TOKEN_KEY } from "@/constants";

const AUTH_PROFILE_QUERY_KEY = ["authProfile"] as const;
const AUTH_CURRENT_SESSION_QUERY_KEY = ["authCurrentSession"] as const;
const AUTH_SESSIONS_QUERY_KEY = ["authSessions"] as const;

const getRefreshTokenHeader = () => {
  if (typeof window === "undefined") return undefined;

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return undefined;

  return {
    "X-Postmatic-RefreshToken": refreshToken,
  };
};

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
  getCurrentSession: () => {
    return api
      .get<BaseResponse<SessionRes>>("/account/session", {
        headers: getRefreshTokenHeader(),
      })
      .then((res) => {
        const session = res.data.data as SessionRes & {
          imageUrl?: string | null;
        };
        res.data.data = {
          ...session,
          image: session.image ?? session.imageUrl ?? null,
        };
        return res;
      });
  },
  getSessions: () => {
    return api.get<BaseResponse<Session[]>>("/account/session/all", {
      headers: getRefreshTokenHeader(),
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
    return api.post<BaseResponse<LogoutAllSessionRes>>(
      "/account/session/logout-all"
    );
  },
  changePassword: (formData: UpdatePasswordPld) => {
    return api.put<BaseResponse<null>>("/account/profile/password", formData);
  },
};

export const useAuthProfileGetProfile = () => {
  return useQuery({
    queryKey: AUTH_PROFILE_QUERY_KEY,
    queryFn: () => authProfileService.getProfile(),
  });
};

export const useAuthProfileGetCurrentSession = () => {
  return useQuery({
    queryKey: AUTH_CURRENT_SESSION_QUERY_KEY,
    queryFn: () => authProfileService.getCurrentSession(),
  });
};

export const useAuthProfileGetSessions = () => {
  return useQuery({
    queryKey: AUTH_SESSIONS_QUERY_KEY,
    queryFn: () => authProfileService.getSessions(),
  });
};

export const useAuthProfileUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: ProfilePld) =>
      authProfileService.updateProfile(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_QUERY_KEY });
    },
  });
};

export const useAuthProfileLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId?: string) => authProfileService.logout(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: AUTH_CURRENT_SESSION_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: AUTH_SESSIONS_QUERY_KEY });
    },
  });
};

export const useAuthProfileLogoutAll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authProfileService.logoutAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: AUTH_CURRENT_SESSION_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: AUTH_SESSIONS_QUERY_KEY });
    },
  });
};

export const useAuthProfileChangePassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: UpdatePasswordPld) =>
      authProfileService.changePassword(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_QUERY_KEY });
    },
  });
};
