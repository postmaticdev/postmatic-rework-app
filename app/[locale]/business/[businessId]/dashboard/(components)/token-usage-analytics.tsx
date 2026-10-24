"use client";

import { useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BarChart3, Cpu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTokenGetAnalyticUsage } from "@/services/tier/token.api";
import type { FilterQuery } from "@/models/api/base-response.type";
import type { TokenUsageChartPoint } from "@/models/api/tier/token.type";
import type { TimePeriod } from "@/lib/chart-data-generator";
import { ChartErrorBoundary } from "./chart-error-boundary";

type UsageTab = "model" | "usage";
type SeriesKey = "image" | "video";

// Validated pair (CVD + normal-vision separation) for light and dark surfaces.
const SERIES: { key: SeriesKey; color: string }[] = [
  { key: "image", color: "var(--series-image)" },
  { key: "video", color: "var(--series-video)" },
];

const toIntlLocale = (locale: string) => (locale === "id" ? "id-ID" : "en-US");

const parseYmd = (ymd: string) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day);
};

function formatAxisLabel(date: string, period: TimePeriod, locale: string) {
  const options: Intl.DateTimeFormatOptions =
    period === "7d"
      ? { weekday: "short", day: "numeric" }
      : period === "1y"
        ? { month: "short", year: "2-digit" }
        : { day: "numeric", month: "short" };

  return parseYmd(date).toLocaleDateString(toIntlLocale(locale), options);
}

function formatBucketLabel(point: TokenUsageChartPoint, locale: string) {
  const intlLocale = toIntlLocale(locale);
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const start = parseYmd(point.date).toLocaleDateString(intlLocale, options);
  if (!point.dateEnd || point.dateEnd === point.date) return start;
  const end = parseYmd(point.dateEnd).toLocaleDateString(intlLocale, options);
  return `${start} – ${end}`;
}

interface UsageTooltipProps {
  active?: boolean;
  point?: TokenUsageChartPoint;
}

function UsageTooltip({ active, point }: UsageTooltipProps) {
  const t = useTranslations("periodSelector");
  const locale = useLocale();
  if (!active || !point) return null;

  return (
    <div className="min-w-[180px] rounded-lg border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-md">
      <p className="mb-2 text-xs text-muted-foreground">
        {formatBucketLabel(point, locale)}
      </p>
      <div className="space-y-1.5">
        {SERIES.map((series) => (
          <div
            key={series.key}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: series.color }}
              />
              {t(series.key)}
            </span>
            <span className="font-medium tabular-nums">
              {point[series.key].toLocaleString(toIntlLocale(locale))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}

interface UsageChartProps {
  period: TimePeriod;
  data: TokenUsageChartPoint[];
  totals: Record<SeriesKey, number>;
  isRefreshing: boolean;
}

function UsageChart({ period, data, totals, isRefreshing }: UsageChartProps) {
  const t = useTranslations("periodSelector");
  const c = useTranslations("dashboard.tokenUsageChart");
  const locale = useLocale();
  const intlLocale = toIntlLocale(locale);
  const compact = new Intl.NumberFormat(intlLocale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <div className={cn("transition-opacity", isRefreshing && "opacity-60")}>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        {SERIES.map((series) => (
          <div key={series.key} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            <span className="text-muted-foreground">{t(series.key)}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {totals[series.key].toLocaleString(intlLocale)}
            </span>
          </div>
        ))}
        {totals.video === 0 && (
          <span className="text-xs text-muted-foreground">
            {c("videoNotAvailable")}
          </span>
        )}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              {SERIES.map((series) => (
                <linearGradient
                  key={series.key}
                  id={`token-usage-fill-${series.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={series.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={series.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              stroke="var(--border)"
            />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) =>
                formatAxisLabel(value, period, locale)
              }
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis
              width={44}
              allowDecimals={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => compact.format(value)}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.3 }}
              content={({ active, payload }) => (
                <UsageTooltip
                  active={active}
                  point={
                    payload?.[0]?.payload as TokenUsageChartPoint | undefined
                  }
                />
              )}
            />
            {SERIES.map((series) => (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={2}
                fill={`url(#token-usage-fill-${series.key})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: series.color,
                  stroke: "var(--card)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface TokenUsageAnalyticsProps {
  period: TimePeriod;
  selectedPeriod: {
    labelStart: string;
    labelEnd: string;
    filterQuery: Partial<FilterQuery>;
  };
}

export function TokenUsageAnalytics({
  period,
  selectedPeriod,
}: TokenUsageAnalyticsProps) {
  const d = useTranslations("dashboard");
  const tabs = useTranslations("dashboard.tokenUsageTabs");
  const c = useTranslations("dashboard.tokenUsageChart");
  const { businessId } = useParams() as { businessId: string };
  const [activeTab, setActiveTab] = useState<UsageTab>("usage");

  const { data, isLoading, isError, isPlaceholderData, refetch, isFetching } =
    useTokenGetAnalyticUsage(businessId, selectedPeriod.filterQuery);
  const points = data ?? [];
  const totals = points.reduce<Record<SeriesKey, number>>(
    (acc, point) => ({
      image: acc.image + point.image,
      video: acc.video + point.video,
    }),
    { image: 0, video: 0 }
  );

  const tabItems: { id: UsageTab; label: string }[] = [
    { id: "model", label: tabs("model") },
    { id: "usage", label: tabs("usage") },
  ];

  const renderUsage = () => {
    if (isLoading) {
      return <Skeleton className="h-[19.5rem] w-full" />;
    }
    if (isError && !data) {
      return (
        <ChartState
          icon={<BarChart3 className="h-5 w-5" />}
          title={c("loadErrorTitle")}
          description={d("chartErrorDescription")}
          action={
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              {d("retry")}
            </Button>
          }
        />
      );
    }
    if (totals.image + totals.video === 0) {
      return (
        <ChartState
          icon={<BarChart3 className="h-5 w-5" />}
          title={c("usageEmptyTitle")}
          description={c("usageEmptyDescription")}
        />
      );
    }
    return (
      <UsageChart
        period={period}
        data={points}
        totals={totals}
        isRefreshing={isPlaceholderData}
      />
    );
  };

  return (
    <ChartErrorBoundary>
      <div className="w-full rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6 [--series-image:#0062FF] [--series-video:#F59E0B] dark:[--series-image:#3B82F6] dark:[--series-video:#D97706]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-foreground">
              {d("tokenUsageAnalysis")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedPeriod.labelStart} - {selectedPeriod.labelEnd}
            </p>
          </div>

          <div
            role="tablist"
            aria-label={tabs("label")}
            className="inline-flex self-start rounded-lg bg-muted p-1"
          >
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "min-w-[84px] rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div role="tabpanel">
          {activeTab === "usage" ? (
            renderUsage()
          ) : (
            <ChartState
              icon={<Cpu className="h-5 w-5" />}
              title={c("modelEmptyTitle")}
              description={c("modelEmptyDescription")}
            />
          )}
        </div>
      </div>
    </ChartErrorBoundary>
  );
}
