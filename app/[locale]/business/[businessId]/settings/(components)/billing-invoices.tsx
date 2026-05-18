"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Info, Send, Zap } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTokenGetTokenUsage } from "@/services/tier/token.api";
import { HistoryTransactions } from "./history-transactions";
import { TopUpTokenDialog } from "./top-up-token-dialog";

export function BillingInvoices() {
  const locale = useLocale();
  const t = useTranslations("settings");
  const { businessId } = useParams() as { businessId: string };
  const searchParams = useSearchParams();
  const { data: tokenUsageData } = useTokenGetTokenUsage(businessId);
  const availableToken = tokenUsageData?.data?.data?.availableToken ?? 0;
  const [isDialogOpen, setIsDialogOpen] = useState(
    searchParams.get("topUp") === "token"
  );
  const topUpAmount = searchParams.get("amount") || undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-6 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <CardTitle className="text-3xl font-bold">Pay as you go</CardTitle>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-1.5 text-base font-medium text-muted-foreground">
                <span>{t("tokenBalance")}</span>
                <span className="group relative inline-flex">
                  <button
                    type="button"
                    aria-label={t("tokenBalanceTooltip")}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 w-64 -translate-y-1/2 rounded-md bg-foreground px-3 py-2 text-xs font-normal leading-relaxed text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-blue-600 text-base font-medium text-white hover:bg-blue-700"
            >
              <Send className="mr-2 h-4 w-4" />
              Top up Credit
            </Button>

            <Link href={`/business/${businessId}/pricing`} prefetch={false}>
              <Button
                variant="outline"
                className="w-full border-border bg-muted/40 text-base font-medium"
              >
                <Send className="mr-2 h-4 w-4 rotate-45" />
                View pricing
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <HistoryTransactions />

      <TopUpTokenDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        initialAmount={topUpAmount}
      />
    </div>
  );
}
