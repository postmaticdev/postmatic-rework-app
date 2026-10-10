"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { countBusiness } from "@/services/business.api";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/constants";
import { LogoLoader } from "@/components/base/logo-loader";
import { setAuthToken } from "@/config/api";
import { useQueryClient } from "@tanstack/react-query";

export default function Home() {
  useCheckBusiness();
  return (
    <div className="flex justify-center items-center h-[calc(100vh-64px)]">
      <LogoLoader />
    </div>
  );
}

const useCheckBusiness = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  return useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      let tokenFromParam = params.get("postmaticAccessToken");
      if (tokenFromParam) tokenFromParam = tokenFromParam.replace(/ /g, "+");

      let refreshTokenFromParam = params.get("postmaticRefreshToken");
      if (refreshTokenFromParam) refreshTokenFromParam = refreshTokenFromParam.replace(/ /g, "+");
      const rootBusinessIdFromParam = params.get("rootBusinessId");

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

      countBusiness()
        .then((totalBusiness) => {
          if (!totalBusiness || totalBusiness === 0) {
            console.log("no business");
            router.replace("/business/new-business");
          } else if (rootBusinessIdFromParam) {
            console.log("rootBusinessIdFromParam", rootBusinessIdFromParam);
            router.replace(`/business/${rootBusinessIdFromParam}`);
          } else {
            console.log("business");
            router.replace("/business");
          }
        })
        .catch((error) => {
          console.log("error", error);
          const is404 = error?.response?.status === 404;
          if (is404) {
            router.replace("/business/new-business");
          } else {
            router.replace("/business");
          }
        });

      console.log("done");
    };

    run();
  }, [queryClient, router]);
};
