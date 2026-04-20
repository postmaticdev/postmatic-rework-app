"use client";

import { WelcomeSection } from "@/components/base/welcome-section";
import { AnalyticsCard } from "@/app/[locale]/business/[businessId]/dashboard/(components)/analytics-card";
import { TokenUsageCard } from "@/app/[locale]/business/[businessId]/dashboard/(components)/token-usage-card";
import { TokenUsageAnalytics } from "@/app/[locale]/business/[businessId]/dashboard/(components)/token-usage-analytics";
import { AnalyticsSkeleton } from "@/components/grid-skeleton/analytics-skeleton";
import { useAuthProfileGetProfile } from "@/services/auth.api";
import {
  useContentOverviewGetCountPosted,
  useContentOverviewGetCountUpcoming,
} from "@/services/content/overview";
import { useTokenGetTokenUsage } from "@/services/tier/token.api";
import { useParams } from "next/navigation";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { dateManipulation } from "@/helper/date-manipulation";
import { SchedulePost } from "../content-scheduler/(components)/schedule-post";
import { AutoGenerate } from "./(components)/auto-generate";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PlatformModal } from "../knowledge-base/(components)/platform-modal";

function DashboardInner() {
  const w = useTranslations("welcomeSection");
  const d = useTranslations("dashboard");
  const a = useTranslations("analyticsCard");
  const { data: profile } = useAuthProfileGetProfile();
  const userName = profile?.data?.data?.name;
  const greeting = `${w("welcome")} ${userName}`;
  const { businessId } = useParams() as { businessId: string };

  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const handleIfNoPlatformConnected = () => {
    setIsPlatformModalOpen(true);
  };

  const { data: countPostedData, isLoading: isLoadingCountPosted } =
    useContentOverviewGetCountPosted(businessId, {
      dateStart: dateManipulation.ymd(
        new Date(new Date().setDate(new Date().getDate() - 30))
      ),
    });

  const totalCountPosted = countPostedData?.data?.data?.total || 0;
  const mappedCountPosted = Object.entries(
    countPostedData?.data?.data?.detail || {}
  )
    .filter(([key]) =>
      [
        "linked_in",
        "facebook_page",
        "instagram_business",
        "twitter",
        "tiktok",
      ].includes(key)
    )
    .map(([key, value]) => ({
      label: mapEnumPlatform.getPlatformLabel(key as PlatformEnum),
      value: value,
      color: mapEnumPlatform.getPlaformColor(key as PlatformEnum),
    }));

  const { data: countUpcomingData, isLoading: isLoadingCountUpcoming } =
    useContentOverviewGetCountUpcoming(businessId, {
      dateStart: dateManipulation.ymd(new Date()),
      dateEnd: dateManipulation.ymd(
        new Date(new Date().setDate(new Date().getDate() + 30))
      ),
    });

  const totalCountUpcoming = countUpcomingData?.data?.data?.total || 0;

  const mappedCountUpcoming = Object.entries(
    countUpcomingData?.data?.data?.detail || {}
  )
    .filter(([key]) =>
      [
        "linked_in",
        "facebook_page",
        "instagram_business",
        "twitter",
        "tiktok",
      ].includes(key)
    )
    .map(([key, value]) => ({
      label: mapEnumPlatform.getPlatformLabel(key as PlatformEnum),
      value: value,
      color: mapEnumPlatform.getPlaformColor(key as PlatformEnum),
    }));

  const { isLoading: isLoadingTokenUsage } = useTokenGetTokenUsage(businessId);

  // Combined loading state for analytics section
  const isLoadingAnalytics =
    isLoadingCountPosted || isLoadingCountUpcoming || isLoadingTokenUsage;

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-6 md:ml-0 gap-2">
      <WelcomeSection
        message={w("manageSocialMedia")}
        title={greeting}
        showSubscription={true}
      />

      {/* Analytics Overview */}
      <h1 className="text-xl font-bold text-foreground mb-2">
        {d("overallAnalysis")}
      </h1>

      {isLoadingAnalytics ? (
        <AnalyticsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <AnalyticsCard
            title={a("totalPosting")}
            subtitle={a("totalPostingSubtitle")}
            value={totalCountPosted.toString()}
            breakdown={mappedCountPosted}
          />

          <AnalyticsCard
            title={a("totalUpcoming")}
            subtitle={a("totalUpcomingSubtitle")}
            value={totalCountUpcoming.toString()}
            breakdown={mappedCountUpcoming}
          />

          <TokenUsageCard />
        </div>
      )}
      <h1 className="text-xl font-bold text-foreground mb-2">
        {d("tokenUsageAnalysis")}
      </h1>
      <div className="w-full flex flex-col md:flex-row gap-6 mb-6">
        <div className="w-full md:w-2/3">
          <TokenUsageAnalytics />
        </div>
        <div className="w-full md:w-1/3 ">
          <SchedulePost onDashboard={true} />
        </div>
      </div>

      {/* Auto Generate Section */}
      
      <div className=" w-full">
        <AutoGenerate handleIfNoPlatformConnected={handleIfNoPlatformConnected} />
      </div>

      <PlatformModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
      />
    </main>
  );
}

export default function Dashboard() {
  return <DashboardInner />;
}
