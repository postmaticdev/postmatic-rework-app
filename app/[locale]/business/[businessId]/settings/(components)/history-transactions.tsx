"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  mergeBusinessPurchaseWithRealtimePayment,
  syncPaymentRealtimeCaches,
  usePaymentRealtime,
} from "@/hooks/use-payment-realtime";
import { CreditCard, Eye } from "lucide-react";
import { useBusinessPurchaseGetHistory } from "@/services/purchase.api";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { mapEnumPaymentStatus } from "@/helper/map-enum-payment-status";
import { BusinessPurchaseRes } from "@/models/api/purchase/business.type";
import { PurchaseDetailModal } from "@/app/[locale]/business/[businessId]/settings/(components)/purchase-detail-modal";
import { useState } from "react";
import { NoContent } from "@/components/base/no-content";
import { useDateFormat } from "@/hooks/use-date-format";
import { dateFormat } from "@/helper/date-format";
import {
  FilterQuery,
  initialPagination,
} from "@/models/api/base-response.type";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useLocale, useTranslations } from "next-intl";
import {
  formatIdrStable,
  formatProductName,
  formatProductType,
} from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/product-display";

export function HistoryTransactions() {
  const locale = useLocale();
  const formatIdr = (amount: number) => formatIdrStable(amount, locale);
  const { businessId } = useParams() as { businessId: string };
  const [filterQuery, setFilterQuery] = useState<Partial<FilterQuery>>({
    page: 1,
    limit: 10,
    sort: "desc",
    sortBy: "createdAt",
    category: "",
    search: "",
  });
  const { data: transactionsData } = useBusinessPurchaseGetHistory(businessId, filterQuery);
  const transactions = transactionsData?.data?.data || [];
  const queryClient = useQueryClient();
  const t = useTranslations("settings");
  const tStatus = useTranslations("checkout.paymentStatusLabel");
  const { formatDate } = useDateFormat();
  const pagination = transactionsData?.data?.pagination || initialPagination;
  const [selectedTransaction, setSelectedTransaction] =
    useState<BusinessPurchaseRes | null>(null);
  const onViewDetail = (transaction: BusinessPurchaseRes) => {
    setSelectedTransaction(transaction);
  };

  usePaymentRealtime({
    businessId,
    subscribeBusinessTopic: true,
    onStatusChanged: (payload) => {
      syncPaymentRealtimeCaches(queryClient, businessId, payload);
      setSelectedTransaction((current) =>
        current?.id === payload.paymentHistoryId
          ? mergeBusinessPurchaseWithRealtimePayment(current, payload)
          : current
      );
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="bg-card ">
        <CardContent className="px-4 py-4 sm:py-8 ">
          <div className="min-w-0">
            <CardTitle className="text-lg sm:text-xl font-bold text-foreground  ">
              {t("historyTransactions")}
            </CardTitle>
            {/* <PaginationWithControls
              pagination={pagination}
              filterQuery={filterQuery}
              setFilterQuery={setFilterQuery}
              currData={transactions.length}
              showSort={false}
            /> */}
            {transactions.length > 0 ? (
              <div>
                {/* Mobile: stacked cards */}
                <ul className="mt-4 space-y-3 md:hidden">
                  {transactions.map((transaction) => (
                    <li
                      key={transaction.id}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-medium text-foreground">
                            {formatProductName(transaction.productName, locale)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(new Date(transaction.createdAt))}{" "}
                            {dateFormat.getHhMm(new Date(transaction.createdAt))}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`${mapEnumPaymentStatus.getStatusColor(
                            transaction.status
                          )} shrink-0 border-0`}
                        >
                          {mapEnumPaymentStatus.getStatusLabel(transaction.status, tStatus)}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant="secondary"
                          className="border-0 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                        >
                          {formatProductType(transaction.productType)}
                        </Badge>
                        {transaction.method && (
                          <span>{transaction.method.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="font-semibold text-foreground">
                          {formatIdr(transaction.totalAmount)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetail(transaction)}
                          className="h-(--control-h-sm) bg-gray-600 hover:bg-gray-700 text-white border-gray-600"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t("view")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop: table */}
                <div className="hidden overflow-x-auto md:block">
                <table className="w-full ">
                  <thead className="border-b border-border">
                    <tr className="text-left">
                      <th className="p-4 font-medium text-foreground">
                        {t("date")}
                      </th>
                      <th className="p-4 font-medium text-foreground">
                        {t("product")}
                      </th>
                      <th className="p-4 font-medium text-foreground">{t("type")}</th>
                      <th className="p-4 font-medium text-foreground">
                        {t("method")}
                      </th>
                      <th className="p-4 font-medium text-foreground">{t("total")}</th>
                      <th className="p-4 font-medium text-foreground">
                        {t("status")}
                      </th>
                      <th className="p-4 font-medium text-foreground">
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-border last:border-b-0 hover:bg-muted/50"
                      >
                        <td className="p-4 text-foreground">
                          {formatDate(
                            new Date(transaction.createdAt)
                          )}{" "}
                          {dateFormat.getHhMm(new Date(transaction.createdAt))}
                        </td>
                        <td className="p-4 text-foreground">
                          {formatProductName(transaction.productName, locale)}
                        </td>
                        <td className="p-4 text-foreground">
                          {formatProductType(transaction.productType)}
                        </td>
                        <td className="p-4 text-foreground">
                          {transaction?.method?.toUpperCase()}
                        </td>
                        <td className="p-4 text-foreground">
                          {formatIdr(transaction.totalAmount)}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="secondary"
                            className={`${mapEnumPaymentStatus.getStatusColor(
                              transaction.status
                            )} border-0`}
                          >
                            {mapEnumPaymentStatus.getStatusLabel(transaction.status, tStatus)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetail(transaction)}
                            className="bg-gray-600 hover:bg-gray-700 text-white border-gray-600"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t("view")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <PaginationControls
                  pagination={pagination}
                  filterQuery={filterQuery}
                  setFilterQuery={setFilterQuery}
                />
              </div>
            ) : (
              <NoContent
                icon={CreditCard}
                title={t("noHistoryTransactions")}
                titleDescription={t("noHistoryTransactionsDescription")}
              />
            )}
          </div>
        </CardContent>
      </Card>
      <PurchaseDetailModal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
        setTransaction={setSelectedTransaction}
      />
    </div>
  );
}
