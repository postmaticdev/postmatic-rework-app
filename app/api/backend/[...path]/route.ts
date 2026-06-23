import { NEXT_PUBLIC_API_ORIGIN, REFRESH_TOKEN_KEY } from "@/constants";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const SESSION_PATHS_REQUIRING_REFRESH = new Set([
  "account/session",
  "account/session/all",
  "account/session/logout",
  "account/session/logout-all",
]);

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const joinedPath = path.join("/");
  const upstreamUrl = new URL(
    `/api/${joinedPath}${request.nextUrl.search}`,
    NEXT_PUBLIC_API_ORIGIN
  );

  const headers = new Headers(request.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));

  const refreshToken = request.cookies.get(REFRESH_TOKEN_KEY)?.value;
  if (
    refreshToken &&
    SESSION_PATHS_REQUIRING_REFRESH.has(joinedPath) &&
    !headers.has("X-Postmatic-RefreshToken")
  ) {
    headers.set("X-Postmatic-RefreshToken", refreshToken);
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = new Headers(upstream.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => responseHeaders.delete(header));

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
