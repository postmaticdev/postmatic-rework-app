import { TokenCard } from "./token-card";
import { AdvancedTokenChart } from "./advanced-token-chart";
import { useTokenGetAnalyticType } from "@/services/tier/token.api";
import { useParams } from "next/navigation";
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
  const { businessId } = useParams() as { businessId: string };
  const { data: tokenUsageData } = useTokenGetAnalyticType(businessId);
  const data = tokenUsageData?.data?.data || [];
  return (
    <div className="flex-1 gap-6 w-full">
      {data.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {data.map((item) => (
            <TokenCard
              key={item.type}
              title={item.type}
              used={item.result.totalUsedToken.toString()}
              total={item.result.totalValidToken.toString()}
              percentage={Math.min(item.result.percentageUsage, 100)}
              isSoon={item.type !== "Image"}
            />
          ))}
        </div>
      )}

      {/* Advanced Token Chart with Period Filter */}
      <AdvancedTokenChart period={period} selectedPeriod={selectedPeriod} />
    </div>
  );
}
