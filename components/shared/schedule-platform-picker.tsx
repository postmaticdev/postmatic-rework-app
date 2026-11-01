"use client";

import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/role-context";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { cn } from "@/lib/utils";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";

export interface SchedulePlatformOption {
  platform: PlatformEnum;
  isConnected: boolean;
  // Connected, but the token expired or was revoked: publishing would fail.
  requiresReconnect?: boolean;
}

interface SchedulePlatformPickerProps {
  platforms: SchedulePlatformOption[];
  selectedPlatforms: PlatformEnum[];
  onTogglePlatform: (platform: PlatformEnum) => void;
  disabled?: boolean;
  // Opens the platform connect modal. Omit (or lack the permission) to keep
  // unconnected platforms read-only.
  onConnectPlatform?: () => void;
}

/**
 * Platform choice of the scheduling dialogs. At least one platform must be
 * selected to schedule; unconnected platforms open the same connect flow as the
 * knowledge base.
 */
export function SchedulePlatformPicker({
  platforms,
  selectedPlatforms,
  onTogglePlatform,
  disabled = false,
  onConnectPlatform,
}: SchedulePlatformPickerProps) {
  const t = useTranslations("contentGenerateScheduler");
  const { platformKnowledge } = useRole().access;
  const canConnect = Boolean(onConnectPlatform) && platformKnowledge.write;
  const availablePlatforms = platforms
    .filter((option) => option.isConnected && !option.requiresReconnect)
    .map((option) => option.platform);
  const hasAvailablePlatform = availablePlatforms.length > 0;
  const hasSelection = selectedPlatforms.some((platform) =>
    availablePlatforms.includes(platform)
  );

  return (
    <div className="space-y-4 max-sm:space-y-3">
      <div className="text-sm font-medium">{t("choosePlatform")}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {platforms.map(({ platform, isConnected, requiresReconnect }) => {
          const isAvailable = isConnected && !requiresReconnect;
          const isSelected = isAvailable && selectedPlatforms.includes(platform);
          const isConnectable = !isAvailable && canConnect;
          return (
            <button
              key={platform}
              type="button"
              onClick={() =>
                isAvailable ? onTogglePlatform(platform) : onConnectPlatform?.()
              }
              disabled={disabled || (!isAvailable && !isConnectable)}
              aria-pressed={isAvailable ? isSelected : undefined}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-2 py-1.5 text-sm font-medium transition-colors",
                isSelected
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-background-secondary",
                !isAvailable &&
                  "border-dashed bg-muted/30 text-muted-foreground",
                isConnectable && "hover:border-primary hover:text-primary",
                !isAvailable && !isConnectable && "cursor-not-allowed opacity-70"
              )}
            >
              {mapEnumPlatform.getPlatformIcon(
                platform,
                cn(
                  "shrink-0",
                  isSelected ? "text-white" : !isAvailable && "text-muted-foreground"
                )
              )}
              <span className="flex min-w-0 flex-col text-left leading-tight">
                <span className="truncate">{mapEnumPlatform.getPlatformLabel(platform)}</span>
                {!isAvailable && (
                  <span className="text-[11px] font-normal max-sm:text-xs">
                    {isConnected ? t("needsReconnect") : t("notConnected")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {!hasAvailablePlatform ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3 max-sm:flex-col max-sm:items-stretch">
          <p className="text-sm text-muted-foreground">
            {t("noConnectedPlatform")}
          </p>
          {canConnect && (
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={onConnectPlatform}
              disabled={disabled}
            >
              <Link2 className="h-4 w-4" />
              {t("connectPlatform")}
            </Button>
          )}
        </div>
      ) : (
        !hasSelection && (
          <p className="text-xs text-muted-foreground">{t("selectPlatform")}</p>
        )
      )}
    </div>
  );
}
