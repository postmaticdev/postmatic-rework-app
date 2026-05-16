import type { PlatformEnum } from "@/models/api/knowledge/platform.type";

export const NEXT_PUBLIC_API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || "";
export const API_ORIGIN = process.env.API_ORIGIN || "";
export const NEXT_PUBLIC_AUTH_ORIGIN =
  process.env.NEXT_PUBLIC_AUTH_ORIGIN || "https://auth.postmatic.id";
export const NEXT_PUBLIC_ENABLE_SOCKET =
  process.env.NEXT_PUBLIC_ENABLE_SOCKET === "true";
export const NEXT_PUBLIC_SOCKET_ORIGIN =
  process.env.NEXT_PUBLIC_SOCKET_ORIGIN || NEXT_PUBLIC_API_ORIGIN;
export const NEXT_PUBLIC_SOCKET_PATH =
  process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io";
export const NEXT_PUBLIC_ENABLE_CONTENT_FEATURES =
  process.env.NEXT_PUBLIC_ENABLE_CONTENT_FEATURES === "true";
export const DEFAULT_USER_AVATAR = "/user.png";
export const DEFAULT_BUSINESS_IMAGE = "/business.png";
export const DEFAULT_PRODUCT_IMAGE = "/product.png";
export const DEFAULT_PLACEHOLDER_IMAGE = "/placeholder.png";

export const LANDING_PAGE_URL = process.env.NEXT_PUBLIC_LANDING_PAGE_URL || "https://postmatic.id";

export const DOCUMENTATION_PAGE_URL = "https://docs.postmatic.id";

export const ACCESS_TOKEN_KEY = "postmaticAccessToken";
export const REFRESH_TOKEN_KEY = "postmaticRefreshToken";

export const LOGIN_URL = NEXT_PUBLIC_AUTH_ORIGIN;

export const SOCIAL_MEDIA_PLATFORMS: PlatformEnum[] = [
  "facebook_page",
  "instagram_business",
  "linked_in",
];
