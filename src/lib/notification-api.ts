/**
 * Notification API — shared across all dashboards.
 *
 *   GET  /notifications          → list + unread count
 *   PATCH /notifications/<id>/read → mark one as read
 *   POST /notifications/read-all  → mark all as read
 */
import { apiClient, notifyAfterWrite } from "./api-helpers";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
}

export const notificationApi = {
  /** GET /api/notifications */
  async getNotifications(limit = 30, unreadOnly = false): Promise<NotificationListResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (unreadOnly) params.set("unread", "true");
    const { data } = await apiClient.get<NotificationListResponse>(`/notifications?${params}`);
    return data;
  },

  /** PATCH /api/notifications/<id>/read */
  async markRead(id: number): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  /** POST /api/notifications/read-all */
  async markAllRead(): Promise<{ marked: number }> {
    const { data } = await apiClient.post<{ marked: number }>("/notifications/read-all");
    notifyAfterWrite();
    return data;
  },
};
