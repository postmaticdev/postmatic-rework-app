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
