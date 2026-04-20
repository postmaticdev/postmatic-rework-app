"use client";

import { Button } from "@/components/ui/button";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { useManageKnowledge } from "@/contexts/manage-knowledge-context";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { showToast } from "@/helper/show-toast";
import {
  PlatformEnum,
  PlatformRes,
} from "@/models/api/knowledge/platform.type";
import { usePlatformKnowledgeDisconnect } from "@/services/knowledge.api";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";

export function ConnectedPlatformForm() {
  const { businessId } = useParams() as { businessId: string };
  const queryClient = useQueryClient();
  const { platforms } = useManageKnowledge();
  const mdDisconnectPlatform = usePlatformKnowledgeDisconnect();
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const t = useTranslations("connectedPlatformForm");
  const [platformToDisconnect, setPlatformToDisconnect] =
    useState<PlatformRes | null>(null);

  const handleDisconnect = async () => {
    try {
      if (!platformToDisconnect) return;
      const response = await mdDisconnectPlatform.mutateAsync({
        businessId,
        platform: platformToDisconnect.platform,
      });
      showToast("success", response.data.responseMessage);
    } catch {}
  };

  const handleConnect = async (platform: PlatformRes) => {
    try {
      switch (platform.status) {
        case "connected":
          setPlatformToDisconnect(platform);
          setIsDisconnectDialogOpen(true);
          break;
        case "unconnected":
          await queryClient.invalidateQueries({
            queryKey: ["platformKnowledge"],
          });
          const url = platform.connectUrl;
          if (url) {
            // Use location.href for iOS compatibility
            const newWindow = window.open();
            if (newWindow) {
              newWindow.opener = null;
              newWindow.location.href = url;
            } else {
              // Fallback if popup is blocked
              window.location.href = url;
            }
          }
          await queryClient.invalidateQueries({
            queryKey: ["platformKnowledge"],
          });
          break;
        case "unavailable":
          break;
      }
    } catch {}
  };

  // Filter platforms to only show the allowed ones
  const allowedPlatforms: PlatformEnum[] = [
    "linked_in",
    "facebook_page",
    "instagram_business",
    "twitter",
    "tiktok",
  ];
  const filteredPlatforms = platforms.filter((platform) =>
    allowedPlatforms.includes(platform.platform)
  );

  return (
    <div className={`grid grid-cols-1 md:grid-cols-1 gap-4`}>
      {filteredPlatforms.map((platform) => (
        <div key={platform.name} className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-background to-background-secondary rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0 overflow-hidden">
                {platform.status === "connected" &&
                platform.accountDisplayImage ? (
                  <Image
                    src={platform.accountDisplayImage}
                    alt={platform.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  mapEnumPlatform.getPlatformIcon(platform.platform)
                )}
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {platform.status === "connected" &&
                  platform.accountDisplayName
                    ? platform.accountDisplayName
                    : platform.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {platform.status !== "connected" ? (
                    mapEnumPlatform.getPlatformHint(platform.status, t)
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span className="flex flex-row gap-2 items-center">
                        <div className="w-4 h-4">
                          {mapEnumPlatform.getPlatformIcon(
                            platform.platform,
                            "w-4 h-4"
                          )}
                        </div>
                        <div>{platform.name}</div>
                      </span>
                      <div className="text-xs text-muted-foreground">
                        Account ID: {platform.accountId}
                      </div>
                    </div>
                  )}
                </p>
              </div>
            </div>
            {mapEnumPlatform.getPlatformCtaLabel(platform.status, t) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConnect(platform)}
                disabled={platform.status === "unavailable"}
                className={
                  platform.status === "connected"
                    ? "bg-green-100 text-green-800 border-green-300"
                    : ""
                }
              >
                {mapEnumPlatform.getPlatformCtaLabel(platform.status, t)}
              </Button>
            )}
          </div>
        </div>
      ))}

      <DeleteConfirmationModal
        isOpen={isDisconnectDialogOpen}
        title={t("disconnectPlatform")}
        description={t("disconnectPlatformDescription")}
        onClose={() => setIsDisconnectDialogOpen(false)}
        onConfirm={handleDisconnect}
        withDetailItem={false}
        isLoading={mdDisconnectPlatform.isPending}
        itemName={platformToDisconnect?.name || ""}
      />
    </div>
  );
}
