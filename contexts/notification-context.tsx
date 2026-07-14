"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

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
  sender: "user" | "cs";
  text: string;
  time: string;
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
  title: string;
  status: "Terkirim" | "Sedang Direview" | "In Progress" | "Done";
  date: string;
  messages: ChatMessage[];
}

interface NotificationContextProps {
  notifications: NotificationItem[];
  tickets: TicketItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addTicket: (
    title: string,
    category: string,
    details: string,
    attachments?: string[]
  ) => string;
  sendChatMessage: (
    ticketId: string,
    text: string,
    attachments?: { type: "photo" | "file" | "video"; name: string; url?: string }[]
  ) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "Fitur Baru: Scheduler Instagram Story",
      message: "Sekarang Anda dapat menjadwalkan postingan Instagram Story secara langsung melalui dashboard Postmatic. Cobalah sekarang!",
      time: "2 jam yang lalu",
      unread: true,
      content: "Kini Anda tidak perlu lagi memposting secara manual. Dengan integrasi terbaru Postmatic Scheduler, Anda dapat mengunggah gambar atau video pendek, menambahkan stiker tautan, dan menjadwalkan penayangan Instagram Story secara otomatis langsung dari workspace ini. Cobalah fitur ini sekarang di tab Content Scheduler!",
    },
    {
      id: "notif-2",
      title: "Pembayaran Invoice Berhasil",
      message: "Invoice #INV-2026-0701 untuk perpanjangan langganan bulanan Anda telah berhasil diproses.",
      time: "1 hari yang lalu",
      unread: false,
      content: "Sistem billing kami telah menerima pembayaran Anda untuk invoice #INV-2026-0701 tertanggal 13 Juli 2026 sebesar Rp 150.000 (Paket Pro Bulanan). Akses fitur penuh Anda diperpanjang hingga 13 Agustus 2026. Terima kasih atas kepercayaan Anda menggunakan layanan Postmatic!",
    },
    {
      id: "notif-3",
      title: "Kredit AI Hampir Habis",
      message: "Kredit AI Anda tersisa kurang dari 50 tokens. Segera lakukan top-up agar postingan terjadwal tetap berjalan lancar.",
      time: "3 hari yang lalu",
      unread: true,
      content: "Pemberitahuan Sistem: Kredit AI Anda saat ini tersisa 42 tokens. Jika kredit habis, penjadwalan otomatis atau pembuatan konten AI baru mungkin akan tertunda. Silakan lakukan pengisian ulang melalui tab Settings > Billing atau klik tombol '+' di bagian kredit header untuk melakukan top-up instan.",
    },
  ]);

  const [tickets, setTickets] = useState<TicketItem[]>([
    {
      id: "TCK-8721",
      title: "Gagal memotong kredit saat post scheduler",
      status: "Sedang Direview",
      date: "14 Jul 2026",
      messages: [
        {
          id: 1,
          sender: "user",
          text: "Halo, saya menjadwalkan post tadi malam tapi statusnya gagal dan tertulis kredit kurang, padahal saya cek kredit saya masih 500.",
          time: "14 Jul 2026 08:30",
        },
        {
          id: 2,
          sender: "cs",
          text: "Halo! Kami memohon maaf atas ketidaknyamanannya. Laporan Anda sedang kami teruskan ke tim teknis untuk dicek log pemotongan kreditnya. Mohon ditunggu ya kak.",
          time: "14 Jul 2026 09:00",
        },
      ],
    },
    {
      id: "TCK-8719",
      title: "Pertanyaan integrasi API Instagram Business",
      status: "In Progress",
      date: "12 Jul 2026",
      messages: [
        {
          id: 1,
          sender: "user",
          text: "Halo, saya sedang mencoba mengintegrasikan API Instagram Business ke akun Postmatic saya, tapi selalu muncul error token tidak valid. Bagaimana ya?",
          time: "12 Jul 2026 14:00",
        },
        {
          id: 2,
          sender: "cs",
          text: "Halo! Terima kasih telah menghubungi layanan pelanggan Postmatic. Mengenai masalah integrasi Instagram Business, pastikan akun Instagram Anda sudah diubah menjadi tipe Akun Profesional (Bisnis/Kreator) dan sudah terhubung dengan Halaman Facebook yang Anda kelola. Apakah langkah ini sudah dilakukan?",
          time: "12 Jul 2026 14:15",
        },
        {
          id: 3,
          sender: "user",
          text: "Oh begitu, baik saya coba cek dulu hubungannya di Facebook Page...",
          time: "12 Jul 2026 14:20",
        },
        {
          id: 4,
          sender: "cs",
          text: "Baik, silakan dicoba terlebih dahulu. Jika kendala masih berlanjut, mohon lampirkan tangkapan layar (screenshot) error yang muncul agar kami dapat menganalisis lebih lanjut.",
          time: "12 Jul 2026 14:25",
        },
      ],
    },
    {
      id: "TCK-8705",
      title: "Upgrade tier langganan 'Pay as you go' tertunda",
      status: "Done",
      date: "10 Jul 2026",
      messages: [
        {
          id: 1,
          sender: "user",
          text: "Saya sudah bayar upgrade lewat QRIS tapi status langganan saya belum berubah di dashboard.",
          time: "10 Jul 2026 10:00",
        },
        {
          id: 2,
          sender: "cs",
          text: "Halo! Transaksi QRIS Anda sudah terverifikasi di sistem kami dan langganan telah diaktifkan secara manual. Silakan refresh halaman dashboard Anda.",
          time: "10 Jul 2026 10:15",
        },
        {
          id: 3,
          sender: "user",
          text: "Sudah berubah sekarang, terima kasih banyak!",
          time: "10 Jul 2026 10:20",
        },
        {
          id: 4,
          sender: "cs",
          text: "Sama-sama. Senang bisa membantu Anda! Tiket ini kami tutup ya kak.",
          time: "10 Jul 2026 10:30",
        },
      ],
    },
    {
      id: "TCK-8699",
      title: "Request fitur custom AI generator model",
      status: "Terkirim",
      date: "08 Jul 2026",
      messages: [
        {
          id: 1,
          sender: "user",
          text: "Apakah ada rencana untuk menambahkan model Llama 3 atau Claude 3.5 Sonnet untuk generate content?",
          time: "08 Jul 2026 11:00",
        },
      ],
    },
  ]);

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
      const now = new Date();
      const timeString = now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) + " " + now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }).replace(".", ":");

      const newMessage: ChatMessage = {
        id: Date.now(),
        sender: "user",
        text,
        time: timeString,
        attachments,
      };

      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === ticketId) {
            return {
              ...t,
              messages: [...t.messages, newMessage],
            };
          }
          return t;
        })
      );

      // Simulasi CS auto-reply setelah 1.5 detik
      setTimeout(() => {
        const csMessage: ChatMessage = {
          id: Date.now() + 1,
          sender: "cs",
          text: `Halo, terima kasih atas tanggapan Anda. Kami telah menerima pesan dan lampiran Anda untuk tiket ${ticketId}. Pesan ini sedang kami teruskan kepada Customer Support Agent kami untuk diproses secepatnya. Mohon ditunggu.`,
          time: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }) + " " + new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }).replace(".", ":"),
        };

        setTickets((prev) =>
          prev.map((t) => {
            if (t.id === ticketId) {
              return {
                ...t,
                messages: [...t.messages, csMessage],
              };
            }
            return t;
          })
        );
      }, 1500);
    },
    []
  );

  const addTicket = useCallback(
    (title: string, category: string, details: string, attachments?: string[]): string => {
      const now = new Date();
      const timeString =
        now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
        " " +
        now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
      const newId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
      const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

      const firstMessage: ChatMessage = {
        id: Date.now(),
        sender: "user",
        text: details,
        time: timeString,
        isInitialReport: true,
        category,
        attachments: attachments?.length
          ? attachments.map((url, idx) => ({
              type: "photo" as const,
              name: `Lampiran ${idx + 1}`,
              url,
            }))
          : undefined,
      };

      const newTicket: TicketItem = {
        id: newId,
        title,
        status: "Terkirim",
        date: dateStr,
        messages: [firstMessage],
      };

      setTickets((prev) => [newTicket, ...prev]);

      // CS auto-reply after 2s
      setTimeout(() => {
        const csReply: ChatMessage = {
          id: Date.now() + 1,
          sender: "cs",
          text: `Halo, terima kasih sudah menghubungi kami! Laporan Anda dengan judul "${title}" telah kami terima dan sedang dalam antrian review. Tim Customer Support kami akan segera meninjau laporan ini. Mohon bersabar.`,
          time: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
            " " +
            new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":"),
        };
        setTickets((prev) =>
          prev.map((t) => (t.id === newId ? { ...t, messages: [...t.messages, csReply] } : t))
        );
      }, 2000);

      return newId;
    },
    []
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        tickets,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addTicket,
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
