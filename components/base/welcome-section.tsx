import { TimezoneSelector } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/timezone-selector";
import { useSubscribtionGetSubscription } from "@/services/tier/subscribtion.api";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "../ui/badge";
interface WelcomeSectionProps {
  title?: string;
  message?: string;
  showTimezoneSelector?: boolean;
  showSubscription?: boolean;
}

export function WelcomeSection({
  title = "",
  message = "",
  showTimezoneSelector = false,
  showSubscription = false,
}: WelcomeSectionProps) {
  const t = useTranslations("welcomeSection");
  const { businessId } = useParams() as { businessId: string };
  const { data: subscriptionData } = useSubscribtionGetSubscription(
    businessId || ""
  );
  const subscription = subscriptionData?.data?.data ?? null;
  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-row mb-2 sm:mb-4 items-center gap-x-4 gap-y-2 sm:gap-4 flex-wrap">
            <h1 className="min-w-0 break-words text-xl sm:text-2xl font-bold text-foreground mb-0 sm:mb-2">
              {title}
            </h1>
            {showSubscription && (
              <Badge className="text-xs text-white w-fit">
                {subscription?.subscription?.productName || t("freePlan")}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
        {showTimezoneSelector && (
          <div className="flex items-center gap-4">
            <TimezoneSelector />
          </div>
        )}
      </div>
    </div>
  );
}
