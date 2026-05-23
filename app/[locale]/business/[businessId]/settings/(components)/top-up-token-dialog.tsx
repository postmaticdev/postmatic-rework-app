"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ReceiptText, RefreshCw } from "lucide-react";
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
import { CheckoutRes } from "@/models/api/purchase/checkout.type";
import { BusinessPurchaseRes } from "@/models/api/purchase/business.type";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Image from "next/image";

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

const getPaymentStatusLabel = (status?: string) => {
  switch (status) {
    case "Success":
      return "Berhasil";
    case "Failed":
      return "Gagal";
    case "Canceled":
      return "Dibatalkan";
    case "Expired":
      return "Kedaluwarsa";
    case "Refunded":
      return "Refund";
    case "Denied":
      return "Ditolak";
    case "Pending":
    default:
      return "Menunggu Pembayaran";
  }
};

const getPaymentStatusClassName = (status?: string) => {
  switch (status) {
    case "Success":
      return "border-green-200 bg-green-50 text-green-700";
    case "Failed":
    case "Denied":
      return "border-red-200 bg-red-50 text-red-700";
    case "Canceled":
    case "Expired":
    case "Refunded":
      return "border-gray-200 bg-gray-50 text-gray-700";
    case "Pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

export function TopUpTokenDialog({
  isOpen,
  onClose,
  initialAmount,
}: TopUpTokenDialogProps) {
  const { businessId } = useParams() as { businessId: string };
  const locale = useLocale();
  const t = useTranslations();
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
  const [now, setNow] = useState(() => Date.now());

  const tokenAmount = Number(clampTokenAmount(amount) || 0);

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
    ? price?.referral?.message ||
    priceQueryError?.response?.data?.responseMessage ||
    priceQueryError?.response?.data?.metaData?.message
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

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

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
      showToast("error", "Please enter promo code.");
      return;
    }
    if (!tokenAmount || tokenAmount <= 0) {
      showToast("error", "Please enter a valid token amount.");
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
      showToast("info", getPaymentStatusLabel(res.data.data.status));
      queryClient.invalidateQueries({
        queryKey: ["businessPurchaseHistory", businessId],
      });
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
        text: "Batas pembayaran telah berakhir.",
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
      text: days > 0 ? `Sisa waktu pembayaran: ${days} hari ${hhmmss}` : `Sisa waktu pembayaran: ${hhmmss}`,
      expired: false,
    };
  };

  const paymentCountdown = getPaymentCountdown(checkoutResult?.expiredAt);

  const qrCodeAction =
    checkoutResult?.paymentActions.find(
      (action) => action.type === "image" && action.action === "generate-qr-code"
    ) ||
    checkoutResult?.paymentActions.find(
      (action) => action.type === "image" && action.action === "generate-qr-code-v2"
    ) ||
    checkoutResult?.paymentActions.find((action) => action.type === "image");
  const virtualAccountAction = checkoutResult?.paymentActions.find(
    (action) => action.type === "text" && action.action === "virtual-account"
  );
  const textPaymentAction = checkoutResult?.paymentActions.find(
    (action) => action.type === "text" && action.action !== "virtual-account"
  );

  const detailRows = checkoutResult
    ? [
      {
        label: "Ref",
        value:
          checkoutResult.paymentCode ||
          checkoutResult.orderId ||
          checkoutResult.id,
      },
      { label: "Tgl Dibuat", value: formatDateTime(checkoutResult.createdAt) },
      { label: "Tgl Diubah", value: formatDateTime(checkoutResult.updatedAt) },
      { label: "Produk", value: checkoutResult.productName },
      {
        label: "Metode",
        value: checkoutResult.method?.toUpperCase() || "-",
      },
      ...checkoutResult.paymentDetails.map((detail) => ({
        label: detail.name,
        value: formatIdr(detail.price),
      })),
      { label: "Total", value: formatIdr(checkoutResult.totalAmount) },
      {
        label: "Status Bayar",
        value: getPaymentStatusLabel(checkoutResult.status),
      },
      { label: "Kode Affiliate", value: checkoutResult.discountCode || "-" },
    ]
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden">
        <DialogHeader className="px-6 py-5">
          <DialogTitle >
            {checkoutResult ? "Payment Instruction" : "Pay as you go"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {!checkoutResult ? (
            <>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Amount to add
                  </label>
                  <Input
                    value={amount}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    placeholder={defaultTokenAmountDisplay}
                    className="h-11"
                  />
                  {/* <p className="text-xs text-muted-foreground">
                    Enter the token amount you want to buy. Max 1,000,000,000.
                  </p> */}
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
                <div className="relative">
                  <Input
                    value={promoCode}
                    onChange={(event) => handlePromoCodeChange(event.target.value)}
                    placeholder="Enter promo code"
                    className="h-11 pr-20 uppercase"
                  />
                  <Button
                    type="button"
                    onClick={handleCheckPromoCode}
                    disabled={
                      isCheckingPromoCode ||
                      priceQuery.isLoading ||
                      !promoCode.trim() ||
                      !tokenAmount ||
                      !paymentMethod
                    }
                    className="absolute right-1 top-1/2 h-9 -translate-y-1/2 px-3 text-sm"
                  >
                    {isCheckingPromoCode ? "Checking..." : "check"}
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
              <div className="flex flex-col gap-4 rounded-lg border border-amber-300 bg-amber-50/45 p-5 dark:border-amber-700 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      Menunggu Pembayaran...
                    </h3>
                    <div className="space-y-1 text-sm text-foreground">
                      <p>Silakan lakukan pembayaran untuk melanjutkan pesanan.</p>
                      <p>
                        Total yang harus dibayar:{" "}
                        <span className="font-semibold">
                          {formatIdr(checkoutResult.totalAmount)}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Berlaku sampai {formatDateTime(checkoutResult.expiredAt)}
                      </p>
                      {paymentCountdown ? (
                        <p
                          className={cn(
                            "font-medium",
                            paymentCountdown.expired
                              ? "text-red-600 dark:text-red-400"
                              : "text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {paymentCountdown.text}
                        </p>
                      ) : null}
                      {virtualAccountAction ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border bg-white/80 p-2 dark:border-zinc-700 dark:bg-zinc-900/70">
                          <div className="min-w-[200px] flex-1 rounded-md border bg-background px-3 py-2 font-mono text-base font-semibold tracking-wide dark:border-zinc-700">
                            {virtualAccountAction.value}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleCopy(virtualAccountAction.value)}
                            className="shrink-0"
                          >
                            <Copy className="h-4 w-4" />
                            Salin
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCheckPaymentStatus}
                    disabled={isCheckingStatus}
                    className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 dark:hover:text-blue-200"
                  >
                    <RefreshCw
                      className={cn("h-4 w-4", isCheckingStatus && "animate-spin")}
                    />
                    Refresh
                  </Button>
                </div>
                <div className="grid min-h-56 min-w-56 place-items-center self-center rounded-md border bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  {qrCodeAction ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCodeAction.value}
                      alt="QRIS payment QR code"
                      className="h-52 w-52 object-contain"
                    />
                  ) : virtualAccountAction ? (
                    <VirtualAccountLogo method={checkoutResult.method} />
                  ) : textPaymentAction ? (
                    <PaymentTextInstruction
                      action={textPaymentAction.action}
                      value={textPaymentAction.value}
                      method={checkoutResult.method}
                      onCopy={handleCopy}
                    />
                  ) : (
                    <div className="grid h-52 w-52 place-items-center text-center text-sm text-muted-foreground">
                      Instruksi pembayaran tidak tersedia.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-background p-5">
                <div className="mb-5 flex items-center gap-3 border-b pb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-foreground">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">Detail Order</h3>
                </div>
                <div className="space-y-3">
                  {detailRows.map((row) => (
                    <DetailOrderRow
                      key={row.label}
                      label={row.label}
                      value={row.value}
                      status={row.label === "Status Bayar" ? checkoutResult.status : undefined}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {!checkoutResult ? (
          <DialogFooter className="px-6 py-4">
            <Button
              onClick={handleCreatePayment}
              disabled={
                isCreatingPayment ||
                priceQuery.isLoading ||
                !tokenAmount ||
                !paymentMethod
              }

            >
              {isCreatingPayment ? "Processing..." : "Continue"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const BANK_LOGO_BY_METHOD: Record<string, string> = {
  bca: "/bca.png",
  bni: "/bni.png",
  mandiri: "/mandiri.png",
  permata: "/permata.png",
  cimb: "/cimbniaga.png",
  cimbniaga: "/cimbniaga.png",
};

const getBankLogoByMethod = (method?: string) => {
  const normalized = (method || "").toLowerCase().replace(/[\s_-]/g, "");
  return BANK_LOGO_BY_METHOD[normalized];
};

const getBankLabelByMethod = (method?: string) =>
  (method || "Bank").replace(/[_-]/g, " ").toUpperCase();

function VirtualAccountLogo({ method }: { method: string }) {
  const logoSrc = getBankLogoByMethod(method);
  const bankLabel = getBankLabelByMethod(method);

  return (
    <div className="grid h-52 w-52 place-items-center rounded-md border border-muted bg-muted/10 p-4">
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={`Logo ${bankLabel}`}
          width={180}
          height={90}
          className="h-auto w-full object-contain"
        />
      ) : (
        <div className="text-center text-base font-semibold text-muted-foreground">
          Virtual Account {bankLabel}
        </div>
      )}
    </div>
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

function DetailOrderRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: string;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {status ? (
        <span
          className={cn(
            "w-fit rounded-md border px-2 py-1 text-sm font-medium",
            getPaymentStatusClassName(status)
          )}
        >
          {value}
        </span>
      ) : (
        <span className="break-words font-medium text-foreground">{value}</span>
      )}
    </div>
  );
}

function PaymentTextInstruction({
  action,
  value,
  method,
  onCopy,
}: {
  action: string;
  value: string;
  method: string;
  onCopy: (value: string) => void;
}) {
  const label =
    action === "virtual-account"
      ? `Virtual Account ${method?.toUpperCase() || ""}`.trim()
      : action;

  return (
    <div className="flex h-full w-full min-w-52 flex-col justify-center gap-3 text-center">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="rounded-lg border bg-muted/20 px-4 py-3">
        <p className="break-all font-mono text-lg font-semibold text-foreground">
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => onCopy(value)}
        className="w-full"
      >
        <Copy className="h-4 w-4" />
        Copy
      </Button>
    </div>
  );
}
