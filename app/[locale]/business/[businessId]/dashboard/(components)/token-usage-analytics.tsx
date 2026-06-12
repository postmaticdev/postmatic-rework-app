import { AdvancedTokenChart } from "./advanced-token-chart";
import type { FilterQuery } from "@/models/api/base-response.type";
import type { TimePeriod } from "@/lib/chart-data-generator";

interface TokenUsageAnalyticsProps {
  period?: TimePeriod;
  selectedPeriod?: {
    labelStart: string;
    labelEnd: string;
    filterQuery: Partial<FilterQuery>;
  };
}

export function TokenUsageAnalytics({
  period,
  selectedPeriod,
}: TokenUsageAnalyticsProps) {
  return (
    <div className="flex-1 gap-6 w-full">
      <AdvancedTokenChart period={period} selectedPeriod={selectedPeriod} />
    </div>
  );
}
