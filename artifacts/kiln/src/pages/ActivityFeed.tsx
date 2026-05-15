import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Heart, Bookmark, UserPlus, Repeat2, Flame,
  Users, ChevronRight, Sparkles,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { ALL_REELS } from "@/data/reels";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

const ALL_ARTISTS = [...artists, ...seedArtists];

function getAvatar(artistId: string) {
  const a = ALL_ARTISTS.find((x) => x.id === artistId);
  return a?.images?.[0]?.url ?? `https://picsum.photos/seed/${artistId}/80/80`;
}

const SEED_ACTIVITY = [
  { id: "sa1", type: "like" as const, actorId: "alex-bernstein", actorName: "Alex Bernstein", actorAvatar: "", targetId: "maya-chen-dQhKVFbpZoQ", targetName: "Maya Chen's celadon vessel", targetLink: "/posts/maya-chen-dQhKVFbpZoQ", thumbnailUrl: "https://img.youtube.com/vi/dQhKVFbpZoQ/hqdefault.jpg", createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
  { id: "sa2", type: "follow" as const, actorId: "dante-marioni", actorName: "Dante Marioni", actorAvatar: "", targetId: "erica-rosenfeld", targetName: "Erica Rosenfeld", targetLink: "/artists/erica-rosenfeld", createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString() },
  { id: "sa3", type: "save" as const, actorId: "richard-royal", actorName: "Richard Royal", actorAvatar: "", targetId: "james-okafor-8P8U8PzFHV8", targetName: "James Okafor's slip-cast series", targetLink: "/posts/james-okafor-8P8U8PzFHV8", thumbnailUrl: "https://img.youtube.com/vi/8P8U8PzFHV8/hqdefault.jpg", createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: "sa4", type: "repost" as const, actorId: "caleb-siemon", actorName: "Caleb Siemon", actorAvatar: "", targetId: "lino-tagliapietra-ABC123", targetName: "Lino Tagliapietra's murrine", targetLink: "/", thumbnailUrl: "https://picsum.photos/seed/lino-reel/400/600", createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: "sa5", type: "like" as const, actorId: "laura-donefer", actorName: "Laura Donefer", actorAvatar: "", targetId: "alex-bernstein-XYZ456", targetName: "Alex Bernstein's optical prism", targetLink: "/", thumbnailUrl: "https://img.youtube.com/vi/lvOjWStv_Q0/hqdefault.jpg", createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString() },
  { id: "sa6", type: "follow" as const, actorId: "maya-chen", actorName: "Maya Chen", actorAvatar: "", targetId: "takeshi-mori", targetName: "Takeshi Mori", targetLink: "/artists/takeshi-mori", createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString() },
  { id: "sa7", type: "save" as const, actorId: "erica-rosenfeld", actorName: "Erica Rosenfeld", actorAvatar: "", targetId: "sa-reel-1", targetName: "Dante Marioni's cane pull demo", targetLink: "/", thumbnailUrl: "https://picsum.photos/seed/dante-reel/400/600", createdAt: new Date(Date.now() - 1000 * 60 * 260).toISOString() },
  { id: "sa8", type: "repost" as const, actorId: "james-okafor", actorName: "James Okafor", actorAvatar: "", targetId: "sa-reel-2", targetName: "Richard Royal's wave series", targetLink: "/", thumbnailUrl: "https://picsum.photos/seed/royal-reel/400/600", createdAt: new Date(Date.now() - 1000 * 60 * 320).toISOString() },
];

const TYPE_CONFIG = {
  like: { icon: Heart, color: "text-red-400", bg: "bg-red-500/10", label: "liked" },
  save: { icon: Bookmark, color: "text-amber-400", bg: "bg-amber-500/10", label: "saved" },
  follow: { icon: UserPlus, color: "text-blue-400", bg: "bg-blue-500/10", label: "followed" },
  repost: { icon: Repeat2, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "amplified" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function ActivityFeed() {
  const { activityFeed, following } = useSocial();

  const combined = [
    ...SEED_ACTIVITY.filter((a) => following.includes(a.actorId) || true),
    ...activityFeed,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 pb-32 pt-6">

        <div className="mb-6">
          <h1 className="font-serif text-3xl text-amber-100 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" /> Activity
          </h1>
          <p className="text-sm text-stone-500 mt-1">What the artists you follow are doing</p>
        </div>

        {following.length === 0 && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-8 text-center mb-6">
            <Users size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-400 text-sm mb-1">Follow some artists to see their activity here</p>
            <Link href="/discover">
              <button className="mt-3 rounded-full border border-amber-500/30 px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors">
                Discover artists
              </button>
            </Link>
          </div>
        )}

        <div className="space-y-1">
          {combined.map((item, i) => {
            const cfg = TYPE_CONFIG[item.type];
            const Icon = cfg.icon;
            const avatar = item.actorAvatar || getAvatar(item.actorId);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 rounded-2xl p-3 hover:bg-white/3 transition-colors group"
              >
                {/* Actor avatar */}
                <Link href={`/artists/${item.actorId}`}>
                  <img src={avatar} alt={item.actorName}
                    className="h-10 w-10 rounded-full object-cover border border-white/10 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.actorId}/80/80`; }}
                  />
                </Link>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-300 leading-snug">
                    <Link href={`/artists/${item.actorId}`}>
                      <span className="font-semibold text-stone-100 hover:text-amber-300 transition-colors">{item.actorName}</span>
                    </Link>
                    {" "}
                    <span className={cfg.color}>{cfg.label}</span>
                    {" "}
                    <Link href={item.targetLink}>
                      <span className="text-stone-400 hover:text-stone-200 transition-colors">{item.targetName}</span>
                    </Link>
                  </p>
                  <p className="text-[11px] text-stone-700 mt-0.5">{timeAgo(item.createdAt)}</p>
                </div>

                {/* Thumbnail or icon */}
                {item.thumbnailUrl ? (
                  <Link href={item.targetLink}>
                    <div className="h-12 w-9 rounded-lg overflow-hidden bg-stone-800 shrink-0 border border-white/8 group-hover:border-white/15 transition-colors">
                      <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  </Link>
                ) : (
                  <div className={`h-9 w-9 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={cfg.color} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {combined.length === 0 && following.length > 0 && (
          <div className="py-16 text-center">
            <Flame size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No recent activity from artists you follow</p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/5 bg-stone-900/30 p-4">
          <p className="text-xs text-stone-600 flex items-center gap-1.5">
            <Sparkles size={11} className="text-amber-500/50" />
            Activity updates as the artists you follow like, save, and amplify works on Kiln
          </p>
        </div>
      </div>
    </div>
  );
}
