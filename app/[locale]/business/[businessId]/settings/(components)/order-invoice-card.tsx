"use client";

import { ReceiptText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PaymentDetail } from "@/models/api/purchase/business.type";
import {
  formatIdrStable,
  formatProductName,
  formatProductType,
} from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/product-display";

interface OrderInvoiceCardProps {
  reference: string;
  createdAt: string;
  updatedAt: string;
  productName: string;
  productType?: string | null;
  method?: string | null;
  paymentDetails: PaymentDetail[];
  totalAmount: number;
  billedTo?: { name?: string | null; email?: string | null } | null;
  affiliateCode?: string | null;
  status?: { value?: string; label: string };
}

// Payment details come from the API as free-form name/price pairs, so the line
// item and discount rows are recognised by name.
const isItemDetail = (name: string) => /item|subtotal|harga/i.test(name);
const isDiscountDetail = (name: string) => /disc|diskon|promo/i.test(name);

const getStatusClassName = (status?: string) => {
  switch (status) {
    case "Success":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400";
    case "Failed":
    case "Denied":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400";
    case "Canceled":
    case "Expired":
    case "Refunded":
      return "border-border bg-muted text-muted-foreground";
    case "Pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400";
  }
};

export function OrderInvoiceCard({
  reference,
  createdAt,
  updatedAt,
  productName,
  productType,
  method,
  paymentDetails,
  totalAmount,
  billedTo,
  affiliateCode,
  status,
}: OrderInvoiceCardProps) {
  const t = useTranslations("settings.topUpTokenDialog");
  const locale = useLocale();
  const formatIdr = (amount: number) => formatIdrStable(amount, locale);

  const itemAmount =
    paymentDetails.find((detail) => isItemDetail(detail.name))?.price ??
    paymentDetails[0]?.price ??
    totalAmount;

  const metaRows = [
    { label: t("createdAt"), value: createdAt },
    { label: t("updatedAt"), value: updatedAt },
    { label: t("method"), value: method?.toUpperCase() || "-" },
    ...(affiliateCode !== undefined
      ? [{ label: t("affiliateCode"), value: affiliateCode || "-" }]
      : []),
  ];

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      {/* Header: judul, nomor referensi, status */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight">{t("orderDetails")}</h3>
            <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
              #{reference}
            </p>
          </div>
        </div>
        {status ? (
          <span
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-semibold",
              getStatusClassName(status.value)
            )}
          >
            {status.label}
          </span>
        ) : null}
      </div>

      {/* Info tagihan */}
      <div className="grid gap-4 border-b bg-muted/40 p-4 sm:grid-cols-2 sm:p-5">
        {billedTo?.name || billedTo?.email ? (
          <div className="min-w-0 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("billedTo")}
            </p>
            {billedTo.name ? (
              <p className="mt-1 break-words font-semibold text-foreground">{billedTo.name}</p>
            ) : null}
            {billedTo.email ? (
              <p className="break-all text-muted-foreground">{billedTo.email}</p>
            ) : null}
          </div>
        ) : null}
        <dl
          className={cn(
            "grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm",
            !(billedTo?.name || billedTo?.email) && "sm:col-span-2"
          )}
        >
          {metaRows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="break-words text-right font-medium text-foreground sm:text-left">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Item & ringkasan biaya */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-[1fr_auto] gap-4 border-b pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{t("item")}</span>
          <span className="text-right">{t("amount")}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-start gap-4 border-b py-3 text-sm">
          <div className="min-w-0">
            <p className="break-words font-medium text-foreground">
              {formatProductName(productName, locale) || "-"}
            </p>
            {productType ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatProductType(productType)}
              </p>
            ) : null}
          </div>
          <span className="text-right font-medium tabular-nums text-foreground">
            {formatIdr(itemAmount)}
          </span>
        </div>

        <dl className="ml-auto mt-3 w-full space-y-2 text-sm sm:max-w-xs">
          {paymentDetails.map((detail, index) => {
            const isDiscount = isDiscountDetail(detail.name) && detail.price > 0;
            return (
              <div key={`${detail.name}-${index}`} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{detail.name}</dt>
                <dd
                  className={cn(
                    "text-right tabular-nums",
                    isDiscount
                      ? "text-green-600 dark:text-green-400"
                      : "text-foreground"
                  )}
                >
                  {isDiscount ? `-${formatIdr(detail.price)}` : formatIdr(detail.price)}
                </dd>
              </div>
            );
          })}
          <div className="flex items-baseline justify-between gap-4 border-t pt-3">
            <dt className="font-semibold text-foreground">{t("total")}</dt>
            <dd className="text-right text-base font-bold tabular-nums text-primary">
              {formatIdr(totalAmount)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
