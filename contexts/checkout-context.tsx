"use client";

import {
  DetailPricingItem,
  PricingByMethod,
  ProductDetailRes,
} from "@/models/api/app-product";
import { CheckoutRes } from "@/models/api/purchase/checkout.type";
import { BusinessPurchaseRes } from "@/models/api/purchase/business.type";
import { useAppProductGetProductDetail } from "@/services/app-product.api";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

import { createContext, useContext, useEffect, useState } from "react";
import { Dispatch, SetStateAction } from "react";

type CheckoutData = CheckoutRes | BusinessPurchaseRes | null;

interface SelectedPayment {
  code: string;
  type: "Virtual Account" | "E-Wallet";
}

interface CheckoutContext {
  promoState: string;
  setPromoState: (promoState: string) => void;
  promoCode: string;
  product: ProductDetailRes | undefined;
  onPromoSubmit: () => void;
  onClearPromo: () => void;
  selectedPayment: SelectedPayment | null;
  setSelectedPayment: (selectedPayment: SelectedPayment | null) => void;
  detailPricing: DetailPricingItem & { total: number };
  checkoutResult: CheckoutData;
  setCheckoutResult: Dispatch<SetStateAction<CheckoutData>>;
}

const CheckoutContext = createContext<CheckoutContext | undefined>(undefined);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { businessId } = useParams() as { businessId: string };
  const [selectedPayment, setSelectedPayment] =
    useState<SelectedPayment | null>(null);
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "";
  const productId = searchParams.get("productId") || "";
  const promoCode = searchParams.get("promoCode") || "";
  const {
    data: productDetail,
    isLoading: isLoadingProductDetail,
    isError: isErrorProductDetail,
  } = useAppProductGetProductDetail({
    rootBusinessId: businessId,
    productId: productId,
    type: type as "subscription" | "token",
    code: promoCode,
  });
  const product = productDetail?.data?.data;
  const [checkoutResult, setCheckoutResult] = useState<CheckoutData>(
    null
  );
  const findDetailPricing = product?.pricingByMethod
    ?.flatMap((method) => method.methods)
    .find((method) => method?.issued?.code === selectedPayment?.code);

  const detailFromCheckout = checkoutResult?.paymentDetails?.reduce(
    (acc, curr) => {
      const key = curr.name.toLowerCase();
      if (key.includes("admin")) acc.admin = curr.price;
      else if (key.includes("discount")) acc.discount = curr.price;
      else if (key.includes("tax")) acc.tax = curr.price;
      else if (key.includes("item") || key.includes("subtotal"))
        acc.item = curr.price;
      return acc;
    },
    {
      admin: 0,
      discount: 0,
      item: 0,
      tax: 0,
    } as DetailPricingItem
  );

  const detailPricing: DetailPricingItem & { total: number } =
    detailFromCheckout && checkoutResult
      ? {
          ...detailFromCheckout,
          total: checkoutResult.totalAmount ?? product?.defaultPrice ?? 0,
        }
      : findDetailPricing?.detail
        ? {
            ...findDetailPricing.detail,
            total:
              findDetailPricing.subtotal?.total || product?.defaultPrice || 0,
          }
        : {
            admin: 0,
            discount: 0,
            item: product?.defaultPrice || 0,
            tax: 0,
            total: product?.defaultPrice || 0,
          };

  const [promoState, setPromoState] = useState<string>("");

  const onPromoSubmit = () => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("productId", productId);
    sp.set("type", type);
    if (promoState.trim()) {
      sp.set("promoCode", promoState);
    } else {
      sp.delete("promoCode");
    }
    router.push(`/business/${businessId}/pricing/checkout?${sp.toString()}`);
  };

  const onClearPromo = () => {
    const sp = new URLSearchParams(window.location.search);
    sp.delete("promoCode");
    router.push(`/business/${businessId}/pricing/checkout?${sp.toString()}`);
  };

  useEffect(() => {
    if (promoCode) {
      setPromoState(promoCode);
    }
  }, [promoCode]);

  if (!isLoadingProductDetail && isErrorProductDetail) {
    router.push(`/business/${businessId}/pricing`);
  }

  return (
    <CheckoutContext.Provider
      value={{
        promoState,
        setPromoState,
        product,
        onPromoSubmit,
        onClearPromo,
        selectedPayment,
        setSelectedPayment,
        detailPricing,
        checkoutResult,
        setCheckoutResult,
        promoCode,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
};
