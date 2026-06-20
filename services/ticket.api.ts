import { api } from "@/config/api";
import {
  CreateWebsiteTicketPld,
  TicketCategory,
  WebsiteTicket,
} from "@/models/api/ticket.type";
import {
  BaseResponse,
  BaseResponseFiltered,
} from "@/models/api/base-response.type";
import { useMutation, useQuery } from "@tanstack/react-query";

const TICKET_CATEGORIES_QUERY_KEY = ["ticketCategories"] as const;

const ticketService = {
  getCategories: () => {
    return api.get<BaseResponseFiltered<TicketCategory[]>>("/ticket/category");
  },
  createWebsiteTicket: (payload: CreateWebsiteTicketPld) => {
    return api.post<BaseResponse<WebsiteTicket>>("/ticket/website", payload);
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
  return useMutation({
    mutationFn: (payload: CreateWebsiteTicketPld) =>
      ticketService.createWebsiteTicket(payload),
  });
};

export default ticketService;
