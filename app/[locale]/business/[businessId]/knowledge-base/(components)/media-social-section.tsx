"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { cn } from "@/lib/utils";
import { PlatformModal } from "./platform-modal";
import { useRole } from "@/contexts/role-context";
import { SOCIAL_MEDIA_PLATFORMS } from "@/constants";

const PLATFORM_URL_FLAGS = [
  "platformTempCode",
  "tempCode",
  "connectedPlatformTempCode",
  "reconnectPlatform",
];

export function MediaSocialSection() {
  const { businessId } = useParams() as { businessId: string };
  const searchParams = useSearchParams();
  const hasPendingPlatform =
    searchParams.has("platformTempCode") ||
    searchParams.has("tempCode") ||
    searchParams.has("connectedPlatformTempCode");
  // Set by the scheduler's "Reconnect" action.
  const wantsReconnect = searchParams.has("reconnectPlatform");
  const { data: platformData, isLoading } =
    usePlatformKnowledgeGetAll(businessId);
  const platforms = platformData?.data.data ?? [];
  const [isPlatformModalOpen, setIsPlatformModalOpen] =
    useState(hasPendingPlatform);
  const { access } = useRole();
  const { platformKnowledge } = access;
  const b = useTranslations("businessKnowledge");
  const m = useTranslations("modal");

  useEffect(() => {
    if (hasPendingPlatform) {
      setIsPlatformModalOpen(true);
    }
  }, [hasPendingPlatform]);

  useEffect(() => {
    if (wantsReconnect && platformKnowledge.write) {
      setIsPlatformModalOpen(true);
    }
  }, [platformKnowledge.write, wantsReconnect]);

  // Drop the one-shot connect/reconnect flags so a refresh does not reopen
  // the modal.
  const handleClosePlatformModal = () => {
    setIsPlatformModalOpen(false);
    if (!hasPendingPlatform && !wantsReconnect) return;
    const url = new URL(window.location.href);
    PLATFORM_URL_FLAGS.forEach((key) => url.searchParams.delete(key));
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div className="h-full">
      <Card className="h-full">
        <CardContent className="flex h-full flex-col pb-4 sm:pb-6">
          <div className="my-3 flex items-center justify-between max-sm:my-4">
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">
              {b("socialMedia")}
            </h2>
            {platformKnowledge.write && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsPlatformModalOpen(true)}
                aria-label={m("managePlatformSocialMedia")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid flex-1 content-center grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOCIAL_MEDIA_PLATFORMS.map((platformId) => {
              const platform = platforms.find(
                (item) => item.platform === platformId
              );
              const isConnected = !isLoading && platform?.status === "connected";
              const needsReconnect = isConnected && Boolean(platform?.requiresReconnect);

              return (
                <div
                  key={platformId}
                  className={cn(
                    "flex items-center gap-4 rounded-md border p-3 text-sm font-medium shadow-sm",
                    !isConnected && "border-dashed bg-muted/30 text-muted-foreground",
                    needsReconnect &&
                      "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-white",
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
                    {isLoading ? (
                      <Skeleton className="mt-1 h-4 w-24" />
                    ) : (
                      <p className="text-md truncate leading-tight">
                        {isConnected
                          ? platform?.accountDisplayName || platform?.name
                          : b("notConnected")}
                      </p>
                    )}
                    {needsReconnect && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {b("needsReconnect")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <PlatformModal
        isOpen={isPlatformModalOpen}
        onClose={handleClosePlatformModal}
      />
    </div>
  );
}
