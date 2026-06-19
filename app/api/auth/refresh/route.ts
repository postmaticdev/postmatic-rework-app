import { ACCESS_TOKEN_KEY, NEXT_PUBLIC_API_ORIGIN, REFRESH_TOKEN_KEY } from "@/constants";
import { NextRequest, NextResponse } from "next/server";

type RefreshResponse = {
  metaData?: { code?: number; message?: string };
  responseMessage?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

const COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
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
  const refreshToken =
    request.cookies.get(REFRESH_TOKEN_KEY)?.value ?? body?.refreshToken;

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

  const upstream = await fetch(
    `${NEXT_PUBLIC_API_ORIGIN}/api/account/auth/refresh-token`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }
  );

  const payload = (await upstream.json().catch(() => null)) as
    | RefreshResponse
    | null;
  const response = NextResponse.json(payload, { status: upstream.status });

  const accessToken = payload?.data?.accessToken;
  const nextRefreshToken = payload?.data?.refreshToken;

  if (upstream.ok && accessToken) {
    response.cookies.set(ACCESS_TOKEN_KEY, accessToken, COOKIE_OPTIONS);
  }

  if (upstream.ok && nextRefreshToken) {
    response.cookies.set(REFRESH_TOKEN_KEY, nextRefreshToken, {
      ...COOKIE_OPTIONS,
      httpOnly: true,
    });
  }

  return response;
}
