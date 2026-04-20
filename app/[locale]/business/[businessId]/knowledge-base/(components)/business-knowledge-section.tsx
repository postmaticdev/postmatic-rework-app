"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Phone } from "lucide-react";
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
  const { data: businessKnowledgeData } =
    useBusinessKnowledgeGetById(businessId);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { access } = useRole();
  const { businessKnowledge } = access;
  const b = useTranslations("businessKnowledge");

  const phoneNumber = isLegacyUnusedValue(
    businessKnowledgeData?.data?.data?.website,
  )
    ? b("notAvailable")
    : businessKnowledgeData?.data?.data?.website;

  return (
    <div className="h-full">
      <Card className="h-full">
        <CardContent className="pb-6">
          <div className="my-3 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">
              {b("title")}
            </h1>
            {businessKnowledge.write && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="overflow-hidden rounded-lg xl:h-5/6 xl:w-5/6">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  src={
                    businessKnowledgeData?.data?.data?.primaryLogo ||
                    businessKnowledgeData?.data?.data?.secondaryLogo ||
                    businessData?.data?.data?.logo ||
                    DEFAULT_BUSINESS_IMAGE
                  }
                  alt="Business Image"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {businessKnowledgeData?.data?.data?.name || b("notAvailable")}
              </h3>
              <p className="mb-3 text-sm text-muted-foreground">
                {businessKnowledgeData?.data?.data?.category}
              </p>

              <div className="mb-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 max-w-[200px] px-2 text-xs"
                >
                  <Phone className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{phoneNumber}</span>
                </Button>
              </div>
            </div>
          </div>

          <p className="mb-3 text-sm text-muted-foreground line-clamp-4">
            {businessKnowledgeData?.data?.data?.description ||
              b("notAvailable")}
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {b("colorTone")}
              </h3>
              <div
                className="h-10 w-20 rounded-md border-2 border-border"
                style={{
                  backgroundColor: `#${
                    (
                      businessKnowledgeData?.data?.data?.colorTone ?? ""
                    ).replace(/^#/, "") || "FFFFFF"
                  }`,
                }}
              />
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
