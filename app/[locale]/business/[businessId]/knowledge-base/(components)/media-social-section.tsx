"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { cn } from "@/lib/utils";
import { PlatformModal } from "./platform-modal";
import { useRole } from "@/contexts/role-context";

export function MediaSocialSection() {
  const { businessId } = useParams() as { businessId: string };
  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const connectedPlatforms =
    platformData?.data.data.filter((platform) => platform.status === "connected") ??
    [];
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const { access } = useRole();
  const { platformKnowledge } = access;
  const b = useTranslations("businessKnowledge");

  return (
    <div className="h-full">
      <Card className="h-full">
        <CardContent className="pb-6">
          <div className="my-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              {b("socialMedia")}
            </h2>
            {platformKnowledge.write && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsPlatformModalOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>

          {connectedPlatforms.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {connectedPlatforms.map((platform) => (
                <div
                  key={platform.platform}
                  className="flex items-center gap-4 rounded-md border p-3 text-sm font-medium shadow-sm"
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md text-white",
                      mapEnumPlatform.getPlatformGradient(platform.platform),
                    )}
                  >
                    {mapEnumPlatform.getPlatformIcon(
                      platform.platform,
                      "h-6 w-6 text-white",
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-normal text-muted-foreground">
                      {mapEnumPlatform.getPlatformLabel(platform.platform)}
                    </p>
                    <p className="truncate text-lg leading-tight">
                      {platform.accountDisplayName || platform.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {b("notAvailable")}
            </div>
          )}
        </CardContent>
      </Card>

      <PlatformModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
      />
    </div>
  );
}
