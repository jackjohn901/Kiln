import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, Heart, MessageCircle, UserPlus, Zap, Star, BookOpen, DollarSign, ShoppingBag, Calendar, Hammer } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial, type KilnNotification } from "@/contexts/SocialContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import CommissionInlineActions from "@/components/CommissionInlineActions";
import RelativeTime from "@/components/RelativeTime";

const TYPE_CONFIG: Record<KilnNotification["type"], { icon: typeof Bell; color: string; bg: string }> = {
  follow:              { icon: UserPlus,      color: "text-blue-400",   bg: "bg-blue-500/15" },
  like:                { icon: Heart,         color: "text-rose-400",   bg: "bg-rose-500/15" },
  comment:             { icon: MessageCircle, color: "text-sky-400",    bg: "bg-sky-500/15" },
  commission:          { icon: Hammer,        color: "text-emerald-400",bg: "bg-emerald-500/15" },
  tip:                 { icon: DollarSign,    color: "text-amber-400",  bg: "bg-amber-500/15" },
  workshop:            { icon: BookOpen,      color: "text-purple-400", bg: "bg-purple-500/15" },
  drop:                { icon: Zap,           color: "text-orange-400", bg: "bg-orange-500/15" },
  subscription:        { icon: Star,          color: "text-amber-300",  bg: "bg-amber-400/15" },
  sale:                { icon: ShoppingBag,   color: "text-green-400",  bg: "bg-green-500/15" },
  workshop_booking:    { icon: Calendar,      color: "text-sky-400",    bg: "bg-sky-500/15" },
  commission_payment:  { icon: DollarSign,    color: "text-emerald-400",bg: "bg-emerald-500/15" },
};


function groupByDate(notifs: KilnNotification[]): Array<{ label: string; items: KilnNotification[] }> {
  const groups = new Map<string, KilnNotification[]>();
  const now = new Date();
  for (const n of notifs) {
    const d = new Date(n.createdAt);
    const diff = now.getTime() - d.getTime();
    let label: string;
    if (diff < 86400000) label = "Today";
    else if (diff < 172800000) label = "Yesterday";
    else if (diff < 604800000) label = "This Week";
    else label = "Earlier";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(n);
  }
  const order = ["Today", "Yesterday", "This Week", "Earlier"];
  return order.filter((l) => groups.has(l)).map((l) => ({ label: l, items: groups.get(l)! }));
}

function extractCommissionId(link?: string): string | undefined {
  if (!link) return undefined;
  const m = link.match(/\/commissions\/([a-f0-9-]{36})/);
  return m?.[1];
}

export default function Notifications() {
  const { notifications, markRead, markAllRead } = useSocial();
  const { subscribe } = useWebSocket();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [apiNotifications, setApiNotifications] = useState<KilnNotification[]>([]);

  const addLiveNotification = useCallback((evt: Record<string, unknown>) => {
    const n = evt as { text?: string; link?: string; fromId?: string; fromName?: string; fromAvatarUrl?: string; notifType?: string };
    const link = n.link ?? undefined;
    setApiNotifications((prev) => [{
      id: `ws-${Date.now()}`,
      type: (n.notifType as KilnNotification["type"]) ?? "follow",
      fromId: n.fromId ?? "",
      fromName: n.fromName ?? "",
      fromAvatarUrl: n.fromAvatarUrl ?? "",
      text: n.text ?? "You have a new notification",
      link,
      commissionId: extractCommissionId(link),
      read: false,
      createdAt: new Date().toISOString(),
    }, ...prev]);
  }, []);

  useEffect(() => {
    const unsub = subscribe("notification", addLiveNotification);
    return unsub;
  }, [subscribe, addLiveNotification]);

  useEffect(() => {
    fetch("/api/notifications", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { notifications?: Record<string, unknown>[] } | null) => {
        if (!Array.isArray(data?.notifications)) return;
        setApiNotifications(data.notifications.map((n) => {
          const link = (n.link as string | undefined) ?? undefined;
          return {
            id: `api-${n.id as string}`,
            type: (n.type as KilnNotification["type"]) ?? "follow",
            fromId: (n.fromId as string) ?? "",
            fromName: (n.fromName as string) ?? "",
            fromAvatarUrl: (n.fromAvatarUrl as string) ?? "",
            text: (n.text as string) ?? "You have a new notification",
            link,
            commissionId: extractCommissionId(link),
            read: (n.read as boolean) ?? false,
            createdAt: n.createdAt as string,
          };
        }));
      })
      .catch(() => {});
  }, []);

  const allNotifications = useMemo(() => {
    const seen = new Set(notifications.map(n => n.id));
    const merged = [...notifications, ...apiNotifications.filter(n => !seen.has(n.id))];
    return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, apiNotifications]);

  const visible = filter === "unread" ? allNotifications.filter(n => !n.read) : allNotifications;
  const unreadCount = allNotifications.filter(n => !n.read).length;
  const grouped = groupByDate(visible);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-amber-100">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-stone-500">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => { markAllRead(); fetch("/api/notifications/read-all", { method: "POST", credentials: "include" }).catch(() => {}); }}
                className="flex items-center gap-1.5 rounded-full border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-stone-900/50 p-1 border border-white/5">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors capitalize ${
                filter === f ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {f === "all" ? `All (${allNotifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Notifications */}
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Bell size={40} className="mb-4 text-stone-700" />
            <p className="text-stone-500">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-600">{label}</p>
                <div className="space-y-1">
                  {items.map((n) => {
                    const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.follow;
                    const Icon = cfg.icon;
                    const commissionId = n.commissionId ?? extractCommissionId(n.link);
                    const isCommission = n.type === "commission" && !!commissionId;
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group relative flex items-start gap-3 rounded-2xl p-3 transition-colors ${
                          n.read ? "bg-transparent hover:bg-white/3" : "bg-white/5 hover:bg-white/7"
                        }`}
                      >
                        {/* Avatar + type icon */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={n.fromAvatarUrl || `https://picsum.photos/seed/${n.fromId}/40/40`}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          <div className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ${cfg.bg} border border-[#12100e]`}>
                            <Icon size={10} className={cfg.color} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div onClick={() => {
                            markRead(n.id);
                            if (n.id.startsWith("api-")) {
                              fetch(`/api/notifications/${n.id.slice(4)}/read`, { method: "PATCH", credentials: "include" }).catch(() => {});
                            }
                          }}>
                            {n.link ? (
                              <Link href={n.link} className="block">
                                <p className={`text-sm leading-snug ${n.read ? "text-stone-400" : "text-stone-200"}`}>{n.text}</p>
                                <p className="mt-0.5 text-xs text-stone-600"><RelativeTime since={n.createdAt} className="" /></p>
                              </Link>
                            ) : (
                              <>
                                <p className={`text-sm leading-snug ${n.read ? "text-stone-400" : "text-stone-200"}`}>{n.text}</p>
                                <p className="mt-0.5 text-xs text-stone-600"><RelativeTime since={n.createdAt} className="" /></p>
                              </>
                            )}
                          </div>
                          {isCommission && (
                            <CommissionInlineActions commissionId={commissionId} />
                          )}
                        </div>

                        {/* Unread dot */}
                        {!n.read && (
                          <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
