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
import type {
  WebsiteTicket,
  WebsiteTicketMessage,
} from "@/models/api/ticket.type";
import ticketService, {
  WEBSITE_TICKETS_QUERY_KEY,
} from "@/services/ticket.api";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  content: string;
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
  attachments?: {
    type: "photo" | "file" | "video";
    name: string;
    url?: string;
  }[];
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
  isTicketLoading: boolean;
  ticketError: string | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addTicket: (
    title: string,
    category: string,
    details: string,
    attachments?: string[]
  ) => string;
  refreshTickets: () => Promise<void>;
  sendChatMessage: (
    ticketId: string,
    text: string,
    attachments?: { type: "photo" | "file" | "video"; name: string; url?: string }[]
  ) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined
);

const TICKET_FALLBACK_REFRESH_INTERVAL_MS = 10_000;

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
  attachments?: { type: "photo" | "file" | "video"; name: string; url?: string }[]
) {
  return (attachments ?? [])
    .map((attachment) => attachment.url)
    .filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url)));
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
  messages: WebsiteTicketMessage[] = []
): TicketItem {
  const initialMessage: ChatMessage = {
    id: -Number(ticket.id),
    sender: "user",
    text: ticket.body ?? "",
    time: formatDateTime(ticket.createdAt),
    createdAt: ticket.createdAt,
    isInitialReport: true,
    category:
      ticket.appTicketCategoryId != null
        ? `Kategori #${ticket.appTicketCategoryId}`
        : undefined,
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
  const response = await ticketService.getWebsiteTickets();
  const tickets = response.data.data ?? [];

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
      mapWebsiteTicket(ticket, details[index]?.messages ?? [])
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? "").getTime() -
        new Date(a.updatedAt ?? "").getTime()
    );
}

function shouldRefreshForTicketEvent(message: RealtimeEnvelope) {
  return (
    message.type === "chat.website.message.created" ||
    message.type === "ticket.created" ||
    message.type === "ticket.status_changed"
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "Fitur Baru: Scheduler Instagram Story",
      message:
        "Sekarang Anda dapat menjadwalkan postingan Instagram Story secara langsung melalui dashboard Postmatic. Cobalah sekarang!",
      time: "2 jam yang lalu",
      unread: true,
      content:
        "Kini Anda tidak perlu lagi memposting secara manual. Dengan integrasi terbaru Postmatic Scheduler, Anda dapat mengunggah gambar atau video pendek, menambahkan stiker tautan, dan menjadwalkan penayangan Instagram Story secara otomatis langsung dari workspace ini. Cobalah fitur ini sekarang di tab Content Scheduler!",
    },
    {
      id: "notif-2",
      title: "Pembayaran Invoice Berhasil",
      message:
        "Invoice #INV-2026-0701 untuk perpanjangan langganan bulanan Anda telah berhasil diproses.",
      time: "1 hari yang lalu",
      unread: false,
      content:
        "Sistem billing kami telah menerima pembayaran Anda untuk invoice #INV-2026-0701 tertanggal 13 Juli 2026 sebesar Rp 150.000 (Paket Pro Bulanan). Akses fitur penuh Anda diperpanjang hingga 13 Agustus 2026. Terima kasih atas kepercayaan Anda menggunakan layanan Postmatic!",
    },
    {
      id: "notif-3",
      title: "Kredit AI Hampir Habis",
      message:
        "Kredit AI Anda tersisa kurang dari 50 tokens. Segera lakukan top-up agar postingan terjadwal tetap berjalan lancar.",
      time: "3 hari yang lalu",
      unread: true,
      content:
        "Pemberitahuan Sistem: Kredit AI Anda saat ini tersisa 42 tokens. Jika kredit habis, penjadwalan otomatis atau pembuatan konten AI baru mungkin akan tertunda. Silakan lakukan pengisian ulang melalui tab Settings > Billing atau klik tombol '+' di bagian kredit header untuk melakukan top-up instan.",
    },
  ]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const ticketsRef = useRef<TicketItem[]>(tickets);

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
    if (!websiteTicketsQuery.data) return;
    setTickets(websiteTicketsQuery.data);
  }, [websiteTicketsQuery.data]);

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

    const socket = createSocket({
      token,
      tokenQueryKey: "postmaticAccessToken",
    });
    const ticketTopics = ticketTopicKey
      ? ticketTopicKey.split("|").map((id) => `ticket.${id}`)
      : [];
    const topics = ["chat.website.admin", "ticket.admin", ...ticketTopics];

    const handleMessage = (message: RealtimeEnvelope) => {
      if (!shouldRefreshForTicketEvent(message)) return;
      refreshTickets();
    };

    socket.on("message", handleMessage);
    socket.subscribe(topics);

    return () => {
      socket.off("message", handleMessage);
      socket.unsubscribe(topics);
    };
  }, [refreshTickets, ticketTopicKey]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const sendChatMessage = useCallback(
    (
      ticketId: string,
      text: string,
      attachments?: { type: "photo" | "file" | "video"; name: string; url?: string }[]
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
        isTicketLoading: websiteTicketsQuery.isLoading,
        ticketError:
          websiteTicketsQuery.error instanceof Error
            ? websiteTicketsQuery.error.message
            : null,
        markAsRead,
        markAllAsRead,
        addTicket,
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
