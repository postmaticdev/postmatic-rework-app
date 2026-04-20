"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooterWithButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Check } from "lucide-react";
import Image from "next/image";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { DEFAULT_PRODUCT_IMAGE } from "@/constants";
import { ProductKnowledgeRes } from "@/models/api/knowledge/product.type";
import { formatPriceWithCurrency } from "@/helper/price-formatter";
import { useTranslations } from "next-intl";

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductSelectionModal({
  isOpen,
  onClose,
}: ProductSelectionModalProps) {
  const [tempSelected, setTempSelected] = useState<ProductKnowledgeRes | null>(
    null
  );
  const { productKnowledges, onSelectProduct } = useContentGenerate();

  const handleSelectProduct = () => {
    onSelectProduct(tempSelected);
    onClose();
  };

  const m = useTranslations("modal");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{m("selectProduct")}</DialogTitle>
          <DialogDescription>
            {m("selectProductDescription")}
          </DialogDescription>
               {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={m("searchProducts")}
              value={productKnowledges.filterQuery.search || ""}
              onChange={(e) =>
                productKnowledges.setFilterQuery({
                  ...productKnowledges.filterQuery,
                  search: e.target.value,
                })
              }
              className="pl-10"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
     

          {/* Product List */}
          <div className="space-y-3 ">
            {productKnowledges.contents.map((product) => (
              <Card
                key={product.id}
                className={`cursor-pointer transition-colors ${
                  product?.id === tempSelected?.id
                    ? "ring-2 ring-inset ring-blue-500 bg-card/50"
                    : "hover:bg-card/50"
                }`}
                onClick={() => {
                  if (product?.id === tempSelected?.id) {
                    setTempSelected(null);
                  } else {
                    setTempSelected(product);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 mb-1">

                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={product.images[0] || DEFAULT_PRODUCT_IMAGE}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col sm:hidden items-start gap-2 mb-1">
                        <h3 className="font-medium text-foreground">
                          {product.name}
                        </h3>
                        <span className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full">
                          {product.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="hidden sm:flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground">
                          {product.name}
                        </h3>
                        <span className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full">
                          {product.category}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {product.description}
                      </p>

                      <p className="text-sm font-medium text-foreground">
                            {formatPriceWithCurrency(
                              product.price,
                              product.currency
                            )}
                          </p>
                    </div>

                    {tempSelected?.id === product.id && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {productKnowledges.contents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {m("noMatchSearch")}
            </div>
          )}
        </div>

        <DialogFooterWithButton
          buttonMessage={m("selectProduct")}
          onClick={handleSelectProduct}
        />
      </DialogContent>
    </Dialog>
  );
}
