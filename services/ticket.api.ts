import { api } from "@/config/api";
import {
  CreateWebsiteTicketPld,
  ReplyWebsiteTicketPld,
  TicketCategory,
  WebsiteTicketDetail,
  WebsiteTicketMessage,
  WebsiteTicket,
} from "@/models/api/ticket.type";
import {
  BaseResponse,
  BaseResponseFiltered,
} from "@/models/api/base-response.type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const TICKET_CATEGORIES_QUERY_KEY = ["ticketCategories"] as const;
export const WEBSITE_TICKETS_QUERY_KEY = ["websiteTickets"] as const;

const ticketService = {
  getCategories: () => {
    return api.get<BaseResponseFiltered<TicketCategory[]>>("/ticket/category");
  },
  getWebsiteTickets: () => {
    return api.get<BaseResponse<WebsiteTicket[]> | BaseResponseFiltered<WebsiteTicket[]>>(
      "/ticket/website"
    );
  },
  getWebsiteTicketDetail: (ticketId: number) => {
    return api.get<BaseResponse<WebsiteTicketDetail>>(`/ticket/website/${ticketId}`);
  },
  createWebsiteTicket: (payload: CreateWebsiteTicketPld) => {
    return api.post<BaseResponse<WebsiteTicket>>("/ticket/website", payload);
  },
  replyWebsiteTicket: (ticketId: number, payload: ReplyWebsiteTicketPld) => {
    return api.post<BaseResponse<WebsiteTicketMessage>>(
      `/ticket/website/${ticketId}/reply`,
      payload
    );
  },
};

export const useTicketCategories = (enabled = true) => {
  return useQuery({
    queryKey: TICKET_CATEGORIES_QUERY_KEY,
    queryFn: () => ticketService.getCategories(),
    enabled,
  });
};

export const useTicketWebsiteCreate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWebsiteTicketPld) =>
      ticketService.createWebsiteTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WEBSITE_TICKETS_QUERY_KEY });
    },
  });
};

export const useTicketWebsiteReply = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      payload,
    }: {
      ticketId: number;
      payload: ReplyWebsiteTicketPld;
    }) => ticketService.replyWebsiteTicket(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WEBSITE_TICKETS_QUERY_KEY });
    },
  });
};

export default ticketService;
