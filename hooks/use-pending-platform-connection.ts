"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

// Flags the auth site appends to the return URL after a platform account is
// picked; ConnectedPlatformForm reads them to finish the connection.
export const PLATFORM_CONNECT_URL_FLAGS = [
  "platformTempCode",
  "tempCode",
  "connectedPlatformTempCode",
  "reconnectPlatform",
];

/**
 * For pages that connect platforms outside the knowledge base: tells whether the
 * user just came back from the auth site (so the platform modal must reopen to
 * finish), and drops the one-shot flags so a refresh does not reopen it.
 */
export function usePendingPlatformConnection() {
  const searchParams = useSearchParams();
  const hasPendingPlatform =
    searchParams.has("platformTempCode") ||
    searchParams.has("tempCode") ||
    searchParams.has("connectedPlatformTempCode");

  const clearPlatformFlags = useCallback(() => {
    const url = new URL(window.location.href);
    if (!PLATFORM_CONNECT_URL_FLAGS.some((key) => url.searchParams.has(key))) {
      return;
    }
    PLATFORM_CONNECT_URL_FLAGS.forEach((key) => url.searchParams.delete(key));
    window.history.replaceState(null, "", url.toString());
  }, []);

  return { hasPendingPlatform, clearPlatformFlags };
}
