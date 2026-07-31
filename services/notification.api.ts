import { api } from "@/config/api";
import {
  BaseResponse,
  BaseResponseFiltered,
} from "@/models/api/base-response.type";
import {
  CommonNotification,
  NotificationUnreadCount,
} from "@/models/api/notification.type";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
export const NOTIFICATION_UNREAD_COUNT_QUERY_KEY = [
  "notifications",
  "unread-count",
] as const;

const notificationService = {
  getNotifications: () => {
    return api.get<
      | BaseResponse<CommonNotification[]>
      | BaseResponseFiltered<CommonNotification[]>
    >("/notification/common");
  },
  getNotification: (notificationId: number) => {
    return api.get<BaseResponse<CommonNotification>>(
      `/notification/common/${notificationId}`
    );
  },
  getUnreadCount: () => {
    return api.get<BaseResponse<NotificationUnreadCount>>(
      "/notification/common/unread-count"
    );
  },
};

export default notificationService;
