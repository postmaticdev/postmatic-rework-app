"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CheckCircle2, Info } from "lucide-react";
import { DEFAULT_USER_AVATAR } from "@/constants";
import { Template } from "./shared-reference-panel";

interface SharedTemplateCardProps {
  item: Template;
  onDetail: (item: Template | null) => void;
  onSelectReferenceImage: (imageUrl: string, imageName: string | null, template?: Template) => void;
  onSaveUnsave?: (template: Template) => void;
  isLoading: boolean;
  selectedTemplate: Template | null;
}

export const SharedTemplateCard = ({ 
  item, 
  onDetail, 
  onSelectReferenceImage,
  onSaveUnsave,
  isLoading,
  selectedTemplate 
}: SharedTemplateCardProps) => {
  const t = useTranslations("templateCard");
  
  const isSelected = selectedTemplate?.id === item.id;
  const categoryLabel =
    item.categories?.length === 1
      ? item.categories[0]
      : item.categories?.length > 1
      ? `${item.categories[0]} +${item.categories.length - 1}`
      : "";
  const productCategoryLabel = item.productCategories?.join(", ") || "";
  
  return (
    <Card
      key={item.id}
      className={`break-inside-avoid mb-4 group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
        isSelected ? "border-primary border-4" : "border-transparent"
      }`}
      onClick={() => {
        if (!isLoading) {
          onSelectReferenceImage(item.imageUrl, item.name, item);
        }
      }}
    >
      <img
        src={item.imageUrl}
        alt={item.name || "Template"}
        className="w-full h-auto block transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-110"
        loading="lazy"
      />
      
      <button
        type="button"
        className="absolute top-2 left-2 z-10 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onDetail(item);
        }}
        aria-label={t("detail") || "Detail"}
      >
        <Info className="w-4 h-4" />
      </button>

      {/* Overlay to indicate loading or selected state if needed */}
      {isSelected && (
        <>
          <div className="absolute inset-0 bg-primary/20 pointer-events-none" />
          <div className="absolute top-2 right-2 pointer-events-none bg-primary text-white rounded-full">
            <CheckCircle2 className="w-6 h-6 fill-primary text-white" />
          </div>
        </>
      )}
    </Card>
  );
};

