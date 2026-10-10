"use client";

import { useCheckout } from "@/contexts/checkout-context";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PromoCodeSection() {
  const {
    product,
    promoState,
    setPromoState,
    onPromoSubmit,
    onClearPromo,
    promoCode,
  } = useCheckout();
  const t = useTranslations("checkout");

  return (
    <div className="mb-8">
      <h3 className="font-medium mb-2 text-gray-900 dark:text-white">
        {t("promoCode")}
      </h3>
      {product?.isValidCode && product?.benefitCode ? (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
          <span className="text-gray-900 dark:text-white">{promoCode}</span>
          <div className="flex items-center">
            <span className="bg-blue-600 dark:bg-blue-500 text-white text-sm px-3 py-1 rounded-md mr-2">
              {product?.benefitCode}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClearPromo}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </div>
        </div>
      ) : (
        <Input
          type="text"
          placeholder={t("promoCode")}
          value={promoState}
          onChange={(e) => setPromoState(e.target.value?.toUpperCase())}
          className="border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onPromoSubmit();
            }
          }}
        />
      )}
      {!product?.isValidCode && product?.hintCode && (
        <div className="text-red-500 text-sm mt-4">{product?.hintCode}</div>
      )}
    </div>
  );
}
