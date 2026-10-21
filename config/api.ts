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
import { destroySocket } from "@/lib/socket";
import { getJwtMaxAge } from "@/lib/jwt";
import { showLogoutOverlay } from "@/lib/logout-overlay";

const MINUTE = 60_000;
const ACCESS_TOKEN_HEADER = "X-Postmatic-AccessToken";
const API_BASE_URL = NEXT_PUBLIC_API_ORIGIN
  ? `${NEXT_PUBLIC_API_ORIGIN.replace(/\/$/, "")}/api`
  : "/api";

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: MINUTE * 2,
  headers: { "Content-Type": "application/json" },
});

export const workspaceApi: AxiosInstance = axios.create({
  baseURL: "",
  timeout: MINUTE * 2,
  headers: { "Content-Type": "application/json" },
});

const refreshApi: AxiosInstance = axios.create({
  baseURL: "",
  timeout: MINUTE,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
type RefreshSubscriber = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};
let refreshSubscribers: RefreshSubscriber[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((s) => s.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(error: unknown) {
  refreshSubscribers.forEach((s) => s.reject(error));
  refreshSubscribers = [];
}

function addRefreshSubscriber(subscriber: RefreshSubscriber) {
  refreshSubscribers.push(subscriber);
}

function getAccessToken() {
  if (typeof window === "undefined") return null;
  return getCookie(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * 401 dari backend yang merupakan error bisnis (bukan token invalid/expired).
 * Untuk kode ini jangan refresh token dan jangan logout, cukup teruskan error
 * ke pemanggil (mis. user Google membuka "ganti password" ->
 * CREDENTIAL_USER_NOT_FOUND).
 */
const NON_SESSION_UNAUTHORIZED_MESSAGES = new Set([
  "CREDENTIAL_USER_NOT_FOUND",
  "ACCOUNT_USES_GOOGLE_SIGN_IN",
  "INVALID_SESSION_ID",
  "INVALID_CREDENTIALS",
  "EMAIL_NOT_VERIFIED",
  "EMAIL_NOT_FOUND",
  "INVALID_SIGNATURE",
]);

const REFRESH_LOCK_NAME = "postmatic-auth-refresh";

function readRequestToken(config: AxiosRequestConfig) {
  const headers = config.headers as
    | (Record<string, unknown> & { get?: (name: string) => unknown })
    | undefined;
  if (!headers) return null;
  const value =
    typeof headers.get === "function"
      ? headers.get(ACCESS_TOKEN_HEADER)
      : headers[ACCESS_TOKEN_HEADER];
  return typeof value === "string" ? value : null;
}

/**
 * Jalankan refresh di bawah Web Lock lintas tab. Bila tab lain sudah me-refresh
 * selama kita menunggu lock (access token di cookie/localStorage sudah berbeda
 * dari token request yang gagal), pakai token itu tanpa refresh ulang. Ini
 * mencegah tab kedua mengirim refresh token lama yang sudah dirotasi lalu
 * ter-logout.
 */
async function runRefreshExclusive(
  failedToken: string | null,
  refresh: () => Promise<string>
): Promise<string> {
  const locks =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { locks?: LockManager }).locks
      : undefined;
  if (!locks?.request) return refresh();

  return locks.request(REFRESH_LOCK_NAME, async () => {
    const current = getAccessToken();
    if (current && failedToken && current !== failedToken) {
      api.defaults.headers.common[ACCESS_TOKEN_HEADER] = current;
      return current;
    }
    return refresh();
  });
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}

function getClientCookieDomain() {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname.toLowerCase();
  return hostname === "postmatic.id" || hostname.endsWith(".postmatic.id")
    ? "; Domain=.postmatic.id"
    : "";
}

function setClientCookie(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const domain = getClientCookieDomain();
  if (!value) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    if (domain) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}${domain}`;
    }
    return;
  }

  // Expire together with the token (JWT `exp`), like the server-set cookies.
  const maxAge = getJwtMaxAge(value) ?? 604800;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}${domain}`;
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

  // Refresh token hanya disimpan di cookie httpOnly (diset postmatic-auth,
  // /api/auth/sync, atau /api/auth/refresh). Jangan pernah simpan di
  // localStorage karena bisa dibaca JavaScript; hapus sisa versi lama.
  void refreshToken;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * postmatic-auth hanya menyimpan token di cookie. Bila cookie berisi token
 * baru, selaraskan localStorage dan buang refresh token lama di sana agar
 * tidak tercampur dengan sesi/user sebelumnya. Return true bila berubah.
 */
export function adoptCookieSession() {
  if (typeof window === "undefined") return false;
  const cookieToken = getCookie(ACCESS_TOKEN_KEY);
  if (!cookieToken || cookieToken === localStorage.getItem(ACCESS_TOKEN_KEY)) {
    return false;
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, cookieToken);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  return true;
}

// ===== Session cleanup & redirect ke halaman login =====

const AUTH_REDIRECT_LOG_KEY = "postmaticAuthRedirectLog";
const AUTH_REDIRECT_WINDOW_MS = 5 * 60_000;
const AUTH_REDIRECT_MAX = 3;
const CLEAR_SESSION_TIMEOUT_MS = 3_000;

let isRedirectingToLogin = false;
let isAuthBlocked = false;
let hardLogoutPromise: Promise<void> | null = null;

function readAuthRedirectLog(): number[] {
  try {
    const raw = sessionStorage.getItem(AUTH_REDIRECT_LOG_KEY);
    const log = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(log)) return [];
    const now = Date.now();
    return log.filter(
      (t): t is number =>
        typeof t === "number" && now - t < AUTH_REDIRECT_WINDOW_MS
    );
  } catch {
    return [];
  }
}

function recordAuthRedirect() {
  try {
    const log = [...readAuthRedirectLog(), Date.now()];
    sessionStorage.setItem(AUTH_REDIRECT_LOG_KEY, JSON.stringify(log));
  } catch {
    // sessionStorage tidak tersedia, abaikan
  }
}

/** Dipanggil setelah sesi terbukti valid agar penghitung loop kembali nol. */
export function resetAuthRedirectLoop() {
  isAuthBlocked = false;
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_LOG_KEY);
  } catch {
    // abaikan
  }
}

/** True saat browser sedang diarahkan ke halaman login. */
export function isAuthRedirecting() {
  return isRedirectingToLogin;
}

/**
 * True bila redirect ke login sudah terjadi berulang kali dalam waktu singkat
 * (login -> app -> 401 -> login -> ...). Redirect otomatis dihentikan agar
 * tidak looping; UI harus menawarkan tombol login ulang.
 */
export function isAuthRedirectBlocked() {
  return isAuthBlocked;
}

/**
 * Hapus token di localStorage, cookie non-httpOnly, dan cookie httpOnly
 * (lewat /api/auth/sync). Ditunggu sampai selesai agar halaman login tidak
 * lagi melihat sesi lama lalu memantul balik ke app.
 */
export async function clearAuthSession() {
  setAuthToken(null, null);
  if (typeof window === "undefined") return;
  destroySocket();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLEAR_SESSION_TIMEOUT_MS);
  try {
    await fetch("/api/auth/sync", {
      method: "DELETE",
      keepalive: true,
      signal: controller.signal,
    });
  } catch {
    // tetap lanjut ke login walaupun gagal
  } finally {
    clearTimeout(timer);
  }
}

/**
 * URL halaman login dengan `from` = origin app ini, supaya setelah login
 * postmatic-auth mengembalikan user ke sini (bukan ke default from-nya).
 */
export function getLoginUrl() {
  const url = new URL("/login", LOGIN_URL);
  if (typeof window !== "undefined") {
    url.searchParams.set("from", `${window.location.origin}/`);
  }
  return url.toString();
}

/** Logout manual: bersihkan sesi lalu pindah ke halaman login. */
export async function logoutAndRedirect() {
  showLogoutOverlay();
  isRedirectingToLogin = true;
  resetAuthRedirectLoop();
  await clearAuthSession();
  window.location.href = getLoginUrl();
}

function hardLogout() {
  if (typeof window === "undefined") return Promise.resolve();
  if (hardLogoutPromise) return hardLogoutPromise;

  hardLogoutPromise = (async () => {
    await clearAuthSession();

    if (readAuthRedirectLog().length >= AUTH_REDIRECT_MAX) {
      isAuthBlocked = true;
      return;
    }

    isRedirectingToLogin = true;
    recordAuthRedirect();
    showLogoutOverlay();
    window.location.href = getLoginUrl();
  })().finally(() => {
    if (!isRedirectingToLogin) hardLogoutPromise = null;
  });

  return hardLogoutPromise;
}

function applyAuthInterceptors(instance: AxiosInstance) {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken();
      if (token) {
        config.headers = config.headers ?? {};
        if (typeof config.headers.set === "function") {
          config.headers.set(ACCESS_TOKEN_HEADER, token);
        } else {
          config.headers[ACCESS_TOKEN_HEADER] = token;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalConfig = error.config as
        | (AxiosRequestConfig & { _retry?: boolean })
        | undefined;

      const status = error.response?.status ?? error?.status;
      const responseBody = error.response?.data as BaseResponse | undefined;
      const codeFromBody = responseBody?.metaData?.code;
      const isUnauthorized = status === 401 || codeFromBody === 401;

      if (!isUnauthorized || !originalConfig) {
        return Promise.reject(error);
      }

      if (
        responseBody?.responseMessage &&
        NON_SESSION_UNAUTHORIZED_MESSAGES.has(responseBody.responseMessage)
      ) {
        return Promise.reject(error);
      }

      // Sedang/sudah diarahkan ke login: jangan refresh ulang.
      if (isRedirectingToLogin || isAuthBlocked) {
        return Promise.reject(error);
      }

      if (originalConfig._retry) {
        await hardLogout();
        return Promise.reject(error);
      }
      originalConfig._retry = true;

      if (isRefreshing) {
        let newToken: string;
        try {
          newToken = await new Promise<string>((resolve, reject) => {
            addRefreshSubscriber({ resolve, reject });
          });
        } catch (e) {
          return Promise.reject(e);
        }
        originalConfig.headers = originalConfig.headers ?? {};
        if (typeof originalConfig.headers.set === "function") {
          originalConfig.headers.set(ACCESS_TOKEN_HEADER, newToken);
        } else {
          originalConfig.headers[ACCESS_TOKEN_HEADER] = newToken;
        }
        return instance.request(originalConfig);
      }

      isRefreshing = true;
      try {
        const newAccessToken = await runRefreshExclusive(
          readRequestToken(originalConfig),
          async () => {
            // Refresh token dikirim otomatis lewat cookie httpOnly.
            const refreshResponse = await refreshApi.post<
              BaseResponse<{ accessToken: string; refreshToken?: string }>
            >("/api/auth/refresh", {});

            const payload = refreshResponse.data?.data;
            if (!payload?.accessToken) {
              throw new Error("Invalid refresh response");
            }

            setAuthToken(payload.accessToken, null);
            return payload.accessToken;
          }
        );

        onRefreshed(newAccessToken);

        originalConfig.headers = originalConfig.headers ?? {};
        if (typeof originalConfig.headers.set === "function") {
          originalConfig.headers.set(ACCESS_TOKEN_HEADER, newAccessToken);
        } else {
          originalConfig.headers[ACCESS_TOKEN_HEADER] = newAccessToken;
        }

        isRefreshing = false;
        return instance.request(originalConfig);
      } catch (e) {
        // Server/jaringan bermasalah (bukan sesi invalid): jangan logout,
        // supaya tidak memantul ke login lalu kembali ke app berulang kali.
        const refreshStatus = (e as AxiosError)?.response?.status;
        const isServerOrNetworkError =
          axios.isAxiosError(e) && (!refreshStatus || refreshStatus >= 500);
        if (!isServerOrNetworkError) {
          // Logout dulu sebelum menolak request yang menunggu, agar pemanggil
          // sudah bisa membaca isAuthRedirecting()/isAuthRedirectBlocked()
          // (mis. halaman root menampilkan "login ulang", bukan "coba lagi").
          await hardLogout();
        }

        isRefreshing = false;
        onRefreshFailed(e);
        return Promise.reject(e);
      }
    }
  );
}

applyAuthInterceptors(api);
applyAuthInterceptors(workspaceApi);
