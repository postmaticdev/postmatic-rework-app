"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooterWithButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, RefreshCw } from "lucide-react";
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
  const t = useTranslations("settings");
  const m = useTranslations("modal");
  const tToast = useTranslations();
  const { formatDate } = useDateFormat();

  const paymentDetails = transaction?.paymentDetails ?? [];
  const paymentActions = transaction?.paymentActions ?? [];
  const qrCodeV2Action = paymentActions.find(
    (action) => action.type === "image" && action.action === "generate-qr-code-v2"
  );
  const textPaymentAction = paymentActions.find(
    (action) => action.type === "text"
  );

  useEffect(() => {
    if (!isOpen || !transaction || transaction.status !== "Pending") return;
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

  const handleCopy = async (str: string) => {
    try {
      await navigator.clipboard.writeText(str);
      showToast("success", t("successfullyCopiedVirtualAccountNumber"));
    } catch {
      showToast("error", t("failedToCopy"));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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

      console.log(res);
    } catch (e) {
      console.log(e);
      showToast("error", tToast("toast.payment.paymentStatusCheckFailed"));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        {/* Header */}
        <DialogHeader>
          <div>
            <DialogTitle>{m("purchaseDetail")}</DialogTitle>
            <DialogDescription>{m("purchaseDetailDescription")}</DialogDescription>
          </div>
        </DialogHeader>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 p-6">
          {/* Invoice and Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{t("invoice")}</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-xs">📄</span>
                    </div>
                    <span className="font-mono text-sm font-bold">
                      {transaction.id}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{t("status")}</div>
                  <Badge
                    variant="secondary"
                    className={`${getStatusColor(transaction.status)} border-0`}
                  >
                    {transaction.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Method and Total Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{t("method")}</div>
                  <div className="font-bold">
                    {transaction?.method?.toUpperCase()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{t("total")}</div>
                  <div className="font-bold">
                    {formatIdr(transaction.totalAmount)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Section */}
          <Card>
            <CardContent className="space-y-4 py-4">
              <CardTitle>{t("product")}</CardTitle>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{t("name")}</div>
                <div className="font-bold">{transaction.productName}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{t("type")}</div>
                <div className="font-bold">
                  {transaction.productType?.toUpperCase()}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{t("date")}</div>
                <div className="font-bold">
                  {formatDate(new Date(transaction.createdAt))}{" "}
                  {dateFormat.getHhMm(new Date(transaction.createdAt))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Instruction Section */}
          {transaction.status === "Pending" && (
            <div className="flex flex-col gap-4 rounded-lg border border-amber-300 bg-amber-50/45 p-5 sm:flex-row sm:items-center sm:justify-between">
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
                        {formatIdr(transaction.totalAmount)}
                      </span>
                    </p>
                    {transaction.expiredAt ? (
                      <p className="text-muted-foreground">
                        Berlaku sampai{" "}
                        {formatDate(new Date(transaction.expiredAt))}{" "}
                        {dateFormat.getHhMm(new Date(transaction.expiredAt))}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCheckPaymentStatus()}
                  disabled={isChecking}
                  className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                >
                  <RefreshCw
                    className={`${isChecking ? "animate-spin" : ""} h-4 w-4`}
                  />
                  Refresh
                </Button>
              </div>
              <div className="grid min-h-56 min-w-56 place-items-center self-center rounded-md border bg-white p-3 shadow-sm">
                {qrCodeV2Action ? (
                  <Image
                    src={qrCodeV2Action.value}
                    alt="QRIS payment QR code"
                    width={208}
                    height={208}
                    className="h-52 w-52 object-contain"
                  />
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
            </div>
          )}

          {/* Payment Details Section */}
          <Card>
            <CardContent>
              <div className="space-y-3 py-4">
                <CardTitle>{t("paymentDetails")}</CardTitle>
                {paymentDetails.map((detail, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-muted-foreground">
                      {detail.name}
                    </span>
                    <span className="font-semibold">
                      {formatIdr(detail.price)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Purchased By Section */}
          <Card>
            <CardContent className="space-y-4 py-4">
              <CardTitle>{t("purchasedBy")}</CardTitle>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{t("name")}</div>
                <div className="font-bold">{transaction?.profile?.name}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{t("email")}</div>
                <div className="font-bold">{transaction?.profile?.email}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{t("role")}</div>
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-800 border-0"
                >
                  {transaction?.profile?.members?.[0]?.role}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}

        <DialogFooterWithButton buttonMessage={m("close")} onClick={onClose}>
          {transaction.status === "Pending" && (
            <Button
              variant="outline"
              onClick={() => handleCheckPaymentStatus()}
            >
              {isChecking ? t("checking") : t("checkPaymentStatus")}
            </Button>
          )}
        </DialogFooterWithButton>
      </DialogContent>
    </Dialog>
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
