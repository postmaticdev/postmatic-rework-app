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
import { haptic } from "@/lib/haptics";
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
  WebsiteTicketDetail,
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
  /** Id aset hasil upload; wajib untuk mengirim lampiran balasan tiket. */
  assetId?: number;
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
  /** True once the ticket list query (enabled on the Ticket tab) has finished its first load. */
  isTicketListSettled: boolean;
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
  ) => Promise<void>;
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

const NOTIFICATION_HAPTIC_SETTLE_MS = 1000;

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

      // URL lampiran dipakai sebagai src/href; tolak skema selain http(s).
      if (typeof attachment === "string") {
        if (!isHttpUrl(attachment)) return mappedAttachments;
        mappedAttachments.push({
          type: attachmentType(attachment),
          name: attachmentName(attachment, fmt.t("attachmentFallback", { index: index + 1 })),
          url: attachment,
        });
        return mappedAttachments;
      }

      const url = attachment.url ?? "";
      if (!url || !isHttpUrl(url)) return mappedAttachments;

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

function isHttpUrl(url: string) {
  return /^https?:\/\//i.test(url.trim());
}

function getUploadedAssetIds(attachments?: NotificationAttachment[]) {
  return (attachments ?? [])
    .map((attachment) => attachment.assetId)
    .filter((id): id is number => typeof id === "number" && id > 0);
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

/** Replaces a ticket's conversation with the messages from its detail endpoint. */
function applyTicketDetail(
  ticket: TicketItem,
  detail: WebsiteTicketDetail,
  fmt: NotificationFormatter
): TicketItem {
  const initialMessage = ticket.messages.find((message) => message.isInitialReport);
  const mappedMessages = (detail.messages ?? []).map((message) =>
    mapWebsiteMessage(message, fmt)
  );
  const allMessages = [
    ...(initialMessage ? [initialMessage] : []),
    ...mappedMessages,
  ].sort((a, b) => timestampOf(a.createdAt) - timestampOf(b.createdAt));
  const lastMessage = allMessages[allMessages.length - 1];
  const lastActivityAt =
    lastMessage?.createdAt ?? detail.ticket.updatedAt ?? detail.ticket.createdAt;

  return {
    ...ticket,
    status: statusToLabel(detail.ticket.slaStatus),
    rawStatus: detail.ticket.slaStatus ?? null,
    updatedAt: detail.ticket.updatedAt ?? detail.ticket.createdAt,
    lastActivityAt,
    lastActivityTime: formatDateTime(lastActivityAt, fmt),
    // Membuka detail me-reset unread di backend (async).
    unreadMessages: 0,
    messages: allMessages,
  };
}

async function getWebsiteTicketRooms(
  queryClient: QueryClient,
  fmt: NotificationFormatter,
  activeTicketId: number | null,
  onActiveTicketRead: (unreadMessages: number) => void
) {
  const [response, categoryNameById, activeDetail] = await Promise.all([
    ticketService.getWebsiteTickets(),
    getTicketCategoryNameById(queryClient).catch(() => new Map<number, string>()),
    // Tiket yang sedang dibuka ikut di-refresh agar balasan baru (polling/realtime) langsung tampil.
    activeTicketId !== null
      ? ticketService
          .getWebsiteTicketDetail(activeTicketId)
          .then((detailResponse) => detailResponse.data.data ?? null)
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  const tickets = response.data.data ?? [];
  const existingData = queryClient.getQueryData<TicketItem[]>(WEBSITE_TICKETS_QUERY_KEY) ?? [];
  const existingMessagesMap = new Map(
    existingData.map((ticket) => [
      ticket.remoteId,
      ticket.messages.filter((message) => !message.isInitialReport),
    ])
  );

  let activeUnreadMessages = 0;
  const mappedTickets = tickets.map((ticket) => {
    const mapped = mapWebsiteTicket(
      ticket,
      existingMessagesMap.get(ticket.id) ?? [],
      categoryNameById,
      fmt
    );
    if (activeDetail && ticket.id === activeTicketId) {
      activeUnreadMessages = mapped.unreadMessages;
      return applyTicketDetail(mapped, activeDetail, fmt);
    }
    return mapped;
  });

  if (activeUnreadMessages > 0) onActiveTicketRead(activeUnreadMessages);
  return sortTicketsByLatestActivity(mappedTickets);
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
  const [notificationUnreadCounts, setNotificationUnreadCounts] =
    useState<NotificationUnreadSummary>(EMPTY_NOTIFICATION_UNREAD_SUMMARY);
  const [isTicketListEnabled, setTicketListEnabled] = useState(false);
  const shouldLoadWebsiteTickets = isNotificationsPage && isTicketListEnabled;
  // Tiket yang sedang dibuka di halaman; detailnya ikut di-refresh bersama list.
  const activeTicketIdRef = useRef<number | null>(null);
  // Notifikasi yang sedang ditandai dibaca, agar tidak terkirim dua kali.
  const markingNotificationIdsRef = useRef(new Set<string>());
  const lastRealtimeTicketRefreshAtRef = useRef(0);
  const realtimeTicketRefreshTimeoutRef = useRef<number | null>(null);

  const decrementTicketUnreadCount = useCallback((count: number) => {
    setNotificationUnreadCounts((prev) => ({
      ...prev,
      ticketReplies: Math.max(prev.ticketReplies - count, 0),
      total: Math.max(prev.total - count, 0),
    }));
  }, []);

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
    queryFn: () =>
      getWebsiteTicketRooms(
        queryClient,
        formatterRef.current,
        activeTicketIdRef.current,
        decrementTicketUnreadCount
      ),
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

  // List dibaca langsung dari cache query (bukan salinan state) supaya tidak ada
  // render di mana query sudah selesai tetapi list masih kosong.
  const notifications = useMemo<NotificationItem[]>(
    () => notificationsQuery.data ?? [],
    [notificationsQuery.data]
  );
  const tickets = useMemo<TicketItem[]>(
    () => (shouldLoadWebsiteTickets ? websiteTicketsQuery.data ?? [] : []),
    [shouldLoadWebsiteTickets, websiteTicketsQuery.data]
  );

  useEffect(() => {
    if (isNotificationsPage) return;
    setTicketListEnabled(false);
  }, [isNotificationsPage]);

  useEffect(() => {
    if (shouldLoadWebsiteTickets) return;
    activeTicketIdRef.current = null;
  }, [shouldLoadWebsiteTickets]);

  useEffect(() => {
    if (!notificationUnreadCountQuery.data) return;
    setNotificationUnreadCounts(notificationUnreadCountQuery.data);
  }, [notificationUnreadCountQuery.data]);

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
    activeTicketIdRef.current = ticketId;
    try {
      const response = await ticketService.getWebsiteTicketDetail(ticketId);
      const detail = response.data.data;
      if (!detail || activeTicketIdRef.current !== ticketId) return;

      let readUnreadMessages = 0;
      queryClient.setQueryData<TicketItem[]>(WEBSITE_TICKETS_QUERY_KEY, (old) => {
        if (!old) return old;
        return sortTicketsByLatestActivity(
          old.map((ticket) => {
            if (ticket.remoteId !== ticketId) return ticket;
            readUnreadMessages = ticket.unreadMessages;
            return applyTicketDetail(ticket, detail, formatterRef.current);
          })
        );
      });
      if (readUnreadMessages > 0) decrementTicketUnreadCount(readUnreadMessages);
    } catch (error) {
      showToast("error", error);
    }
  }, [decrementTicketUnreadCount, queryClient]);

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

  // Getaran halus saat ada notifikasi atau balasan baru (jumlah belum dibaca naik).
  // Baru aktif setelah kedua query awal selesai, agar pemuatan pertama (0 -> N) tidak ikut bergetar.
  const isUnreadCountLoaded = notificationsQuery.isFetched && notificationUnreadCountQuery.isFetched;
  const previousUnreadCountRef = useRef(unreadCount);
  const notificationHapticArmedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isUnreadCountLoaded || notificationHapticArmedAtRef.current !== null) return;
    notificationHapticArmedAtRef.current = Date.now() + NOTIFICATION_HAPTIC_SETTLE_MS;
  }, [isUnreadCountLoaded]);
  useEffect(() => {
    const previous = previousUnreadCountRef.current;
    previousUnreadCountRef.current = unreadCount;
    const armedAt = notificationHapticArmedAtRef.current;
    if (
      unreadCount > previous &&
      armedAt !== null &&
      Date.now() >= armedAt &&
      document.visibilityState === "visible"
    ) {
      haptic("notification");
    }
  }, [unreadCount]);

  const setNotificationsReadInCache = useCallback(
    (ids: Set<string>) => {
      queryClient.setQueryData<NotificationItem[]>(NOTIFICATIONS_QUERY_KEY, (old) =>
        old?.map((item) => (ids.has(item.id) ? { ...item, unread: false } : item))
      );
    },
    [queryClient]
  );

  // Backend menandai dibaca lewat GET detail secara async (goroutine), jadi list
  // TIDAK langsung di-refetch: hasilnya bisa masih "unread" dan menimpa update
  // optimistik. Polling berikutnya yang menyelaraskan data.
  const markAsRead = useCallback(
    (id: string) => {
      const notificationId = Number(id);
      const marking = markingNotificationIdsRef.current;
      if (marking.has(id)) return;
      const target = queryClient
        .getQueryData<NotificationItem[]>(NOTIFICATIONS_QUERY_KEY)
        ?.find((item) => item.id === id);
      if (!target?.unread) return;

      setNotificationsReadInCache(new Set([id]));
      setNotificationUnreadCounts((prev) => ({
        ...prev,
        blast: Math.max(prev.blast - 1, 0),
        total: Math.max(prev.total - 1, 0),
      }));

      if (!Number.isFinite(notificationId)) return;

      marking.add(id);
      notificationService
        .getNotification(notificationId)
        .catch((error) => {
          showToast("error", error);
          void refreshNotifications();
        })
        .finally(() => {
          marking.delete(id);
        });
    },
    [queryClient, refreshNotifications, setNotificationsReadInCache]
  );

  const markAllAsRead = useCallback(() => {
    const marking = markingNotificationIdsRef.current;
    const unreadIds = notifications
      .filter((notification) => notification.unread && !marking.has(notification.id))
      .map((notification) => notification.id);
    if (!unreadIds.length) return;

    setNotificationsReadInCache(new Set(unreadIds));
    setNotificationUnreadCounts((prev) => ({
      ...prev,
      blast: Math.max(prev.blast - unreadIds.length, 0),
      total: Math.max(prev.total - unreadIds.length, 0),
    }));

    // Belum ada endpoint "read all" di backend: tandai satu per satu.
    unreadIds.forEach((id) => marking.add(id));
    Promise.allSettled(
      unreadIds.map((id) => notificationService.getNotification(Number(id)))
    ).then((results) => {
      unreadIds.forEach((id) => marking.delete(id));
      const failed = results.find(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );
      if (failed) {
        showToast("error", failed.reason);
        void refreshNotifications();
      }
    });
  }, [notifications, refreshNotifications, setNotificationsReadInCache]);

  const updateTicketInCache = useCallback(
    (ticketId: string, update: (ticket: TicketItem) => TicketItem) => {
      queryClient.setQueryData<TicketItem[]>(WEBSITE_TICKETS_QUERY_KEY, (old) =>
        old
          ? sortTicketsByLatestActivity(
              old.map((item) => (item.id === ticketId ? update(item) : item))
            )
          : old
      );
    },
    [queryClient]
  );

  const sendChatMessage = useCallback(
    async (
      ticketId: string,
      text: string,
      attachments?: NotificationAttachment[]
    ) => {
      const ticket = queryClient
        .getQueryData<TicketItem[]>(WEBSITE_TICKETS_QUERY_KEY)
        ?.find((item) => item.id === ticketId);
      const body = text.trim();
      const uploadedAssetIds = getUploadedAssetIds(attachments);

      // Backend mewajibkan body (validate:"required") dan menolak tiket resolved.
      if (!ticket?.remoteId || !body || ticket.rawStatus === "resolved") return;

      const now = new Date().toISOString();
      const optimisticMessage: ChatMessage = {
        id: Date.now(),
        sender: "user",
        text: body,
        time: formatDateTime(now, formatterRef.current),
        createdAt: now,
        attachments,
      };

      // Batalkan refetch yang sedang berjalan agar tidak menimpa pesan optimistik.
      await queryClient.cancelQueries({ queryKey: WEBSITE_TICKETS_QUERY_KEY });
      updateTicketInCache(ticketId, (item) => ({
        ...item,
        updatedAt: now,
        lastActivityAt: now,
        lastActivityTime: formatDateTime(now, formatterRef.current),
        messages: [...item.messages, optimisticMessage],
      }));

      try {
        await ticketService.replyWebsiteTicket(ticket.remoteId, {
          body,
          ...(uploadedAssetIds.length > 0 ? { uploadedAssetIds } : {}),
        });
      } catch (error) {
        showToast("error", error);
        updateTicketInCache(ticketId, (item) => ({
          ...item,
          messages: item.messages.filter(
            (message) => message.id !== optimisticMessage.id
          ),
        }));
      }
      // Refetch list juga memuat ulang detail tiket aktif (pesan dari server).
      void refreshTickets();
    },
    [queryClient, refreshTickets, updateTicketInCache]
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
        isTicketListSettled:
          shouldLoadWebsiteTickets && !websiteTicketsQuery.isPending,
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
