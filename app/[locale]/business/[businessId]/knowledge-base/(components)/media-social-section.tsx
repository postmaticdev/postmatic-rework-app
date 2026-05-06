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
import { SOCIAL_MEDIA_PLATFORMS } from "@/constants";

export function MediaSocialSection() {
  const { businessId } = useParams() as { businessId: string };
  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const platforms = platformData?.data.data ?? [];
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOCIAL_MEDIA_PLATFORMS.map((platformId) => {
              const platform = platforms.find(
                (item) => item.platform === platformId
              );
              const isConnected = platform?.status === "connected";

              return (
                <div
                  key={platformId}
                  className={cn(
                    "flex items-center gap-4 rounded-md border p-3 text-sm font-medium shadow-sm",
                    !isConnected && "border-dashed bg-muted/30 text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md text-white",
                      isConnected
                        ? mapEnumPlatform.getPlatformGradient(platformId)
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {mapEnumPlatform.getPlatformIcon(
                      platformId,
                      cn(
                        "h-6 w-6",
                        isConnected ? "text-white" : "text-muted-foreground"
                      )
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-normal text-muted-foreground">
                      {mapEnumPlatform.getPlatformLabel(platformId)}
                    </p>
                    <p className="truncate text-lg leading-tight">
                      {isConnected
                        ? platform?.accountDisplayName || platform?.name
                        : b("notConnected")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <PlatformModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
      />
    </div>
  );
}
