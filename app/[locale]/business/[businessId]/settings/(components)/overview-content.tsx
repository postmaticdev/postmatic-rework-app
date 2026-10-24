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
import { CalendarClock, FileText } from "lucide-react";

interface Period {
  value: TimePeriod;
  label: string;
  labelStart: string;
  labelEnd: string;
  filterQuery: Partial<FilterQuery>;
  futureFilterQuery: Partial<FilterQuery>;
}

export function OverviewContent() {
  const d = useTranslations("dashboard");
  const a = useTranslations("analyticsCard");
  const p = useTranslations("periodSelector");
  const { formatDate } = useDateFormat();
  const { businessId } = useParams() as { businessId: string };
  const [period, setPeriod] = useState<TimePeriod>("30d");

  const periods: Period[] = useMemo(() => {
    // Ranges include today, so "7 Days" spans exactly 7 calendar days.
    const today = new Date();
    const shiftDays = (days: number) =>
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    const lastYearStart = new Date(
      today.getFullYear() - 1,
      today.getMonth(),
      today.getDate() + 1
    );
    const nextYearEnd = new Date(
      today.getFullYear() + 1,
      today.getMonth(),
      today.getDate() - 1
    );

    const buildPeriod = (
      value: TimePeriod,
      label: string,
      start: Date,
      futureEnd: Date,
      bucketDays: number
    ): Period => ({
      value,
      label,
      labelStart: formatDate(start),
      labelEnd: formatDate(today),
      filterQuery: {
        dateStart: dateManipulation.ymd(start),
        dateEnd: dateManipulation.ymd(today),
        limit: bucketDays,
      },
      futureFilterQuery: {
        dateStart: dateManipulation.ymd(today),
        dateEnd: dateManipulation.ymd(futureEnd),
      },
    });

    return [
      buildPeriod("7d", p("weekly"), shiftDays(-6), shiftDays(6), 1),
      buildPeriod("30d", p("monthly"), shiftDays(-29), shiftDays(29), 1),
      buildPeriod("1y", p("yearly"), lastYearStart, nextYearEnd, 30),
    ];
  }, [formatDate, p]);

  const selectedPeriod = periods.find((item) => item.value === period) || periods[0];
  const dateRangeLabel = `${selectedPeriod.labelStart} - ${selectedPeriod.labelEnd}`;
  const upcomingFilterQuery = {
    ...selectedPeriod.futureFilterQuery,
    includeDrafts: false,
  };
  const periodLabel = selectedPeriod.label.toLowerCase();

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
        "instagram_professional",
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
    useContentOverviewGetCountUpcoming(businessId, upcomingFilterQuery);

  const totalCountUpcoming = countUpcomingData?.data?.data?.total || 0;
  const mappedCountUpcoming = Object.entries(
    countUpcomingData?.data?.data?.detail || {}
  )
    .filter(([key]) =>
      [
        "linked_in",
        "facebook_page",
        "instagram_professional",
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
    <div className="space-y-4 sm:space-y-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">
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
                className="h-(--control-h-sm) sm:h-9"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoadingAnalytics ? (
          <AnalyticsSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3 [&>*:nth-child(3)]:col-span-2 xl:[&>*:nth-child(3)]:col-span-1">
            <AnalyticsCard
              title={a("totalPosting")}
              subtitle={a("totalPostingSubtitlePeriod", {
                period: periodLabel,
              })}
              value={totalCountPosted.toString()}
              breakdown={mappedCountPosted}
              titleIcon={<FileText className="h-5 w-5" />}
              titleIconClassName="bg-rose-100 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300"
            />

            <AnalyticsCard
              title={a("totalUpcoming")}
              subtitle={a("totalUpcomingSubtitlePeriod", {
                period: periodLabel,
              })}
              value={totalCountUpcoming.toString()}
              breakdown={mappedCountUpcoming}
              titleIcon={<CalendarClock className="h-5 w-5" />}
              titleIconClassName="bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-300"
            />

            <TokenUsageCard />
          </div>
        )}
      </section>

      <section>
        <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TokenUsageAnalytics
              period={period}
              selectedPeriod={selectedPeriod}
            />
          </div>

          <SchedulePost
            onDashboard={true}
            filterQuery={upcomingFilterQuery}
            subtitle={a("totalUpcomingSubtitlePeriod", {
              period: periodLabel,
            })}
          />

        </div>
      </section>
    </div>
  );
}
