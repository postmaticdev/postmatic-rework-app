"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useTranslations } from "next-intl";
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
  
  return (
    <Card
      key={item.id}
      className={`p-3 group transition-all duration-300 hover:scale-105 hover:shadow-lg ${
        isSelected ? "border-primary border-2" : ""
      }`}
    >
      <div className="relative">
        <div className="relative aspect-square rounded-lg overflow-hidden">
          {/* Business Image Content */}

          <Image
            src={item.imageUrl}
            alt="Placeholder Colorful"
            onClick={() => onDetail(item)}
            fill
            className="object-cover  transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-110"
            priority
          />
        </div>
        <div className="absolute top-2 right-2">
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded hidden sm:block">
            {item.categories && item.categories.length > 0
              ? item.categories.length === 1
                ? item.categories[0]
                : `${item.categories[0]} +${item.categories.length - 1}`
              : ""}
          </span>
        </div>
        <div className="absolute bottom-2 right-2">
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded hidden sm:block">
            {item.productCategories}
          </span>
        </div>
      </div>

      <div className="space-y-2 -mt-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Image
              src={item.publisher?.image || DEFAULT_USER_AVATAR}
              alt={item.publisher?.name || "image"}
              width={200}
              height={200}
              className="rounded-full w-8 h-8"
            />

            <div>
              <h3 className="font-medium text-sm line-clamp-2">{item.name}</h3>
              <p className="hidden sm:block text-xs ">Publisher: {item.publisher?.name}</p>
            </div>
          </div>
        </div>
        <p className="block sm:hidden text-xs ">Publisher: {item.publisher?.name}</p>
    

        <Button
          className="w-full mt-0 sm:mt-3 bg-blue-500 hover:bg-blue-600 text-white text-sm"
          disabled={isLoading || isSelected}
          onClick={() => {
            if (isLoading) return;
            onSelectReferenceImage(item.imageUrl, item.name, item);
          }}
        >
          {isSelected ? t("selected") : t("use")}
        </Button>
      </div>
    </Card>
  );
};

