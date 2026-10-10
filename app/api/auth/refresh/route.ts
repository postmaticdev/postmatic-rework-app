import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/constants";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthCookieOptions,
  getBackendApiOrigin,
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
  const body = await request.json().catch(() => ({}));
  const cookieRefreshToken = request.cookies.get(REFRESH_TOKEN_KEY)?.value;
  const bodyRefreshToken =
    typeof body?.refreshToken === "string" ? body.refreshToken : undefined;

  // Cookie diutamakan; token dari body dipakai bila cookie tidak ada/basi.
  const refreshTokens = [cookieRefreshToken, bodyRefreshToken].filter(
    (token, index, list): token is string =>
      !!token && list.indexOf(token) === index
  );

  if (refreshTokens.length === 0) {
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

  let upstream!: Response;
  for (const refreshToken of refreshTokens) {
    upstream = await fetch(`${apiOrigin}/api/account/auth/refresh-token`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    // Hanya coba token berikutnya bila token ini ditolak (4xx), bukan saat server error.
    if (upstream.ok || upstream.status >= 500) break;
  }

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
  const cookieOptions = getAuthCookieOptions(request);

  if (upstream.ok && accessToken) {
    response.cookies.set(ACCESS_TOKEN_KEY, accessToken, cookieOptions);
  }

  if (upstream.ok && nextRefreshToken) {
    response.cookies.set(REFRESH_TOKEN_KEY, nextRefreshToken, {
      ...cookieOptions,
      httpOnly: true,
    });
  }

  return response;
}
