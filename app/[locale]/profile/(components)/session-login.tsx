"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  useAuthProfileGetCurrentSession,
  useAuthProfileGetSessions,
  useAuthProfileLogout,
  useAuthProfileLogoutAll,
} from "@/services/auth.api";
import { useDateFormat } from "@/hooks/use-date-format";
import { logoutAndRedirect } from "@/config/api";
import { showToast } from "@/helper/show-toast";
import { useTranslations } from "next-intl";
import { Session } from "@/models/api/auth/profile.type";

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

export function SessionLogin() {
  const { data: sessionsData } = useAuthProfileGetSessions();
  const { data: currentSessionData } = useAuthProfileGetCurrentSession();
  const mLogout = useAuthProfileLogout();
  const { formatDate } = useDateFormat();
  const mLogoutAll = useAuthProfileLogoutAll();
  const t = useTranslations("sessionLogin");
  const tToast = useTranslations();
  const currentSession = currentSessionData?.data?.data?.session ?? null;
  const currentSessionId = currentSession?.id ?? null;

  const [logoutTarget, setLogoutTarget] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const sessions = useMemo(() => {
    const sessionList = sessionsData?.data?.data ?? [];

    const uniqueSessionsMap = new Map<string, Session>();
    
    sessionList
      .map((session) => mergeSessionDetails(session, currentSession))
      .forEach((session) => {
        // Use clientIp and device for deduplication, fallback to session id
        const key = (session.clientIp && session.device) ? `${session.clientIp}-${session.device}` : session.id;
        
        if (uniqueSessionsMap.has(key)) {
          const existing = uniqueSessionsMap.get(key)!;
          // Prefer current session over duplicates
          if (session.id === currentSessionId) {
            uniqueSessionsMap.set(key, session);
          } else if (existing.id !== currentSessionId) {
            // Keep the more recent session if both are not current
            if (new Date(session.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
              uniqueSessionsMap.set(key, session);
            }
          }
        } else {
          uniqueSessionsMap.set(key, session);
        }
      });

    return Array.from(uniqueSessionsMap.values())
      .sort((a, b) => {
        if (a.id === currentSessionId) return -1;
        if (b.id === currentSessionId) return 1;

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
      const isCurrentSession = logoutTarget === currentSessionId;
      try {
        await mLogout.mutateAsync(logoutTarget);
        showToast("success", tToast("toast.auth.logoutSuccess"), tToast);
        if (isCurrentSession) {
          await sleep(1000);
          await logoutAndRedirect();
        } else {
          setLogoutTarget(null);
          setIsLoggingOut(false);
        }
      } catch {
        setIsLoggingOut(false);
      }
    }
  };

  return (
    <>
      <Card className="h-fit">
        <CardContent className="p-6">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              {t("title")}
            </h2>
            <Button variant="destructive" size="sm" onClick={() => setLogoutTarget("all")}>
              {t("logoutAll")}
            </Button>
          </div>

          <div className="space-y-4">
            {sessions.map((session) => {
              const label = formatSessionLabel(session);
              const sessionDate = session.createdAt || session.expiredAt;

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between bg-background-secondary p-4 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    {sessionDate && (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(new Date(sessionDate))}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-white"
                    onClick={() => setLogoutTarget(session.id)}
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
        description={logoutTarget === "all" ? t("logoutAllConfirmDescription") : t("logoutConfirmDescription")}
        confirmText={t("confirm")}
        cancelText={t("cancel")}
        isLoading={isLoggingOut}
      />
    </>
  );
}
