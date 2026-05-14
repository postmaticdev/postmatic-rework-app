import { api } from "@/config/api";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import {
  ProductDetailParamsPld,
  ProductDetailRes,
  SubscriptionProductRes,
  TokenProductRes,
} from "@/models/api/app-product";
import { BaseResponse } from "@/models/api/base-response.type";
import { useQuery } from "@tanstack/react-query";

type TokenProductApiRes = {
  id: string;
  type: string;
  currencyCode: string;
  priceAmount: number;
  tokenAmount: number;
};

type PaymentMethodApiRes = {
  id: number;
  code: string;
  name: string;
  type: "bank" | "ewallet";
  image: string | null;
  taxFee: number;
  adminType: string;
  adminFee: number;
  isActive: boolean;
};

const TOKEN_AMOUNTS = [100_000, 200_000, 500_000, 1_000_000];

const getPaymentMethods = async () => {
  const res = await api.get<BaseResponse<PaymentMethodApiRes[]>>(
    "/app/payment-method"
  );
  return (res.data.data ?? []).filter((method) => method.isActive);
};

const mapMethodType = (type: PaymentMethodApiRes["type"]) =>
  type === "bank" ? "Virtual Account" : "E-Wallet";

const appProductService = {
  getSubscription: async () => {
    return {
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "SUBSCRIPTION_PRODUCT_NOT_AVAILABLE",
        data: { discount: { message: "", detail: null }, products: [] },
      },
    } as unknown as Awaited<ReturnType<typeof api.get<BaseResponse<SubscriptionProductRes>>>>;
  },
  getToken: async () => {
    const products = await Promise.all(
      TOKEN_AMOUNTS.map((amount) =>
        api.get<BaseResponse<TokenProductApiRes>>("/app/token-product", {
          params: {
            amount,
            currencyCode: "IDR",
            from: "token",
            type: "image_token",
          },
        })
      )
    );

    return {
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "SUCCESS_GET_TOKEN_PRODUCTS",
        data: {
          discount: { message: "", detail: null },
          products: products.map(({ data }) => ({
            id: String(data.data.tokenAmount),
            price: data.data.priceAmount,
            token: data.data.tokenAmount,
            tokenType: data.data.type,
            pricingByMethod: [],
          })),
        },
      },
    } as unknown as Awaited<ReturnType<typeof api.get<BaseResponse<TokenProductRes>>>>;
  },
  getProductDetail: async (payload: ProductDetailParamsPld) => {
    const tokenAmount = Number(payload.productId);
    const [productRes, methods] = await Promise.all([
      api.get<BaseResponse<TokenProductApiRes>>("/app/token-product", {
        params: {
          amount: tokenAmount,
          currencyCode: "IDR",
          from: "token",
          type: "image_token",
        },
      }),
      getPaymentMethods(),
    ]);

    const product = productRes.data.data;
    const methodsByType = methods.reduce<Record<string, PaymentMethodApiRes[]>>(
      (acc, method) => {
        const type = mapMethodType(method.type);
        acc[type] = [...(acc[type] ?? []), method];
        return acc;
      },
      {}
    );

    return {
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "SUCCESS_GET_TOKEN_PRODUCT_DETAIL",
        data: {
          id: String(product.tokenAmount),
          name: `Image Token x${product.tokenAmount}`,
          description: "Token for image generation",
          type: "token",
          pricingByMethod: Object.entries(methodsByType).map(
            ([type, methods]) => ({
              type,
              methods: methods.map((method) => {
                const admin =
                  method.adminType === "percentage"
                    ? Math.round((product.priceAmount * method.adminFee) / 100)
                    : method.adminFee;
                const tax = Math.round(
                  ((product.priceAmount + admin) * method.taxFee) / 100
                );
                const total = product.priceAmount + admin + tax;
                return {
                  detail: {
                    item: product.priceAmount,
                    discount: 0,
                    admin,
                    tax,
                  },
                  issued: {
                    name: method.name,
                    code: method.code,
                    image: method.image || DEFAULT_PLACEHOLDER_IMAGE,
                  },
                  subtotal: {
                    item: product.priceAmount,
                    afterDiscount: product.priceAmount,
                    afterAdmin: product.priceAmount + admin,
                    afterTax: total,
                    total,
                  },
                  admin: {
                    fee: method.adminFee,
                    type: method.adminType,
                    percentage:
                      method.adminType === "percentage" ? method.adminFee : 0,
                  },
                  discount: { fee: 0, type: "fixed", percentage: 0 },
                };
              }),
            })
          ),
          validFor: 0,
          validForInfo: "unlimited",
          defaultPrice: product.priceAmount,
          isValidCode: true,
          hintCode: null,
          benefitCode: null,
        },
      },
    } as unknown as Awaited<ReturnType<typeof api.get<BaseResponse<ProductDetailRes>>>>;
  },
};

export const useAppProductGetSubscription = (
  businessId: string,
  code?: string
) => {
  return useQuery({
    queryKey: ["appProductSubscription", businessId, code],
    queryFn: () => appProductService.getSubscription(),
    enabled: !!businessId,
  });
};

export const useAppProductGetToken = (businessId: string, code?: string) => {
  return useQuery({
    queryKey: ["appProductToken", businessId, code],
    queryFn: () => appProductService.getToken(),
    enabled: !!businessId,
  });
};

export const useAppProductGetProductDetail = (
  payload: ProductDetailParamsPld
) => {
  return useQuery({
    queryKey: ["appProductProductDetail", payload],
    queryFn: () => appProductService.getProductDetail(payload),
    enabled:
      !!payload.rootBusinessId && !!payload.productId && payload.type === "token",
  });
};
