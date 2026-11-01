import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/constants";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthCookieOptions,
  getBackendApiOrigin,
  isSameOriginRequest,
} from "../_shared";

type RefreshResponse = {
  metaData?: { code?: number; message?: string };
  responseMessage?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

const FORWARDED_REFRESH_HEADERS = [
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

export async function POST(request: NextRequest) {
  // Refresh menulis cookie sesi: tolak request lintas origin, dan hanya pakai
  // refresh token dari cookie httpOnly (bukan dari body) agar halaman lain
  // tidak bisa menanamkan sesi miliknya ke browser korban (login CSRF).
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        metaData: { code: 403, message: "Forbidden" },
        responseMessage: "CROSS_ORIGIN_REQUEST_REJECTED",
        data: null,
      },
      { status: 403 }
    );
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_KEY)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      {
        metaData: { code: 401, message: "Unauthorized" },
        responseMessage: "REFRESH_TOKEN_NOT_FOUND",
        data: null,
      },
      { status: 401 }
    );
  }

  const headers = new Headers({
    "Content-Type": "application/json",
  });

  FORWARDED_REFRESH_HEADERS.forEach((header) => {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  });

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

  const upstream = await fetch(`${apiOrigin}/api/account/auth/refresh-token`, {
    method: "POST",
    headers,
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  const payload = (await upstream.json().catch(() => null)) as
    | RefreshResponse
    | null;
  const responsePayload = payload
    ? {
        ...payload,
        data: payload.data
          ? { ...payload.data, refreshToken: undefined }
          : payload.data,
      }
    : payload;
  const response = NextResponse.json(responsePayload, {
    status: upstream.status,
  });

  const accessToken = payload?.data?.accessToken;
  const nextRefreshToken = payload?.data?.refreshToken;
  if (upstream.ok && accessToken) {
    response.cookies.set(ACCESS_TOKEN_KEY, accessToken, getAuthCookieOptions(request, accessToken));
  }

  // The API returns the same refresh token until it rotates it near expiry.
  // Only write it when it changed: rewriting an unchanged token would only
  // re-extend a cookie whose lifetime should follow the token's own `exp`.
  if (upstream.ok && nextRefreshToken && nextRefreshToken !== refreshToken) {
    response.cookies.set(REFRESH_TOKEN_KEY, nextRefreshToken, {
      ...getAuthCookieOptions(request, nextRefreshToken),
      httpOnly: true,
    });
  }

  return response;
}
