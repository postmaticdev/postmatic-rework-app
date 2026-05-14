import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/constants";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const response = NextResponse.json({ ok: true });

  if (typeof body?.accessToken === "string" && body.accessToken) {
    response.cookies.set(ACCESS_TOKEN_KEY, body.accessToken, COOKIE_OPTIONS);
  }

  if (typeof body?.refreshToken === "string" && body.refreshToken) {
    response.cookies.set(REFRESH_TOKEN_KEY, body.refreshToken, {
      ...COOKIE_OPTIONS,
      httpOnly: true,
    });
  }

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_TOKEN_KEY);
  response.cookies.delete(REFRESH_TOKEN_KEY);
  return response;
}
