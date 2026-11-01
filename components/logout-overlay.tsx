"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LogoLoader } from "@/components/base/logo-loader";
import { LOGOUT_OVERLAY_EVENT } from "@/lib/logout-overlay";

// Layar transisi saat logout: sama dengan layar dari auth ke workspace (hanya logo kecil),
// tampil sampai browser berpindah ke halaman auth.
export function LogoutOverlay() {
  const t = useTranslations("authCheck");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener(LOGOUT_OVERLAY_EVENT, show);
    return () => window.removeEventListener(LOGOUT_OVERLAY_EVENT, show);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background animate-in fade-in duration-200"
      aria-live="polite"
    >
      <LogoLoader size={64} strokeWidth={28} hideContentBackground={false} label={t("loggingOut")} />
    </div>
  );
}
