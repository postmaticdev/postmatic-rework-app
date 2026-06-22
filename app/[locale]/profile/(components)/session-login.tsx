"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useAuthProfileGetCurrentSession,
  useAuthProfileGetSessions,
  useAuthProfileLogout,
  useAuthProfileLogoutAll,
} from "@/services/auth.api";
import { useDateFormat } from "@/hooks/use-date-format";
import { ACCESS_TOKEN_KEY, LOGIN_URL, REFRESH_TOKEN_KEY } from "@/constants";
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

  const sessions = useMemo(() => {
    const sessionList = sessionsData?.data?.data ?? [];

    return sessionList
      .map((session) => mergeSessionDetails(session, currentSession))
      .sort((a, b) => {
        if (a.id === currentSessionId) return -1;
        if (b.id === currentSessionId) return 1;

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [currentSession, currentSessionId, sessionsData?.data?.data]);

  const handleLogout = async (sessionId: string) => {
    const isCurrentSession = sessionId === currentSessionId;

    try {
      await mLogout.mutateAsync(sessionId);
      showToast("success", tToast("toast.auth.logoutSuccess"), tToast);
    } catch {
      return;
    }

    if (!isCurrentSession) {
      return;
    }

    await sleep(1000);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    fetch("/api/auth/sync", { method: "DELETE" }).catch(() => undefined);
    window.location.href = LOGIN_URL;
  };

  const handleLogoutAll = async () => {
    try {
      await mLogoutAll.mutateAsync();
      showToast("success", tToast("toast.auth.logoutAllSuccess"), tToast);
    } catch {
      return;
    }

    await sleep(1000);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    fetch("/api/auth/sync", { method: "DELETE" }).catch(() => undefined);
    window.location.href = LOGIN_URL;
  };

  return (
    <Card className="h-fit">
      <CardContent className="p-6">
        <div className="flex justify-between">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            {t("title")}
          </h2>
          <Button variant="destructive" size="sm" onClick={handleLogoutAll}>
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
                  className="text-white px-6"
                  onClick={() => handleLogout(session.id)}
                >
                  {t("logout")}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
