"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartErrorBoundary } from "./chart-error-boundary";
import type { TimePeriod } from "@/lib/chart-data-generator";
import { FilterQuery } from "@/models/api/base-response.type";
import { useTokenGetAnalyticUsage } from "@/services/tier/token.api";
import { useParams } from "next/navigation";
import { dateManipulation } from "@/helper/date-manipulation";
import { useDateFormat } from "@/hooks/use-date-format";
import { useLocale, useTranslations } from "next-intl";

const toIntlLocale = (locale: string) => (locale === "id" ? "id-ID" : "en-US");

// Locale-aware variant of formatXAxisLabel from @/lib/chart-data-generator
// (that helper is pinned to id-ID).
function formatAxisLabel(date: string, period: TimePeriod, locale: string) {
  const dateObj = new Date(date);
  const options: Intl.DateTimeFormatOptions =
    period === "7d"
      ? { weekday: "short", day: "numeric" }
      : period === "1y"
        ? { month: "short", year: "2-digit" }
        : { day: "numeric", month: "short" };

  return dateObj.toLocaleDateString(toIntlLocale(locale), options);
}

interface CustomTooltipPayload {
  color: string;
  dataKey: string;
  value: number;
}

interface CustomTooltipProps {
  active: boolean;
  payload: CustomTooltipPayload[];
  label: string;
  period: TimePeriod;
}

// Custom tooltip component
const CustomTooltip = ({
  active,
  payload,
  label,
  period,
}: CustomTooltipProps) => {
  const t = useTranslations("periodSelector");
  const locale = useLocale();
  const total = payload.find((entry) => entry.dataKey === "Total");
  const otherPayload = payload.filter((entry) => entry.dataKey !== "Total");

  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[200px]">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          {formatAxisLabel(label, period, locale)}
        </p>
        <div className="space-y-2">
          {otherPayload.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {entry.dataKey === "Image" && t("image")}
                  {entry.dataKey === "Video" && t("video")}
                  {entry.dataKey === "LiveStream" && t("liveStream")}
                  {entry.dataKey === "Total" && t("total")}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {entry.value.toLocaleString(toIntlLocale(locale))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: total?.color }}
              />
              {t("totalLabel")}
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {total?.value?.toLocaleString(toIntlLocale(locale))}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface CustomLegendProps {
  payload: CustomLegendPayload[];
}

interface CustomLegendPayload {
  value: string;
  color: string;
}

// Custom legend component
const CustomLegend = ({ payload }: CustomLegendProps) => {
  const t = useTranslations("periodSelector");
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {entry.value === "Image" && t("image")}
            {entry.value === "Video" && t("video")}
            {entry.value === "LiveStream" && t("liveStream")}
            {entry.value === "Total" && t("total")}
          </span>
        </div>
      ))}
    </div>
  );
};

interface Period {
  value: TimePeriod;
  label: string;
  filterQuery: Partial<FilterQuery>;
  labelStart: string;
  labelEnd: string;
}

interface AdvancedTokenChartProps {
  period: TimePeriod;
  selectedPeriod?: Pick<Period, "filterQuery" | "labelStart" | "labelEnd">;
}

// Main chart component
export function AdvancedTokenChart({
  period = "7d",
  selectedPeriod,
}: Partial<AdvancedTokenChartProps>) {
  const t = useTranslations("periodSelector");
  const locale = useLocale();
  const { formatDate } = useDateFormat();

  const periods: Period[] = [
    {
      value: "7d",
      label: t("weekly"),
      labelStart: formatDate(
        new Date(new Date().setDate(new Date().getDate() - 7))
      ),
      labelEnd: formatDate(new Date()),
      filterQuery: {
        dateStart: dateManipulation.ymd(
          new Date(new Date().setDate(new Date().getDate() - 7))
        ),
        dateEnd: dateManipulation.ymd(new Date()),
        limit: 1,
      },
    },
    {
      value: "30d",
      label: t("monthly"),
      labelStart: formatDate(
        new Date(new Date().setDate(new Date().getDate() - 30))
      ),
      labelEnd: formatDate(new Date()),
      filterQuery: {
        dateStart: dateManipulation.ymd(
          new Date(new Date().setDate(new Date().getDate() - 30))
        ),
        dateEnd: dateManipulation.ymd(new Date()),
        limit: 1,
      },
    },
    {
      value: "1y",
      label: t("yearly"),
      labelStart: formatDate(
        new Date(new Date().setFullYear(new Date().getFullYear() - 1))
      ),
      labelEnd: formatDate(new Date()),
      filterQuery: {
        dateStart: dateManipulation.ymd(
          new Date(new Date().setFullYear(new Date().getFullYear() - 1))
        ),
        dateEnd: dateManipulation.ymd(new Date()),
        limit: 30,
      },
    },
  ];

  const { businessId } = useParams() as { businessId: string };
  const findPeriod = selectedPeriod || periods.find((p) => p.value === period);
  const { data: tokenUsageData } = useTokenGetAnalyticUsage(
    businessId,
    findPeriod?.filterQuery
  );
  const chartData = (tokenUsageData?.data?.data || []).map((item) => ({
    date: item.date,
    Image: item.Image,
    Video: item.Video,
    LiveStream: item.LiveStream,
    Total: item.Image + item.Video + item.LiveStream,
  }));

  const d = useTranslations("dashboard");
  return (
    <ChartErrorBoundary>
      <div className="w-full bg-card rounded-lg p-4 border border-border">
        {/* Header with controls */}
        <div className="mb-4 sm:mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {d("tokenUsageAnalysis")}
            </h3>
          </div>
        </div>

        {/* Chart container */}
        <div className="">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <defs>
                  <linearGradient id="colorImages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorVideo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient
                    id="colorLivestream"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--grid-color, #E5E7EB)"
                  strokeOpacity={0.3}
                  className="dark:stroke-[#E5E7EB] stroke-[#000000]"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatAxisLabel(value, period, locale)}
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString(toIntlLocale(locale))}
                />
                <Tooltip
                  content={(props) => (
                    <CustomTooltip
                      {...props}
                      period={period}
                      label={String(props.label)}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="Image"
                  stackId="1"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#colorImages)"
                  fillOpacity={1}
                />
                <Area
                  type="monotone"
                  dataKey="Video"
                  stackId="1"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#colorVideo)"
                  fillOpacity={1}
                />
                <Area
                  type="monotone"
                  dataKey="LiveStream"
                  stackId="1"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#colorLivestream)"
                  fillOpacity={1}
                />
                <Area
                  type="monotone"
                  dataKey="Total"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  fill="url(#colorTotal)"
                  fillOpacity={0.3}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <CustomLegend
            payload={[
              { value: "Image", color: "#3B82F6" },
              { value: "Video", color: "#8B5CF6" },
              { value: "LiveStream", color: "#10B981" },
              { value: "Total", color: "#F59E0B" },
            ]}
          />
        </div>
      </div>
    </ChartErrorBoundary>
  );
}
