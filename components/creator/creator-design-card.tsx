"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { MoreHorizontal, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { CreatorDesign } from "@/models/api/creator/design";
import { useCreatorDesign } from "@/contexts/creator-design-context";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEFAULT_USER_AVATAR } from "@/constants";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

interface CreatorDesignCardProps {
  design: CreatorDesign;
}

export function CreatorDesignCard({ design }: CreatorDesignCardProps) {
  const { openEditModal, handlePublishToggle, handleDeleteDesign } =
    useCreatorDesign();
  const t = useTranslations("creatorDesign");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await handleDeleteDesign(design.id);
      setShowDeleteModal(false);
    } catch (error) {
      // Error is handled in context
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePublishChange = async (isPublished: boolean) => {
    await handlePublishToggle(design.id, isPublished);
  };

  return (
    <>
      <Card className="group transition-all duration-300 hover:scale-105 hover:shadow-lg">
        <div className="p-3 space-y-3">
          <div className="relative">
            <div className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src={design.imageUrl}
                alt={design.name}
                fill
                className="object-cover transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-110"
                priority
              />
              {/* Status Badge */}
              {/* <div className="absolute top-2 right-2">
              <span
                className={`text-white text-xs px-2 py-1 rounded ${
                  design.isPublished ? "bg-green-500" : "bg-gray-500"
                }`}
              >
                {design.isPublished ? "Published" : "Draft"}
              </span>
            </div> */}

              {/* Categories Badge */}
              <div className="absolute top-2 right-2">
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  {design.templateImageCategories.length > 0
                    ? design.templateImageCategories[0].name
                    : "Uncategorized"}
                </span>
              </div>
            {/* Product Categories */}
              <div className="absolute bottom-2 right-2">
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  {design.templateProductCategories.length > 0
                    ? design.templateProductCategories[0].indonesianName
                    : "Uncategorized"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
           
            <div className="flex items-start gap-2">
             
              <div className="flex-1 min-w-0">
                <h3 className="font-medium  truncate">{design.name}</h3>

                {/* Price */}
                <div className="text-sm">
                  {design.price > 0
                    ? `Rp ${design.price.toLocaleString()}`
                    : "Free"}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => openEditModal(design)}
                    className="cursor-pointer"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {t("edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteModal(true)}
                    className="cursor-pointer text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

       

            {/* Actions */}
            <div className="flex items-center justify-between">
              {/* Publish Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={design.isPublished}
                  onCheckedChange={handlePublishChange}
                />
                <span className="text-xs text-muted-foreground">
                  {design.isPublished ? "Published" : "Draft"}
                </span>
              </div>

              {/* Actions Dropdown */}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{design._count.templateImageSaved} saved</span>
              <span>{new Date(design.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={t("deleteConfirmationTitle")}
        description={t("deleteConfirmationDescription")}
        itemName={design.name}
        isLoading={isDeleting}
      />
    </>
  );
}
