"use client";

import Image from "next/image";
import { Plus, Heart, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooterWithTwoButtons,
} from "@/components/ui/dialog";
import { Card, CardContent } from "../../../../../../components/ui/card";
import {
  Template,
  useContentGenerate,
} from "@/contexts/content-generate-context";
import { useDateFormat } from "@/hooks/use-date-format";
import { formatIdr } from "@/helper/formatter";
import { useTranslations } from "next-intl";

interface ReferenceFullviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
  // onSaveReference: (id: string) => void;
  // onUseTemplate: () => void;
}

export function ReferenceFullviewModal({
  isOpen,
  onClose,
  template,
}: ReferenceFullviewModalProps) {
  const { onSaveUnsave, onSelectReferenceImage } = useContentGenerate();
  const m = useTranslations("modal");
  const { formatDate } = useDateFormat();
  if (!template) return null;

  const isSaved = template.type === "saved";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        {/* Header */}
        <DialogHeader>
          <div>
            <DialogTitle>{template.name}</DialogTitle>
            <DialogDescription>
              {m("by")} <span className="font-medium">{template.publisher?.name}</span>
            </DialogDescription>
          </div>

          {/* Stats Row in Header */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3">
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">★</span>
              <span className="font-medium">{4.6}</span>
              {/* TODO: gaada rating */}
            </div>
            <div className="text-muted-foreground">•</div>
            <div className="flex items-center gap-1">
              <span>
                {20} {m("downloads")}
                {/* TODO: gada download */}
              </span>
            </div>
            <div className="text-muted-foreground">•</div>
            <div className="flex items-center gap-1">
              <span>
                {formatDate(new Date(template.createdAt))}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Preview Image */}
          
            <Image
              src={template?.imageUrl}
              alt={template.name}
              width={500}
              height={500}
              className="w-full h-auto rounded-xl"
              priority
            />
        

          {/* Description */}
          {/* <Card>
            <CardContent className="py-4">
              <h3 className="font-semibold  mb-2 flex items-center">
                <div className="w-1 h-4 bg-blue-500 rounded-full mr-2"></div>
                Deskripsi
              </h3>
              <p className=" text-sm leading-relaxed">{template.description}</p>
              {/* TODO: gaada deskripsi */}
            {/* </CardContent>
          </Card> */} 

          {/* Category and Price Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="py-4">
                <h3 className="font-semibold  mb-3 text-sm uppercase tracking-wide">
                  {m("productCategory")}
                </h3>
                <span className="inline-flex items-center bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                  {template.productCategories?.join(", ")}
                </span>
              </CardContent>
            </Card>
                    {/* TODO: gaada harga */}
            {/* <Card>
              <CardContent className="py-4">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide">
                  {m("price")}
                </h3>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-green-600">
                    {template.price ? formatIdr(template.price) : "Gratis"}
                  </span>
                  {template.price && (
                    <span className="ml-2 text-sm  line-through">
                      {template.price
                        ? formatIdr(template.price * 1.5)
                        : "Gratis"}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card> */}
          {/* Tags */}
          {template.categories && template.categories.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <h3 className="font-semibold  mb-3 text-sm uppercase tracking-wide">
                  {m("category")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.categories.map((cat, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-3 py-1 rounded-md text-xs font-medium border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      #{cat}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>

        </div>

        {/* Footer */}
        <DialogFooterWithTwoButtons
          className="px-6 py-4 border-t rounded-b-lg"
          primaryButton={{
            message: m("buttonUse"),
            onClick: () => {
              onSelectReferenceImage(template.imageUrl, template.name, template);
              onClose();
            },
            icon: <Plus className="mr-2 h-4 w-4" />,
            className:
              "bg-gradient-to-r text-white from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700  shadow-sm font-medium",
          }}
          secondaryButton={{
            message: isSaved ? m("buttonSaved") : m("buttonUnsaved"),
            onClick: () => onSaveUnsave(template),
            icon: isSaved ? (
              <Heart className="mr-2 h-4 w-4 fill-current" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            ),
            variant: "outline",
            className: `px-6 border-2 font-medium transition-all ${
              isSaved
                ? "border-red-200 text-red-600 hover:bg-red-50"
                : "border-gray-200 hover:bg-gray-50"
            }`,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
