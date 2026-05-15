import { useState } from "react";
import { Link } from "wouter";
import { Bell, ChevronLeft, Heart, UserPlus, ShoppingBag, MessageCircle, Star, DollarSign, CheckCircle, Zap } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";

const ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  like: { icon: Heart, color: "text-rose-400" },
  follow: { icon: UserPlus, color: "text-sky-400" },
  sale: { icon: ShoppingBag, color: "text-emerald-400" },
  comment: { icon: MessageCircle, color: "text-amber-400" },
  review: { icon: Star, color: "text-amber-400" },
  tip: { icon: DollarSign, color: "text-emerald-400" },
  commission: { icon: CheckCircle, color: "text-purple-400" },
  drop: { icon: Zap, color: "text-amber-400" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (days > 6) return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

type FilterType = "all" | "unread" | "likes" | "follows" | "sales" | "comments";

export default function NotificationsPage() {
  const { notifications, markAllRead } = useSocial();
  const [filter, setFilter] = useState<FilterType>("all");
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    if (filter === "likes") return n.type === "like";
    if (filter === "follows") return n.type === "follow";
    if (filter === "sales") return n.type === "tip" || n.type === "commission";
    if (filter === "comments") return n.type === "comment";
    return true;
  });

  // Group by date
  type Notif = typeof notifications[0];
  const groups: { label: string; items: Notif[] }[] = [];
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const n of filtered) {
    const d = new Date(n.createdAt).toDateString();
    const label = d === today ? "Today" : d === yesterday ? "Yesterday" : new Date(n.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl text-amber-100">Notifications</h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-400">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {(["all", "unread", "likes", "follows", "sales", "comments"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-amber-500 text-stone-950" : "border border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Bell size={40} className="text-stone-700" />
            <p className="text-stone-500 text-lg">Nothing here yet.</p>
            <p className="text-stone-600 text-sm">When artists you follow post, sell, or interact with you — it'll show up here.</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label} className="mb-8">
            <p className="mb-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">{group.label}</p>
            <div className="flex flex-col gap-1">
              {group.items.map((n) => {
                const meta = ICON_MAP[n.type] ?? ICON_MAP.comment;
                const Icon = meta.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 rounded-xl px-4 py-3.5 transition-colors ${
                      !n.read ? "bg-amber-500/5 border border-amber-500/10" : "bg-stone-900/40 border border-transparent hover:border-white/8"
                    }`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-800 ${meta.color}`}>
                      <Icon size={14} />
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? "text-stone-200" : "text-stone-400"}`}>
                        {n.text}
                      </p>
                      <p className="mt-0.5 text-[11px] text-stone-600">{timeAgo(n.createdAt)}</p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-xs text-stone-700">Notifications are kept for 90 days.</p>
          </div>
        )}
      </div>
    </div>
  );
}
