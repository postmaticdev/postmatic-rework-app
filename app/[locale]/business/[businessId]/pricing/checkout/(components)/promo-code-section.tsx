"use client";

import { useCheckout } from "@/contexts/checkout-context";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

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
    <div className="mb-6 sm:mb-8">
      <h3 className="font-medium mb-2 text-gray-900 dark:text-white">
        {t("promoCode")}
      </h3>
      {product?.isValidCode && product?.benefitCode ? (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 flex justify-between items-center max-md:gap-2 bg-gray-50 dark:bg-gray-700">
          <span className="text-gray-900 dark:text-white max-md:min-w-0 max-md:truncate">{promoCode}</span>
          <div className="flex items-center max-md:shrink-0">
            <span className="bg-blue-600 dark:bg-blue-500 text-white text-sm px-3 py-1 rounded-md mr-2">
              {product?.benefitCode}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClearPromo}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 max-md:size-10"
              aria-label={t("removePromoCode")}
            >
              <X className="h-5 w-5" />
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
