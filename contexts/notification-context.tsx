"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { ACCESS_TOKEN_KEY, NEXT_PUBLIC_ENABLE_SOCKET } from "@/constants";
import { showToast } from "@/helper/show-toast";
import { errorString } from "@/helper/error-handler";
import { toIntlLocale } from "@/helper/locale";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { createSocket, RealtimeEnvelope } from "@/lib/socket";
import type {
  ChatBlastAttachment,
  CommonNotification,
  NotificationUnreadCount,
} from "@/models/api/notification.type";
import type {
  WebsiteTicket,
  WebsiteTicketMessage,
} from "@/models/api/ticket.type";
import notificationService, {
  NOTIFICATIONS_QUERY_KEY,
  NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
} from "@/services/notification.api";
import { useAuthProfileGetProfile } from "@/services/auth.api";
import ticketService, {
  TICKET_CATEGORIES_QUERY_KEY,
  WEBSITE_TICKETS_QUERY_KEY,
} from "@/services/ticket.api";

export type NotificationAttachment = {
  type: "photo" | "file" | "video";
  name: string;
  url?: string;
};

export interface NotificationItem {
  id: string;
  remoteId?: number;
  chatBlastMessageHistoryId?: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  attachments?: NotificationAttachment[];
  channelType?: string | null;
}

export interface ChatMessage {
  id: number;
  externalId?: number;
  sender: "user" | "cs";
  text: string;
  time: string;
  createdAt?: string;
  isInitialReport?: boolean;
  category?: string;
  attachments?: NotificationAttachment[];
}

export interface TicketItem {
  id: string;
  remoteId?: number;
  title: string;
  /** Internal status key (kept for existing consumers); translate it for display. */
  status: "Terkirim" | "Sedang Direview" | "In Progress" | "Done";
  /** Raw backend SLA status (e.g. "pending", "in_progress", "resolved"). */
  rawStatus?: string | null;
  date: string;
  updatedAt?: string;
  lastActivityAt?: string;
  lastActivityTime: string;
  unreadMessages: number;
  messages: ChatMessage[];
}

interface NotificationContextProps {
  notifications: NotificationItem[];
  tickets: TicketItem[];
  unreadCount: number;
  blastUnreadCount: number;
  ticketUnreadCount: number;
  isNotificationLoading: boolean;
  isTicketLoading: boolean;
  notificationError: string | null;
  ticketError: string | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addTicket: (
    title: string,
    category: string,
    details: string,
    attachments?: string[]
  ) => string;
  refreshNotifications: () => Promise<void>;
  refreshTickets: () => Promise<void>;
  setTicketListEnabled: (enabled: boolean) => void;
  sendChatMessage: (
    ticketId: string,
    text: string,
    attachments?: NotificationAttachment[]
  ) => void;
  loadTicketMessages: (ticketId: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined
);

const TICKET_FALLBACK_REFRESH_INTERVAL_MS = 10_000;
const NOTIFICATION_FALLBACK_REFRESH_INTERVAL_MS = 30_000;
// Saat socket aktif tetap ada polling lambat sebagai jaring pengaman: event
// yang terlewat saat socket reconnect/token refresh tidak di-replay server.
const SOCKET_SAFETY_REFRESH_INTERVAL_MS = 60_000;
const REALTIME_TICKET_REFRESH_COOLDOWN_MS = 3_000;
const TICKET_CATEGORY_CACHE_MS = 5 * 60_000;

type NotificationUnreadSummary = {
  total: number;
  blast: number;
  ticketReplies: number;
};

const EMPTY_NOTIFICATION_UNREAD_SUMMARY: NotificationUnreadSummary = {
  total: 0,
  blast: 0,
  ticketReplies: 0,
};

const REALTIME_CONTROL_EVENT_TYPES = new Set([
  "connected",
  "connection",
  "heartbeat",
  "ping",
  "pong",
  "subscribe",
  "subscribed",
  "subscription",
  "subscription.created",
  "unsubscribe",
  "unsubscribed",
]);

const TICKET_REFRESH_EVENT_TYPES = new Set([
  "chat.website.message.created",
  "ticket.created",
  "ticket.message.created",
  "ticket.status_changed",
  "ticket.updated",
]);

function getBrowserAccessToken() {
  if (typeof window === "undefined") return null;

  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ACCESS_TOKEN_KEY}=`))
    ?.split("=")[1];

  return cookieToken
    ? decodeURIComponent(cookieToken)
    : localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Locale-aware formatting + fallback labels used by the mappers below. */
interface NotificationFormatter {
  intlLocale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}

function formatDate(value: string | null | undefined, fmt: NotificationFormatter) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(fmt.intlLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined, fmt: NotificationFormatter) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${formatDate(value, fmt)} ${date
    .toLocaleTimeString(fmt.intlLocale, {
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(".", ":")}`;
}

function timestampOf(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function statusToLabel(status?: string | null): TicketItem["status"] {
  switch (status) {
    case "resolved":
      return "Done";
    case "in_progress":
      return "In Progress";
    case "pending":
      return "Sedang Direview";
    default:
      return "Terkirim";
  }
}

function attachmentName(url: string, fallback: string) {
  try {
    const name = new URL(url).pathname.split("/").filter(Boolean).pop();
    return name || fallback;
  } catch {
    return fallback;
  }
}

function attachmentType(
  url: string,
  rawType?: string | null,
  mimeType?: string | null
): "photo" | "file" | "video" {
  const normalizedRawType = rawType?.toLowerCase() ?? "";
  const normalizedMimeType = mimeType?.toLowerCase() ?? "";

  if (
    normalizedRawType.includes("image") ||
    normalizedRawType.includes("photo") ||
    normalizedMimeType.startsWith("image/")
  ) {
    return "photo";
  }

  if (
    normalizedRawType.includes("video") ||
    normalizedMimeType.startsWith("video/")
  ) {
    return "video";
  }

  const normalized = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|bmp|avif)(?:\?|$)/.test(normalized)) {
    return "photo";
  }
  if (/\.(mp4|webm|mov|m4v|ogg)(?:\?|$)/.test(normalized)) {
    return "video";
  }
  return "file";
}

type ApiAttachment = string | ChatBlastAttachment;

function mapAttachments(
  attachments: ApiAttachment[] | null | undefined,
  fmt: NotificationFormatter
) {
  return (attachments ?? []).reduce<NotificationAttachment[]>(
    (mappedAttachments, attachment, index) => {
      if (!attachment) return mappedAttachments;

      if (typeof attachment === "string") {
        mappedAttachments.push({
          type: attachmentType(attachment),
          name: attachmentName(attachment, fmt.t("attachmentFallback", { index: index + 1 })),
          url: attachment,
        });
        return mappedAttachments;
      }

      const url = attachment.url ?? "";
      if (!url) return mappedAttachments;

      mappedAttachments.push({
        type: attachmentType(
          url,
          attachment.attachmentType,
          attachment.mimeType
        ),
        name:
          attachment.filename ||
          attachmentName(url, fmt.t("attachmentFallback", { index: index + 1 })),
        url,
      });

      return mappedAttachments;
    },
    []
  );
}

function toSafeCount(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function mapNotificationUnreadSummary(
  unreadCount?: NotificationUnreadCount | null
): NotificationUnreadSummary {
  const total = toSafeCount(unreadCount?.totalUnread);
  const blast = toSafeCount(unreadCount?.blastMessages);
  const ticketReplies = toSafeCount(unreadCount?.ticketRepliesForCustomer);
  const breakdownTotal = blast + ticketReplies;

  return {
    total: Math.max(total, breakdownTotal),
    blast,
    ticketReplies,
  };
}

function getPublicAttachmentUrls(
  attachments?: NotificationAttachment[]
) {
  return (attachments ?? [])
    .map((attachment) => attachment.url)
    .filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url)));
}

function plainTextFromRichText(value?: string | null) {
  return (value ?? "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function mapCommonNotification(
  notification: CommonNotification,
  fmt: NotificationFormatter
): NotificationItem {
  const blast = notification.chatBlast;
  const content = blast?.body ?? "";
  const preview = plainTextFromRichText(content);
  const createdAt =
    notification.createdAt ?? blast?.createdAt ?? blast?.scheduledFor ?? undefined;
  const updatedAt = notification.updatedAt ?? blast?.updatedAt ?? createdAt;

  return {
    id: String(notification.id),
    remoteId: notification.id,
    chatBlastMessageHistoryId:
      notification.chatBlastMessageHistoryId ?? blast?.id ?? undefined,
    title: blast?.subject || fmt.t("notificationFallbackTitle", { id: notification.id }),
    message: preview || fmt.t("notificationFallbackMessage"),
    time: formatDateTime(createdAt, fmt),
    unread: !notification.readAt,
    content,
    createdAt,
    updatedAt,
    attachments: mapAttachments(blast?.attachments, fmt),
    channelType: blast?.channelType,
  };
}

function mapWebsiteMessage(message: WebsiteTicketMessage, fmt: NotificationFormatter): ChatMessage {
  const fromUser = message.senderType !== "customer_service";

  return {
    id: message.id,
    externalId: message.id,
    sender: fromUser ? "user" : "cs",
    text: message.body ?? "",
    time: formatDateTime(message.createdAt, fmt),
    createdAt: message.createdAt ?? undefined,
    attachments: mapAttachments(message.attachments, fmt),
  };
}

function mapWebsiteTicket(
  ticket: WebsiteTicket,
  mappedMessages: ChatMessage[] = [],
  categoryNameById: Map<number, string>,
  fmt: NotificationFormatter
): TicketItem {
  const categoryName =
    ticket.appTicketCategoryId != null
      ? categoryNameById.get(ticket.appTicketCategoryId)
      : undefined;
  const initialMessage: ChatMessage = {
    id: -Number(ticket.id),
    sender: "user",
    text: ticket.body ?? "",
    time: formatDateTime(ticket.createdAt, fmt),
    createdAt: ticket.createdAt,
    isInitialReport: true,
    category:
      categoryName ??
      (ticket.appTicketCategoryId != null
        ? fmt.t("categoryFallback", { id: ticket.appTicketCategoryId })
        : undefined),
    attachments: mapAttachments(ticket.attachments, fmt),
  };

  const allMessages = [initialMessage, ...mappedMessages].sort(
    (a, b) =>
      timestampOf(a.createdAt) -
      timestampOf(b.createdAt)
  );
  const lastMessage = allMessages[allMessages.length - 1];
  const lastActivityAt =
    lastMessage?.createdAt ?? ticket.updatedAt ?? ticket.createdAt;

  return {
    id: `TCK-${ticket.id}`,
    remoteId: Number(ticket.id),
    title: ticket.subject || fmt.t("ticketFallbackTitle", { id: ticket.id }),
    status: statusToLabel(ticket.slaStatus),
    rawStatus: ticket.slaStatus ?? null,
    date: formatDate(ticket.createdAt, fmt),
    updatedAt: ticket.updatedAt ?? ticket.createdAt,
    lastActivityAt,
    lastActivityTime: formatDateTime(lastActivityAt, fmt),
    unreadMessages: toSafeCount(ticket.unreadMessages),
    messages: allMessages,
  };
}

function sortTicketsByLatestActivity(tickets: TicketItem[]) {
  return [...tickets].sort(
    (a, b) => {
      const activityDiff =
        timestampOf(b.lastActivityAt ?? b.updatedAt) -
        timestampOf(a.lastActivityAt ?? a.updatedAt);

      if (activityDiff !== 0) return activityDiff;
      return (b.remoteId ?? 0) - (a.remoteId ?? 0);
    }
  );
}

async function getTicketCategoryNameById(queryClient: QueryClient) {
  const categoriesResponse = await queryClient.fetchQuery({
    queryKey: TICKET_CATEGORIES_QUERY_KEY,
    queryFn: () => ticketService.getCategories(),
    staleTime: TICKET_CATEGORY_CACHE_MS,
  });
  const categories = categoriesResponse.data.data ?? [];

  return new Map(categories.map((category) => [category.id, category.name]));
}

async function getWebsiteTicketRooms(queryClient: QueryClient, fmt: NotificationFormatter) {
  const [response, categoryNameById] = await Promise.all([
    ticketService.getWebsiteTickets(),
    getTicketCategoryNameById(queryClient).catch(() => new Map<number, string>()),
  ]);
  const tickets = response.data.data ?? [];
  const existingData = queryClient.getQueryData<TicketItem[]>(WEBSITE_TICKETS_QUERY_KEY) ?? [];
  const existingMessagesMap = new Map(existingData.map(t => [t.remoteId, t.messages.slice(1)]));

  return sortTicketsByLatestActivity(
    tickets.map((ticket) =>
      mapWebsiteTicket(
        ticket,
        (existingMessagesMap.get(ticket.id) as ChatMessage[]) ?? [],
        categoryNameById,
        fmt
      )
    )
  );
}

async function getCommonNotifications(fmt: NotificationFormatter) {
  const response = await notificationService.getNotifications();
  const notifications = response.data.data ?? [];

  return notifications
    .map((notification) => mapCommonNotification(notification, fmt))
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? "").getTime() -
        new Date(a.createdAt ?? "").getTime()
    );
}

async function getCommonNotificationUnreadCount() {
  const response = await notificationService.getUnreadCount();
  return mapNotificationUnreadSummary(response.data.data);
}

function shouldRefreshForTicketEvent(message: RealtimeEnvelope) {
  const type = message.type.toLowerCase();
  const topic = message.topic?.toLowerCase() ?? "";

  if (REALTIME_CONTROL_EVENT_TYPES.has(type)) return false;
  if (type.startsWith("subscription.")) return false;

  return (
    TICKET_REFRESH_EVENT_TYPES.has(type) ||
    type.startsWith("chat.website.") ||
    type.startsWith("ticket.") ||
    type.includes("ticket") ||
    (topic.startsWith("ticket.") &&
      /created|updated|changed|message|reply|resolved|closed/.test(type))
  );
}

function shouldRefreshForNotificationEvent(message: RealtimeEnvelope) {
  const type = message.type.toLowerCase();
  const topic = message.topic?.toLowerCase() ?? "";

  if (REALTIME_CONTROL_EVENT_TYPES.has(type)) return false;
  if (type.startsWith("subscription.")) return false;

  return (
    type.includes("notification") ||
    type.includes("blast") ||
    topic.includes("notification") ||
    topic.includes("blast")
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const tNotification = useTranslations("notificationContext");
  // Read by query functions / callbacks so mapped dates and fallback labels follow the active locale.
  const formatterRef = useRef<NotificationFormatter>({
    intlLocale: toIntlLocale(locale),
    t: tNotification,
  });
  formatterRef.current = { intlLocale: toIntlLocale(locale), t: tNotification };
  const pathname = usePathname();
  const isNotificationsPage = pathname?.endsWith("/notifications") ?? false;
  const profileQuery = useAuthProfileGetProfile();
  const profileId = profileQuery.data?.data?.data?.id;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationUnreadCounts, setNotificationUnreadCounts] =
    useState<NotificationUnreadSummary>(EMPTY_NOTIFICATION_UNREAD_SUMMARY);
  const [isTicketListEnabled, setTicketListEnabled] = useState(false);
  const shouldLoadWebsiteTickets = isNotificationsPage && isTicketListEnabled;
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const ticketsRef = useRef<TicketItem[]>(tickets);
  const lastRealtimeTicketRefreshAtRef = useRef(0);
  const realtimeTicketRefreshTimeoutRef = useRef<number | null>(null);

  const notificationsQuery = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => getCommonNotifications(formatterRef.current),
    refetchInterval: NEXT_PUBLIC_ENABLE_SOCKET
      ? SOCKET_SAFETY_REFRESH_INTERVAL_MS
      : NOTIFICATION_FALLBACK_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const notificationUnreadCountQuery = useQuery({
    queryKey: NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
    queryFn: getCommonNotificationUnreadCount,
    refetchInterval: NEXT_PUBLIC_ENABLE_SOCKET
      ? SOCKET_SAFETY_REFRESH_INTERVAL_MS
      : NOTIFICATION_FALLBACK_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const websiteTicketsQuery = useQuery({
    queryKey: WEBSITE_TICKETS_QUERY_KEY,
    queryFn: () => getWebsiteTicketRooms(queryClient, formatterRef.current),
    enabled: shouldLoadWebsiteTickets,
    refetchInterval: NEXT_PUBLIC_ENABLE_SOCKET
      ? SOCKET_SAFETY_REFRESH_INTERVAL_MS
      : TICKET_FALLBACK_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  // Cached items hold pre-formatted dates/labels; refetch them when the locale changes.
  const previousLocaleRef = useRef(locale);
  useEffect(() => {
    if (previousLocaleRef.current === locale) return;
    previousLocaleRef.current = locale;
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: WEBSITE_TICKETS_QUERY_KEY });
  }, [locale, queryClient]);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    if (isNotificationsPage) return;
    setTicketListEnabled(false);
  }, [isNotificationsPage]);

  useEffect(() => {
    if (shouldLoadWebsiteTickets) return;
    setTickets([]);
  }, [shouldLoadWebsiteTickets]);

  useEffect(() => {
    if (!notificationsQuery.data) return;
    setNotifications(notificationsQuery.data);
    if (!notificationUnreadCountQuery.data) {
      const blast = notificationsQuery.data.filter(
        (notification) => notification.unread
      ).length;

      setNotificationUnreadCounts((prev) => ({
        ...prev,
        blast,
        total: blast + prev.ticketReplies,
      }));
    }
  }, [notificationUnreadCountQuery.data, notificationsQuery.data]);

  useEffect(() => {
    if (!notificationUnreadCountQuery.data) return;
    setNotificationUnreadCounts(notificationUnreadCountQuery.data);
  }, [notificationUnreadCountQuery.data]);

  useEffect(() => {
    if (!shouldLoadWebsiteTickets) return;
    if (!websiteTicketsQuery.data) return;
    setTickets(sortTicketsByLatestActivity(websiteTicketsQuery.data));
  }, [shouldLoadWebsiteTickets, websiteTicketsQuery.data]);

  const refreshNotifications = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      }),
      queryClient.invalidateQueries({
        queryKey: NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
      }),
    ]);
  }, [queryClient]);

  const refreshNotificationUnreadCount = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
    });
  }, [queryClient]);

  const refreshTickets = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: WEBSITE_TICKETS_QUERY_KEY,
      refetchType: shouldLoadWebsiteTickets ? "active" : "none",
    });
  }, [queryClient, shouldLoadWebsiteTickets]);

  const scheduleRealtimeTicketRefresh = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!shouldLoadWebsiteTickets) return;
    if (realtimeTicketRefreshTimeoutRef.current !== null) return;

    const elapsed = Date.now() - lastRealtimeTicketRefreshAtRef.current;
    const delay = Math.max(
      REALTIME_TICKET_REFRESH_COOLDOWN_MS - elapsed,
      0
    );

    realtimeTicketRefreshTimeoutRef.current = window.setTimeout(() => {
      realtimeTicketRefreshTimeoutRef.current = null;
      lastRealtimeTicketRefreshAtRef.current = Date.now();
      void refreshTickets();
    }, delay);
  }, [refreshTickets, shouldLoadWebsiteTickets]);
  const loadTicketMessages = useCallback(async (ticketId: number) => {
    try {
      const response = await ticketService.getWebsiteTicketDetail(ticketId);
      const detail = response.data.data;
      if (!detail) return;

      queryClient.setQueryData<TicketItem[]>(WEBSITE_TICKETS_QUERY_KEY, (old) => {
        if (!old) return old;
        return old.map(t => {
          if (t.remoteId === ticketId) {
            const initialMessage = t.messages[0];
            const mappedMessages = (detail.messages ?? []).map((message) =>
              mapWebsiteMessage(message, formatterRef.current)
            );
            const allMessages = [initialMessage, ...mappedMessages].sort(
              (a, b) => timestampOf(a.createdAt) - timestampOf(b.createdAt)
            );
            const lastMessage = allMessages[allMessages.length - 1];
            const lastActivityAt = lastMessage?.createdAt ?? detail.ticket.updatedAt ?? detail.ticket.createdAt;
            
            return {
              ...t,
              updatedAt: detail.ticket.updatedAt ?? detail.ticket.createdAt,
              lastActivityAt,
              lastActivityTime: formatDateTime(lastActivityAt, formatterRef.current),
              unreadMessages: toSafeCount(detail.ticket.unreadMessages),
              messages: allMessages,
            };
          }
          return t;
        });
      });
    } catch {}
  }, [queryClient]);

  const ticketTopicKey = useMemo(
    () =>
      tickets
        .map((ticket) => ticket.remoteId)
        .filter((id): id is number => typeof id === "number")
        .sort((a, b) => a - b)
        .join("|"),
    [tickets]
  );

  useEffect(() => {
    if (!NEXT_PUBLIC_ENABLE_SOCKET) return;

    const token = getBrowserAccessToken();
    if (!token) return;

    const ticketTopics = shouldLoadWebsiteTickets && ticketTopicKey
      ? ticketTopicKey.split("|").map((id) => `ticket.${id}`)
      : [];
    const profileTopics = profileId
      ? [
          `notification.profile.${profileId}`,
          `ticket.profile.${profileId}`,
        ]
      : [];
    const topics = [...profileTopics, ...ticketTopics];

    if (topics.length === 0) return;

    const socket = createSocket({
      token,
      tokenQueryKey: "postmaticAccessToken",
    });

    const handleMessage = (message: RealtimeEnvelope) => {
      if (shouldRefreshForNotificationEvent(message)) {
        refreshNotifications();
      }

      if (shouldRefreshForTicketEvent(message)) {
        void refreshNotificationUnreadCount();

        if (shouldLoadWebsiteTickets) {
          scheduleRealtimeTicketRefresh();
        }
      }
    };

    socket.on("message", handleMessage);
    socket.subscribe(topics);

    return () => {
      socket.off("message", handleMessage);
      socket.unsubscribe(topics);
    };
  }, [
    profileId,
    refreshNotificationUnreadCount,
    refreshNotifications,
    scheduleRealtimeTicketRefresh,
    shouldLoadWebsiteTickets,
    ticketTopicKey,
  ]);

  useEffect(() => {
    return () => {
      if (realtimeTicketRefreshTimeoutRef.current !== null) {
        window.clearTimeout(realtimeTicketRefreshTimeoutRef.current);
      }
    };
  }, []);

  const localBlastUnreadCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  const localTicketUnreadCount = useMemo(() => {
    return tickets.reduce(
      (total, ticket) => total + toSafeCount(ticket.unreadMessages),
      0
    );
  }, [tickets]);

  const hasRemoteUnreadCounts = Boolean(notificationUnreadCountQuery.data);
  const blastUnreadCount = hasRemoteUnreadCounts
    ? notificationUnreadCounts.blast
    : localBlastUnreadCount;
  const ticketUnreadCount = hasRemoteUnreadCounts
    ? notificationUnreadCounts.ticketReplies
    : localTicketUnreadCount;
  const unreadCount = hasRemoteUnreadCounts
    ? notificationUnreadCounts.total
    : blastUnreadCount + ticketUnreadCount;

  const markAsRead = useCallback(
    (id: string) => {
      const notificationId = Number(id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
      );
      setNotificationUnreadCounts((prev) => ({
        ...prev,
        blast: Math.max(prev.blast - 1, 0),
        total: Math.max(prev.total - 1, 0),
      }));

      if (!Number.isFinite(notificationId)) return;

      notificationService
        .getNotification(notificationId)
        .then((response) => {
          const notification = response.data.data;
          if (notification) {
            const mappedNotification = mapCommonNotification(
              notification,
              formatterRef.current
            );
            setNotifications((prev) =>
              prev.map((item) =>
                item.id === mappedNotification.id ? mappedNotification : item
              )
            );
          }
          refreshNotifications();
        })
        .catch((error) => {
          showToast("error", error);
          refreshNotifications();
        });
    },
    [refreshNotifications]
  );

  const markAllAsRead = useCallback(() => {
    const unreadNotificationIds = notifications
      .filter((notification) => notification.unread)
      .map((notification) => Number(notification.id))
      .filter((notificationId) => Number.isFinite(notificationId));

    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setNotificationUnreadCounts((prev) => ({
      ...prev,
      blast: Math.max(prev.blast - unreadNotificationIds.length, 0),
      total: Math.max(prev.total - unreadNotificationIds.length, 0),
    }));

    if (!unreadNotificationIds.length) return;

    Promise.allSettled(
      unreadNotificationIds.map((notificationId) =>
        notificationService.getNotification(notificationId)
      )
    )
      .then(() => refreshNotifications())
      .catch((error) => {
        showToast("error", error);
        refreshNotifications();
      });
  }, [notifications, refreshNotifications]);

  const sendChatMessage = useCallback(
    (
      ticketId: string,
      text: string,
      attachments?: NotificationAttachment[]
    ) => {
      const ticket = ticketsRef.current.find((item) => item.id === ticketId);
      const body = text.trim();
      const publicAttachments = getPublicAttachmentUrls(attachments);

      if (!ticket?.remoteId || (!body && publicAttachments.length === 0)) return;

      const now = new Date().toISOString();
      const optimisticMessage: ChatMessage = {
        id: Date.now(),
        sender: "user",
        text: body,
        time: formatDateTime(now, formatterRef.current),
        createdAt: now,
        attachments,
      };

      setTickets((prev) =>
        sortTicketsByLatestActivity(
          prev.map((item) =>
            item.id === ticketId
              ? {
                  ...item,
                  updatedAt: now,
                  lastActivityAt: now,
                  lastActivityTime: formatDateTime(now, formatterRef.current),
                  messages: [...item.messages, optimisticMessage],
                }
              : item
          )
        )
      );

      ticketService
        .replyWebsiteTicket(ticket.remoteId, {
          body,
          attachments: publicAttachments,
        })
        .then(() => refreshTickets())
        .catch((error) => {
          showToast("error", error);
          // Hapus pesan optimistik: data refetch yang identik tidak memicu
          // ulang setTickets, sehingga pesan gagal tampak seolah terkirim.
          setTickets((prev) =>
            prev.map((item) =>
              item.id === ticketId
                ? {
                    ...item,
                    messages: item.messages.filter(
                      (message) => message.id !== optimisticMessage.id
                    ),
                  }
                : item
            )
          );
          refreshTickets();
        });
    },
    [refreshTickets]
  );

  const addTicket = useCallback(
    (title: string, category: string, details: string, attachments?: string[]) => {
      void title;
      void category;
      void details;
      void attachments;

      refreshTickets();
      return "";
    },
    [refreshTickets]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        tickets,
        unreadCount,
        blastUnreadCount,
        ticketUnreadCount,
        isNotificationLoading: notificationsQuery.isLoading,
        isTicketLoading: websiteTicketsQuery.isLoading,
        notificationError: notificationsQuery.error
          ? errorString(notificationsQuery.error)
          : null,
        ticketError: websiteTicketsQuery.error
          ? errorString(websiteTicketsQuery.error)
          : null,
        markAsRead,
        markAllAsRead,
        addTicket,
        refreshNotifications,
        refreshTickets,
        setTicketListEnabled,
        sendChatMessage,
        loadTicketMessages,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
