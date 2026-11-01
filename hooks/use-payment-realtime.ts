"use client";

import { ACCESS_TOKEN_KEY, NEXT_PUBLIC_ENABLE_SOCKET } from "@/constants";
import { createSocket, RealtimeEnvelope } from "@/lib/socket";
import { BusinessPurchaseRes } from "@/models/api/purchase/business.type";
import { CheckoutRes } from "@/models/api/purchase/checkout.type";
import { QueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { useEffect, useRef } from "react";
import {
  BaseResponse,
  BaseResponseFiltered,
} from "@/models/api/base-response.type";

export type RealtimePaymentStatusChangedData = {
  businessRootId: number;
  changedAt: string;
  currency: string;
  paymentHistoryId: string;
  previousStatus: string;
  productAmount: number;
  productName: string;
  profileId: string;
  reason: "PAYMENT_STATUS_CHANGED";
  source: "midtrans_status_check" | "midtrans_webhook";
  status:
    | "success"
    | "failed"
    | "expired"
    | "canceled"
    | "denied"
    | "refunded"
    | "pending";
  totalAmount: number;
};

type UsePaymentRealtimeParams = {
  businessId?: number | string | null;
  enabled?: boolean;
  onStatusChanged?: (payload: RealtimePaymentStatusChangedData) => void;
  paymentId?: string | null;
  subscribeBusinessTopic?: boolean;
};

const getBrowserAccessToken = () => {
  if (typeof window === "undefined") return null;

  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ACCESS_TOKEN_KEY}=`))
    ?.split("=")[1];

  return cookieToken
    ? decodeURIComponent(cookieToken)
    : localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const normalizeRealtimePaymentStatus = (
  status?: RealtimePaymentStatusChangedData["status"]
) => {
  if (!status) return "Pending" as const;

  return `${status.slice(0, 1).toUpperCase()}${status.slice(1).toLowerCase()}` as BusinessPurchaseRes["status"];
};

export const mergeCheckoutWithRealtimePayment = (
  checkout: CheckoutRes,
  payload: RealtimePaymentStatusChangedData
): CheckoutRes => ({
  ...checkout,
  productName: payload.productName || checkout.productName,
  status: normalizeRealtimePaymentStatus(payload.status),
  totalAmount: payload.totalAmount ?? checkout.totalAmount,
  updatedAt: payload.changedAt || checkout.updatedAt,
});

export const mergeBusinessPurchaseWithRealtimePayment = (
  purchase: BusinessPurchaseRes,
  payload: RealtimePaymentStatusChangedData
): BusinessPurchaseRes => ({
  ...purchase,
  productName: payload.productName || purchase.productName,
  status: normalizeRealtimePaymentStatus(payload.status),
  totalAmount: payload.totalAmount ?? purchase.totalAmount,
  updatedAt: payload.changedAt || purchase.updatedAt,
});

export const syncPaymentRealtimeCaches = (
  queryClient: QueryClient,
  businessId: string,
  payload: RealtimePaymentStatusChangedData
) => {
  const nextStatus = normalizeRealtimePaymentStatus(payload.status);

  queryClient.setQueriesData(
    { queryKey: ["businessPurchaseHistory", businessId] },
    (
      current:
        | AxiosResponse<BaseResponseFiltered<BusinessPurchaseRes[]>>
        | undefined
    ) => {
      if (!current?.data?.data?.length) return current;

      const nextRows = current.data.data.map((item) =>
        item.id === payload.paymentHistoryId
          ? {
              ...item,
              productName: payload.productName || item.productName,
              status: nextStatus,
              totalAmount: payload.totalAmount ?? item.totalAmount,
              updatedAt: payload.changedAt || item.updatedAt,
            }
          : item
      );

      return {
        ...current,
        data: {
          ...current.data,
          data: nextRows,
        },
      };
    }
  );

  queryClient.setQueryData(
    ["businessPurchaseDetail", payload.paymentHistoryId],
    (
      current:
        | AxiosResponse<BaseResponse<BusinessPurchaseRes>>
        | undefined
    ) => {
      if (!current?.data?.data) return current;

      return {
        ...current,
        data: {
          ...current.data,
          data: mergeBusinessPurchaseWithRealtimePayment(
            current.data.data,
            payload
          ),
        },
      };
    }
  );

  if (nextStatus === "Success") {
    queryClient.invalidateQueries({
      queryKey: ["tokenUsage", businessId],
    });
    queryClient.invalidateQueries({
      queryKey: ["subscribtionSubscription", businessId],
    });
  }
};

export function usePaymentRealtime({
  businessId,
  enabled = true,
  onStatusChanged,
  paymentId,
  subscribeBusinessTopic = false,
}: UsePaymentRealtimeParams) {
  const onStatusChangedRef = useRef(onStatusChanged);

  useEffect(() => {
    onStatusChangedRef.current = onStatusChanged;
  }, [onStatusChanged]);

  useEffect(() => {
    if (!NEXT_PUBLIC_ENABLE_SOCKET || !enabled) return;

    const token = getBrowserAccessToken();
    if (!token) return;

    const topics = [
      paymentId ? `payment.${paymentId}` : null,
      subscribeBusinessTopic && businessId != null
        ? `business.${businessId}.payment`
        : null,
    ].filter(Boolean) as string[];

    if (!topics.length) return;

    const socket = createSocket({ token });
    const handleMessage = (message: RealtimeEnvelope) => {
      if (message.type !== "payment.status_changed") return;

      const payload = message.data as
        | RealtimePaymentStatusChangedData
        | undefined;
      if (!payload) return;

      const matchesPayment = paymentId
        ? payload.paymentHistoryId === paymentId
        : false;
      const matchesBusiness =
        businessId != null
          ? String(payload.businessRootId) === String(businessId)
          : false;

      if (paymentId && subscribeBusinessTopic) {
        if (!matchesPayment && !matchesBusiness) return;
      } else if (paymentId) {
        if (!matchesPayment) return;
      } else if (subscribeBusinessTopic) {
        if (!matchesBusiness) return;
      } else {
        return;
      }

      onStatusChangedRef.current?.(payload);
    };

    socket.on("message", handleMessage);
    socket.subscribe(topics);

    return () => {
      socket.off("message", handleMessage);
      socket.unsubscribe(topics);
    };
  }, [businessId, enabled, paymentId, subscribeBusinessTopic]);
}
