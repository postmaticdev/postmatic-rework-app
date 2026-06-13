"use client";

import { useEffect } from "react";
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

  return useEffect(() => {
    /* Ambil token dari query string */
    const params = new URLSearchParams(window.location.search);
    const tokenFromParam = params.get("postmaticAccessToken");
    const refreshTokenFromParam = params.get("postmaticRefreshToken");
    const rootBusinessIdFromParam = params.get("rootBusinessId");

    /* 🔹 Jika ada token di query param */
    if (tokenFromParam || refreshTokenFromParam) {
      const accessToken =
        tokenFromParam ?? localStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken =
        refreshTokenFromParam ?? localStorage.getItem(REFRESH_TOKEN_KEY);

      // Update both localStorage and the cookie before any authenticated request.
      setAuthToken(accessToken, refreshToken);

      // Cached queries are shared between accounts and must not cross sessions.
      queryClient.clear();

      fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: tokenFromParam,
          refreshToken: refreshTokenFromParam,
        }),
      }).catch(() => undefined);
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
      });

    console.log("done");

    return;
  }, [queryClient, router]);
};
