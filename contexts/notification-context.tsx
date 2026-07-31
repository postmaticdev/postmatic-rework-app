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
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ACCESS_TOKEN_KEY, NEXT_PUBLIC_ENABLE_SOCKET } from "@/constants";
import { showToast } from "@/helper/show-toast";
import { createSocket, RealtimeEnvelope } from "@/lib/socket";
import type { CommonNotification } from "@/models/api/notification.type";
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
  status: "Terkirim" | "Sedang Direview" | "In Progress" | "Done";
  date: string;
  updatedAt?: string;
  messages: ChatMessage[];
}

interface NotificationContextProps {
  notifications: NotificationItem[];
  tickets: TicketItem[];
  unreadCount: number;
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
  sendChatMessage: (
    ticketId: string,
    text: string,
    attachments?: NotificationAttachment[]
  ) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined
);

const TICKET_FALLBACK_REFRESH_INTERVAL_MS = 10_000;
const NOTIFICATION_FALLBACK_REFRESH_INTERVAL_MS = 30_000;

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

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${formatDate(value)} ${date
    .toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(".", ":")}`;
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

function attachmentType(url: string): "photo" | "file" | "video" {
  const normalized = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|bmp|avif)(?:\?|$)/.test(normalized)) {
    return "photo";
  }
  if (/\.(mp4|webm|mov|m4v|ogg)(?:\?|$)/.test(normalized)) {
    return "video";
  }
  return "file";
}

function mapAttachments(urls?: string[] | null) {
  return (urls ?? []).filter(Boolean).map((url, index) => ({
    type: attachmentType(url),
    name: attachmentName(url, `Lampiran ${index + 1}`),
    url,
  }));
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

function mapCommonNotification(notification: CommonNotification): NotificationItem {
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
    title: blast?.subject || `Notifikasi #${notification.id}`,
    message: preview || "Notifikasi baru dari Postmatic.",
    time: formatDateTime(createdAt),
    unread: !notification.readAt,
    content,
    createdAt,
    updatedAt,
    attachments: mapAttachments(blast?.attachments),
    channelType: blast?.channelType,
  };
}

function mapWebsiteMessage(message: WebsiteTicketMessage): ChatMessage {
  const fromUser = message.senderType !== "customer_service";

  return {
    id: message.id,
    externalId: message.id,
    sender: fromUser ? "user" : "cs",
    text: message.body ?? "",
    time: formatDateTime(message.createdAt),
    createdAt: message.createdAt ?? undefined,
    attachments: mapAttachments(message.attachments),
  };
}

function mapWebsiteTicket(
  ticket: WebsiteTicket,
  messages: WebsiteTicketMessage[] = [],
  categoryNameById: Map<number, string> = new Map()
): TicketItem {
  const categoryName =
    ticket.appTicketCategoryId != null
      ? categoryNameById.get(ticket.appTicketCategoryId)
      : undefined;
  const initialMessage: ChatMessage = {
    id: -Number(ticket.id),
    sender: "user",
    text: ticket.body ?? "",
    time: formatDateTime(ticket.createdAt),
    createdAt: ticket.createdAt,
    isInitialReport: true,
    category:
      categoryName ??
      (ticket.appTicketCategoryId != null
        ? `Kategori #${ticket.appTicketCategoryId}`
        : undefined),
    attachments: mapAttachments(ticket.attachments),
  };

  const mappedMessages = messages.map(mapWebsiteMessage);
  const allMessages = [initialMessage, ...mappedMessages].sort(
    (a, b) =>
      new Date(a.createdAt ?? "").getTime() -
      new Date(b.createdAt ?? "").getTime()
  );

  return {
    id: `TCK-${ticket.id}`,
    remoteId: Number(ticket.id),
    title: ticket.subject || `Website Ticket #${ticket.id}`,
    status: statusToLabel(ticket.slaStatus),
    date: formatDate(ticket.createdAt),
    updatedAt: ticket.updatedAt ?? ticket.createdAt,
    messages: allMessages,
  };
}

async function getWebsiteTicketRooms() {
  const [response, categoriesResponse] = await Promise.all([
    ticketService.getWebsiteTickets(),
    ticketService.getCategories().catch(() => null),
  ]);
  const tickets = response.data.data ?? [];
  const categories = categoriesResponse?.data.data ?? [];
  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.name])
  );

  const details = await Promise.all(
    tickets.map(async (ticket) => {
      try {
        const detail = await ticketService.getWebsiteTicketDetail(ticket.id);
        return detail.data.data;
      } catch {
        return null;
      }
    })
  );

  return tickets
    .map((ticket, index) =>
      mapWebsiteTicket(
        ticket,
        details[index]?.messages ?? [],
        categoryNameById
      )
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? "").getTime() -
        new Date(a.updatedAt ?? "").getTime()
    );
}

async function getCommonNotifications() {
  const response = await notificationService.getNotifications();
  const notifications = response.data.data ?? [];

  return notifications
    .map(mapCommonNotification)
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? "").getTime() -
        new Date(a.createdAt ?? "").getTime()
    );
}

async function getCommonNotificationUnreadCount() {
  const response = await notificationService.getUnreadCount();
  return response.data.data?.totalUnread ?? 0;
}

function shouldRefreshForTicketEvent(message: RealtimeEnvelope) {
  const type = message.type.toLowerCase();
  const topic = message.topic?.toLowerCase() ?? "";

  return (
    type === "chat.website.message.created" ||
    type === "ticket.created" ||
    type === "ticket.status_changed" ||
    type.includes("ticket") ||
    topic.startsWith("ticket.")
  );
}

function shouldRefreshForNotificationEvent(message: RealtimeEnvelope) {
  const type = message.type.toLowerCase();
  const topic = message.topic?.toLowerCase() ?? "";

  return (
    type.includes("notification") ||
    type.includes("blast") ||
    topic.includes("notification") ||
    topic.includes("blast")
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const profileQuery = useAuthProfileGetProfile();
  const profileId = profileQuery.data?.data?.data?.id;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const ticketsRef = useRef<TicketItem[]>(tickets);

  const notificationsQuery = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: getCommonNotifications,
    refetchInterval: NEXT_PUBLIC_ENABLE_SOCKET
      ? false
      : NOTIFICATION_FALLBACK_REFRESH_INTERVAL_MS,
  });

  const notificationUnreadCountQuery = useQuery({
    queryKey: NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
    queryFn: getCommonNotificationUnreadCount,
    refetchInterval: NEXT_PUBLIC_ENABLE_SOCKET
      ? false
      : NOTIFICATION_FALLBACK_REFRESH_INTERVAL_MS,
  });

  const websiteTicketsQuery = useQuery({
    queryKey: WEBSITE_TICKETS_QUERY_KEY,
    queryFn: getWebsiteTicketRooms,
    refetchInterval: NEXT_PUBLIC_ENABLE_SOCKET
      ? false
      : TICKET_FALLBACK_REFRESH_INTERVAL_MS,
  });

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    if (!notificationsQuery.data) return;
    setNotifications(notificationsQuery.data);
    if (typeof notificationUnreadCountQuery.data !== "number") {
      setNotificationUnreadCount(
        notificationsQuery.data.filter((notification) => notification.unread)
          .length
      );
    }
  }, [notificationUnreadCountQuery.data, notificationsQuery.data]);

  useEffect(() => {
    if (typeof notificationUnreadCountQuery.data !== "number") return;
    setNotificationUnreadCount(notificationUnreadCountQuery.data);
  }, [notificationUnreadCountQuery.data]);

  useEffect(() => {
    if (!websiteTicketsQuery.data) return;
    setTickets(websiteTicketsQuery.data);
  }, [websiteTicketsQuery.data]);

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

  const refreshTickets = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: WEBSITE_TICKETS_QUERY_KEY,
    });
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

    const ticketTopics = ticketTopicKey
      ? ticketTopicKey.split("|").map((id) => `ticket.${id}`)
      : [];
    const profileTopics = profileId
      ? [`notification.profile.${profileId}`, `ticket.profile.${profileId}`]
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
        refreshTickets();
      }
    };

    socket.on("message", handleMessage);
    socket.subscribe(topics);

    return () => {
      socket.off("message", handleMessage);
      socket.unsubscribe(topics);
    };
  }, [profileId, refreshNotifications, refreshTickets, ticketTopicKey]);

  const localUnreadCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);
  const unreadCount =
    notificationUnreadCountQuery.data == null && notificationUnreadCount === 0
      ? localUnreadCount
      : notificationUnreadCount;

  const markAsRead = useCallback(
    (id: string) => {
      const notificationId = Number(id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
      );
      setNotificationUnreadCount((prev) => Math.max(prev - 1, 0));

      if (!Number.isFinite(notificationId)) return;

      notificationService
        .getNotification(notificationId)
        .then((response) => {
          const notification = response.data.data;
          if (notification) {
            const mappedNotification = mapCommonNotification(notification);
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
    setNotificationUnreadCount(0);

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
        time: formatDateTime(now),
        createdAt: now,
        attachments,
      };

      setTickets((prev) =>
        prev.map((item) =>
          item.id === ticketId
            ? {
                ...item,
                updatedAt: now,
                messages: [...item.messages, optimisticMessage],
              }
            : item
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
        isNotificationLoading: notificationsQuery.isLoading,
        isTicketLoading: websiteTicketsQuery.isLoading,
        notificationError:
          notificationsQuery.error instanceof Error
            ? notificationsQuery.error.message
            : null,
        ticketError:
          websiteTicketsQuery.error instanceof Error
            ? websiteTicketsQuery.error.message
            : null,
        markAsRead,
        markAllAsRead,
        addTicket,
        refreshNotifications,
        refreshTickets,
        sendChatMessage,
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
