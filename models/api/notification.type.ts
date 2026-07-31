export interface ChatBlast {
  id: number;
  subject: string | null;
  body: string | null;
  attachments: string[] | null;
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
}
