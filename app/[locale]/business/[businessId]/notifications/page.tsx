"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import LinkExtension from "@tiptap/extension-link";
import OrderedList from "@tiptap/extension-ordered-list";

import { useNotification, TicketItem } from "@/contexts/notification-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  MessageSquare,
  Paperclip,
  Send,
  ChevronLeft,
  FileText,
  X,
  Circle,
  Search,
  Play,
  Download,
  Loader2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
} from "lucide-react";
import { showToast } from "@/helper/show-toast";
import { cn } from "@/lib/utils";
import { helperService } from "@/services/helper.api";

type MediaViewerState = {
  type: "photo" | "video";
  url: string;
  name: string;
} | null;

const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: "1",
        parseHTML: (element) => element.getAttribute("type"),
        renderHTML: (attributes) => ({
          type: attributes.type,
        }),
      },
    };
  },
});

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

function sanitizeRichHtml(value?: string | null) {
  const content = value ?? "";
  const source = hasHtmlTag(content)
    ? content
    : escapeHtml(content).replace(/\n/g, "<br />");

  return source
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*(['"])[\s\S]*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
}

function htmlToPreviewText(value?: string | null) {
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

function isEmptyRichText(value: string) {
  return !htmlToPreviewText(value).trim();
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
  const [editorHtml, setEditorHtml] = useState("");
  const [attachments, setAttachments] = useState<
    { type: "photo" | "file" | "video"; name: string; url?: string; preview?: string }[]
  >([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Mobile view state
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState>(null);
  const [isMounted, setIsMounted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousTicketCountRef = useRef(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        orderedList: false,
      }),
      CustomOrderedList,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setEditorHtml(editor.getHTML());
    },
  });

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

  useEffect(() => {
    setEditorHtml("");
    editor?.commands.clearContent();
    setAttachments((currentAttachments) => {
      currentAttachments.forEach((attachment) => {
        if (attachment.preview) URL.revokeObjectURL(attachment.preview);
      });
      return [];
    });
  }, [editor, selectedTicketId]);

  // Auto-select newest ticket if it appears (from report modal)
  useEffect(() => {
    const previousTicketCount = previousTicketCountRef.current;
    previousTicketCountRef.current = tickets.length;

    if (tickets.length > previousTicketCount && tickets[0]) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets]);

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
    const body = isEmptyRichText(editorHtml) ? "" : editorHtml;
    if (!body && attachments.length === 0) return;
    if (isUploadingAttachment) return;
    if (!selectedTicketId) return;

    sendChatMessage(
      selectedTicketId,
      body,
      attachments.length > 0
        ? attachments.map((a) => ({ type: a.type, name: a.name, url: a.url }))
        : undefined
    );

    setEditorHtml("");
    editor?.commands.clearContent();
    attachments.forEach((attachment) => {
      if (attachment.preview) URL.revokeObjectURL(attachment.preview);
    });
    setAttachments([]);
  };

  const handleLink = () => {
    const previousUrl = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt("Masukkan URL:", previousUrl ?? "https://");

    if (url === null) return;
    if (!url.trim()) {
      editor?.chain().focus().unsetLink().run();
      return;
    }

    editor?.chain().focus().setLink({ href: url.trim() }).run();
  };

  // Real file picker handler
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (files.length > imageFiles.length) {
      showToast("warning", "Untuk saat ini lampiran tiket hanya mendukung gambar.");
    }

    if (imageFiles.length === 0) {
      e.target.value = "";
      return;
    }

    const uploadingAttachments = imageFiles.map((file) => {
      const preview = URL.createObjectURL(file);
      return { type: "photo" as const, name: file.name, preview };
    });

    setAttachments((prev) => [...prev, ...uploadingAttachments]);
    setIsUploadingAttachment(true);

    try {
      const uploadedAttachments = await Promise.all(
        imageFiles.map(async (file, index) => ({
          ...uploadingAttachments[index],
          url: await helperService.uploadSingleImage({ image: file }),
        }))
      );

      setAttachments((prev) =>
        prev.map((attachment) => {
          const uploaded = uploadedAttachments.find(
            (item) => item.preview === attachment.preview
          );
          return uploaded ?? attachment;
        })
      );
    } catch (error) {
      uploadingAttachments.forEach((attachment) => {
        if (attachment.preview) URL.revokeObjectURL(attachment.preview);
      });
      setAttachments((prev) =>
        prev.filter(
          (attachment) =>
            !uploadingAttachments.some(
              (uploading) => uploading.preview === attachment.preview
            )
        )
      );
      showToast("error", error);
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = "";
    }
  }, []);

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

  const canSendReply = !isEmptyRichText(editorHtml) || attachments.length > 0;
  const toolbarButtonClass = (active?: boolean) =>
    cn(
      "h-8 shrink-0 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
      active && "bg-accent text-accent-foreground"
    );
  const toolbarIconClass = (active?: boolean) =>
    cn(
      "h-8 w-8 shrink-0 rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
      active && "bg-accent text-accent-foreground"
    );

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
                                {htmlToPreviewText(lastMsg.text) || "[Lampiran]"}
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
                  <div className="flex-1 overflow-y-auto bg-background/50 custom-scrollbar">
                    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
                    {activeTicket.messages.map((msg) => {
                      const isUser = msg.sender === "user";
                      const authorName = isUser ? "Anda" : "Customer Service";
                      const authorRole = isUser ? "Pelapor" : "CS Agent";
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
                              <p className="text-[11px] text-muted-foreground">{authorRole}</p>
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
                                    Kategori Masalah: {msg.category}
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
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Rich Reply Editor */}
                  <form
                    onSubmit={handleSendMessage}
                    className="border-t border-border bg-card p-3 shrink-0"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1 overflow-x-auto rounded-t-md border border-border/70 bg-muted/40 px-3 py-1.5">
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                          className={toolbarButtonClass(editor?.isActive("heading", { level: 1 }))}
                        >
                          H1
                        </button>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                          className={toolbarButtonClass(editor?.isActive("heading", { level: 2 }))}
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                          className={toolbarButtonClass(editor?.isActive("heading", { level: 3 }))}
                        >
                          H3
                        </button>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().setParagraph().run()}
                          className={toolbarButtonClass(editor?.isActive("paragraph"))}
                        >
                          Paragraf
                        </button>

                        <span className="mx-1 h-4 w-px shrink-0 bg-border" />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().toggleBold().run()}
                          className={toolbarIconClass(editor?.isActive("bold"))}
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().toggleItalic().run()}
                          className={toolbarIconClass(editor?.isActive("italic"))}
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().toggleUnderline().run()}
                          className={toolbarIconClass(editor?.isActive("underline"))}
                        >
                          <UnderlineIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={handleLink}
                          className={toolbarIconClass(editor?.isActive("link"))}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>

                        <span className="mx-1 h-4 w-px shrink-0 bg-border" />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
                          className={toolbarIconClass(editor?.isActive({ textAlign: "left" }))}
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
                          className={toolbarIconClass(editor?.isActive({ textAlign: "center" }))}
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
                          className={toolbarIconClass(editor?.isActive({ textAlign: "right" }))}
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>

                        <span className="mx-1 h-4 w-px shrink-0 bg-border" />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().toggleBulletList().run()}
                          className={toolbarIconClass(editor?.isActive("bulletList"))}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                          className={toolbarIconClass(editor?.isActive("orderedList"))}
                        >
                          <ListOrdered className="h-4 w-4" />
                        </Button>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            if (editor?.isActive("orderedList", { type: "a" })) {
                              editor.chain().focus().toggleOrderedList().run();
                              return;
                            }

                            editor
                              ?.chain()
                              .focus()
                              .toggleOrderedList()
                              .updateAttributes("orderedList", { type: "a" })
                              .run();
                          }}
                          className={cn(
                            toolbarButtonClass(editor?.isActive("orderedList", { type: "a" })),
                            "gap-1 border border-border px-2"
                          )}
                        >
                          a-b-c
                        </button>

                        <span className="mx-1 h-4 w-px shrink-0 bg-border" />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isUploadingAttachment}
                          onClick={() => fileInputRef.current?.click()}
                          className={toolbarIconClass(false)}
                        >
                          {isUploadingAttachment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Paperclip className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <div className="relative rounded-b-md border border-t-0 border-border/70 bg-muted/20">
                        {editor && editor.isEmpty && (
                          <div className="pointer-events-none absolute left-4 top-3 select-none text-sm text-muted-foreground/70">
                            Tulis balasan laporan di sini...
                          </div>
                        )}
                        <EditorContent
                          editor={editor}
                          className="min-h-[96px] max-h-44 overflow-y-auto px-4 py-3 text-sm outline-none focus-within:ring-1 focus-within:ring-primary [&_.ProseMirror]:min-h-[72px] [&_.ProseMirror]:outline-none [&_a]:underline [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={isUploadingAttachment || !canSendReply}
                          className="h-9 gap-2 px-4 text-xs font-medium"
                        >
                          {isUploadingAttachment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Kirim Balasan
                        </Button>
                      </div>
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
