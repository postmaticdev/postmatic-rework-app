export interface ChatBlastAttachment {
  id?: number;
  position?: number | null;
  url: string | null;
  filename?: string | null;
  mimeType?: string | null;
  attachmentType?: string | null;
  sizeBytes?: number | null;
}

export interface ChatBlast {
  id: number;
  subject: string | null;
  body: string | null;
  attachments: Array<string | ChatBlastAttachment> | null;
  channelType: "website" | "whatsapp" | string | null;
  broadcastType: "direct" | "scheduled" | string | null;
  status: string | null;
  scheduledFor: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CommonNotification {
  id: number;
  chatBlastMessageHistoryId: number | null;
  profileId: string | null;
  readAt: string | null;
  chatBlast: ChatBlast | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface NotificationUnreadCount {
  totalUnread: number;
  blastMessages?: number | null;
  ticketRepliesForCustomer?: number | null;
}
