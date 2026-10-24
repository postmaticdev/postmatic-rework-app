"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BusinessPurchaseRes } from "@/models/api/purchase/business.type";
import { showToast } from "@/helper/show-toast";
import {
  mergeBusinessPurchaseWithRealtimePayment,
  normalizeRealtimePaymentStatus,
  syncPaymentRealtimeCaches,
  usePaymentRealtime,
} from "@/hooks/use-payment-realtime";
import { useDateFormat } from "@/hooks/use-date-format";
import { dateFormat } from "@/helper/date-format";
import { businessPurchaseService } from "@/services/purchase.api";
import { useParams } from "next/navigation";
import { mapEnumPaymentStatus } from "@/helper/map-enum-payment-status";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PaymentInstructionCard } from "./payment-instruction-card";
import { OrderInvoiceCard } from "./order-invoice-card";

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
  const tDialog = useTranslations("settings.topUpTokenDialog");

  const paymentDetails = transaction?.paymentDetails ?? [];

  usePaymentRealtime({
    businessId,
    enabled: isOpen && !!transaction?.id,
    paymentId: transaction?.id,
    onStatusChanged: (payload) => {
      const nextStatus = normalizeRealtimePaymentStatus(payload.status);

      if (transaction?.id === payload.paymentHistoryId) {
        setTransaction(mergeBusinessPurchaseWithRealtimePayment(transaction, payload));
      }
      syncPaymentRealtimeCaches(queryClient, businessId, payload);

      showToast(
        nextStatus === "Success" ? "success" : "info",
        mapEnumPaymentStatus.getStatusDescription(nextStatus, tToast)
      );
    },
  });

  // Only a pending payment shows the countdown, so only it needs a ticking clock.
  const isPendingTransaction = transaction?.status === "Pending";
  useEffect(() => {
    if (!isOpen || !isPendingTransaction) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen, isPendingTransaction]);

  // History rows don't carry the payment actions, so load the detail once per
  // opened transaction. Keyed by id: a settled payment has no actions even after
  // the detail loads, and re-running on every transaction update looped forever.
  const fetchedDetailIdRef = useRef<string | null>(null);
  const openTransactionIdRef = useRef<string | null>(null);
  const transactionId = transaction?.id;
  const hasPaymentActions = (transaction?.paymentActions?.length ?? 0) > 0;
  useEffect(() => {
    openTransactionIdRef.current = isOpen ? transactionId ?? null : null;
    if (!isOpen) {
      fetchedDetailIdRef.current = null;
      return;
    }
    if (!transactionId || hasPaymentActions) return;
    if (fetchedDetailIdRef.current === transactionId) return;
    fetchedDetailIdRef.current = transactionId;

    // Apply the result only if the same transaction is still open.
    const isStillOpen = () => openTransactionIdRef.current === transactionId;
    businessPurchaseService
      .getDetail(businessId, transactionId)
      .then(({ data: res }) => {
        if (isStillOpen()) setTransaction(res.data);
      })
      .catch(() => {
        if (isStillOpen()) {
          showToast("error", tToast("toast.payment.paymentStatusCheckFailed"));
        }
      });
  }, [businessId, hasPaymentActions, isOpen, setTransaction, tToast, transactionId]);

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
        queryKey: ["businessPurchaseDetail", transaction.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["businessPurchaseHistory", businessId],
      });
      if (res.data.status === "Success") {
        queryClient.invalidateQueries({
          queryKey: ["tokenUsage", businessId],
        });
        queryClient.invalidateQueries({
          queryKey: ["subscribtionSubscription", businessId],
        });
      }
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

  const paymentCountdown = getPaymentCountdown(transaction.expiredAt);
  const statusLabel = mapEnumPaymentStatus.getStatusLabel(transaction.status, tStatus);
  const statusTitle = isPending
    ? tDialog("pendingTitle")
    : isSuccess
      ? tDialog("successTitle")
      : statusLabel;
  const statusDescription = isPending
    ? tDialog("pendingDescription")
    : transaction.status === "Expired"
      ? tDialog("expiredDescription")
      : transaction.status === "Failed" ||
          transaction.status === "Denied" ||
          transaction.status === "Canceled"
        ? tDialog("failedDescription")
        : tDialog("processedDescription");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="scrollbar-hidden">
        <DialogHeader>
          <div>
            <DialogTitle>{m("purchaseDetail")}</DialogTitle>
            <DialogDescription>{m("purchaseDetailDescription")}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="scrollbar-hidden flex-1 overflow-y-auto space-y-4 px-4 py-4 sm:space-y-6 sm:p-6">
          <PaymentInstructionCard
            status={transaction.status}
            statusTitle={statusTitle}
            statusDescription={statusDescription}
            totalAmount={transaction.totalAmount}
            paymentStatusLabel={statusLabel}
            expiresAtLabel={formatDateTime(transaction.expiredAt)}
            paymentCountdown={paymentCountdown}
            paymentActions={transaction.paymentActions}
            method={transaction.method}
            isPending={isPending}
            persistPaymentMedia
            showStatusBadge
            isRefreshing={isChecking}
            onRefresh={handleCheckPaymentStatus}
            onCopy={handleCopy}
          />

          <OrderInvoiceCard
            reference={transaction.paymentCode || transaction.orderId || transaction.id}
            createdAt={formatDateTime(transaction.createdAt)}
            updatedAt={formatDateTime(transaction.updatedAt)}
            productName={transaction.productName}
            productType={transaction.productType}
            method={transaction.method}
            paymentDetails={paymentDetails}
            totalAmount={transaction.totalAmount}
            billedTo={transaction.profile}
          />
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
