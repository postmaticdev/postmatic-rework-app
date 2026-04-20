"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Copy } from "lucide-react";
import {
  BusinessPurchaseRes,
  PaymentAction,
} from "@/models/api/purchase/business.type";
import { showToast } from "@/helper/show-toast";
import { formatIdr } from "@/helper/formatter";
import Image from "next/image";
import { useDateFormat } from "@/hooks/use-date-format";
import { dateFormat } from "@/helper/date-format";
import { businessPurchaseService } from "@/services/purchase.api";
import { useParams } from "next/navigation";
import { mapEnumPaymentStatus } from "@/helper/map-enum-payment-status";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

  if (!transaction) return null;

  const { paymentDetails, paymentActions } = transaction;

  const renderPaymentActions = (item: PaymentAction) => {
    switch (item.type) {
      case "claim":
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {t("itemAlreadyClaimed")}
            </div>
          </div>
        );
      case "redirect":
        return (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRedirect(item.value)}
            >
              {t("clickToMakePayment")}
            </Button>

            <div className="text-sm text-muted-foreground">
              {t("youWillBeRedirectedToThePaymentPage")}
            </div>
          </div>
        );
      case "text":
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{item.action}</div>
            <div className="flex items-center space-x-2">
              <Input
                value={item.value}
                readOnly
                className="font-mono text-blue-600 font-bold bg-gray-50 text-sm sm:text-base flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(item.value)}
                className="flex-shrink-0 px-3"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("use")} {item.action} {t("toMakePayment")}
            </div>
          </div>
        );
      case "image":
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{t("qris")}</div>
            <div className="flex items-center space-x-2">
              <Image
                src={item.value}
                alt={item.action}
                width={600}
                height={600}
                className="aspect-square rounded-lg w-full h-auto"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {t("useTheImageAboveToMakePayment")}
            </div>
          </div>
        );
    }
  };

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

  const handleRedirect = (url: string) => {
    window.open(url, "_blank");
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
            <Card>
              <CardContent className="space-y-4 py-4">
                <CardTitle>{t("paymentInstruction")}</CardTitle>
                {paymentActions.map((act) => (
                  <div key={act.id}>{renderPaymentActions(act)}</div>
                ))}
              </CardContent>
            </Card>
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
