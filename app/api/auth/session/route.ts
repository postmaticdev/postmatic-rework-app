import { NextRequest } from "next/server";
import { forwardAuthRequest } from "../_shared";

export function GET(request: NextRequest) {
  return forwardAuthRequest(request, "/account/session");
}
