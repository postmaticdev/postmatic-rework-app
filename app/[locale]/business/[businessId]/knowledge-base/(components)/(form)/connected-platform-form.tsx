"use client";

import { Button } from "@/components/ui/button";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { SOCIAL_MEDIA_PLATFORMS } from "@/constants";
import { translateApiResponseMessage } from "@/helper/api-response-message";
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
import { useTranslations } from "next-intl";
import { AlertTriangle, Link2, Loader2, RefreshCw, Unlink } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const PLATFORM_URL_FLAGS = [
  "platformTempCode",
  "tempCode",
  "connectedPlatformTempCode",
  "reconnectPlatform",
];

type ApiError = {
  response?: { data?: { responseMessage?: string } };
};

const getApiErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiError)?.response?.data?.responseMessage || fallback;

// Only send the browser to an https provider page.
const toSafeAuthUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

// Provider avatar URLs (LinkedIn, Facebook CDN) expire, so fall back to the
// platform icon when the image fails to load.
function PlatformAvatar({
  src,
  alt,
  platform,
}: {
  src: string | null;
  alt: string;
  platform: PlatformEnum;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return <>{mapEnumPlatform.getPlatformIcon(platform)}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className="h-full w-full object-cover"
      onError={() => setFailedSrc(src)}
    />
  );
}

export function ConnectedPlatformForm() {
  const { businessId } = useParams() as { businessId: string };
  const t = useTranslations("connectedPlatformForm");
  const searchParams = useSearchParams();
  const tempCode =
    searchParams.get("platformTempCode") ||
    searchParams.get("tempCode") ||
    searchParams.get("connectedPlatformTempCode");

  const {
    data: platformData,
    isLoading: isLoadingPlatforms,
    isError: isPlatformsError,
    isFetching: isFetchingPlatforms,
    refetch: refetchPlatforms,
  } = usePlatformKnowledgeGetAll(businessId);
  const platforms = (platformData?.data.data ?? []).filter((platform) =>
    SOCIAL_MEDIA_PLATFORMS.includes(platform.platform)
  );
  const pendingOauth = usePlatformKnowledgeGetPendingOauth(businessId, tempCode);
  const pendingData = pendingOauth.data?.data?.data;
  const isPendingOauthPlatformAllowed =
    !!pendingData && SOCIAL_MEDIA_PLATFORMS.includes(pendingData.platformCode);

  const mdDisconnectPlatform = usePlatformKnowledgeDisconnect();
  const mdAuthorizeUrl = usePlatformKnowledgeGetAuthorizeUrl();
  const mdConnectAccount = usePlatformKnowledgeConnectAccount();

  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [platformToDisconnect, setPlatformToDisconnect] =
    useState<PlatformRes | null>(null);
  const [connectingPlatform, setConnectingPlatform] =
    useState<PlatformEnum | null>(null);

  const disconnectingId = mdDisconnectPlatform.isPending
    ? mdDisconnectPlatform.variables?.platformId
    : null;
  const connectingAccount = mdConnectAccount.isPending
    ? mdConnectAccount.variables?.tempCodeAccount
    : null;
  // One platform action at a time: a second redirect or disconnect would race
  // the first one.
  const isBusy = connectingPlatform !== null || mdDisconnectPlatform.isPending;

  // Going back from the provider page restores this page from the bfcache
  // with the button still showing "connecting".
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setConnectingPlatform(null);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const openDisconnectDialog = (platform: PlatformRes) => {
    setPlatformToDisconnect(platform);
    setIsDisconnectDialogOpen(true);
  };

  const handleDisconnect = async () => {
    const platformId = platformToDisconnect?.id;
    if (!platformId || mdDisconnectPlatform.isPending) return;
    try {
      const response = await mdDisconnectPlatform.mutateAsync({
        businessId,
        platformId,
      });
      showToast("success", response.data.responseMessage);
    } catch (error) {
      showToast("error", error);
    } finally {
      setIsDisconnectDialogOpen(false);
    }
  };

  // Used for new connections and for reconnecting an expired or revoked one;
  // the backend replaces the broken connection.
  const handleConnect = async (platform: PlatformRes) => {
    if (isBusy) return;
    setConnectingPlatform(platform.platform);
    let isRedirecting = false;
    try {
      // Come back to this page after the account is picked on the auth site,
      // without leftover flags from a previous connection.
      const returnUrl = new URL(window.location.href);
      PLATFORM_URL_FLAGS.forEach((key) => returnUrl.searchParams.delete(key));
      returnUrl.hash = "";
      const response = await mdAuthorizeUrl.mutateAsync({
        businessId,
        platform: platform.platform,
        from: returnUrl.toString(),
      });
      const authUrl = toSafeAuthUrl(response.data.data?.authUrl);
      if (!authUrl) {
        showToast("error", t("connectFailed"));
        return;
      }
      // Same tab: the flow ends back on `from`, and a second tab would leave
      // this one showing the old connection state.
      isRedirecting = true;
      window.location.assign(authUrl);
    } catch (error) {
      showToast("error", getApiErrorMessage(error, t("connectFailed")));
    } finally {
      if (!isRedirecting) setConnectingPlatform(null);
    }
  };

  const handleConnectAccount = async (tempCodeAccount: string) => {
    if (mdConnectAccount.isPending) return;
    try {
      const response = await mdConnectAccount.mutateAsync({
        businessId,
        tempCodeAccount,
      });
      showToast("success", response.data.responseMessage);
      const url = new URL(window.location.href);
      PLATFORM_URL_FLAGS.forEach((key) => url.searchParams.delete(key));
      window.history.replaceState(null, "", url.toString());
    } catch (error) {
      showToast("error", getApiErrorMessage(error, t("connectAccountFailed")));
    }
  };

  const showPendingOauth =
    !!tempCode &&
    (pendingOauth.isLoading ||
      pendingOauth.isError ||
      isPendingOauthPlatformAllowed);

  return (
    <div className="grid grid-cols-1 gap-4">
      {isLoadingPlatforms && (
        <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loadingPlatforms")}
        </div>
      )}

      {isPlatformsError && !platformData && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <span className="text-destructive">{t("loadPlatformsFailed")}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchPlatforms()}
            disabled={isFetchingPlatforms}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetchingPlatforms ? "animate-spin" : ""}`}
            />
            {t("retry")}
          </Button>
        </div>
      )}

      {showPendingOauth && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <h3 className="font-medium text-foreground">{t("completeConnection")}</h3>
          {pendingOauth.isLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loadingConnectedAccount")}
            </div>
          ) : pendingOauth.isError ? (
            <p className="mt-2 text-sm text-destructive">
              {translateApiResponseMessage(
                getApiErrorMessage(pendingOauth.error, t("connectAccountFailed"))
              )}
            </p>
          ) : pendingData?.accounts?.length ? (
            <div className="mt-3 space-y-3">
              {pendingData.accounts.map((account) => (
                <div
                  key={account.tempCodeAccount}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 flex-shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                      <PlatformAvatar
                        src={account.platformIconUrl}
                        alt={account.platformUserName || t("accountAlt")}
                        platform={pendingData.platformCode}
                      />
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
                    onClick={() => handleConnectAccount(account.tempCodeAccount)}
                    disabled={mdConnectAccount.isPending}
                  >
                    {connectingAccount === account.tempCodeAccount ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    {connectingAccount === account.tempCodeAccount
                      ? t("connecting")
                      : t("connect")}
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

      {platforms.map((platform) => {
        const isConnected = platform.status === "connected";
        const needsReconnect = isConnected && platform.requiresReconnect;
        const isConnecting = connectingPlatform === platform.platform;
        const isDisconnecting =
          disconnectingId != null && disconnectingId === platform.id;
        const ctaLabel = mapEnumPlatform.getPlatformCtaLabel(platform.status, t);

        return (
          <div key={platform.platform} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between max-sm:gap-3">
              <div className="flex items-center gap-3 max-sm:min-w-0">
                <div className="w-8 h-8 bg-gradient-to-br from-background to-background-secondary rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0 overflow-hidden">
                  <PlatformAvatar
                    src={isConnected ? platform.accountDisplayImage : null}
                    alt={platform.accountDisplayName || platform.name}
                    platform={platform.platform}
                  />
                </div>
                <div className="max-sm:min-w-0">
                  <h3 className="font-medium text-foreground max-sm:break-words">
                    {isConnected && platform.accountDisplayName
                      ? platform.accountDisplayName
                      : platform.name}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {!isConnected ? (
                      mapEnumPlatform.getPlatformHint(platform.status, t)
                    ) : (
                      <div className="flex flex-col gap-2">
                        <span className="flex flex-row gap-2 items-center">
                          <span className="w-4 h-4">
                            {mapEnumPlatform.getPlatformIcon(
                              platform.platform,
                              "w-4 h-4"
                            )}
                          </span>
                          <span>{platform.name}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t("accountId", { id: platform.accountId ?? "" })}
                        </span>
                        {needsReconnect && (
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
                  </div>
                </div>
              </div>
              {needsReconnect ? (
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Button
                    size="sm"
                    onClick={() => handleConnect(platform)}
                    disabled={isBusy}
                    className="bg-amber-500 text-white hover:bg-amber-600"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isConnecting ? "animate-spin" : ""}`}
                    />
                    {isConnecting ? t("connecting") : t("reconnect")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDisconnectDialog(platform)}
                    disabled={isBusy}
                  >
                    {isDisconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                    {isDisconnecting ? t("disconnecting") : t("disconnect")}
                  </Button>
                </div>
              ) : (
                ctaLabel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      isConnected
                        ? openDisconnectDialog(platform)
                        : handleConnect(platform)
                    }
                    disabled={platform.status === "unavailable" || isBusy}
                    className={
                      isConnected
                        ? "bg-green-100 text-green-800 border-green-300"
                        : ""
                    }
                  >
                    {isConnecting || isDisconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isConnected ? (
                      <Unlink className="h-4 w-4" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    {isConnecting
                      ? t("connecting")
                      : isDisconnecting
                      ? t("disconnecting")
                      : ctaLabel}
                  </Button>
                )
              )}
            </div>
          </div>
        );
      })}

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
