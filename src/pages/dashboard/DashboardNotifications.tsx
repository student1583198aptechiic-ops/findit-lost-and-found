import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BellOff, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Notification } from "@/types";
import { EmptyState, FullPageSpinner } from "@/components/ui/State";
import { timeAgo, classNames } from "@/lib/utils";
import toast from "react-hot-toast";

export function DashboardNotifications() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", session!.user.id)
        .order("created_at", { ascending: false });
      setNotifications((data as Notification[]) ?? []);
      setLoading(false);
    }
    load();
  }, [session?.user]);

  async function markAllRead() {
    if (!session?.user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", session.user.id)
      .is("read_at", null);
    if (error) {
      toast.error("Could not mark notifications as read.");
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    toast.success("All notifications marked as read.");
  }

  async function markOneRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
    }
  }

  if (loading) return <FullPageSpinner />;

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Notifications</h1>
          <p className="text-sm text-navy-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary">
            <Check className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-8 w-8" />}
          title="No notifications"
          description="You'll be notified here about matches, claims, and messages."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const link =
              n.related_resource_type === "item" && n.related_resource_id
                ? `/items/${n.related_resource_id}`
                : null;
            const content = (
              <div
                className={classNames(
                  "card p-4 flex items-start gap-3 transition-colors",
                  link && "hover:shadow-card-hover cursor-pointer",
                  !n.read_at && "bg-navy-50/40"
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-50 text-navy-500 flex-shrink-0">
                  <Bell className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-navy-900 text-sm">{n.title}</p>
                    {!n.read_at && (
                      <span className="h-2 w-2 rounded-full bg-navy-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-navy-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-navy-400 mt-1.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read_at && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      markOneRead(n.id);
                    }}
                    className="text-xs text-navy-400 hover:text-navy-600 flex-shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
            return link ? (
              <Link key={n.id} to={link}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
