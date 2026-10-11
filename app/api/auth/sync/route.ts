import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/constants";
import { NextRequest, NextResponse } from "next/server";
import {
  expireAuthCookie,
  getAuthCookieOptions,
  isSameOriginRequest,
} from "../_shared";

const forbidden = () =>
  NextResponse.json(
    {
      metaData: { code: 403, message: "Forbidden" },
      responseMessage: "CROSS_ORIGIN_REQUEST_REJECTED",
      data: null,
    },
    { status: 403 }
  );

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return forbidden();

  const body = await request.json().catch(() => ({}));
  const response = NextResponse.json({ ok: true });
  const cookieOptions = getAuthCookieOptions(request);

  if (typeof body?.accessToken === "string" && body.accessToken) {
    response.cookies.set(ACCESS_TOKEN_KEY, body.accessToken, cookieOptions);
  }

  if (typeof body?.refreshToken === "string" && body.refreshToken) {
    response.cookies.set(REFRESH_TOKEN_KEY, body.refreshToken, {
      ...cookieOptions,
      httpOnly: true,
    });
  }

  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) return forbidden();

  const response = NextResponse.json({ ok: true });
  expireAuthCookie(response, request, ACCESS_TOKEN_KEY);
  expireAuthCookie(response, request, REFRESH_TOKEN_KEY, true);
  return response;
}
