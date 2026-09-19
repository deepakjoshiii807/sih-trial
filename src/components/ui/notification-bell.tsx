/**
 * NotificationBell — reusable across all role dashboards.
 *
 * Shows a bell icon with an unread-count badge. Clicking opens a dropdown
 * listing recent notifications. Each notification is marked as read on click.
 * Polls every 30 seconds for new notifications.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { notificationApi, Notification } from "@/lib/notification-api";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.getNotifications(20);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silently fail — polling shouldn't break the UI
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      try {
        await notificationApi.markRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Ignore
      }
    }
    if (n.link) {
      window.location.href = n.link;
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      const { marked } = await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const typeIcon: Record<string, string> = {
    application_stage: "📋",
    verification: "✅",
    skill_verified: "🏆",
    project_review: "📝",
    sla_breach: "⚠️",
    assessment: "📊",
    system: "🔔",
  };

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-black/5 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" style={{ color: "#244B35" }} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white bg-red-500">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-96 rounded-2xl shadow-xl border z-50 overflow-hidden"
            style={{
              background: "#FAF9F5",
              borderColor: "#E6E3D7",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "#E6E3D7" }}
            >
              <span
                className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase"
                style={{ color: "#6B6F68" }}
              >
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: "#244B35" }}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-sm" style={{ color: "#6B6F68" }}>
                  No notifications yet
                </div>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-black/[0.03] ${
                    n.read ? "opacity-60" : ""
                  }`}
                  style={{ borderColor: "#E6E3D7" }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5 flex-shrink-0">
                      {typeIcon[n.type] || "🔔"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-semibold truncate"
                          style={{ color: "#171A18" }}
                        >
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[#244B35] flex-shrink-0" />
                        )}
                      </div>
                      {n.message && (
                        <p
                          className="text-xs mt-0.5 line-clamp-2"
                          style={{ color: "#6B6F68" }}
                        >
                          {n.message}
                        </p>
                      )}
                      <span
                        className="text-[10px] mt-1 block"
                        style={{ color: "#9CA09C" }}
                      >
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
