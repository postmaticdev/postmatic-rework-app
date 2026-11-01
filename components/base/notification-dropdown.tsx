"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, CheckCheck, ChevronRight, Loader2, MessageSquare } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNotification } from "@/contexts/notification-context";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 5;

interface NotificationDropdownProps {
  /** Business used to build the notifications page URL. */
  businessId?: string | number | null;
}

/**
 * Header bell: opens a preview of the latest notifications. Clicking an item opens it
 * on the notifications page; "Lihat semua" opens the page without a selection.
 */
export function NotificationDropdown({ businessId }: NotificationDropdownProps) {
  const t = useTranslations("notificationDropdown");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    blastUnreadCount,
    ticketUnreadCount,
    isNotificationLoading,
    notificationError,
    markAllAsRead,
  } = useNotification();

  const notificationsPath = businessId ? `/business/${String(businessId)}/notifications` : null;
  const previewItems = notifications.slice(0, PREVIEW_LIMIT);

  const goTo = (query?: string) => {
    if (!notificationsPath) return;
    setOpen(false);
    router.push(query ? `${notificationsPath}?${query}` : notificationsPath);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative hidden md:inline-flex text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 hover:scale-105 active:scale-95 group"
          aria-label={t("triggerLabel")}
        >
          <Bell className="size-5 transition-transform duration-300 group-hover:rotate-12" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] px-1 md:h-4 md:min-w-4 md:px-0 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] md:text-[10px] leading-none font-bold text-white ring-2 ring-background animate-in zoom-in-50 duration-200">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{t("title")}</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allRead")}
            </p>
          </div>
          {blastUnreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("markAllRead")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />

        <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
          {isNotificationLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : notificationError ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("loadFailed")}
            </p>
          ) : previewItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Bell className="mx-auto mb-2 h-7 w-7 opacity-30" />
              <p className="text-sm">{t("empty")}</p>
            </div>
          ) : (
            previewItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                disabled={!notificationsPath}
                onSelect={() => goTo(`tab=notifications&id=${encodeURIComponent(item.id)}`)}
                className="flex cursor-pointer items-start gap-3 rounded-none px-4 py-3 focus:bg-muted/60"
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    item.unread ? "bg-blue-500" : "bg-transparent",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm text-foreground",
                      item.unread ? "font-semibold" : "font-medium",
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">{item.time}</p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>

        {ticketUnreadCount > 0 && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <DropdownMenuItem
              disabled={!notificationsPath}
              onSelect={() => goTo("tab=tickets")}
              className="flex cursor-pointer items-center gap-2 rounded-none px-4 py-3 text-sm focus:bg-muted/60"
            >
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="flex-1">
                {t("newTicketReplies", { count: ticketUnreadCount })}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          disabled={!notificationsPath}
          onSelect={() => goTo()}
          className="justify-center rounded-none px-4 py-3 text-sm font-medium text-primary focus:bg-muted/60 focus:text-primary"
        >
          {t("viewAll")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
