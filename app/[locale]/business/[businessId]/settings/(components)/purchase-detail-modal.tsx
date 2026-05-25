"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooterWithButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ReceiptText } from "lucide-react";
import { BusinessPurchaseRes } from "@/models/api/purchase/business.type";
import { showToast } from "@/helper/show-toast";
import { formatIdr } from "@/helper/formatter";
import { useDateFormat } from "@/hooks/use-date-format";
import { dateFormat } from "@/helper/date-format";
import { businessPurchaseService } from "@/services/purchase.api";
import { useParams } from "next/navigation";
import { mapEnumPaymentStatus } from "@/helper/map-enum-payment-status";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PaymentInstructionCard } from "./payment-instruction-card";

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
      setTransaction(res.data);
      queryClient.invalidateQueries({
        queryKey: ["businessPurchaseHistory"],
      });
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
  const statusLabel = mapEnumPaymentStatus.getStatusLabel(transaction.status, tStatus);
  const statusTitle = isPending
    ? "Menunggu Pembayaran..."
    : isSuccess
      ? "Pembayaran Berhasil"
      : statusLabel;
  const statusDescription = isPending
    ? "Silakan lakukan pembayaran untuk melanjutkan pesanan."
    : "Transaksi ini sudah diproses.";

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
      value: statusLabel,
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
          <PaymentInstructionCard
            status={transaction.status}
            statusTitle={statusTitle}
            statusDescription={statusDescription}
            totalAmount={transaction.totalAmount}
            expiresAtLabel={formatDateTime(transaction.expiredAt)}
            paymentCountdown={paymentCountdown}
            paymentActions={transaction.paymentActions}
            method={transaction.method}
            isPending={isPending}
            isRefreshing={isChecking}
            onRefresh={handleCheckPaymentStatus}
            onCopy={handleCopy}
          />

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

        {/* <DialogFooterWithButton buttonMessage={m("close")} onClick={onClose}>
          {isPending ? (
            <Button variant="outline" onClick={handleCheckPaymentStatus}>
              {isChecking ? t("checking") : t("checkPaymentStatus")}
            </Button>
          ) : null}
        </DialogFooterWithButton> */}
      </DialogContent>
    </Dialog>
  );
}

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
