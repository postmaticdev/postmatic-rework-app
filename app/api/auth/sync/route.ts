import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/constants";
import { NextRequest, NextResponse } from "next/server";
import { expireAuthCookie, getAuthCookieOptions } from "../_shared";

export async function POST(request: NextRequest) {
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
  const response = NextResponse.json({ ok: true });
  expireAuthCookie(response, request, ACCESS_TOKEN_KEY);
  expireAuthCookie(response, request, REFRESH_TOKEN_KEY, true);
  return response;
}
