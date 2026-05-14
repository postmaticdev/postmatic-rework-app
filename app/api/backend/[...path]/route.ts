import { NEXT_PUBLIC_API_ORIGIN } from "@/constants";
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

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const upstreamUrl = new URL(
    `/api/${path.join("/")}${request.nextUrl.search}`,
    NEXT_PUBLIC_API_ORIGIN
  );

  const headers = new Headers(request.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));

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
