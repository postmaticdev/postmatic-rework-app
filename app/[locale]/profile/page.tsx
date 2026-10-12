"use client";

import { Header } from "@/components/base/header";
import { WelcomeSection } from "@/components/base/welcome-section";
import { PersonalInformation } from "@/app/[locale]/profile/(components)/personal-information";
import { DetailInformation } from "@/app/[locale]/profile/(components)/detail-information";
import { BusinessInformation } from "@/app/[locale]/profile/(components)/business-information";
import { SessionLogin } from "@/app/[locale]/profile/(components)/session-login";
import { CreatorDesignInformation } from "@/app/[locale]/profile/(components)/creator-design-information";
import { CreatorDesignProvider } from "@/contexts/creator-design-context";
import { useAuthProfileGetProfile } from "@/services/auth.api";
import { useTranslations } from "next-intl";

export default function Profile() {
  const t = useTranslations("welcomeSection");
  const { data: profile } = useAuthProfileGetProfile();
  const userName = profile?.data?.data?.name;
  const greeting = `${t("welcome")} ${userName}`;
  
  return (
    <CreatorDesignProvider>
      <div className="min-h-dvh bg-background">
        <main className="py-4 sm:py-6 px-4 sm:px-6">
          <WelcomeSection message={t("profile")} title={greeting} />

          {/* Mobile: kolom di-"contents" agar urutan card bisa diatur via order —
              Personal, Bisnis, Desain Creator, Detail, Sesi Login */}
          <div className="flex flex-col lg:flex-row gap-6 w-full ">
            <div className="contents lg:block w-full lg:w-3/5 ">
              <div className="order-1">
                <PersonalInformation />
              </div>
              <div className="hidden lg:block mt-6">
                <CreatorDesignInformation />
              </div>
            </div>
            <div className="contents lg:block w-full lg:w-2/5 lg:space-y-6">
              <div className="order-4">
                <DetailInformation />
              </div>
              <div className="order-2">
                <BusinessInformation />
              </div>
              <div className="order-5">
                <SessionLogin />
              </div>
            </div>
            <div className="order-3 lg:hidden">
              <CreatorDesignInformation />
            </div>
          </div>
        </main>
      </div>
    </CreatorDesignProvider>
  );
}
