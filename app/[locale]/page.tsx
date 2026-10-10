"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { countBusiness } from "@/services/business.api";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/constants";
import { LogoLoader } from "@/components/base/logo-loader";
import { Button } from "@/components/ui/button";
import {
  isAuthRedirectBlocked,
  isAuthRedirecting,
  logoutAndRedirect,
  resetAuthRedirectLoop,
  setAuthToken,
} from "@/config/api";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type CheckStatus = "loading" | "error" | "auth-loop";

export default function Home() {
  const t = useTranslations("authCheck");
  const { status, retry } = useCheckBusiness();

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <LogoLoader />
      </div>
    );
  }

  const isAuthLoop = status === "auth-loop";

  return (
    <div className="flex justify-center items-center h-[calc(100vh-64px)] px-4">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          {isAuthLoop ? t("loopTitle") : t("errorTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAuthLoop ? t("loopDescription") : t("errorDescription")}
        </p>
        {isAuthLoop ? (
          <Button onClick={() => logoutAndRedirect()}>{t("relogin")}</Button>
        ) : (
          <Button onClick={retry}>{t("retry")}</Button>
        )}
      </div>
    </div>
  );
}

const useCheckBusiness = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasRun = useRef(false);
  const [status, setStatus] = useState<CheckStatus>("loading");

  const checkBusiness = useCallback(async () => {
    setStatus("loading");

    const params = new URLSearchParams(window.location.search);
    const rootBusinessIdFromParam = params.get("rootBusinessId");

    try {
      const totalBusiness = await countBusiness();
      // Sesi terbukti valid: reset penghitung redirect login.
      resetAuthRedirectLoop();

      if (!totalBusiness) {
        router.replace("/business/new-business");
      } else if (rootBusinessIdFromParam) {
        router.replace(
          `/business/${encodeURIComponent(rootBusinessIdFromParam)}`
        );
      } else {
        router.replace("/business");
      }
    } catch (error) {
      console.error("check business failed", error);
      // Browser sudah diarahkan ke halaman login: biarkan loader tampil.
      if (isAuthRedirecting()) return;
      // Jangan arahkan ke new-business saat error, agar user yang sudah punya
      // bisnis tidak diminta membuat bisnis baru.
      setStatus(isAuthRedirectBlocked() ? "auth-loop" : "error");
    }
  }, [router]);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      let tokenFromParam = params.get("postmaticAccessToken");
      if (tokenFromParam) tokenFromParam = tokenFromParam.replace(/ /g, "+");

      let refreshTokenFromParam = params.get("postmaticRefreshToken");
      if (refreshTokenFromParam) refreshTokenFromParam = refreshTokenFromParam.replace(/ /g, "+");

      if (tokenFromParam || refreshTokenFromParam) {
        const accessToken =
          tokenFromParam ?? localStorage.getItem(ACCESS_TOKEN_KEY);

        const refreshToken =
          refreshTokenFromParam ?? localStorage.getItem(REFRESH_TOKEN_KEY);

        setAuthToken(accessToken, refreshToken);
        queryClient.clear();

        await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: tokenFromParam,
            refreshToken: refreshTokenFromParam,
          }),
        }).catch(() => undefined);

        params.delete("postmaticAccessToken");
        params.delete("postmaticRefreshToken");

        const nextQuery = params.toString();
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${
            window.location.hash
          }`
        );
      }

      await checkBusiness();
    };

    run();
  }, [checkBusiness, queryClient]);

  return { status, retry: checkBusiness };
};
