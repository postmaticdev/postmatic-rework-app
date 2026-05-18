"use client";

import { useMemo, useState } from "react";
import { AnalyticsCard } from "@/app/[locale]/business/[businessId]/dashboard/(components)/analytics-card";
import { TokenUsageCard } from "@/app/[locale]/business/[businessId]/dashboard/(components)/token-usage-card";
import { TokenUsageAnalytics } from "@/app/[locale]/business/[businessId]/dashboard/(components)/token-usage-analytics";
import { AnalyticsSkeleton } from "@/components/grid-skeleton/analytics-skeleton";
import { Button } from "@/components/ui/button";
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
import { useDateFormat } from "@/hooks/use-date-format";
import type { FilterQuery } from "@/models/api/base-response.type";
import type { TimePeriod } from "@/lib/chart-data-generator";

interface Period {
  value: TimePeriod;
  label: string;
  labelStart: string;
  labelEnd: string;
  filterQuery: Partial<FilterQuery>;
}

export function OverviewContent() {
  const d = useTranslations("dashboard");
  const a = useTranslations("analyticsCard");
  const p = useTranslations("periodSelector");
  const { formatDate } = useDateFormat();
  const { businessId } = useParams() as { businessId: string };
  const [period, setPeriod] = useState<TimePeriod>("30d");

  const periods: Period[] = useMemo(
    () => [
      {
        value: "7d",
        label: p("weekly"),
        labelStart: formatDate(
          new Date(new Date().setDate(new Date().getDate() - 7))
        ),
        labelEnd: formatDate(new Date()),
        filterQuery: {
          page: 1,
          dateStart: dateManipulation.ymd(
            new Date(new Date().setDate(new Date().getDate() - 7))
          ),
        },
      },
      {
        value: "30d",
        label: p("monthly"),
        labelStart: formatDate(
          new Date(new Date().setDate(new Date().getDate() - 30))
        ),
        labelEnd: formatDate(new Date()),
        filterQuery: {
          page: 7,
          dateStart: dateManipulation.ymd(
            new Date(new Date().setDate(new Date().getDate() - 30))
          ),
        },
      },
      {
        value: "1y",
        label: p("yearly"),
        labelStart: formatDate(
          new Date(new Date().setFullYear(new Date().getFullYear() - 1))
        ),
        labelEnd: formatDate(new Date()),
        filterQuery: {
          page: 30,
          dateStart: dateManipulation.ymd(
            new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          ),
        },
      },
    ],
    [formatDate, p]
  );

  const selectedPeriod = periods.find((item) => item.value === period) || periods[0];
  const dateRangeLabel = `${selectedPeriod.labelStart} - ${selectedPeriod.labelEnd}`;

  const { data: countPostedData, isLoading: isLoadingCountPosted } =
    useContentOverviewGetCountPosted(businessId, selectedPeriod.filterQuery);

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {d("overallAnalysis")}
            </h2>
            <p className="text-sm text-muted-foreground">{dateRangeLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {p("period")}:
            </span>
            {periods.map((item) => (
              <Button
                key={item.value}
                onClick={() => setPeriod(item.value)}
                variant={period === item.value ? "default" : "outline"}
                size="sm"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoadingAnalytics ? (
          <AnalyticsSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <AnalyticsCard
              title={a("totalPosting")}
              subtitle={a("totalPostingSubtitlePeriod", {
                period: selectedPeriod.label.toLowerCase(),
              })}
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

      <section>
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TokenUsageAnalytics
              period={period}
              selectedPeriod={selectedPeriod}
            />
          </div>
          <div>
            <SchedulePost onDashboard={true} />
          </div>
        </div>
      </section>
    </div>
  );
}
