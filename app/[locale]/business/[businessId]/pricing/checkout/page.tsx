"use client";
import { Card, CardContent } from "@/components/ui/card";
import { OrderSummary } from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/order-summary";
import { PaymentMethodGrid } from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/payment-method-grid";
import { PromoCodeSection } from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/promo-code-section";
import { CheckoutFooter } from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/checkout-footer";
import {
  useCheckoutPayBank,
  useCheckoutPayEWallet,
} from "@/services/purchase.api";
import { useCheckout } from "@/contexts/checkout-context";
import { showToast } from "@/helper/show-toast";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function CheckoutPage() {
  const { businessId } = useParams() as { businessId: string };
  const router = useRouter();
  const mCheckoutPayBank = useCheckoutPayBank();
  const mCheckoutPayEWallet = useCheckoutPayEWallet();
  const queryClient = useQueryClient();
  const { selectedPayment, product, setCheckoutResult, promoState } =
    useCheckout();

  const isLoading = mCheckoutPayBank.isPending || mCheckoutPayEWallet.isPending;
  const disabled = !selectedPayment || !product || isLoading;
  const t = useTranslations();

  const performCheckout = async (discountCode?: string) => {
    if (!selectedPayment) return;
    if (selectedPayment.type === "Virtual Account") {
      return mCheckoutPayBank.mutateAsync({
        businessId,
        formData: {
          bank: selectedPayment.code,
          productId: product?.id || "",
          type: product?.type as "subscription" | "token",
          discountCode,
        },
      });
    }
    return mCheckoutPayEWallet.mutateAsync({
      businessId,
      formData: {
        productId: product?.id || "",
        type: product?.type as "subscription" | "token",
        discountCode,
        acquirer: selectedPayment.code as "gopay" | "qris",
      },
    });
  };

  const handleCheckout = async () => {
    const discountCode = promoState?.trim() || undefined;

    try {
      if (!selectedPayment) {
        showToast("error", t("toast.validation.selectPaymentMethod"));
        return;
      }
      const res = await performCheckout(discountCode);
      if (res?.data?.data) {
        setCheckoutResult(res.data.data);
        const sp = new URLSearchParams();
        if (product?.id) sp.set("productId", product.id);
        if (product?.type) sp.set("type", product.type);
        if (res.data.data.expiredAt) sp.set("expiredAt", res.data.data.expiredAt);
        const query = sp.toString();
        const target = query
          ? `/business/${businessId}/pricing/checkout/${res.data.data.id}?${query}`
          : `/business/${businessId}/pricing/checkout/${res.data.data.id}`;
        router.push(target);
      }
    } catch (error: unknown) {
      type ApiError = {
        response?: { data?: { metaData?: { message?: string } } };
      };

      let message = t("toast.validation.invalidPromoCode");
      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as ApiError;
        message = apiError.response?.data?.metaData?.message ?? message;
      }
      // showToast("error", message);
      
    } finally {
      queryClient.clear();
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left sidebar - Hidden on mobile */}
      <OrderSummary variant="sidebar" />

      {/* Main content */}
      <div className="flex-1 p-3 sm:p-4 lg:p-12 max-w-[800px] mx-auto">
     

        {/* Mobile Order Summary Card */}
        <OrderSummary variant="mobile" />

        <Card className="border border-border">
          <CardContent className="p-3 sm:p-4 lg:p-8">
            <>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                {t("checkout.paymentMethod")}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                {t("toast.validation.selectPaymentMethod")}
              </p>

              {/* Payment method grid */}
              <PaymentMethodGrid />

              {/* Promo code section */}
              <PromoCodeSection />

              {/* Continue button */}
              <button
                onClick={handleCheckout}
                disabled={disabled}
                className={cn(
                  "bg-blue-600 dark:bg-blue-500 text-white text-sm sm:text-base lg:text-lg font-medium w-full py-3 sm:py-3 lg:py-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {isLoading ? t("toast.validation.processing") : t("toast.validation.continue")}
              </button>
            </>
          </CardContent>
        </Card>

        {/* Footer links - Hidden on mobile */}
        <CheckoutFooter />
      </div>
    </div>
  );
}
