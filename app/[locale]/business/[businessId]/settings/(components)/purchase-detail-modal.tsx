"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooterWithButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Copy, ReceiptText, RefreshCw } from "lucide-react";
import { BusinessPurchaseRes } from "@/models/api/purchase/business.type";
import { showToast } from "@/helper/show-toast";
import { formatIdr } from "@/helper/formatter";
import Image from "next/image";
import { useDateFormat } from "@/hooks/use-date-format";
import { dateFormat } from "@/helper/date-format";
import { businessPurchaseService } from "@/services/purchase.api";
import { useParams } from "next/navigation";
import { mapEnumPaymentStatus } from "@/helper/map-enum-payment-status";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: BusinessPurchaseRes | null;
  setTransaction: (transaction: BusinessPurchaseRes) => void;
}

export function PurchaseDetailModal({
  isOpen,
  onClose,
  transaction,
  setTransaction,
}: PurchaseDetailModalProps) {
  const { businessId } = useParams() as { businessId: string };
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const t = useTranslations("settings");
  const m = useTranslations("modal");
  const tStatus = useTranslations("checkout.paymentStatusLabel");
  const tToast = useTranslations();
  const { formatDate } = useDateFormat();

  const paymentDetails = transaction?.paymentDetails ?? [];
  const paymentActions = transaction?.paymentActions ?? [];
  const qrCodeAction =
    paymentActions.find(
      (action) => action.type === "image" && action.action === "generate-qr-code"
    ) ||
    paymentActions.find(
      (action) => action.type === "image" && action.action === "generate-qr-code-v2"
    ) ||
    paymentActions.find((action) => action.type === "image");
  const virtualAccountAction = paymentActions.find(
    (action) => action.type === "text" && action.action === "virtual-account"
  );
  const textPaymentAction = paymentActions.find(
    (action) => action.type === "text" && action.action !== "virtual-account"
  );
  const hasPaymentInstruction = Boolean(
    qrCodeAction || virtualAccountAction || textPaymentAction
  );

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !transaction) return;
    if (transaction.paymentActions.length > 0) return;

    let ignore = false;
    businessPurchaseService
      .getDetail(businessId, transaction.id)
      .then(({ data: res }) => {
        if (!ignore) setTransaction(res.data);
      })
      .catch(() => {
        if (!ignore) {
          showToast("error", tToast("toast.payment.paymentStatusCheckFailed"));
        }
      });

    return () => {
      ignore = true;
    };
  }, [businessId, isOpen, setTransaction, tToast, transaction]);

  if (!transaction) return null;

  const isPending = transaction.status === "Pending";
  const isSuccess = transaction.status === "Success";

  const handleCopy = async (str: string) => {
    try {
      await navigator.clipboard.writeText(str);
      showToast("success", t("successfullyCopiedVirtualAccountNumber"));
    } catch {
      showToast("error", t("failedToCopy"));
    }
  };

  const handleCheckPaymentStatus = async () => {
    try {
      setIsChecking(true);
      const { data: res } = await businessPurchaseService.getDetail(
        businessId,
        transaction.id
      );

      showToast(
        "success",
        mapEnumPaymentStatus.getStatusDescription(res.data.status, tToast)
      );
      if (res.data.status !== transaction.status) {
        queryClient.invalidateQueries({
          queryKey: ["businessPurchaseHistory"],
        });
        onClose();
      }
      setTransaction(res.data);
    } catch {
      showToast("error", tToast("toast.payment.paymentStatusCheckFailed"));
    } finally {
      setIsChecking(false);
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    return `${formatDate(new Date(value))} ${dateFormat.getHhMm(new Date(value))}`;
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

  const paymentCountdown = getPaymentCountdown(transaction.expiredAt);

  const detailRows = [
    {
      label: "Ref",
      value: transaction.paymentCode || transaction.orderId || transaction.id,
    },
    { label: "Tgl Dibuat", value: formatDateTime(transaction.createdAt) },
    { label: "Tgl Diubah", value: formatDateTime(transaction.updatedAt) },
    { label: "Produk", value: transaction.productName },
    { label: "Tipe", value: transaction.productType?.toUpperCase() || "-" },
    { label: "Metode", value: transaction.method?.toUpperCase() || "-" },
    ...paymentDetails.map((detail) => ({
      label: detail.name,
      value: formatIdr(detail.price),
    })),
    { label: "Total", value: formatIdr(transaction.totalAmount) },
    {
      label: "Status Bayar",
      value: mapEnumPaymentStatus.getStatusLabel(transaction.status, tStatus),
      status: transaction.status,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>{m("purchaseDetail")}</DialogTitle>
            <DialogDescription>{m("purchaseDetailDescription")}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 p-6">
          <Card
            className={cn(
              "border",
              isPending
                ? "border-amber-300 bg-amber-50/45 dark:border-amber-700 dark:bg-amber-950/20"
                : isSuccess
                  ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                  : "border-border bg-muted/20 dark:bg-zinc-900/60"
            )}
          >
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {isPending
                        ? "Menunggu Pembayaran..."
                        : isSuccess
                          ? "Pembayaran Berhasil"
                          : mapEnumPaymentStatus.getStatusLabel(transaction.status, tStatus)}
                    </h3>
                    <div className="space-y-1 text-sm text-foreground">
                      <p>
                        {isPending
                          ? "Silakan lakukan pembayaran untuk melanjutkan pesanan."
                          : "Transaksi ini sudah diproses."}
                      </p>
                      <p>
                        Total yang harus dibayar:{" "}
                        <span className="font-semibold">
                          {formatIdr(transaction.totalAmount)}
                        </span>
                      </p>
                      {transaction.expiredAt ? (
                        <p className="text-muted-foreground">
                          Berlaku sampai {formatDateTime(transaction.expiredAt)}
                        </p>
                      ) : null}
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
                  {isPending ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCheckPaymentStatus}
                      disabled={isChecking}
                      className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 dark:hover:text-blue-200"
                    >
                      <RefreshCw
                        className={`${isChecking ? "animate-spin" : ""} h-4 w-4`}
                      />
                      Refresh
                    </Button>
                  ) : null}
                </div>

                {hasPaymentInstruction ? (
                  <div className="grid min-h-56 min-w-56 place-items-center self-center rounded-md border bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    {qrCodeAction ? (
                      <Image
                        src={qrCodeAction.value}
                        alt="QRIS payment QR code"
                        width={208}
                        height={208}
                        className="h-52 w-52 object-contain"
                      />
                    ) : virtualAccountAction ? (
                      <VirtualAccountLogo method={transaction.method} />
                    ) : textPaymentAction ? (
                      <PaymentTextInstruction
                        action={textPaymentAction.action}
                        value={textPaymentAction.value}
                        method={transaction.method}
                        onCopy={handleCopy}
                      />
                    ) : (
                      <div className="grid h-52 w-52 place-items-center text-center text-sm text-muted-foreground">
                        Instruksi pembayaran tidak tersedia.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid min-h-40 min-w-56 place-items-center self-center rounded-md border bg-white p-4 text-center dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Status pembayaran</p>
                      <span
                        className={cn(
                          "inline-flex rounded-md border px-3 py-1 text-sm font-medium",
                          getPaymentStatusClassName(transaction.status)
                        )}
                      >
                        {mapEnumPaymentStatus.getStatusLabel(transaction.status, tStatus)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-background p-5">
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
                  status={row.status}
                />
              ))}
            </div>
          </Card>
        </div>

        <DialogFooterWithButton buttonMessage={m("close")} onClick={onClose}>
          {isPending ? (
            <Button variant="outline" onClick={handleCheckPaymentStatus}>
              {isChecking ? t("checking") : t("checkPaymentStatus")}
            </Button>
          ) : null}
        </DialogFooterWithButton>
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
