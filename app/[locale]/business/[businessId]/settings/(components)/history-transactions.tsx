"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Eye } from "lucide-react";
import { useBusinessPurchaseGetHistory } from "@/services/purchase.api";
import { useParams } from "next/navigation";
import { mapEnumPaymentStatus } from "@/helper/map-enum-payment-status";
import { BusinessPurchaseRes } from "@/models/api/purchase/business.type";
import { PurchaseDetailModal } from "@/app/[locale]/business/[businessId]/settings/(components)/purchase-detail-modal";
import { useState } from "react";
import { NoContent } from "@/components/base/no-content";
import { formatIdr } from "@/helper/formatter";
import { useDateFormat } from "@/hooks/use-date-format";
import { dateFormat } from "@/helper/date-format";
import {
  FilterQuery,
  initialPagination,
} from "@/models/api/base-response.type";
import { PaginationWithControls } from "@/components/ui/pagination-with-controls";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useTranslations } from "next-intl";

export function HistoryTransactions() {
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
  const t = useTranslations("settings");
  const tStatus = useTranslations("checkout.paymentStatusLabel");
  const { formatDate } = useDateFormat();
  const pagination = transactionsData?.data?.pagination || initialPagination;
  const [selectedTransaction, setSelectedTransaction] =
    useState<BusinessPurchaseRes | null>(null);
  const onViewDetail = (transaction: BusinessPurchaseRes) => {
    setSelectedTransaction(transaction);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="bg-card ">
        <CardContent className="px-4 py-8 ">
          <div className="overflow-x-auto max-w-screen">
            <CardTitle className="text-lg sm:text-xl font-bold text-foreground  ">
              {t("historyTransactions")}
            </CardTitle>
            <PaginationWithControls
              pagination={pagination}
              filterQuery={filterQuery}
              setFilterQuery={setFilterQuery}
              currData={transactions.length}
              showSort={false}
            />
            {transactions.length > 0 ? (
              <div>
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
                          {transaction.productName}
                        </td>
                        <td className="p-4 text-foreground">
                          {transaction.productType?.toUpperCase()}
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
