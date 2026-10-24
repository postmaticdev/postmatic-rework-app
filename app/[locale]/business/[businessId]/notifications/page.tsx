"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DOMPurify from "dompurify";
import dynamic from "next/dynamic";

import {
  useNotification,
  type NotificationAttachment,
  type TicketItem,
} from "@/contexts/notification-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  MessageSquare,
  Check,
  CheckCheck,
  ArrowLeft,
  FileText,
  X,
  Circle,
  Search,
  Play,
  Download,
  Loader2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { htmlToPreviewText } from "./(components)/rich-text-utils";

type MediaViewerState = {
  type: "photo" | "video";
  url: string;
  name: string;
} | null;

// Editor Tiptap hanya dibutuhkan di tab Tiket; dimuat terpisah agar halaman ringan.
const TicketReplyComposer = dynamic(
  () => import("./(components)/ticket-reply-composer"),
  {
    ssr: false,
    loading: () => (
      <div className="border-t border-border bg-card p-3 shrink-0">
        <div className="h-[148px] animate-pulse rounded-md border border-border/70 bg-muted/30" />
      </div>
    ),
  }
);

const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function hasHtmlTag(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

// Allowlist sanitizer (DOMPurify): konten berasal dari blast admin dan pesan
// tiket, jadi hanya tag/atribut format teks yang diizinkan dan URL hanya
// http(s)/mailto/tel. Atribut style hanya menyisakan text-align (TextAlign).
const RICH_HTML_ALLOWED_TAGS = [
  "a", "b", "blockquote", "br", "code", "em", "h1", "h2", "h3", "hr", "i",
  "img", "li", "ol", "p", "pre", "s", "source", "span", "strong", "u", "ul",
  "video",
];
const RICH_HTML_ALLOWED_ATTR = [
  "alt", "controls", "href", "rel", "src", "style", "target", "title", "type",
];
const TEXT_ALIGN_STYLE = /text-align\s*:\s*(left|right|center|justify)/i;
let isRichHtmlHookInstalled = false;

function installRichHtmlHook() {
  if (isRichHtmlHookInstalled) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
    const style = node.getAttribute("style");
    if (style !== null) {
      const align = style.match(TEXT_ALIGN_STYLE)?.[1];
      if (align) node.setAttribute("style", `text-align: ${align}`);
      else node.removeAttribute("style");
    }
  });
  isRichHtmlHookInstalled = true;
}

function sanitizeRichHtml(value?: string | null) {
  const content = value ?? "";
  const source = hasHtmlTag(content)
    ? content
    : escapeHtml(content).replace(/\n/g, "<br />");

  // Tanpa DOM (render di server) jangan pernah meneruskan HTML mentah.
  if (typeof window === "undefined" || !DOMPurify.isSupported) {
    return escapeHtml(htmlToPreviewText(source));
  }

  installRichHtmlHook();
  return DOMPurify.sanitize(source, {
    ALLOWED_TAGS: RICH_HTML_ALLOWED_TAGS,
    ALLOWED_ATTR: RICH_HTML_ALLOWED_ATTR,
    // http(s)/mailto/tel atau URL relatif; skema lain (javascript:, data:, ...) ditolak.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

function RichMessageContent({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "leading-relaxed text-inherit",
        "[&_a]:font-medium [&_a]:underline",
        "[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-current/30 [&_blockquote]:pl-3 [&_blockquote]:opacity-90",
        "[&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5",
        "[&_h1]:mb-2 [&_h1]:mt-1 [&_h1]:text-xl [&_h1]:font-bold",
        "[&_h2]:mb-2 [&_h2]:mt-1 [&_h2]:text-lg [&_h2]:font-bold",
        "[&_h3]:mb-1.5 [&_h3]:mt-1 [&_h3]:text-base [&_h3]:font-bold",
        "[&_img]:my-2 [&_img]:max-h-64 [&_img]:rounded-lg [&_img]:object-contain",
        "[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_video]:my-2 [&_video]:max-h-64 [&_video]:rounded-lg",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }}
    />
  );
}

function downloadFile(url: string, name: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function MediaFullscreenOverlay({
  media,
  onClose,
}: {
  media: NonNullable<MediaViewerState>;
  onClose: () => void;
}) {
  const t = useTranslations("notifications");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[101] rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label={t("close")}
      >
        <X className="h-6 w-6" />
      </button>

      <div
        className="flex max-h-[100dvh] max-w-[100vw] items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        {media.type === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={media.name}
            className="max-h-[100dvh] max-w-[100vw] object-contain"
          />
        ) : (
          <video
            src={media.url}
            controls
            autoPlay
            className="max-h-[100dvh] max-w-[100vw] object-contain"
          />
        )}
      </div>
    </div>,
    document.body
  );
}

export default function NotificationsPage() {
  const {
    notifications,
    tickets,
    blastUnreadCount,
    ticketUnreadCount,
    isNotificationLoading,
    notificationError,
    isTicketLoading,
    isTicketListSettled,
    ticketError,
    markAsRead,
    markAllAsRead,
    sendChatMessage,
    setTicketListEnabled,
    loadTicketMessages,
  } = useNotification();

  const t = useTranslations("notifications");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"notifications" | "tickets">("notifications");
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Search states
  const [notifSearch, setNotifSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");

  // Mobile view state
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState>(null);
  const [isMounted, setIsMounted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const previousTicketCountRef = useRef(0);

  // Filtered lists
  const filteredNotifications = notifications.filter(
    (n) =>
      n.title.toLowerCase().includes(notifSearch.toLowerCase()) ||
      n.message.toLowerCase().includes(notifSearch.toLowerCase())
  );

  const filteredTickets = tickets.filter(
    (t) =>
      t.id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.title.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.status.toLowerCase().includes(ticketSearch.toLowerCase())
  );

  const activeNotification = notifications.find((n) => n.id === selectedNotifId) || null;
  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  // Auto-select first item
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setTicketListEnabled(activeTab === "tickets");

    return () => {
      setTicketListEnabled(false);
    };
  }, [activeTab, setTicketListEnabled]);

  useEffect(() => {
    if (notifications.length > 0 && !selectedNotifId) {
      setSelectedNotifId(notifications[0].id);
    }
  }, [notifications, selectedNotifId]);

  useEffect(() => {
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  useEffect(() => {
    if (!selectedTicketId) return;
    const numericId = parseInt(selectedTicketId.replace(/\D/g, ""), 10);
    if (!Number.isNaN(numericId)) {
      loadTicketMessages(numericId);
    }
  }, [selectedTicketId, loadTicketMessages]);

  // Auto-select newest ticket if it appears (from report modal). List yang baru
  // dimuat (0 -> N, mis. saat pindah tab) tidak boleh menimpa pilihan user.
  useEffect(() => {
    const previousTicketCount = previousTicketCountRef.current;
    previousTicketCountRef.current = tickets.length;

    if (previousTicketCount > 0 && tickets.length > previousTicketCount && tickets[0]) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket?.messages]);

  // Deep link from the header notification dropdown: ?tab=notifications|tickets&id=<id>.
  // Applied once the target item is loaded, then removed from the URL so the same
  // item can be opened again from the dropdown.
  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    const requestedId = searchParams.get("id");
    if (!requestedTab && !requestedId) return;

    const tab = requestedTab === "tickets" ? "tickets" : "notifications";
    // Tab tiket harus aktif dulu: list tiket baru di-fetch saat tab Ticket dibuka.
    if (activeTab !== tab) {
      setActiveTab(tab);
      return;
    }
    if (requestedId) {
      const items = tab === "tickets" ? tickets : notifications;
      if (!items.some((item) => item.id === requestedId)) {
        const isLoading =
          tab === "notifications" ? isNotificationLoading : !isTicketListSettled;
        if (isLoading) return;
      } else if (tab === "tickets") {
        setSelectedTicketId(requestedId);
      } else {
        setSelectedNotifId(requestedId);
      }
    }

    setMobileView(requestedId ? "detail" : "list");
    router.replace(pathname, { scroll: false });
  }, [
    searchParams,
    activeTab,
    notifications,
    tickets,
    isNotificationLoading,
    isTicketListSettled,
    pathname,
    router,
  ]);

  // Auto-mark as read hanya jika detail benar-benar terlihat: di mobile, item
  // yang dipilih otomatis berada di balik tampilan list dan belum dibaca user.
  useEffect(() => {
    if (!activeNotification?.unread) return;
    const isDetailVisible =
      mobileView === "detail" || window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
    if (isDetailVisible) markAsRead(activeNotification.id);
  }, [activeNotification, mobileView, markAsRead]);

  const handleTabChange = (tab: "notifications" | "tickets") => {
    setActiveTab(tab);
    setMobileView("list");
  };

  const handleSendReply = useCallback(
    (body: string, attachments: NotificationAttachment[]) => {
      if (!selectedTicketId) return;
      void sendChatMessage(
        selectedTicketId,
        body,
        attachments.length > 0 ? attachments : undefined
      );
    },
    [selectedTicketId, sendChatMessage]
  );

  const handleAttachmentClick = useCallback(
    (file: { type: "photo" | "file" | "video"; name: string; url?: string }) => {
      if (!file.url) return;

      if (file.type === "file") {
        downloadFile(file.url, file.name);
        return;
      }

      setMediaViewer({ type: file.type, url: file.url, name: file.name });
    },
    []
  );

  const renderMessageAttachments = (
    attachments: NonNullable<TicketItem["messages"][number]["attachments"]>
  ) => (
    <div className="mt-2 space-y-2 border-t border-border pt-2">
      {attachments.map((file, idx) => (
        <div key={idx}>
          {file.type === "photo" && file.url && (
            <button
              type="button"
              onClick={() => handleAttachmentClick(file)}
              className="mb-1 block max-w-[240px] overflow-hidden rounded-lg transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.url}
                alt={file.name}
                className="h-auto w-full object-contain"
              />
            </button>
          )}
          {file.type === "video" && file.url && (
            <button
              type="button"
              onClick={() => handleAttachmentClick(file)}
              className="relative mb-1 block max-w-[240px] overflow-hidden rounded-lg bg-black transition-opacity hover:opacity-90"
            >
              <video src={file.url} className="h-auto w-full object-contain" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-8 w-8 text-white" />
              </span>
            </button>
          )}
          {file.type === "file" && (
            <button
              type="button"
              onClick={() => handleAttachmentClick(file)}
              className="flex w-full items-center gap-2 rounded-md bg-muted p-2 text-xs text-foreground transition-colors hover:bg-muted/80"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-medium">{file.name}</span>
              <Download className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const getStatusBadge = (status: TicketItem["status"]) => {
    const map = {
      Terkirim:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      "Sedang Direview":
        "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
      "In Progress":
        "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/50",
      Done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
    };
    return map[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: TicketItem["status"]) => {
    switch (status) {
      case "Terkirim":
        return t("ticketStatusSent");
      case "Sedang Direview":
        return t("ticketStatusReviewing");
      case "In Progress":
        return t("ticketStatusInProgress");
      case "Done":
        return t("ticketStatusDone");
      default:
        return status;
    }
  };


  return (
    // Mobile: 100dvh (bukan 100vh) agar halaman tidak ikut ter-scroll di balik toolbar browser —
    // header + search tetap menempel, hanya list yang di-scroll.
    <main className="flex-1 flex flex-col h-[calc(100vh-4.5rem)] max-md:h-[calc(100dvh-4.5rem)] overflow-hidden bg-background">
      {/* ── Tab Navigation Bar ─────────────────────────────────────────── */}
      <div className="border-b border-border bg-card px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 max-md:flex-wrap max-md:gap-2">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {t("pageTitle")}
          </h1>

          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => handleTabChange("notifications")}
              className={`min-h-10 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === "notifications"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bell className="w-4 h-4" />
              {t("notificationTab")}
              {blastUnreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {blastUnreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange("tickets")}
              className={`min-h-10 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === "tickets"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {t("ticketTab")}
              {ticketUnreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {ticketUnreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === "notifications" && blastUnreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-blue-600 hover:text-blue-700 shrink-0"
          >
            <CheckCheck className="h-4 w-4" />
            {t("markAllAsRead")}
          </Button>
        )}
      </div>

      {/* ── Main Split Screen ──────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ════════════════════════════════════════════════════════════════
            TAB: NOTIFICATIONS
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === "notifications" && (
          <>
            {/* List Column 30% */}
            <div
              className={`w-full md:w-[30%] border-r border-border flex flex-col bg-card shrink-0 ${
                mobileView === "detail" ? "hidden md:flex" : "flex"
              }`}
            >
              {/* Search bar */}
              <div className="p-3 border-b border-border shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={notifSearch}
                    onChange={(e) => setNotifSearch(e.target.value)}
                    placeholder={t("searchNotifications")}
                    className="pl-9 bg-muted/40 border-border"
                  />
                  {notifSearch && (
                    <button
                      onClick={() => setNotifSearch("")}
                      aria-label={t("clearSearch")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground max-md:right-1 max-md:p-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {isNotificationLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-60" />
                    <p className="text-sm">{t("loadingNotifications")}</p>
                  </div>
                ) : notificationError && notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t("loadNotificationsFailed")}</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t("noNotificationsFound")}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredNotifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedNotifId(item.id);
                          setMobileView("detail");
                        }}
                        className={`p-4 cursor-pointer transition-all duration-200 hover:bg-muted/40 relative flex gap-3 ${
                          selectedNotifId === item.id
                            ? "bg-primary/5 border-l-4 border-primary"
                            : "border-l-4 border-transparent"
                        }`}
                      >
                        {item.unread && (
                          <span className="absolute right-4 top-4">
                            <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" />
                          </span>
                        )}
                        <div className="flex-1 min-w-0 pr-5">
                          <h4
                            className={`text-sm text-foreground truncate ${
                              item.unread ? "font-bold" : "font-medium"
                            }`}
                          >
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {item.message}
                          </p>
                          <span className="text-[11px] text-muted-foreground/80 block mt-2 max-md:text-xs">
                            {item.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Detail Column 70% — full scrollable */}
            <div
              className={`flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-background ${
                mobileView === "list" ? "hidden md:flex" : "flex"
              }`}
            >
              {/* Mobile back button */}
              <div className="md:hidden p-3 border-b border-border shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileView("list")}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("back")}
                </Button>
              </div>

              {activeNotification ? (
                <div className="min-h-full bg-muted/20 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                  <article className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    <header className="border-b border-border px-4 py-4 sm:px-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {activeNotification.unread && (
                              <Badge
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {t("newBadge")}
                              </Badge>
                            )}
                            {activeNotification.channelType && (
                              <Badge variant="outline" className="capitalize">
                                {activeNotification.channelType}
                              </Badge>
                            )}
                          </div>
                          <h2 className="text-base font-bold leading-snug text-foreground">
                            {activeNotification.title}
                          </h2>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {activeNotification.time}
                          </span>
                        </div>
                      </div>
                    </header>

                    <div className="flex-1 space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
                      <RichMessageContent
                        value={activeNotification.content || activeNotification.message}
                        className="text-sm leading-6 text-foreground/90"
                      />

                      {activeNotification.attachments &&
                        activeNotification.attachments.length > 0 &&
                        renderMessageAttachments(activeNotification.attachments)}
                    </div>

                    <footer className="flex justify-end border-t border-border px-4 py-4 sm:px-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(activeNotification.id)}
                        disabled={!activeNotification.unread}
                      >
                        <Check className="h-4 w-4" />
                        {activeNotification.unread ? t("markAsRead") : t("alreadyRead")}
                      </Button>
                    </footer>
                  </article>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                  <Bell className="w-12 h-12 stroke-[1.5] mb-2 opacity-30" />
                  <p className="text-sm">{t("selectNotificationHint")}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: TICKETS
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === "tickets" && (
          <>
            {/* List Column 30% */}
            <div
              className={`w-full md:w-[30%] border-r border-border flex flex-col bg-card shrink-0 ${
                mobileView === "detail" ? "hidden md:flex" : "flex"
              }`}
            >
              {/* Search bar */}
              <div className="p-3 border-b border-border shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    placeholder={t("searchTickets")}
                    className="pl-9 bg-muted/40 border-border"
                  />
                  {ticketSearch && (
                    <button
                      onClick={() => setTicketSearch("")}
                      aria-label={t("clearSearch")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground max-md:right-1 max-md:p-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {isTicketLoading || (!isTicketListSettled && tickets.length === 0) ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-60" />
                    <p className="text-sm">{t("loadingTickets")}</p>
                  </div>
                ) : ticketError && tickets.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t("loadTicketsFailed")}</p>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t("noTicketsFound")}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredTickets.map((ticket) => {
                      const lastMsg = ticket.messages[ticket.messages.length - 1];
                      const hasUnread = ticket.unreadMessages > 0;
                      return (
                        <div
                          key={ticket.id}
                          onClick={() => {
                            setSelectedTicketId(ticket.id);
                            setMobileView("detail");
                          }}
                          className={cn(
                            "flex cursor-pointer flex-col gap-2 border-l-4 p-4 transition-all duration-200 hover:bg-muted/40",
                            selectedTicketId === ticket.id
                              ? "border-primary bg-primary/5"
                              : hasUnread
                                ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/15"
                                : "border-transparent"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {hasUnread && (
                                <Circle className="h-2.5 w-2.5 shrink-0 fill-blue-600 text-blue-600" />
                              )}
                              <span
                                className={cn(
                                  "truncate text-xs font-bold tracking-wide",
                                  hasUnread ? "text-blue-700" : "text-blue-600"
                                )}
                              >
                                {ticket.id}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 text-[10px] max-md:text-xs",
                                hasUnread
                                  ? "font-semibold text-blue-700"
                                  : "text-muted-foreground"
                              )}
                            >
                              {ticket.lastActivityTime}
                            </span>
                          </div>
                          <div>
                            <h4
                              className={cn(
                                "line-clamp-1 text-sm text-foreground",
                                hasUnread ? "font-bold" : "font-semibold"
                              )}
                            >
                              {ticket.title}
                            </h4>
                            {lastMsg && (
                              <p
                                className={cn(
                                  "mt-1 truncate text-xs",
                                  hasUnread
                                    ? "font-semibold text-foreground"
                                    : "text-muted-foreground"
                                )}
                              >
                                {lastMsg.sender === "user"
                                  ? t("lastMessageFromYou", {
                                      message: htmlToPreviewText(lastMsg.text) || t("attachmentPlaceholder"),
                                    })
                                  : t("lastMessageFromCs", {
                                      message: htmlToPreviewText(lastMsg.text) || t("attachmentPlaceholder"),
                                    })}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                                ticket.status
                              )}`}
                            >
                              {getStatusLabel(ticket.status)}
                            </span>
                            {hasUnread && (
                              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                {t("newMessagesCount", { count: ticket.unreadMessages })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Detail 70% */}
            <div
              className={`flex-1 flex flex-col bg-background relative overflow-hidden ${
                mobileView === "list" ? "hidden md:flex" : "flex"
              }`}
            >
              {activeTicket ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileView("list")}
                        className="md:hidden"
                        aria-label={t("back")}
                      >
                        <ArrowLeft className="w-5 h-5 text-foreground" />
                      </Button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600">{activeTicket.id}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                              activeTicket.status
                            )}`}
                          >
                            {getStatusLabel(activeTicket.status)}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-foreground truncate mt-0.5">
                          {activeTicket.title}
                        </h3>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:block shrink-0">
                      {t("createdAt", { date: activeTicket.date })}
                    </span>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto bg-background/50 custom-scrollbar">
                    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
                    {activeTicket.messages.map((msg) => {
                      const isUser = msg.sender === "user";
                      const authorName = isUser ? t("authorYou") : t("authorCustomerService");
                      const authorRole = isUser ? t("roleReporter") : t("roleCsAgent");
                      return (
                        <article
                          key={msg.id}
                          className="rounded-lg border border-border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                                isUser
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {authorName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {authorName}
                              </p>
                              <p className="text-[11px] text-muted-foreground max-md:text-xs">{authorRole}</p>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {msg.time}
                            </span>
                          </div>

                          <div className="space-y-2 text-sm text-foreground/90">
                            {msg.isInitialReport && (
                              <>
                                <p className="text-base font-bold leading-snug text-foreground">
                                  {activeTicket.title}
                                </p>
                                {msg.category && (
                                  <p className="text-xs text-muted-foreground">
                                    {t("issueCategory", { category: msg.category })}
                                  </p>
                                )}
                              </>
                            )}

                            {msg.text && <RichMessageContent value={msg.text} />}

                            {msg.attachments &&
                              msg.attachments.length > 0 &&
                              renderMessageAttachments(msg.attachments)}
                          </div>
                        </article>
                      );
                    })}
                    <div ref={chatEndRef} />
                    </div>
                  </div>

                  {activeTicket.rawStatus === "resolved" ? (
                    <div className="flex items-center justify-center gap-2 border-t border-border bg-card px-4 py-4 text-sm text-muted-foreground shrink-0">
                      <Lock className="h-4 w-4" />
                      {t("ticketResolvedNotice")}
                    </div>
                  ) : (
                    <TicketReplyComposer key={activeTicket.id} onSend={handleSendReply} />
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                  <MessageSquare className="w-12 h-12 stroke-[1.5] mb-2 opacity-30" />
                  <p className="text-sm">{t("selectTicketHint")}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isMounted && mediaViewer && (
        <MediaFullscreenOverlay media={mediaViewer} onClose={() => setMediaViewer(null)} />
      )}
    </main>
  );
}
