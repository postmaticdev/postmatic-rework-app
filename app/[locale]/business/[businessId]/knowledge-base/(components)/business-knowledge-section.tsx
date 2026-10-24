"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Pencil, Phone } from "lucide-react";
import Image from "next/image";
import { EditKnowledgeModal } from "./edit-knowledge-modal";
import { useBusinessGetById } from "@/services/business.api";
import { useParams } from "next/navigation";
import { useBusinessKnowledgeGetById } from "@/services/knowledge.api";
import { DEFAULT_BUSINESS_IMAGE } from "@/constants";
import { isLegacyUnusedValue } from "@/helper/knowledge-form";
import { useRole } from "@/contexts/role-context";
import { useTranslations } from "next-intl";

export function BusinessKnowledgeSection() {
  const { businessId } = useParams() as { businessId: string };
  const { data: businessData } = useBusinessGetById(businessId);
  const { data: businessKnowledgeData, isLoading } =
    useBusinessKnowledgeGetById(businessId);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { access } = useRole();
  const { businessKnowledge } = access;
  const b = useTranslations("businessKnowledge");
  const m = useTranslations("modal");

  const businessKnowledgeDetail = businessKnowledgeData?.data?.data;
  const phoneNumber = isLegacyUnusedValue(businessKnowledgeDetail?.businessPhone)
    ? b("notAvailable")
    : `${businessKnowledgeDetail?.countryCode || ""} ${
        businessKnowledgeDetail?.businessPhone
      }`.trim();
  const website = isLegacyUnusedValue(businessKnowledgeDetail?.website)
    ? b("notAvailable")
    : businessKnowledgeDetail?.website;
  const colorToneHex = (
    businessKnowledgeDetail?.colorTone ?? "FAFAFA"
  )
    .replace(/^#/, "")
    .toUpperCase();
  const normalizedColorToneHex = /^[0-9A-F]{6}$/.test(colorToneHex)
    ? colorToneHex
    : "FAFAFA";

  return (
    <div className="h-full">
      <Card className="h-full">
        <CardContent className="pb-4 sm:pb-6">
          <div className="my-3 flex items-center justify-between max-sm:my-4">
            <h1 className="text-lg font-semibold text-foreground sm:text-xl">
              {b("title")}
            </h1>
            {businessKnowledge.write && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsEditModalOpen(true)}
                aria-label={m("titleBusinessRole")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 md:grid-cols-3 md:gap-6">
            <div className="relative aspect-square size-28 overflow-hidden rounded-lg sm:size-36 md:h-auto md:w-full md:max-w-full xl:w-5/6">
              <Image
                src={
                  businessKnowledgeDetail?.primaryLogo ||
                  businessKnowledgeDetail?.secondaryLogo ||
                  businessData?.data?.data?.logo ||
                  DEFAULT_BUSINESS_IMAGE
                }
                alt={b("logoBrand")}
                fill
                sizes="(min-width: 768px) 25vw, 144px"
                className="object-contain"
              />
            </div>

            {/* Mobile: kolom ini di-"contents" — nama/kategori/kontak di samping logo,
                deskripsi & warna tone selebar card mulai dari kiri (bawah logo) */}
            <div className="min-w-0 md:col-span-2 max-md:contents">
              <div className="min-w-0">
              {isLoading ? (
                <div className="mb-3 space-y-2">
                  <Skeleton className="h-5 w-40 max-w-full" />
                  <Skeleton className="h-4 w-28 max-w-full" />
                </div>
              ) : (
                <>
                  <h3 className="mb-2 break-words font-semibold text-foreground">
                    {businessKnowledgeDetail?.name || b("notAvailable")}
                  </h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {businessKnowledgeDetail?.category}
                  </p>
                </>
              )}

              <div className="mb-3 flex flex-wrap gap-2 max-md:mb-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 max-w-full px-3 text-xs sm:h-6 sm:max-w-[200px] sm:px-2"
                >
                  <Phone className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{phoneNumber}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 max-w-full px-3 text-xs sm:h-6 sm:max-w-[200px] sm:px-2"
                >
                  <Globe className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{website}</span>
                </Button>
              </div>
              </div>

              {isLoading ? (
                <div className="mb-3 space-y-2 max-md:col-span-2 max-md:mb-0">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <p className="mb-3 text-sm text-muted-foreground line-clamp-4 max-md:col-span-2 max-md:mb-0 max-md:text-justify">
                  {businessKnowledgeDetail?.description || b("notAvailable")}
                </p>
              )}

              <div className="space-y-4 max-md:col-span-2">
                <div>
                  <h3 className="mb-2 font-semibold text-foreground">
                    {b("colorTone")}
                  </h3>
                  <div className="flex h-10 w-40 items-center overflow-hidden rounded-md border border-border bg-background">
                    <div className="flex h-10 items-center justify-center border-r border-border px-1">
                      <span
                        className="size-8 rounded-md border border-black/5 shadow-sm"
                        style={{ backgroundColor: `#${normalizedColorToneHex}` }}
                        title={`#${normalizedColorToneHex}`}
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 items-center px-4 font-mono text-sm uppercase text-foreground">
                      <span className="mr-2 text-muted-foreground">#</span>
                      <span>{normalizedColorToneHex}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditKnowledgeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialTab="business"
      />
    </div>
  );
}
