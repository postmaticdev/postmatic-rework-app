"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useBusinessGetAll } from "@/services/business.api";
import { useBusinessKnowledgeGetById } from "@/services/knowledge.api";
import { DEFAULT_BUSINESS_IMAGE } from "@/constants";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { BusinessRes } from "@/models/api/business/index.type";

function BusinessInformationItem({ business }: { business: BusinessRes }) {
  const { data: businessKnowledgeData } = useBusinessKnowledgeGetById(
    business.id
  );

  const knowledgeLogo =
    businessKnowledgeData?.data?.data?.primaryLogo ||
    businessKnowledgeData?.data?.data?.primaryLogoUrl ||
    "";
  const businessImage = knowledgeLogo || business.logo || DEFAULT_BUSINESS_IMAGE;

  const t = useTranslations("businessInformation");

  return (
    <div className="flex flex-col md:flex-row flex-warp md:items-center justify-between p-3 rounded-lg bg-background-secondary">
      <div className="flex items-center flex-row gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
          <Image
            src={businessImage}
            alt={business.name}
            width={200}
            height={200}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">
            {t("name")}
          </span>
          <span className="font-medium text-foreground">{business.name}</span>
        </div>
      </div>

      <div className="flex flex-row flex-warp items-center md:space-x-24 mt-4 md:mt-0 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("role")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {business?.userPosition?.role}
            </span>
          </div>
        </div>

        <Link href={`/business/${business.id}/settings`} prefetch={false}>
          <Button
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            {t("view")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function BusinessInformation() {
  const { data: businessesData } = useBusinessGetAll({
    limit: 1000,
    sort: "asc",
    sortBy: "name",
  });
  const businesses = businessesData?.data?.data || [];
  const t = useTranslations("businessInformation");

  return (
    <Card className="h-fit">
      <CardContent className="py-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          {t("title")}
        </h2>

        <div
          className={`space-y-4 ${
            businesses.length > 3 ? "max-h-[400px] overflow-y-auto" : ""
          }`}
        >
          {businesses.map((business) => (
            <BusinessInformationItem key={business.id} business={business} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
