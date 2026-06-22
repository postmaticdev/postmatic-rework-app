import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useDateFormat } from "@/hooks/use-date-format";
import { useSubscribtionGetSubscription } from "@/services/tier/subscribtion.api";
import { useTokenGetTokenUsage } from "@/services/tier/token.api";
import { Coins } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export function TokenUsageCard() {
  const t = useTranslations("tokenUsageCard");
  const { businessId } = useParams() as { businessId: string };
  const { formatDate } = useDateFormat();

  const { data: tokenUsageData } = useTokenGetTokenUsage(businessId);

  const usedValue = tokenUsageData?.data?.data?.totalUsedToken || 0;
  const availableValue = tokenUsageData?.data?.data?.availableToken || 0;
  const limitToken = tokenUsageData?.data?.data?.totalValidToken || 0;

  const { data: subscriptionDataTier } = useSubscribtionGetSubscription(
    businessId || ""
  );
  const subscription = subscriptionDataTier?.data?.data ?? null;

  const percentage = Math.min(
    tokenUsageData?.data?.data?.percentageUsage || 0,
    100
  );

  const locale = useLocale();
  const iconClassName = cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-md",
    "bg-blue-100 text-blue-500 dark:bg-blue-500/15 dark:text-blue-300"
  );

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border border-border flex flex-col gap-2">
      <div className="flex flex-col mb-4">
        <div className="mb-1 flex items-center gap-3">
          <span className={iconClassName}>
            <Coins className="h-5 w-5" />
          </span>
          <h3 className="font-semibold text-foreground">{t("title")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>

        {subscription?.expiredAt && (
          <span className="text-sm text-red-500">
            ({t("validUntil")}
            {formatDate(new Date(subscription?.expiredAt))})
          </span>
        )}
      </div>

      <div className="text-3xl font-bold text-foreground mb-4">
        {usedValue.toLocaleString(locale)} / {limitToken.toLocaleString(locale)}
      </div>
      <Progress value={percentage} />

      <div className="flex mt-2 justify-between flex-row text-sm">
        <span className="text-muted-foreground">
          {usedValue.toLocaleString(locale)} {t("usedValue")} ({percentage.toFixed(2)}%)
        </span>

        <span className="text-muted-foreground">
          {availableValue.toLocaleString(locale)} {t("availableValue")}
        </span>
      </div>
    </div>
  );
}
