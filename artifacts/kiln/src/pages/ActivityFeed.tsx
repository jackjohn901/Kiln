import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Heart, Bookmark, UserPlus, Repeat2, Flame,
  Users, ChevronRight, Sparkles, DollarSign, MessageCircle, Star, Loader2,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

interface ApiNotification {
  id: string;
  type: string;
  fromId: string | null;
  fromName: string | null;
  fromAvatarUrl: string | null;
  text: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  type: "like" | "save" | "follow" | "repost" | "tip" | "commission" | "subscription" | "comment" | "bid" | "mention";
  actorId: string;
  actorName: string;
  actorAvatar: string;
  text: string;
  link: string;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  like: { icon: Heart, color: "text-red-400", bg: "bg-red-500/10" },
  save: { icon: Bookmark, color: "text-amber-400", bg: "bg-amber-500/10" },
  follow: { icon: UserPlus, color: "text-blue-400", bg: "bg-blue-500/10" },
  repost: { icon: Repeat2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  tip: { icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  commission: { icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
  subscription: { icon: Star, color: "text-amber-400", bg: "bg-amber-500/10" },
  comment: { icon: MessageCircle, color: "text-stone-400", bg: "bg-stone-500/10" },
  bid: { icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" },
  mention: { icon: MessageCircle, color: "text-purple-400", bg: "bg-purple-500/10" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function notificationToActivity(n: ApiNotification): ActivityItem {
  return {
    id: n.id,
    type: (["like","save","follow","repost","tip","commission","subscription","comment","bid","mention"].includes(n.type) ? n.type : "mention") as ActivityItem["type"],
    actorId: n.fromId ?? "unknown",
    actorName: n.fromName ?? "Someone",
    actorAvatar: n.fromAvatarUrl ?? `https://picsum.photos/seed/${n.fromId ?? "x"}/80/80`,
    text: n.text,
    link: n.link ?? "/",
    createdAt: n.createdAt,
  };
}

export default function ActivityFeed() {
  const { profile } = useProfile();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    fetch("/api/notifications", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: { notifications?: ApiNotification[] } | null) => {
        if (Array.isArray(d?.notifications)) {
          setItems(d.notifications.map(notificationToActivity));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile]);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 pb-32 pt-6">
        <div className="mb-6">
          <h1 className="font-serif text-3xl text-amber-100 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" /> Activity
          </h1>
          <p className="text-sm text-stone-500 mt-1">Your recent notifications and interactions</p>
        </div>

        {!profile && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-8 text-center mb-6">
            <Users size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-400 text-sm mb-1">Sign in to see your activity</p>
            <Link href="/setup">
              <button className="mt-3 rounded-full border border-amber-500/30 px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors">
                Set up profile
              </button>
            </Link>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-stone-600">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading activity…</span>
          </div>
        )}

        {!loading && items.length === 0 && profile && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-10 text-center">
            <Sparkles size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-400 text-sm">No activity yet — post content to start getting interactions</p>
            <Link href="/create">
              <button className="mt-4 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                Create a post
              </button>
            </Link>
          </div>
        )}

        <div className="space-y-1">
          {items.map((item, i) => {
            const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.mention;
            const Icon = cfg.icon;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link href={item.link}>
                  <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/[0.03] transition-colors cursor-pointer group">
                    <div className="relative shrink-0">
                      <img
                        src={item.actorAvatar}
                        alt={item.actorName}
                        className="h-10 w-10 rounded-full object-cover border border-white/10"
                        onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.actorId}/80/80`; }}
                      />
                      <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ${cfg.bg}`}>
                        <Icon size={10} className={cfg.color} />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-300">
                        <span className="font-semibold text-stone-100">{item.actorName}</span>{" "}
                        {item.text}
                      </p>
                      <p className="text-[11px] text-stone-600 mt-0.5">{timeAgo(item.createdAt)}</p>
                    </div>
                    <ChevronRight size={14} className="text-stone-700 group-hover:text-stone-500 transition-colors shrink-0" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
