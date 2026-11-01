import { NextRequest } from "next/server";
import { forwardAuthRequest } from "../../_shared";

export async function POST(request: NextRequest) {
  const body = await request.text();
  return forwardAuthRequest(request, "/account/session/logout", body);
}
