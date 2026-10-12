"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  AUTH_CURRENT_SESSION_QUERY_KEY,
  AUTH_PROFILE_QUERY_KEY,
  AUTH_SESSIONS_QUERY_KEY,
  authProfileService,
  useAuthProfileGetCurrentSession,
  useAuthProfileGetSessions,
  useAuthProfileLogoutAll,
} from "@/services/auth.api";
import { useDateFormat } from "@/hooks/use-date-format";
import { logoutAndRedirect } from "@/config/api";
import { showToast } from "@/helper/show-toast";
import { useTranslations } from "next-intl";
import { Session } from "@/models/api/auth/profile.type";
import { useQueryClient } from "@tanstack/react-query";

interface GroupedSession {
  key: string;
  sessionIds: string[];
  primarySession: Session;
  isCurrentSession: boolean;
  latestDate: string;
  count: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const GENERIC_BROWSER_NAMES = ["node", "postmanruntime"];

const isGenericBrowser = (browser?: string) => {
  if (!browser) return false;
  return GENERIC_BROWSER_NAMES.some((name) =>
    browser.toLowerCase().startsWith(name)
  );
};

const formatSessionLabel = (session: Session) => {
  const browser = session.browser?.trim();
  const platform = session.platform?.trim();
  const device = session.device?.trim();
  const informativeBrowser =
    browser && !isGenericBrowser(browser) ? browser : null;

  const primaryLabel = platform || informativeBrowser || device || browser || "-";
  const secondaryLabel =
    informativeBrowser && informativeBrowser !== primaryLabel
      ? informativeBrowser
      : device && device !== primaryLabel
        ? device
        : browser && browser !== primaryLabel && !informativeBrowser
          ? browser
          : null;

  return [primaryLabel, secondaryLabel].filter(Boolean).join(" • ");
};

const mergeSessionDetails = (session: Session, currentSession: Session | null) => {
  if (!currentSession || session.id !== currentSession.id) {
    return session;
  }

  return {
    ...session,
    browser: currentSession.browser || session.browser,
    platform: currentSession.platform || session.platform,
    device: currentSession.device || session.device,
  };
};

const getSessionGroupKey = (session: Session) => {
  const device = (session.device || "").trim().toLowerCase();
  const platform = (session.platform || "").trim().toLowerCase();
  const browser = (session.browser || "").trim().toLowerCase();
  const ip = (session.clientIp || "").trim().toLowerCase();
  return `${platform}:::${device}:::${browser}:::${ip}`;
};

export function SessionLogin() {
  const { data: sessionsData } = useAuthProfileGetSessions();
  const { data: currentSessionData } = useAuthProfileGetCurrentSession();
  const queryClient = useQueryClient();
  const { formatDate } = useDateFormat();
  const mLogoutAll = useAuthProfileLogoutAll();
  const t = useTranslations("sessionLogin");
  const tToast = useTranslations();
  const currentSession = currentSessionData?.data?.data?.session ?? null;
  const currentSessionId = currentSession?.id ?? null;

  const [logoutTarget, setLogoutTarget] = useState<GroupedSession | "all" | null>(
    null
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const sessions = useMemo(() => {
    const sessionList = sessionsData?.data?.data ?? [];
    const groupMap = new Map<string, GroupedSession>();

    sessionList
      .map((session) => mergeSessionDetails(session, currentSession))
      .forEach((session) => {
        const key = getSessionGroupKey(session);
        const isCurrent = session.id === currentSessionId;
        const sessionDate = session.createdAt || session.expiredAt || "";

        const existing = groupMap.get(key);
        if (!existing) {
          groupMap.set(key, {
            key,
            sessionIds: [session.id],
            primarySession: session,
            isCurrentSession: isCurrent,
            latestDate: sessionDate,
            count: 1,
          });
        } else {
          if (!existing.sessionIds.includes(session.id)) {
            existing.sessionIds.push(session.id);
            existing.count += 1;
          }
          if (isCurrent) {
            existing.isCurrentSession = true;
            existing.primarySession = session;
          }
          const existingTime = existing.latestDate
            ? new Date(existing.latestDate).getTime()
            : 0;
          const currentTime = sessionDate
            ? new Date(sessionDate).getTime()
            : 0;
          if (currentTime > existingTime) {
            existing.latestDate = sessionDate;
            if (!existing.isCurrentSession) {
              existing.primarySession = session;
            }
          }
        }
      });

    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.isCurrentSession && !b.isCurrentSession) return -1;
      if (!a.isCurrentSession && b.isCurrentSession) return 1;

      const timeA = a.latestDate ? new Date(a.latestDate).getTime() : 0;
      const timeB = b.latestDate ? new Date(b.latestDate).getTime() : 0;
      return timeB - timeA;
    });
  }, [currentSession, currentSessionId, sessionsData?.data?.data]);

  const handleConfirmLogout = async () => {
    if (!logoutTarget) return;

    setIsLoggingOut(true);

    if (logoutTarget === "all") {
      try {
        await mLogoutAll.mutateAsync();
        showToast("success", tToast("toast.auth.logoutAllSuccess"), tToast);
        await sleep(1000);
        await logoutAndRedirect();
      } catch {
        setIsLoggingOut(false);
      }
    } else {
      const isCurrentSession = logoutTarget.isCurrentSession;
      try {
        await Promise.allSettled(
          logoutTarget.sessionIds.map((id) => authProfileService.logout(id))
        );

        showToast("success", tToast("toast.auth.logoutSuccess"), tToast);

        if (isCurrentSession) {
          await sleep(1000);
          await logoutAndRedirect();
        } else {
          queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_QUERY_KEY });
          queryClient.invalidateQueries({
            queryKey: AUTH_CURRENT_SESSION_QUERY_KEY,
          });
          queryClient.invalidateQueries({ queryKey: AUTH_SESSIONS_QUERY_KEY });
          setLogoutTarget(null);
          setIsLoggingOut(false);
        }
      } catch {
        setIsLoggingOut(false);
      }
    }
  };

  const getModalDetailValue = () => {
    if (!logoutTarget || logoutTarget === "all") return undefined;
    const label = formatSessionLabel(logoutTarget.primarySession);
    const ip = logoutTarget.primarySession.clientIp?.trim();
    return ip ? `${label} • IP: ${ip}` : label;
  };

  return (
    <>
      <Card className="h-fit">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 max-md:mb-4 max-md:items-center">
            <h2 className="text-lg font-semibold text-foreground mb-6 max-md:mb-0">
              {t("title")}
            </h2>
            <Button
              variant="destructive"
              size="sm"
              className="h-(--control-h-sm) shrink-0 sm:h-9"
              onClick={() => setLogoutTarget("all")}
            >
              {t("logoutAll")}
            </Button>
          </div>

          <div className="space-y-4">
            {sessions.map((group) => {
              const label = formatSessionLabel(group.primarySession);
              const sessionDate = group.latestDate;
              const clientIp = group.primarySession.clientIp?.trim();

              return (
                <div
                  key={group.key}
                  className="flex items-center justify-between gap-3 bg-background-secondary p-4 rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-medium text-foreground">
                        {label}
                      </p>
                      {group.isCurrentSession && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {t("currentSession")}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground mt-0.5">
                      {sessionDate && (
                        <span>{formatDate(new Date(sessionDate))}</span>
                      )}
                      {clientIp && (
                        <>
                          {sessionDate && <span>•</span>}
                          <span>IP: {clientIp}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-(--control-h-sm) shrink-0 text-white sm:h-9"
                    onClick={() => setLogoutTarget(group)}
                  >
                    {t("logout")}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={!!logoutTarget}
        onClose={() => {
          if (!isLoggingOut) setLogoutTarget(null);
        }}
        onConfirm={handleConfirmLogout}
        title={t("logoutConfirmTitle")}
        description={
          logoutTarget === "all"
            ? t("logoutAllConfirmDescription")
            : t("logoutConfirmDescription")
        }
        confirmText={t("confirm")}
        cancelText={t("cancel")}
        isLoading={isLoggingOut}
        variant="danger"
        detailLabel={logoutTarget !== "all" ? t("deviceDetail") : undefined}
        detailValue={getModalDetailValue()}
      />
    </>
  );
}
