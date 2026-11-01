"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooterWithButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaymentMethodSelect } from "@/components/forms/payment-method-select";
import { showToast } from "@/helper/show-toast";
import { translateApiResponseMessage } from "@/helper/api-response-message";
import {
  formatIdrStable,
} from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/product-display";
import {
  mergeCheckoutWithRealtimePayment,
  normalizeRealtimePaymentStatus,
  syncPaymentRealtimeCaches,
  usePaymentRealtime,
} from "@/hooks/use-payment-realtime";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useAppProductGetProductDetail } from "@/services/app-product.api";
import {
  businessPurchaseService,
  useCheckoutPayBank,
  useCheckoutPayEWallet,
  usePaymentImageTokenPrice,
} from "@/services/purchase.api";
import { CheckoutRes } from "@/models/api/purchase/checkout.type";
import { BusinessPurchaseRes } from "@/models/api/purchase/business.type";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { PaymentInstructionCard } from "./payment-instruction-card";
import { OrderInvoiceCard } from "./order-invoice-card";

interface TopUpTokenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: string;
}

type ApiError = {
  response?: {
    data?: { responseMessage?: string; metaData?: { message?: string } };
  };
};

type PaymentStatusKey =
  | "success"
  | "failed"
  | "canceled"
  | "expired"
  | "refunded"
  | "denied"
  | "pending";

const DEFAULT_TOKEN_AMOUNT = "200000";
const MAX_TOKEN_AMOUNT = 1_000_000_000;

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const clampTokenAmount = (value: string) => {
  const digits = onlyDigits(value);
  if (!digits) return "";

  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";

  return String(Math.min(parsed, MAX_TOKEN_AMOUNT));
};

const formatTokenAmountInput = (value: string, locale: string) => {
  const clamped = clampTokenAmount(value);
  if (!clamped) return "";

  return Number(clamped).toLocaleString(locale);
};

const getPaymentStatusKey = (status?: string): PaymentStatusKey => {
  switch (status) {
    case "Success":
      return "success";
    case "Failed":
      return "failed";
    case "Canceled":
      return "canceled";
    case "Expired":
      return "expired";
    case "Refunded":
      return "refunded";
    case "Denied":
      return "denied";
    case "Pending":
    default:
      return "pending";
  }
};

export function TopUpTokenDialog({
  isOpen,
  onClose,
  initialAmount,
}: TopUpTokenDialogProps) {
  const { businessId } = useParams() as { businessId: string };
  const locale = useLocale();
  const formatIdr = (amount: number) => formatIdrStable(amount, locale);
  const t = useTranslations();
  const tDialog = useTranslations("settings.topUpTokenDialog");
  const tStatus = useTranslations("checkout.paymentStatusLabel");
  const queryClient = useQueryClient();
  const defaultTokenAmountDisplay = Number(DEFAULT_TOKEN_AMOUNT).toLocaleString(
    locale
  );
  const [amount, setAmount] = useState(() =>
    formatTokenAmountInput(initialAmount || DEFAULT_TOKEN_AMOUNT, locale)
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [checkedPromoCode, setCheckedPromoCode] = useState("");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutRes | null>(
    null
  );
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());

  const tokenAmount = Number(clampTokenAmount(amount) || 0);
  // Debounce the amount used for price/product queries so typing doesn't fire a request per keystroke.
  const [debouncedTokenAmount, setDebouncedTokenAmount] = useState(tokenAmount);
  useDebounce(() => setDebouncedTokenAmount(tokenAmount), 500, [tokenAmount]);
  const isTokenAmountSettling = tokenAmount !== debouncedTokenAmount;

  // The dialog stays mounted on the billing tab; only load pricing while it's open.
  const productDetail = useAppProductGetProductDetail({
    rootBusinessId: businessId,
    productId: isOpen && debouncedTokenAmount ? String(debouncedTokenAmount) : "",
    type: "token",
  });

  const methodOptions = useMemo(() => {
    const groups = productDetail.data?.data?.data?.pricingByMethod ?? [];
    return groups.flatMap((group) =>
      group.methods.map((method) => ({
        code: method.issued.code,
        name: method.issued.name,
        type: group.type,
        image: method.issued.image,
      }))
    );
  }, [productDetail.data]);

  const selectedMethod = methodOptions.find(
    (method) => method.code === paymentMethod
  );

  const priceQuery = usePaymentImageTokenPrice({
    businessId,
    tokenAmount: debouncedTokenAmount,
    paymentMethod,
    referralCode: checkedPromoCode || undefined,
    enabled: isOpen && !checkoutResult,
  });

  const mCheckoutPayBank = useCheckoutPayBank();
  const mCheckoutPayEWallet = useCheckoutPayEWallet();
  const isCreatingPayment =
    mCheckoutPayBank.isPending || mCheckoutPayEWallet.isPending;
  const price = priceQuery.data?.data?.data;
  const priceQueryError = priceQuery.error as ApiError | null;
  const isPromoCodeChecked =
    !!checkedPromoCode && checkedPromoCode === promoCode.trim();
  const isCheckingPromoCode =
    isPromoCodeChecked && priceQuery.isFetching;
  const promoCodeMessage = isPromoCodeChecked
    ? translateApiResponseMessage(
      price?.referral?.message ||
      priceQueryError?.response?.data?.responseMessage ||
      priceQueryError?.response?.data?.metaData?.message ||
      ""
    )
    : "";

  useEffect(() => {
    if (!isOpen) return;
    setAmount(formatTokenAmountInput(initialAmount || DEFAULT_TOKEN_AMOUNT, locale));
    setPromoCode("");
    setCheckedPromoCode("");
    setCheckoutResult(null);
  }, [initialAmount, isOpen, locale]);

  useEffect(() => {
    if (!paymentMethod && methodOptions.length > 0) {
      setPaymentMethod(methodOptions[0].code);
    }
  }, [methodOptions, paymentMethod]);

  // The countdown is the only thing that needs a ticking clock.
  const hasPendingCountdown =
    !!checkoutResult?.expiredAt &&
    (!checkoutResult.status || checkoutResult.status === "Pending");
  useEffect(() => {
    if (!isOpen || !hasPendingCountdown) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen, hasPendingCountdown]);

  usePaymentRealtime({
    businessId,
    enabled: isOpen && !!checkoutResult?.id,
    paymentId: checkoutResult?.id,
    onStatusChanged: (payload) => {
      const nextStatus = normalizeRealtimePaymentStatus(payload.status);

      setCheckoutResult((current) =>
        current?.id === payload.paymentHistoryId
          ? mergeCheckoutWithRealtimePayment(current, payload)
          : current
      );
      syncPaymentRealtimeCaches(queryClient, businessId, payload);

      showToast(
        nextStatus === "Success" ? "success" : "info",
        tStatus(getPaymentStatusKey(nextStatus))
      );
    },
  });

  const handleClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast("success", t("toast.payment.clipboardCopySuccess"));
    } catch {
      showToast("error", t("toast.payment.clipboardCopyFailed"));
    }
  };

  const handlePromoCodeChange = (value: string) => {
    const nextPromoCode = value.toUpperCase();
    setPromoCode(nextPromoCode);
    if (checkedPromoCode && checkedPromoCode !== nextPromoCode.trim()) {
      setCheckedPromoCode("");
    }
  };

  const handleCheckPromoCode = async () => {
    const nextPromoCode = promoCode.trim();
    if (!nextPromoCode) {
      showToast("error", tDialog("enterPromoCodeValidation"));
      return;
    }
    if (!tokenAmount || tokenAmount <= 0) {
      showToast("error", tDialog("invalidTokenAmount"));
      return;
    }
    if (!selectedMethod) {
      showToast("error", t("toast.validation.selectPaymentMethod"));
      return;
    }

    setCheckedPromoCode(nextPromoCode);
    if (checkedPromoCode === nextPromoCode) {
      await priceQuery.refetch();
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(formatTokenAmountInput(value, locale));
  };

  const handleCreatePayment = async () => {
    if (!tokenAmount || tokenAmount <= 0) {
      showToast("error", tDialog("invalidTokenAmount"));
      return;
    }
    if (!selectedMethod) {
      showToast("error", t("toast.validation.selectPaymentMethod"));
      return;
    }

    if (isSubmittingRef.current) return;

    // Only send a promo code that was checked and accepted, never a typed-but-unchecked one.
    const discountCode =
      isPromoCodeChecked && price?.referral?.valid ? checkedPromoCode : undefined;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const res =
        selectedMethod.type === "Virtual Account"
          ? await mCheckoutPayBank.mutateAsync({
            businessId,
            formData: {
              bank: selectedMethod.code,
              productId: String(tokenAmount),
              type: "token",
              discountCode,
            },
          })
          : await mCheckoutPayEWallet.mutateAsync({
            businessId,
            formData: {
              productId: String(tokenAmount),
              type: "token",
              discountCode,
              acquirer: selectedMethod.code.toLowerCase(),
            },
          });

      let nextCheckout: CheckoutRes = {
        ...res.data.data,
        discountCode: discountCode || null,
      };
      try {
        const detailRes = await businessPurchaseService.getDetail(
          businessId,
          nextCheckout.id
        );
        nextCheckout = mergeCheckoutWithPurchaseDetail(
          nextCheckout,
          detailRes.data.data
        );
      } catch {
        // The creation response still contains the payment actions needed to pay.
      }

      setCheckoutResult(nextCheckout);
      queryClient.invalidateQueries({
        queryKey: ["businessPurchaseHistory", businessId],
      });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      showToast(
        "error",
        apiError.response?.data?.responseMessage ||
        apiError.response?.data?.metaData?.message ||
        t("toast.defaultError")
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!checkoutResult) return;
    try {
      setIsCheckingStatus(true);
      const res = await businessPurchaseService.getDetail(
        businessId,
        checkoutResult.id
      );
      setCheckoutResult((current) =>
        current ? mergeCheckoutWithPurchaseDetail(current, res.data.data) : current
      );
      showToast("info", tStatus(getPaymentStatusKey(res.data.data.status)));
      queryClient.invalidateQueries({
        queryKey: ["businessPurchaseDetail", checkoutResult.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["businessPurchaseHistory", businessId],
      });
      if (res.data.data.status === "Success") {
        queryClient.invalidateQueries({
          queryKey: ["tokenUsage", businessId],
        });
        queryClient.invalidateQueries({
          queryKey: ["subscribtionSubscription", businessId],
        });
      }
    } catch {
      showToast("error", t("toast.payment.paymentStatusCheckFailed"));
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  const getPaymentCountdown = (expiredAt?: string) => {
    if (!expiredAt) return null;
    const diffMs = new Date(expiredAt).getTime() - now;
    if (diffMs <= 0) {
      return {
        text: tDialog("paymentExpired"),
        expired: true,
      };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hhmmss = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;

    return {
      text:
        days > 0
          ? tDialog("paymentTimeRemainingWithDays", { days, time: hhmmss })
          : tDialog("paymentTimeRemaining", { time: hhmmss }),
      expired: false,
    };
  };

  const paymentCountdown = getPaymentCountdown(checkoutResult?.expiredAt);
  const paymentStatus = checkoutResult?.status;
  const isPendingPayment = !paymentStatus || paymentStatus === "Pending";
  const isSuccessPayment = paymentStatus === "Success";
  const statusLabel = tStatus(getPaymentStatusKey(paymentStatus));
  const statusTitle = isPendingPayment
    ? tDialog("pendingTitle")
    : isSuccessPayment
      ? tDialog("successTitle")
      : statusLabel;
  const statusDescription = isPendingPayment
    ? tDialog("pendingDescription")
    : tDialog("processedDescription");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="scrollbar-hidden">
        <DialogHeader>
          <DialogTitle >
            {checkoutResult
              ? tDialog("paymentInstruction")
              : tDialog("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="scrollbar-hidden flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:space-y-6 sm:p-6">
          {!checkoutResult ? (
            <>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {tDialog("amountToAdd")}
                  </label>
                  <Input
                    value={amount}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    placeholder={defaultTokenAmountDisplay}
                  />
                  {/* Preview harga (Rp) mengikuti jumlah token yang diinput */}
                  {tokenAmount > 0 && (
                    <div className="flex items-center justify-between rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">
                        {tDialog("pricePreview")}
                      </span>
                      <span className="font-semibold text-primary">
                        {price && tokenAmount === debouncedTokenAmount
                          ? tDialog("pricePreviewHint", {
                              tokens: tokenAmount.toLocaleString(locale),
                              price: formatIdr(price.calculation.itemPrice),
                            })
                          : priceQuery.isFetching || tokenAmount !== debouncedTokenAmount
                            ? "..."
                            : "-"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {tDialog("paymentMethod")}
                  </label>
                  <PaymentMethodSelect
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    disabled={productDetail.isLoading}
                    options={methodOptions}
                    placeholder={tDialog("selectPaymentMethod")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {tDialog("promoCode")}
                </label>
                <div className="relative">
                  <Input
                    value={promoCode}
                    onChange={(event) => handlePromoCodeChange(event.target.value)}
                    placeholder={tDialog("enterPromoCode")}
                    className="pr-20 uppercase"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCheckPromoCode}
                    disabled={
                      isCheckingPromoCode ||
                      priceQuery.isLoading ||
                      !promoCode.trim() ||
                      !tokenAmount ||
                      !paymentMethod
                    }
                    className="absolute right-1 top-1/2 h-8 -translate-y-1/2 max-md:h-9"
                  >
                    {isCheckingPromoCode
                      ? tDialog("checking")
                      : tDialog("check")}
                  </Button>
                </div>
                {promoCodeMessage ? (
                  <p
                    className={cn(
                      "text-xs",
                      price?.referral?.valid && !priceQueryError
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {promoCodeMessage}
                  </p>
                ) : null}
              </div>

            </>
          ) : (
            <>
              <PaymentInstructionCard
                status={paymentStatus}
                statusTitle={statusTitle}
                statusDescription={statusDescription}
                totalAmount={checkoutResult.totalAmount}
                expiresAtLabel={formatDateTime(checkoutResult.expiredAt)}
                paymentCountdown={paymentCountdown}
                paymentActions={checkoutResult.paymentActions}
                method={checkoutResult.method}
                isPending={isPendingPayment}
                isRefreshing={isCheckingStatus}
                onRefresh={handleCheckPaymentStatus}
                onCopy={handleCopy}
              />

              <OrderInvoiceCard
                reference={
                  checkoutResult.paymentCode ||
                  checkoutResult.orderId ||
                  checkoutResult.id
                }
                createdAt={formatDateTime(checkoutResult.createdAt)}
                updatedAt={formatDateTime(checkoutResult.updatedAt)}
                productName={checkoutResult.productName}
                productType={checkoutResult.productType}
                method={checkoutResult.method}
                paymentDetails={checkoutResult.paymentDetails}
                totalAmount={checkoutResult.totalAmount}
                affiliateCode={checkoutResult.discountCode ?? null}
                status={{ value: checkoutResult.status, label: statusLabel }}
              />
            </>
          )}
        </div>

        {!checkoutResult ? (
          <DialogFooterWithButton
            buttonMessage={
              isCreatingPayment || isSubmitting
                ? tDialog("processing")
                : tDialog("continue")
            }
            onClick={handleCreatePayment}
            disabled={
              isCreatingPayment ||
              isSubmitting ||
              isTokenAmountSettling ||
              priceQuery.isLoading ||
              priceQuery.isError ||
              !tokenAmount ||
              !paymentMethod
            }
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function mergeCheckoutWithPurchaseDetail(
  checkout: CheckoutRes,
  detail: BusinessPurchaseRes
): CheckoutRes {
  return {
    ...checkout,
    productName: detail.productName || checkout.productName,
    productType: detail.productType || checkout.productType,
    totalAmount: detail.totalAmount,
    method: detail.method || checkout.method,
    expiredAt: detail.expiredAt || checkout.expiredAt,
    status: detail.status || checkout.status,
    createdAt: detail.createdAt || checkout.createdAt,
    updatedAt: detail.updatedAt || checkout.updatedAt,
    paymentDetails: detail.paymentDetails?.length
      ? detail.paymentDetails
      : checkout.paymentDetails,
  };
}
