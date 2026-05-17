"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { showToast } from "@/helper/show-toast";
import { formatIdr } from "@/helper/formatter";
import { cn } from "@/lib/utils";
import { useAppProductGetProductDetail } from "@/services/app-product.api";
import {
  businessPurchaseService,
  useCheckoutPayBank,
  useCheckoutPayEWallet,
  usePaymentImageTokenPrice,
} from "@/services/purchase.api";
import { CheckoutRes, PaymentAction } from "@/models/api/purchase/checkout.type";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

interface TopUpTokenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: string;
}

const DEFAULT_TOKEN_AMOUNT = "200000";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function TopUpTokenDialog({
  isOpen,
  onClose,
  initialAmount,
}: TopUpTokenDialogProps) {
  const { businessId } = useParams() as { businessId: string };
  const locale = useLocale();
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(initialAmount || DEFAULT_TOKEN_AMOUNT);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutRes | null>(
    null
  );
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const tokenAmount = Number(onlyDigits(amount));

  const productDetail = useAppProductGetProductDetail({
    rootBusinessId: businessId,
    productId: tokenAmount ? String(tokenAmount) : "",
    type: "token",
  });

  const methodOptions = useMemo(() => {
    const groups = productDetail.data?.data?.data?.pricingByMethod ?? [];
    return groups.flatMap((group) =>
      group.methods.map((method) => ({
        code: method.issued.code,
        name: method.issued.name,
        type: group.type,
      }))
    );
  }, [productDetail.data]);

  const selectedMethod = methodOptions.find(
    (method) => method.code === paymentMethod
  );

  const priceQuery = usePaymentImageTokenPrice({
    businessId,
    tokenAmount,
    paymentMethod,
    referralCode: promoCode.trim() || undefined,
    enabled: isOpen && !checkoutResult,
  });

  const mCheckoutPayBank = useCheckoutPayBank();
  const mCheckoutPayEWallet = useCheckoutPayEWallet();
  const isCreatingPayment =
    mCheckoutPayBank.isPending || mCheckoutPayEWallet.isPending;
  const price = priceQuery.data?.data?.data;

  useEffect(() => {
    if (!isOpen) return;
    setAmount(initialAmount || DEFAULT_TOKEN_AMOUNT);
    setCheckoutResult(null);
  }, [initialAmount, isOpen]);

  useEffect(() => {
    if (!paymentMethod && methodOptions.length > 0) {
      setPaymentMethod(methodOptions[0].code);
    }
  }, [methodOptions, paymentMethod]);

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

  const handleCreatePayment = async () => {
    if (!tokenAmount || tokenAmount <= 0) {
      showToast("error", "Please enter a valid token amount.");
      return;
    }
    if (!selectedMethod) {
      showToast("error", t("toast.validation.selectPaymentMethod"));
      return;
    }

    const discountCode = promoCode.trim() || undefined;

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

      setCheckoutResult(res.data.data);
      queryClient.invalidateQueries({
        queryKey: ["businessPurchaseHistory", businessId],
      });
    } catch (error: unknown) {
      type ApiError = {
        response?: {
          data?: { responseMessage?: string; metaData?: { message?: string } };
        };
      };
      const apiError = error as ApiError;
      showToast(
        "error",
        apiError.response?.data?.responseMessage ||
          apiError.response?.data?.metaData?.message ||
          t("toast.defaultError")
      );
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
      showToast("info", res.data.data.status);
      queryClient.clear();
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

  const renderAction = (action: PaymentAction, index: number) => {
    if (action.type === "image") {
      return (
        <div key={`${action.action}-${index}`} className="space-y-3">
          <p className="text-sm font-medium text-foreground">{action.action}</p>
          <div className="grid place-items-center rounded-lg border bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={action.value}
              alt={action.action}
              className="h-64 w-64 object-contain"
            />
          </div>
        </div>
      );
    }

    if (action.type === "redirect") {
      return (
        <div key={`${action.action}-${index}`} className="space-y-3">
          <p className="text-sm font-medium text-foreground">{action.action}</p>
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-all font-mono text-sm">{action.value}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open(action.value, "_blank", "noreferrer")}
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div key={`${action.action}-${index}`} className="space-y-3">
        <p className="text-sm font-medium text-foreground">{action.action}</p>
        <CopyableValue value={action.value} onCopy={handleCopy} />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl overflow-hidden">
        <DialogHeader className="px-6 py-5">
          <DialogTitle className="text-2xl font-bold">
            {checkoutResult ? "Payment Instruction" : "Pay as you go"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {!checkoutResult ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Amount to add
                  </label>
                  <Input
                    value={amount}
                    onChange={(event) =>
                      setAmount(onlyDigits(event.target.value))
                    }
                    placeholder="200000"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the token amount you want to buy.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Payment method
                  </label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    disabled={productDetail.isLoading}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {methodOptions.map((method) => (
                        <SelectItem key={method.code} value={method.code}>
                          {method.name} - {method.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Promo code
                </label>
                <Input
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value)}
                  placeholder="Enter promo code"
                  className="h-11 uppercase"
                />
                {price?.referral?.message ? (
                  <p
                    className={cn(
                      "text-xs",
                      price.referral.valid
                        ? "text-green-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {price.referral.message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Payment details</h3>
                  {priceQuery.isFetching ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                <SummaryRow
                  label="Token"
                  value={tokenAmount ? tokenAmount.toLocaleString(locale) : "-"}
                />
                <SummaryRow
                  label="Subtotal"
                  value={formatIdr(price?.calculation.itemPrice ?? 0)}
                />
                <SummaryRow
                  label="Discount"
                  value={formatIdr(price?.calculation.discountAmount ?? 0)}
                />
                <SummaryRow
                  label="Admin"
                  value={formatIdr(price?.calculation.adminFeeAmount ?? 0)}
                />
                <SummaryRow
                  label="Tax"
                  value={formatIdr(price?.calculation.taxAmount ?? 0)}
                />
                <SummaryRow
                  label="Total"
                  value={formatIdr(price?.calculation.totalAmount ?? 0)}
                  strong
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoBox
                  label="Payment code"
                  value={checkoutResult.paymentCode || checkoutResult.id}
                  onCopy={handleCopy}
                />
                <InfoBox
                  label="Expiration time"
                  value={formatDateTime(checkoutResult.expiredAt)}
                />
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <SummaryRow label="Product" value={checkoutResult.productName} />
                <SummaryRow
                  label="Method"
                  value={checkoutResult.method?.toUpperCase()}
                />
                <SummaryRow
                  label="Total"
                  value={formatIdr(checkoutResult.totalAmount)}
                  strong
                />
              </div>

              <div className="space-y-5">
                {checkoutResult.paymentActions.map(renderAction)}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4">
          {!checkoutResult ? (
            <Button
              onClick={handleCreatePayment}
              disabled={
                isCreatingPayment ||
                priceQuery.isLoading ||
                !tokenAmount ||
                !paymentMethod
              }
              className="ml-auto bg-blue-600 text-white hover:bg-blue-700"
            >
              {isCreatingPayment ? "Processing..." : "Continue"}
            </Button>
          ) : (
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => setCheckoutResult(null)}>
                Create another
              </Button>
              <Button
                onClick={handleCheckPaymentStatus}
                disabled={isCheckingStatus}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isCheckingStatus ? "Checking..." : "Check Payment Status"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right", strong && "font-semibold")}>
        {value}
      </span>
    </div>
  );
}

function CopyableValue({
  value,
  onCopy,
}: {
  value: string;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
      <p className="break-all font-mono text-sm font-semibold">{value}</p>
      <Button type="button" variant="outline" size="icon" onClick={() => onCopy(value)}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

function InfoBox({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: (value: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="break-all font-mono text-sm font-semibold">{value}</p>
        {onCopy ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onCopy(value)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
