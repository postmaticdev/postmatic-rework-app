"use client";

import { Button } from "@/components/ui/button";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { showToast } from "@/helper/show-toast";
import {
  PlatformEnum,
  PlatformRes,
} from "@/models/api/knowledge/platform.type";
import {
  usePlatformKnowledgeConnectAccount,
  usePlatformKnowledgeDisconnect,
  usePlatformKnowledgeGetAll,
  usePlatformKnowledgeGetAuthorizeUrl,
  usePlatformKnowledgeGetPendingOauth,
} from "@/services/knowledge.api";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Link2, Loader2, RefreshCw, Unlink } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

const ALLOWED_PLATFORMS: PlatformEnum[] = [
  "linked_in",
  "facebook_page",
  "instagram_professional",
  "twitter",
];

export function ConnectedPlatformForm() {
  const { businessId } = useParams() as { businessId: string };
  const queryClient = useQueryClient();
  const { data: platformData, isLoading: isLoadingPlatforms } =
    usePlatformKnowledgeGetAll(businessId);
  const platforms = platformData?.data.data ?? [];
  const mdDisconnectPlatform = usePlatformKnowledgeDisconnect();
  const mdAuthorizeUrl = usePlatformKnowledgeGetAuthorizeUrl();
  const mdConnectAccount = usePlatformKnowledgeConnectAccount();
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const t = useTranslations("connectedPlatformForm");
  const searchParams = useSearchParams();
  const tempCode =
    searchParams.get("platformTempCode") ||
    searchParams.get("tempCode") ||
    searchParams.get("connectedPlatformTempCode");
  const pendingOauth = usePlatformKnowledgeGetPendingOauth(
    businessId,
    tempCode
  );
  const [platformToDisconnect, setPlatformToDisconnect] =
    useState<PlatformRes | null>(null);
  const [connectingPlatform, setConnectingPlatform] =
    useState<PlatformEnum | null>(null);
  const isPendingOauthPlatformAllowed = ALLOWED_PLATFORMS.includes(
    pendingOauth.data?.data?.data?.platformCode as PlatformEnum
  );

  const handleDisconnect = async () => {
    try {
      if (!platformToDisconnect || !platformToDisconnect.id) return;
      const response = await mdDisconnectPlatform.mutateAsync({
        businessId,
        platformId: platformToDisconnect.id,
      });
      showToast("success", response.data.responseMessage);
    } catch {}
  };

  const handleConnect = async (platform: PlatformRes) => {
    try {
      // A connection whose token expired or was revoked is renewed through
      // the normal OAuth flow; the backend replaces the broken connection.
      const status =
        platform.status === "connected" && platform.requiresReconnect
          ? "unconnected"
          : platform.status;
      switch (status) {
        case "connected":
          setPlatformToDisconnect(platform);
          setIsDisconnectDialogOpen(true);
          break;
        case "unconnected":
          setConnectingPlatform(platform.platform);
          // Kembali ke halaman Business Knowledge ini setelah akun dipilih di auth,
          // tanpa parameter sisa koneksi sebelumnya.
          const returnUrl = new URL(window.location.href);
          ["platformTempCode", "tempCode", "connectedPlatformTempCode", "reconnectPlatform"].forEach(
            (key) => returnUrl.searchParams.delete(key)
          );
          returnUrl.hash = "";
          const response = await mdAuthorizeUrl.mutateAsync({
            businessId,
            platform: platform.platform,
            from: returnUrl.toString(),
          });
          if (response.data.data.authUrl) {
            const newWindow = window.open();
            if (newWindow) {
              newWindow.opener = null;
              newWindow.location.href = response.data.data.authUrl;
            } else {
              window.location.href = response.data.data.authUrl;
            }
          }
          break;
        case "unavailable":
          break;
      }
    } catch (error: unknown) {
      type ApiError = {
        response?: { data?: { responseMessage?: string } };
      };
      showToast(
        "error",
        (error as ApiError).response?.data?.responseMessage ||
          t("connectFailed")
      );
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleConnectAccount = async (tempCodeAccount: string) => {
    try {
      const response = await mdConnectAccount.mutateAsync({
        businessId,
        tempCodeAccount,
      });
      showToast("success", response.data.responseMessage);
      await queryClient.invalidateQueries({ queryKey: ["platformKnowledge"] });
      const url = new URL(window.location.href);
      url.searchParams.delete("platformTempCode");
      url.searchParams.delete("tempCode");
      url.searchParams.delete("connectedPlatformTempCode");
      window.history.replaceState(null, "", url.toString());
    } catch (error: unknown) {
      type ApiError = {
        response?: { data?: { responseMessage?: string } };
      };
      showToast(
        "error",
        (error as ApiError).response?.data?.responseMessage ||
          t("connectAccountFailed")
      );
    }
  };

  const filteredPlatforms = platforms.filter((platform) =>
    ALLOWED_PLATFORMS.includes(platform.platform)
  );

  return (
    <div className={`grid grid-cols-1 md:grid-cols-1 gap-4`}>
      {isLoadingPlatforms && (
        <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loadingPlatforms")}
        </div>
      )}

      {tempCode && isPendingOauthPlatformAllowed && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <h3 className="font-medium text-foreground">{t("completeConnection")}</h3>
          {pendingOauth.isLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loadingConnectedAccount")}
            </div>
          ) : pendingOauth.data?.data?.data?.accounts?.length ? (
            <div className="mt-3 space-y-3">
              {pendingOauth.data.data.data.accounts.map((account) => (
                <div
                  key={account.tempCodeAccount}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {account.platformIconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={account.platformIconUrl}
                          alt={account.platformUserName || t("accountAlt")}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs">
                          {mapEnumPlatform.getPlatformIcon(
                            pendingOauth.data.data.data.platformCode
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {account.platformUserName || account.platformUserId}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {account.platformUserEmail || account.platformUserId}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleConnectAccount(account.tempCodeAccount)
                    }
                    disabled={mdConnectAccount.isPending}
                  >
                    <Link2 className="h-4 w-4" />
                    {mdConnectAccount.isPending ? t("connecting") : t("connect")}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("noPendingAccount")}
            </p>
          )}
        </div>
      )}

      {filteredPlatforms.map((platform) => (
        <div key={platform.name} className="p-4 border rounded-lg">
          <div className="flex items-center justify-between max-sm:gap-3">
            <div className="flex items-center gap-3 max-sm:min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-background to-background-secondary rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0 overflow-hidden">
                {platform.status === "connected" &&
                platform.accountDisplayImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={platform.accountDisplayImage}
                    alt={platform.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  mapEnumPlatform.getPlatformIcon(platform.platform)
                )}
              </div>
              <div className="max-sm:min-w-0">
                <h3 className="font-medium text-foreground max-sm:break-words">
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
                        {t("accountId", { id: platform.accountId ?? "" })}
                      </div>
                      {platform.requiresReconnect && (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            {t("needsReconnect")}
                          </span>
                          <span className="text-xs text-amber-700 dark:text-amber-400">
                            {t("needsReconnectDescription")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </p>
              </div>
            </div>
            {platform.status === "connected" && platform.requiresReconnect ? (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Button
                  size="sm"
                  onClick={() => handleConnect(platform)}
                  disabled={connectingPlatform === platform.platform}
                  className="bg-amber-500 text-white hover:bg-amber-600"
                >
                  <RefreshCw className="h-4 w-4" />
                  {connectingPlatform === platform.platform
                    ? t("connecting")
                    : t("reconnect")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPlatformToDisconnect(platform);
                    setIsDisconnectDialogOpen(true);
                  }}
                >
                  <Unlink className="h-4 w-4" />
                  {t("disconnect")}
                </Button>
              </div>
            ) : mapEnumPlatform.getPlatformCtaLabel(platform.status, t) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConnect(platform)}
                disabled={
                  platform.status === "unavailable" ||
                  connectingPlatform === platform.platform
                }
                className={
                  platform.status === "connected"
                    ? "bg-green-100 text-green-800 border-green-300"
                    : ""
                }
              >
                {platform.status === "connected" ? (
                  <Unlink className="h-4 w-4" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {connectingPlatform === platform.platform
                  ? t("connecting")
                  : mapEnumPlatform.getPlatformCtaLabel(platform.status, t)}
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
