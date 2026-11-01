"use client";

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { logoutAndRedirect } from "@/config/api";
import { showToast } from "@/helper/show-toast";
import { showLogoutOverlay } from "@/lib/logout-overlay";
import {
  AUTH_CURRENT_SESSION_QUERY_KEY,
  authProfileService,
} from "@/services/auth.api";

/**
 * Logout dari header (dropdown profil desktop dan menu mobile).
 *
 * API mewajibkan `sessionId` untuk mencabut sesi ini di server, jadi sesi saat
 * ini diambil tepat saat logout (bukan di setiap halaman). Request logout
 * dipanggil langsung, bukan lewat mutation hook, agar tidak memicu refetch
 * profil/sesi dengan token yang baru saja dicabut.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const t = useTranslations();
  const isLoggingOutRef = useRef(false);

  return useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    // Layar loading langsung tampil, tidak menunggu request logout selesai.
    showLogoutOverlay();
    try {
      const session = await queryClient.fetchQuery({
        queryKey: AUTH_CURRENT_SESSION_QUERY_KEY,
        queryFn: () => authProfileService.getCurrentSession(),
        staleTime: 60_000,
      });
      const sessionId = session.data.data?.session?.id;
      if (sessionId) {
        await authProfileService.logout(sessionId);
      }
    } catch {
      // Tetap keluar walaupun pencabutan sesi di server gagal.
    } finally {
      showToast("success", t("toast.auth.logoutSuccess"), t);
      await logoutAndRedirect();
    }
  }, [queryClient, t]);
}
