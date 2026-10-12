"use client";

import { useState, useMemo } from "react";
import { MoreVertical, UserPlus, Trash2, LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { DEFAULT_BUSINESS_IMAGE } from "@/constants";
import { cn } from "@/lib/utils";
import {
  useBusinessDelete,
  useBusinessOutBusiness,
} from "@/services/business.api";
import { useBusinessKnowledgeGetById } from "@/services/knowledge.api";
import { showToast } from "@/helper/show-toast";
import { BusinessRes } from "@/models/api/business/index.type";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";

interface BusinessCardProps {
  business: BusinessRes;
  onClickInvite?: () => void;
  variant?: "grid" | "list";
}

export function BusinessCard({
  business,
  onClickInvite,
  variant = "grid",
}: BusinessCardProps) {
  const router = useRouter();
  const t = useTranslations("businessCard");
  const tModal = useTranslations("modal");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false); // controlled AlertDialog (Keluar)
  const { id, name, description, logo, members, userPosition } = business;
  const role = userPosition?.role || null;
  const { data: businessKnowledgeData } = useBusinessKnowledgeGetById(id);
  const knowledgeLogo =
    businessKnowledgeData?.data?.data?.primaryLogo ||
    businessKnowledgeData?.data?.data?.primaryLogoUrl ||
    "";
  const businessImage = knowledgeLogo || logo || DEFAULT_BUSINESS_IMAGE;

  // ---- NAV GUARD: jangan navigate kalau ada modal/dialog terbuka
  const canNavigate = !(leaveOpen || isDeleteModalOpen);

  const handleCardClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!canNavigate) {
      // cegah navigate saat dialog/modal terbuka
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // kalau klik berasal dari elemen interaktif bertanda no-card-nav, jangan navigate
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-card-nav]")) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    router.push(`/business/${business.id}/content-scheduler`);
  };

  const handleClickInvite = () => {
    onClickInvite?.();
  };

  const mDelete = useBusinessDelete();
  const handleDelete = async () => {
    try {
      const res = await mDelete.mutateAsync(id);
      showToast("success", res.data.responseMessage);
      setIsDeleteModalOpen(false);
    } catch {}
  };
  const handleOpenDeleteModal = () => setIsDeleteModalOpen(true);
  const handleCloseDeleteModal = () => setIsDeleteModalOpen(false);

  const owner = useMemo(
    () => members?.find((member) => member.role === "Owner")?.profile,
    [members]
  );

  const mOutBusiness = useBusinessOutBusiness();
  const handleOutBusiness = async () => {
    try {
      const res = await mOutBusiness.mutateAsync(id);
      showToast("success", res.data.responseMessage);
    } catch {}
  };

  return (
    <>
      <Card
        className={cn(
          "group transition-all bg-card border border-border cursor-pointer rounded-xl",
          variant === "list"
            ? "hover:border-blue-500/50 hover:shadow-sm shadow-xs"
            : "hover:scale-105 duration-300 shadow-sm"
        )}
        onClick={handleCardClick}
        // Guard ekstra: blok bubbling sedini mungkin saat ada dialog/modal (capture phase)
        onClickCapture={(e) => {
          if (!canNavigate) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {variant === "list" ? (
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4">
            {/* Left Thumbnail + Details */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 border border-border/50">
                <Image
                  src={businessImage}
                  alt={t("imageAlt")}
                  fill
                  className="object-contain p-1.5 sm:object-cover sm:p-0 select-none pointer-events-none"
                  priority
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm sm:text-base truncate group-hover:text-blue-600 transition-colors">
                    {name}
                  </h3>
                  {role && (
                    <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-blue-700 dark:text-blue-400">
                      {role}
                    </span>
                  )}
                </div>
                {description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                    {description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                  <Avatar className="w-4 h-4 sm:w-5 sm:h-5">
                    <AvatarImage src={owner?.image} alt={owner?.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-[10px]">
                      {owner?.name?.charAt(0) || ""}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs text-muted-foreground">
                    {owner?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Elements / Dropdown */}
            <div className="shrink-0" data-no-card-nav>
              <DropdownMenu modal>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    data-no-card-nav
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" data-no-card-nav>
                  {role === "Owner" ? (
                    <>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClickInvite();
                        }}
                        data-no-card-nav
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        {t("invite")}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenDeleteModal();
                        }}
                        data-no-card-nav
                        className="flex items-center gap-2 text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        {tModal("delete")}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLeaveOpen(true);
                      }}
                      data-no-card-nav
                      className="flex items-center gap-2 text-red-600 focus:text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("leave")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        ) : (
          <CardContent className="py-4 md:py-6">
            {/* Image Section */}
            <div className="relative aspect-square bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg overflow-hidden">
              <Image
                src={businessImage}
                alt={t("imageAlt")}
                fill
                className="object-cover rounded-xl select-none pointer-events-none transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-110"
                priority
              />

              {/* Interactive Elements */}
              <div className="absolute top-3 right-3" data-no-card-nav>
                <DropdownMenu modal>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="bg-card hover:bg-muted/30"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      data-no-card-nav
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" data-no-card-nav>
                    {role === "Owner" ? (
                      <>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleClickInvite();
                          }}
                          data-no-card-nav
                          className="flex items-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          {t("invite")}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenDeleteModal();
                          }}
                          data-no-card-nav
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          {tModal("delete")}
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLeaveOpen(true); // buka dialog terkontrol
                        }}
                        data-no-card-nav
                        className="flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        {t("leave")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-3 sm:p-4">
              <h3 className="font-bold text-foreground mb-1 text-sm sm:text-base break-words">
                {name}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-3">
                {description}
              </p>

              <div className="flex items-center gap-2">
                <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
                  <AvatarImage src={owner?.image} alt={owner?.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                    {owner?.name?.charAt(0) || ""}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {owner?.name}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* AlertDialog Keluar (Non-Owner) — DI LUAR DropdownMenuContent */}
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          data-no-card-nav
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("leaveDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
                setLeaveOpen(false);
              }}
              data-no-card-nav
            >
              {tModal("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.stopPropagation();
                await handleOutBusiness();
                setLeaveOpen(false);
              }}
              data-no-card-nav
            >
              {t("leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* Modal Konfirmasi Hapus (Owner) */}
       <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleDelete}
          title={t("deleteTitle")}
          description={t("deleteDescription")}
          itemName={name}
          isLoading={mDelete.isPending}
        />
    </>
  );
}
