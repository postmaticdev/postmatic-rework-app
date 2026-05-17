import { api } from "@/config/api";
import {
  BaseResponse,
  BaseResponseFiltered,
  FilterQuery,
} from "@/models/api/base-response.type";
import { BusinessPurchaseRes } from "@/models/api/purchase/business.type";
import {
  BankPld,
  CheckoutRes,
  EWalletPld,
} from "@/models/api/purchase/checkout.type";
import { UserPurchaseRes } from "@/models/api/purchase/user.type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type NewPaymentAction = {
  name: string;
  value: string;
  valueType: "image" | "link" | "text";
  method: string;
};

type NewPaymentCreated = {
  paymentId: string;
  orderId?: string;
  status: string;
  paymentMethod: { code: string; name: string; type: string };
  expiresAt: string;
  calculation: {
    itemPrice: number;
    discountAmount: number;
    adminFeeAmount: number;
    taxAmount: number;
    totalAmount: number;
  };
  tokenAmount: number;
  actions: NewPaymentAction[];
};

export type ImageTokenPriceRes = {
  referral?: {
    valid: boolean;
    message: string;
  };
  calculation: {
    itemPrice: number;
    discountAmount: number;
    afterDiscount: number;
    adminFeeAmount: number;
    subtotalBeforeTax: number;
    taxAmount: number;
    totalAmount: number;
  };
  paymentMethod: {
    code: string;
    name: string;
    type: string;
  };
  tokenAmount: number;
};

type NewPaymentHistory = {
  id: string;
  productAmount: number;
  status: string;
  currency: string;
  paymentMethod: string;
  paymentMethodType: string;
  productName: string;
  productType: string;
  productPrice: number;
  subtotalItemAmount: number;
  discountAmount: number;
  adminFeeAmount: number;
  taxAmount: number;
  totalAmount: number;
  midtransExpiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

const titleStatus = (status: string) =>
  `${status.slice(0, 1).toUpperCase()}${status.slice(1).toLowerCase()}`;

const mapActions = (actions: NewPaymentAction[] = []) =>
  actions.map((action) => ({
    action: action.name,
    value: action.value,
    type:
      action.valueType === "link"
        ? ("redirect" as const)
        : (action.valueType as "image" | "text"),
    method: action.method,
  }));

const mapPaymentDetails = (payment: NewPaymentCreated | NewPaymentHistory) => {
  if ("calculation" in payment) {
    return [
      { name: "Item", price: payment.calculation.itemPrice },
      { name: "Discount", price: payment.calculation.discountAmount },
      { name: "Admin", price: payment.calculation.adminFeeAmount },
      { name: "Tax", price: payment.calculation.taxAmount },
    ];
  }
  return [
    { name: "Item", price: payment.subtotalItemAmount },
    { name: "Discount", price: payment.discountAmount },
    { name: "Admin", price: payment.adminFeeAmount },
    { name: "Tax", price: payment.taxAmount },
  ];
};

const mapCheckout = (payment: NewPaymentCreated): CheckoutRes => ({
  id: payment.paymentId,
  midtransId: payment.paymentId,
  orderId: payment.orderId,
  paymentCode: payment.orderId,
  productName: `Image Token x${payment.tokenAmount}`,
  productType: "token",
  totalAmount: payment.calculation.totalAmount,
  method: payment.paymentMethod.code,
  token: payment.tokenAmount,
  expiredAt: payment.expiresAt,
  status: titleStatus(payment.status),
  appProductSubscriptionItemId: "",
  appProductTokenId: String(payment.tokenAmount),
  profileId: "",
  rootBusinessId: "",
  deletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  paymentActions: mapActions(payment.actions),
  paymentDetails: mapPaymentDetails(payment),
});

const mapHistory = (payment: NewPaymentHistory): BusinessPurchaseRes => ({
  id: payment.id,
  totalAmount: payment.totalAmount,
  method: payment.paymentMethod,
  productName: payment.productName,
  productType: payment.productType,
  status: titleStatus(payment.status) as BusinessPurchaseRes["status"],
  expiredAt: payment.midtransExpiredAt ?? undefined,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
  paymentActions: [],
  paymentDetails: mapPaymentDetails(payment),
  profile: { name: "", email: "", members: [] },
});

// ============================== USER PURCHASE ==============================

const userPurchaseService = {
  getHistory: () => {
    return api.get<BaseResponse<UserPurchaseRes[]>>(`/purchase/user`);
  },
  getDetail: (businessId: string) => {
    return api.get<BaseResponse<UserPurchaseRes>>(
      `/purchase/user/${businessId}`
    );
  },
};

export const useUserPurchaseGetHistory = () => {
  return useQuery({
    queryKey: ["userPurchaseHistory", "purchase"],
    queryFn: () => userPurchaseService.getHistory(),
  });
};

export const useUserPurchaseGetDetail = (businessId: string) => {
  return useQuery({
    queryKey: ["userPurchaseDetail", businessId, "purchase"],
    queryFn: () => userPurchaseService.getDetail(businessId),
  });
};

// ============================== BUSINESS PURCHASE ==============================

export const businessPurchaseService = {
  getHistory: (businessId: string, filterQuery: Partial<FilterQuery>) => {
    return api.get<BaseResponseFiltered<BusinessPurchaseRes[]>>(
      `/payment/${businessId}/`,
      {
        params: filterQuery,
      }
    ).then((res) => {
      res.data.data = ((res.data.data ?? []) as unknown as NewPaymentHistory[]).map(
        mapHistory
      );
      return res;
    });
  },
  getDetail: (businessId: string, paymentId: string) => {
    return api.get<BaseResponse<BusinessPurchaseRes>>(
      `/payment/${businessId}/${paymentId}`
    ).then((res) => {
      res.data.data = mapHistory(res.data.data as unknown as NewPaymentHistory);
      return res;
    });
  },
};

export const useBusinessPurchaseGetHistory = (
  businessId: string,
  filterQuery: Partial<FilterQuery>
) => {
  return useQuery({
    queryKey: ["businessPurchaseHistory", businessId, filterQuery],
    queryFn: () => businessPurchaseService.getHistory(businessId, filterQuery),
    enabled: !!businessId,
  });
};

export const useBusinessPurchaseGetDetail = (
  businessId: string,
  paymentId: string
) => {
  return useQuery({
    queryKey: ["businessPurchaseDetail", paymentId],
    queryFn: () => businessPurchaseService.getDetail(businessId, paymentId),
    enabled: !!businessId && !!paymentId,
  });
};

// ============================== CHECKOUT PAY ==============================

const checkoutPayService = {
  checkImageTokenPrice: (
    businessId: string,
    payload: {
      tokenAmount: number;
      paymentMethod: string;
      referralCode?: string;
    }
  ) => {
    return api.get<BaseResponse<ImageTokenPriceRes>>(`/payment/image-token`, {
      params: {
        tokenAmount: payload.tokenAmount,
        currencyCode: "IDR",
        paymentMethod: payload.paymentMethod,
        businessRootId: Number(businessId),
        referralCode: payload.referralCode || undefined,
      },
    });
  },
  eWallet: (businessId: string, formData: EWalletPld) => {
    return api.post<BaseResponse<CheckoutRes>>(
      `/payment/image-token`,
      {
        tokenAmount: Number(formData.productId),
        currencyCode: "IDR",
        paymentMethod: formData.acquirer,
        businessRootId: Number(businessId),
        referralCode: formData.discountCode || undefined,
      }
    ).then((res) => {
      res.data.data = mapCheckout(res.data.data as unknown as NewPaymentCreated);
      res.data.data.rootBusinessId = businessId;
      return res;
    });
  },
  bank: (businessId: string, formData: BankPld) => {
    return api.post<BaseResponse<CheckoutRes>>(
      `/payment/image-token`,
      {
        tokenAmount: Number(formData.productId),
        currencyCode: "IDR",
        paymentMethod: formData.bank,
        businessRootId: Number(businessId),
        referralCode: formData.discountCode || undefined,
      }
    ).then((res) => {
      res.data.data = mapCheckout(res.data.data as unknown as NewPaymentCreated);
      res.data.data.rootBusinessId = businessId;
      return res;
    });
  },
};

export const usePaymentImageTokenPrice = ({
  businessId,
  tokenAmount,
  paymentMethod,
  referralCode,
  enabled = true,
}: {
  businessId: string;
  tokenAmount: number;
  paymentMethod: string;
  referralCode?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: [
      "paymentImageTokenPrice",
      businessId,
      tokenAmount,
      paymentMethod,
      referralCode,
    ],
    queryFn: () =>
      checkoutPayService.checkImageTokenPrice(businessId, {
        tokenAmount,
        paymentMethod,
        referralCode,
      }),
    enabled:
      enabled && !!businessId && tokenAmount > 0 && !!paymentMethod,
  });
};

export const useCheckoutPayEWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: EWalletPld;
    }) => checkoutPayService.eWallet(businessId, formData),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({
        queryKey: [data?.data?.rootBusinessId],
      });
    },
  });
};

export const useCheckoutPayBank = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: BankPld;
    }) => checkoutPayService.bank(businessId, formData),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({
        queryKey: [data?.data?.rootBusinessId],
      });
    },
  });
};
