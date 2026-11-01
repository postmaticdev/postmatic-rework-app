import { NextRequest } from "next/server";
import { forwardAuthRequest } from "../../_shared";

export function POST(request: NextRequest) {
  return forwardAuthRequest(request, "/account/session/logout-all");
}
