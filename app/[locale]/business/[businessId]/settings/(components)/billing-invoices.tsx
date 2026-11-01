"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { CreditCard, ExternalLink, Info, Zap } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTokenGetTokenUsage } from "@/services/tier/token.api";
import { useRole } from "@/contexts/role-context";
import { HistoryTransactions } from "./history-transactions";
import { TopUpTokenDialog } from "./top-up-token-dialog";

export function BillingInvoices() {
  const locale = useLocale();
  const t = useTranslations("settings");
  const searchParams = useSearchParams();
  const { businessId } = useParams() as { businessId: string };
  const { data: tokenUsageData } = useTokenGetTokenUsage(businessId);
  const availableToken = tokenUsageData?.data?.data?.availableToken ?? 0;
  const isTopUpRequested = searchParams.get("topUp") === "token";
  const [isDialogOpen, setIsDialogOpen] = useState(isTopUpRequested);
  const topUpAmount = searchParams.get("amount") || undefined;
  const { access } = useRole();
  const canPurchase = access.purchase.write;

  // The header "top up" link can land here while this tab is already mounted.
  useEffect(() => {
    if (isTopUpRequested) setIsDialogOpen(true);
  }, [isTopUpRequested]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    if (!searchParams.has("topUp") && !searchParams.has("amount")) return;
    // Drop the one-shot params so a refresh doesn't reopen the dialog.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("topUp");
    params.delete("amount");
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 py-4 sm:gap-6 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <CardTitle className="text-2xl font-bold sm:text-3xl">
              {t("payAsYouGo")}
            </CardTitle>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-1.5 text-base font-medium text-muted-foreground">
                <span>{t("tokenBalance")}</span>
                <span className="group relative inline-flex">
                  <button
                    type="button"
                    aria-label={t("tokenBalanceTooltip")}
                    className="-m-[10px] inline-flex h-[36px] w-[36px] items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:m-0 sm:h-4 sm:w-4"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md sm:left-full sm:top-1/2 sm:mt-0 sm:ml-2 sm:max-w-none sm:translate-x-0 sm:-translate-y-1/2 bg-foreground px-3 py-2 text-xs font-normal leading-relaxed text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    {t("tokenBalanceTooltip")}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-xl font-bold text-foreground">
                <Zap className="h-8 w-8 text-blue-600" />
                <span>{availableToken.toLocaleString(locale)}</span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-[260px]">
            {canPurchase && (
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {t("topUpCredit")}
              </Button>
            )}

            <Button
              asChild
              variant="outline"
              className="w-full border-border bg-muted/40"
            >
              <a
                href="https://docs.postmatic.id/our-features/pricing"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("viewPricing")}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <HistoryTransactions />

      <TopUpTokenDialog
        isOpen={canPurchase && isDialogOpen}
        onClose={handleCloseDialog}
        initialAmount={topUpAmount}
      />
    </div>
  );
}
