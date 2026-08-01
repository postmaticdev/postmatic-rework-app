export interface TicketCategory {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type TicketPriority = "low" | "medium" | "high";

export interface CreateWebsiteTicketPld {
  subject: string;
  body: string;
  countryCode: string;
  phone: string;
  email: string;
  priority: TicketPriority;
  appTicketCategoryId: number;
  attachments: string[];
}

export interface WebsiteTicket {
  id: number;
  appTicketCategoryId: number | null;
  profileId: string | null;
  channel: string;
  priority: TicketPriority;
  slaStatus: string;
  isPinned?: boolean | null;
  unreadMessages?: number | null;
  whatsappRoomChatId: number | null;
  subject: string;
  body: string;
  countryCode: string | null;
  phone: string | null;
  email: string | null;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteTicketMessage {
  id: number;
  ticketId: number | null;
  profileId: string | null;
  profile?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  senderType: "customer" | "customer_service" | string | null;
  body: string | null;
  attachments: string[] | null;
  quotedWebMessageId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WebsiteTicketDetail {
  ticket: WebsiteTicket;
  messages?: WebsiteTicketMessage[] | null;
}

export interface ReplyWebsiteTicketPld {
  body: string;
  quotedWebMessageId?: number;
  attachments?: string[];
}
