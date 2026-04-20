"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { OrderSummary } from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/order-summary";
import { PaymentConfirmation } from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/payment-confirmation";
import { PaymentSuccess } from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/payment-success";
import { CheckoutFooter } from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/checkout-footer";
import { useCheckout } from "@/contexts/checkout-context";
import { useBusinessPurchaseGetDetail } from "@/services/purchase.api";
import { useTranslations } from "next-intl";
import { LogoLoader } from "@/components/base/logo-loader";

export default function CheckoutOrderPage() {
  const { businessId, orderId } = useParams() as {
    businessId: string;
    orderId: string;
  };
  const t = useTranslations();
  const { setCheckoutResult } = useCheckout();
  const { data, isLoading, isError } = useBusinessPurchaseGetDetail(
    businessId,
    orderId
  );
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const searchParams = useSearchParams();
  const expiredAtFallback = searchParams.get("expiredAt") || undefined;

  useEffect(() => {
    const purchase = data?.data?.data;
    if (purchase) {
      setCheckoutResult((prev) => {
        const expiredAt =
          purchase.expiredAt ?? prev?.expiredAt ?? expiredAtFallback ?? null;
        return {
          ...(prev ?? {}),
          ...purchase,
          expiredAt: expiredAt ?? undefined,
        };
      });
      setShowPaymentSuccess(purchase.status === "Success");
    }
  }, [data, setCheckoutResult, expiredAtFallback]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
      <LogoLoader />
    </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {t("toast.validation.invalidPromoCode")}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <OrderSummary variant="sidebar" />

      <div className="flex-1 p-3 sm:p-4 lg:p-12 max-w-[800px] mx-auto">
        <OrderSummary variant="mobile" />

        <Card className="border border-border">
          <CardContent className="p-3 sm:p-4 lg:p-8">
            {showPaymentSuccess ? (
              <PaymentSuccess />
            ) : (
              <PaymentConfirmation
                setShowPaymentSuccess={setShowPaymentSuccess}
              />
            )}
          </CardContent>
        </Card>

        <CheckoutFooter />
      </div>
    </div>
  );
}
