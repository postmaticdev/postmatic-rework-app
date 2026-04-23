"use client";

import { AnalyticsCard } from "@/app/[locale]/business/[businessId]/dashboard/(components)/analytics-card";
import { TokenUsageCard } from "@/app/[locale]/business/[businessId]/dashboard/(components)/token-usage-card";
import { TokenUsageAnalytics } from "@/app/[locale]/business/[businessId]/dashboard/(components)/token-usage-analytics";
import { AnalyticsSkeleton } from "@/components/grid-skeleton/analytics-skeleton";
import {
  useContentOverviewGetCountPosted,
  useContentOverviewGetCountUpcoming,
} from "@/services/content/overview";
import { useTokenGetTokenUsage } from "@/services/tier/token.api";
import { useParams } from "next/navigation";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { dateManipulation } from "@/helper/date-manipulation";
import { SchedulePost } from "../../content-scheduler/(components)/schedule-post";
import { useTranslations } from "next-intl";

export function OverviewContent() {
  const d = useTranslations("dashboard");
  const a = useTranslations("analyticsCard");
  const { businessId } = useParams() as { businessId: string };

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
  const isLoadingAnalytics =
    isLoadingCountPosted || isLoadingCountUpcoming || isLoadingTokenUsage;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          {d("overallAnalysis")}
        </h2>

        {isLoadingAnalytics ? (
          <AnalyticsSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
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
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          {d("tokenUsageAnalysis")}
        </h2>

        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="w-full xl:w-2/3">
            <TokenUsageAnalytics />
          </div>
          <div className="w-full xl:w-1/3">
            <SchedulePost onDashboard={true} />
          </div>
        </div>
      </section>
    </div>
  );
}
