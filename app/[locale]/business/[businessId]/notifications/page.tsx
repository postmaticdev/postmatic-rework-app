"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNotification, TicketItem } from "@/contexts/notification-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Bell,
  MessageSquare,
  Paperclip,
  Send,
  ChevronLeft,
  Image as ImageIcon,
  FileText,
  Video,
  X,
  Circle,
  Search,
  Play,
  Download,
} from "lucide-react";

type MediaViewerState = {
  type: "photo" | "video";
  url: string;
  name: string;
} | null;

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
        aria-label="Tutup"
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

// ─── Dummy rich-content for notification detail ─────────────────────────────
const NOTIF_RICH_CONTENT: Record<
  string,
  { body: string; mediaType?: "image" | "video"; mediaUrl?: string; caption?: string }
> = {
  "notif-1": {
    body: "Kini Anda tidak perlu lagi memposting secara manual. Dengan integrasi terbaru Postmatic Scheduler, Anda dapat mengunggah gambar atau video pendek, menambahkan stiker tautan, dan menjadwalkan penayangan Instagram Story secara otomatis langsung dari workspace ini.\n\nFitur ini mendukung:\n• Upload gambar hingga 30MB (format JPEG, PNG, WEBP)\n• Upload video hingga 60 detik (format MP4, MOV)\n• Penjadwalan hingga 30 hari ke depan\n• Pratinjau tampilan story sebelum diterbitkan\n\nCobalah fitur ini sekarang di tab Content Scheduler!",
    mediaType: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80",
    caption: "Tampilan baru fitur Scheduler Instagram Story di Postmatic Dashboard",
  },
  "notif-2": {
    body: "Sistem billing kami telah menerima pembayaran Anda untuk invoice #INV-2026-0701 tertanggal 13 Juli 2026 sebesar Rp 150.000 (Paket Pro Bulanan).\n\nDetail Transaksi:\n• Metode Pembayaran: Transfer Bank BCA\n• Nominal: Rp 150.000\n• Status: LUNAS ✓\n• Akses diperpanjang hingga: 13 Agustus 2026\n\nTerima kasih atas kepercayaan Anda menggunakan layanan Postmatic! Untuk melihat detail tagihan lengkap, kunjungi Settings > Billing.",
    mediaType: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
    caption: "Konfirmasi pembayaran invoice #INV-2026-0701 — Status: LUNAS",
  },
  "notif-3": {
    body: "Pemberitahuan Sistem: Kredit AI Anda saat ini tersisa 42 tokens. Jika kredit habis, penjadwalan otomatis atau pembuatan konten AI baru mungkin akan tertunda.\n\nRincian penggunaan kredit 7 hari terakhir:\n• Senin: -120 tokens (4 postingan)\n• Selasa: -95 tokens (3 postingan)\n• Rabu: -110 tokens (4 postingan)\n• Kamis: -88 tokens (3 postingan)\n• Jumat: -145 tokens (5 postingan)\n\nSilakan lakukan pengisian ulang melalui tab Settings > Billing atau klik tombol '+' di bagian kredit header untuk melakukan top-up instan.",
    mediaType: "video",
    mediaUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    caption: "Tutorial cara melakukan top-up kredit AI di Postmatic",
  },
};

export default function NotificationsPage() {
  const {
    notifications,
    tickets,
    unreadCount,
    markAsRead,
    markAllAsRead,
    sendChatMessage,
  } = useNotification();

  const [activeTab, setActiveTab] = useState<"notifications" | "tickets">("notifications");
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Search states
  const [notifSearch, setNotifSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");

  // Chat Input states
  const [chatInput, setChatInput] = useState("");
  const [attachments, setAttachments] = useState<
    { type: "photo" | "file" | "video"; name: string; url?: string; preview?: string }[]
  >([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Mobile view state
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState>(null);
  const [isMounted, setIsMounted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const richContent = selectedNotifId ? NOTIF_RICH_CONTENT[selectedNotifId] : null;

  // Auto-select first item
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Auto-select newest ticket if it appears (from report modal)
  useEffect(() => {
    if (tickets.length > 0) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets.length]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket?.messages]);

  // Auto-mark as read when viewing
  useEffect(() => {
    if (activeNotification?.unread) {
      markAsRead(activeNotification.id);
    }
  }, [selectedNotifId, activeNotification, markAsRead]);

  const handleTabChange = (tab: "notifications" | "tickets") => {
    setActiveTab(tab);
    setMobileView("list");
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() && attachments.length === 0) return;
    if (!selectedTicketId) return;

    sendChatMessage(
      selectedTicketId,
      chatInput,
      attachments.length > 0
        ? attachments.map((a) => ({ type: a.type, name: a.name, url: a.url }))
        : undefined
    );

    setChatInput("");
    setAttachments([]);
    setShowAttachmentMenu(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Real file picker handler
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const newAttachments = files.map((file) => {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        const type: "photo" | "file" | "video" = isImage ? "photo" : isVideo ? "video" : "file";
        const preview = isImage || isVideo ? URL.createObjectURL(file) : undefined;
        return { type, name: file.name, url: preview, preview };
      });
      setAttachments((prev) => [...prev, ...newAttachments]);
      setShowAttachmentMenu(false);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    []
  );

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

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
    attachments: NonNullable<TicketItem["messages"][number]["attachments"]>,
    isUser: boolean
  ) => (
    <div className="mt-2 space-y-2 border-t border-white/20 pt-2">
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
              className={`flex w-full items-center gap-2 rounded-md p-2 text-xs transition-colors ${
                isUser
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
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

  return (
    <main className="flex-1 flex flex-col h-[calc(100vh-4.5rem)] overflow-hidden bg-background">
      {/* ── Tab Navigation Bar ─────────────────────────────────────────── */}
      <div className="border-b border-border bg-card px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            System Notification
          </h1>

          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => handleTabChange("notifications")}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === "notifications"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bell className="w-4 h-4" />
              Notification
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange("tickets")}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === "tickets"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Ticket
            </button>
          </div>
        </div>

        {activeTab === "notifications" && unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-700 shrink-0"
          >
            Tandai semua dibaca
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
                    placeholder="Cari notifikasi..."
                    className="pl-9 h-9 text-sm bg-muted/40 border-border"
                  />
                  {notifSearch && (
                    <button
                      onClick={() => setNotifSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Tidak ada notifikasi ditemukan.</p>
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
                          <span className="text-[11px] text-muted-foreground/80 block mt-2">
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
                  <ChevronLeft className="w-4 h-4" />
                  Kembali
                </Button>
              </div>

              {activeNotification ? (
                <div className="flex flex-col min-h-full">
                  {/* Header section */}
                  <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-foreground leading-snug">
                        {activeNotification.title}
                      </h2>
                      <span className="text-xs text-muted-foreground mt-0.5 block">
                        {activeNotification.time}
                      </span>
                    </div>
                    {activeNotification.unread && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 shrink-0"
                      >
                        Baru
                      </Badge>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 px-[15rem] py-6 space-y-6">
                    {/* Media block */}
                    {richContent?.mediaType === "image" && richContent.mediaUrl && (
                      <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={richContent.mediaUrl}
                          alt={richContent.caption ?? "Notification media"}
                          className="w-full h-auto object-contain"
                        />
                        {richContent.caption && (
                          <p className="text-xs text-muted-foreground px-3 py-2 bg-card">
                            {richContent.caption}
                          </p>
                        )}
                      </div>
                    )}

                    {richContent?.mediaType === "video" && richContent.mediaUrl && (
                      <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-black">
                        <video
                          src={richContent.mediaUrl}
                          controls
                          className="w-full h-auto object-contain"
                        />
                        {richContent.caption && (
                          <p className="text-xs text-muted-foreground px-3 py-2 bg-card">
                            {richContent.caption}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Text content */}
                    <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                      {richContent?.body ?? activeNotification.content}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-[15rem] pb-6 pt-2 border-t border-border flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsRead(activeNotification.id)}
                      disabled={!activeNotification.unread}
                      className="text-xs"
                    >
                      {activeNotification.unread ? "Tandai sudah dibaca" : "Sudah Dibaca"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                  <Bell className="w-12 h-12 stroke-[1.5] mb-2 opacity-30" />
                  <p className="text-sm">Pilih notifikasi untuk melihat detail.</p>
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
                    placeholder="Cari tiket..."
                    className="pl-9 h-9 text-sm bg-muted/40 border-border"
                  />
                  {ticketSearch && (
                    <button
                      onClick={() => setTicketSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {filteredTickets.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Tidak ada tiket ditemukan.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredTickets.map((ticket) => {
                      const lastMsg = ticket.messages[ticket.messages.length - 1];
                      return (
                        <div
                          key={ticket.id}
                          onClick={() => {
                            setSelectedTicketId(ticket.id);
                            setMobileView("detail");
                          }}
                          className={`p-4 cursor-pointer transition-all duration-200 hover:bg-muted/40 flex flex-col gap-2 ${
                            selectedTicketId === ticket.id
                              ? "bg-primary/5 border-l-4 border-primary"
                              : "border-l-4 border-transparent"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-blue-600 tracking-wide">
                              {ticket.id}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{ticket.date}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-foreground line-clamp-1">
                              {ticket.title}
                            </h4>
                            {lastMsg && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {lastMsg.sender === "user" ? "Anda: " : "CS: "}
                                {lastMsg.text || "[Lampiran]"}
                              </p>
                            )}
                          </div>
                          <span
                            className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                              ticket.status
                            )}`}
                          >
                            {ticket.status}
                          </span>
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
                      <button
                        onClick={() => setMobileView("list")}
                        className="md:hidden p-1.5 hover:bg-muted rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-foreground" />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600">{activeTicket.id}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                              activeTicket.status
                            )}`}
                          >
                            {activeTicket.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-foreground truncate mt-0.5">
                          {activeTicket.title}
                        </h3>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:block shrink-0">
                      Dibuat: {activeTicket.date}
                    </span>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50 custom-scrollbar">
                    {activeTicket.messages.map((msg) => {
                      const isUser = msg.sender === "user";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                        >
                          <div
                            className={`max-w-[75%] flex flex-col ${
                              isUser ? "items-end" : "items-start"
                            }`}
                          >
                            <span className="text-[10px] text-muted-foreground/80 mb-1 px-1">
                              {isUser ? "Anda" : "Customer Service"}
                            </span>

                            <div
                              className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                                isUser
                                  ? "bg-primary text-primary-foreground rounded-tr-none"
                                  : "bg-card border border-border text-foreground rounded-tl-none"
                              }`}
                            >
                              {msg.isInitialReport ? (
                                <div className="space-y-2">
                                  <p className="text-base font-bold leading-snug">
                                    {activeTicket.title}
                                  </p>
                                  {msg.category && (
                                    <p className="text-xs opacity-90">
                                      Kategori Masalah: {msg.category}
                                    </p>
                                  )}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                      {msg.attachments.map((file, idx) =>
                                        file.type === "photo" && file.url ? (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleAttachmentClick(file)}
                                            className="block max-w-[240px] overflow-hidden rounded-lg transition-opacity hover:opacity-90"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={file.url}
                                              alt={file.name}
                                              className="h-auto w-full object-contain"
                                            />
                                          </button>
                                        ) : null
                                      )}
                                    </div>
                                  )}
                                  {msg.text && (
                                    <p className="leading-relaxed whitespace-pre-wrap pt-1">
                                      {msg.text}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {msg.text && (
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                  )}
                                  {msg.attachments &&
                                    msg.attachments.length > 0 &&
                                    renderMessageAttachments(msg.attachments, isUser)}
                                </>
                              )}
                            </div>

                            <span className="text-[9px] text-muted-foreground/75 mt-1 px-1 block">
                              {msg.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Attachment preview bar */}
                  {attachments.length > 0 && (
                    <div className="px-4 py-2 bg-card border-t border-border flex flex-wrap gap-2 shrink-0">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="relative group">
                          {att.type === "photo" && att.preview ? (
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-border">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={att.preview}
                                alt={att.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : att.type === "video" && att.preview ? (
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-border bg-black flex items-center justify-center relative">
                              <video src={att.preview} className="w-full h-full object-cover opacity-70" />
                              <Play className="absolute w-5 h-5 text-white" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-muted text-foreground text-xs px-2.5 py-1.5 rounded-lg border border-border max-w-[140px]">
                              <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">{att.name}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                          {att.type !== "photo" && att.type !== "video" && (
                            <span className="sr-only">{att.name}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Chat Input Box */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 border-t border-border bg-card flex flex-col gap-2 shrink-0 relative"
                  >
                    <div className="flex items-end gap-2">
                      {/* Attachment button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowAttachmentMenu((v) => !v)}
                          className={`p-2.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 ${
                            showAttachmentMenu ? "bg-muted text-foreground" : ""
                          }`}
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>

                        {showAttachmentMenu && (
                          <div className="absolute bottom-12 left-0 bg-card border border-border shadow-xl rounded-xl p-2 w-52 z-20 animate-in slide-in-from-bottom-2 duration-150 flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (fileInputRef.current) {
                                  fileInputRef.current.accept = "image/*";
                                  fileInputRef.current.click();
                                }
                              }}
                              className="flex items-center gap-3 text-left text-xs font-semibold px-3 py-2 rounded-lg hover:bg-muted text-foreground/90 transition-colors"
                            >
                              <ImageIcon className="w-4 h-4 text-blue-500" />
                              Upload Foto
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (fileInputRef.current) {
                                  fileInputRef.current.accept = "video/*";
                                  fileInputRef.current.click();
                                }
                              }}
                              className="flex items-center gap-3 text-left text-xs font-semibold px-3 py-2 rounded-lg hover:bg-muted text-foreground/90 transition-colors"
                            >
                              <Video className="w-4 h-4 text-rose-500" />
                              Upload Video
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (fileInputRef.current) {
                                  fileInputRef.current.accept =
                                    ".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip";
                                  fileInputRef.current.click();
                                }
                              }}
                              className="flex items-center gap-3 text-left text-xs font-semibold px-3 py-2 rounded-lg hover:bg-muted text-foreground/90 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-amber-500" />
                              Upload Dokumen
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Text area */}
                      <div className="flex-1">
                        <Textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={handleKeyPress}
                          placeholder="Tulis tanggapan Anda... (Enter untuk Kirim)"
                          rows={1}
                          className="min-h-[40px] max-h-[120px] resize-none py-2.5 px-4 bg-muted/40 border-border rounded-xl focus-visible:ring-1 focus-visible:ring-primary w-full text-sm"
                        />
                      </div>

                      {/* Send */}
                      <Button
                        type="submit"
                        disabled={!chatInput.trim() && attachments.length === 0}
                        className="h-10 w-10 p-0 rounded-full shrink-0 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                  <MessageSquare className="w-12 h-12 stroke-[1.5] mb-2 opacity-30" />
                  <p className="text-sm">Pilih tiket untuk memulai percakapan CS.</p>
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
