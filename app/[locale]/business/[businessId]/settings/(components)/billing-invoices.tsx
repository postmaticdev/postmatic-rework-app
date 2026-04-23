"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { Send, Zap } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTokenGetTokenUsage } from "@/services/tier/token.api";
import { HistoryTransactions } from "./history-transactions";
import { TopUpTokenDialog } from "./top-up-token-dialog";

export function BillingInvoices() {
  const locale = useLocale();
  const { businessId } = useParams() as { businessId: string };
  const { data: tokenUsageData } = useTokenGetTokenUsage(businessId);
  const availableToken = tokenUsageData?.data?.data?.availableToken ?? 0;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-6 py-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <CardTitle className="text-3xl font-bold">Pay as you go</CardTitle>
            <p className="text-base text-muted-foreground">
              Top up tokens whenever your workspace needs more generation
              credits.
            </p>

            <div className="space-y-2 pt-2">
              <p className="text-base text-muted-foreground">
                Token Balance
              </p>
              <div className="flex items-center gap-3 text-4xl font-bold text-foreground">
                <Zap className="h-8 w-8 text-blue-600" />
                <span>{availableToken.toLocaleString(locale)}</span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-[260px]">
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="h-14 rounded-2xl bg-blue-600 text-base font-medium text-white hover:bg-blue-700"
            >
              <Send className="mr-2 h-4 w-4" />
              Top up Credit
            </Button>

            <Link href={`/business/${businessId}/pricing`} prefetch={false}>
              <Button
                variant="outline"
                className="h-14 w-full rounded-2xl border-border bg-muted/40 text-base font-medium"
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
      />
    </div>
  );
}
