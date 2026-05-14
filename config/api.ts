import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  NEXT_PUBLIC_API_ORIGIN,
  LOGIN_URL,
} from "@/constants";
import { BaseResponse } from "@/models/api/base-response.type";

const MINUTE = 60_000;

// === Axios instances ===
export const api: AxiosInstance = axios.create({
  baseURL:
    typeof window === "undefined"
      ? `${NEXT_PUBLIC_API_ORIGIN}/api`
      : "/api/backend",
  timeout: MINUTE * 2,
  headers: { "Content-Type": "application/json" },
});

const ACCESS_TOKEN_HEADER = "X-Postmatic-AccessToken";

// Penting: client khusus refresh (tanpa interceptor auth/401)
const refreshApi: AxiosInstance = axios.create({
  baseURL: "",
  timeout: MINUTE,
  headers: { "Content-Type": "application/json" },
});

// === State untuk koordinasi refresh ===
let isRefreshing = false;
type ResolveFn = (token: string) => void;
let refreshSubscribers: ResolveFn[] = [];

// Notifikasi semua subscriber jika token baru tersedia
function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// Tambahkan subscriber baru (request yang menunggu token)
function addRefreshSubscriber(callback: ResolveFn) {
  refreshSubscribers.push(callback);
}

// Util: ambil token dari localStorage (di browser)
function getAccessToken() {
  if (typeof window === "undefined") return null;
  return getCookie(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
}
function getRefreshToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem(REFRESH_TOKEN_KEY)
    : null;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}

function setClientCookie(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (!value) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    return;
  }
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=604800; SameSite=Lax${secure}`;
}

export function setAuthToken(
  accessToken: string | null,
  refreshToken: string | null
) {
  if (typeof window === "undefined") return;
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    setClientCookie(ACCESS_TOKEN_KEY, accessToken);
    api.defaults.headers.common[ACCESS_TOKEN_HEADER] = accessToken;
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setClientCookie(ACCESS_TOKEN_KEY, null);
    delete api.defaults.headers.common[ACCESS_TOKEN_HEADER];
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

function hardLogout() {
  setAuthToken(null, null);
  if (typeof window !== "undefined") {
    window.location.href = LOGIN_URL;
  }
}

// === Request interceptor: sisipkan token header backend baru ===
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers[ACCESS_TOKEN_HEADER] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// === Response interceptor: tangani 401 + refresh flow ===
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Bukan 401? lempar saja
    const status = error.response?.status ?? error?.status;
    const codeFromBody = (error.response?.data as BaseResponse)?.metaData?.code;
    const isUnauthorized = status === 401 || codeFromBody === 401;

    if (!isUnauthorized || !originalConfig) {
      return Promise.reject(error);
    }

    // Sudah pernah di-retry? jangan ulangi (hindari loop)
    if (originalConfig._retry) {
      // refresh sebelumnya gagal/invalid
      hardLogout();
      return Promise.reject(error);
    }
    originalConfig._retry = true;

    try {
      const rToken = getRefreshToken();

      // Tanpa refresh token → tidak bisa lanjut
      if (!rToken) {
        hardLogout();
        return Promise.reject(error);
      }

      // Kalau sedang refresh → antre sampai selesai, lalu ulang request
      if (isRefreshing) {
        const newToken = await new Promise<string>((resolve) => {
          addRefreshSubscriber(resolve);
        });
        // set header baru di request yg diulang
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers[ACCESS_TOKEN_HEADER] = newToken;
        return api.request(originalConfig);
      }

      // Mulai refresh
      isRefreshing = true;

      const refreshResponse = await refreshApi.post<
        BaseResponse<{ accessToken: string; refreshToken: string }>
      >("/api/auth/refresh", { refreshToken: rToken });

      const payload = refreshResponse.data?.data;
      if (!payload?.accessToken || !payload?.refreshToken) {
        // server tidak mengirim data yang diharapkan
        throw new Error("Invalid refresh response");
      }

      // Simpan dan set header default
      setAuthToken(payload.accessToken, payload.refreshToken);

      // Beri tahu semua request yang menunggu
      onRefreshed(payload.accessToken);

      // Ulang request awal dengan token baru
      originalConfig.headers = originalConfig.headers ?? {};
      originalConfig.headers[ACCESS_TOKEN_HEADER] = payload.accessToken;

      return api.request(originalConfig);
    } catch (e) {
      // Refresh gagal → logout
      hardLogout();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);
