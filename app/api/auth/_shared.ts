import {
  ACCESS_TOKEN_KEY,
  API_ORIGIN,
  NEXT_PUBLIC_API_ORIGIN,
  REFRESH_TOKEN_KEY,
} from "@/constants";
import { NextRequest, NextResponse } from "next/server";

export const ACCESS_TOKEN_HEADER = "X-Postmatic-AccessToken";
export const REFRESH_TOKEN_HEADER = "X-Postmatic-RefreshToken";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const FORWARDED_AUTH_HEADERS = [
  "user-agent",
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "accept-language",
] as const;

type AuthCookieOptions = {
  path: string;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
  domain?: string;
  httpOnly?: boolean;
};

const isPostmaticHostname = (hostname: string) =>
  hostname === "postmatic.id" || hostname.endsWith(".postmatic.id");

export function getBackendApiOrigin() {
  return (API_ORIGIN || NEXT_PUBLIC_API_ORIGIN).replace(/\/$/, "");
}

export function getAuthCookieOptions(request: NextRequest): AuthCookieOptions {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const protocol = request.nextUrl.protocol;
  const domain = isPostmaticHostname(hostname) ? ".postmatic.id" : undefined;

  return {
    path: "/",
    sameSite: "lax",
    secure: protocol === "https:" || process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    ...(domain ? { domain } : {}),
  };
}

export function expireAuthCookie(
  response: NextResponse,
  request: NextRequest,
  name: string,
  httpOnly = false
) {
  const options = getAuthCookieOptions(request);
  const expireOptions = {
    path: options.path,
    sameSite: options.sameSite,
    secure: options.secure,
    maxAge: 0,
    httpOnly,
  };

  response.cookies.set(name, "", expireOptions);

  if (options.domain) {
    response.cookies.set(name, "", {
      ...expireOptions,
      domain: options.domain,
    });
  }
}

export function createForwardedAuthHeaders(request: NextRequest) {
  const headers = new Headers({ "Content-Type": "application/json" });

  FORWARDED_AUTH_HEADERS.forEach((header) => {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  });

  const accessToken =
    request.headers.get(ACCESS_TOKEN_HEADER) ??
    request.cookies.get(ACCESS_TOKEN_KEY)?.value;
  if (accessToken) headers.set(ACCESS_TOKEN_HEADER, accessToken);

  const refreshToken = request.cookies.get(REFRESH_TOKEN_KEY)?.value;
  if (refreshToken) headers.set(REFRESH_TOKEN_HEADER, refreshToken);

  return headers;
}

export async function forwardAuthRequest(
  request: NextRequest,
  upstreamPath: string,
  body?: BodyInit
) {
  const apiOrigin = getBackendApiOrigin();

  if (!apiOrigin) {
    return NextResponse.json(
      {
        metaData: { code: 500, message: "API origin is not configured" },
        responseMessage: "API_ORIGIN_NOT_CONFIGURED",
        data: null,
      },
      { status: 500 }
    );
  }

  const upstream = await fetch(`${apiOrigin}/api${upstreamPath}`, {
    method: request.method,
    headers: createForwardedAuthHeaders(request),
    body,
    cache: "no-store",
  });

  const payload = await upstream.json().catch(() => null);

  return NextResponse.json(payload, { status: upstream.status });
}
