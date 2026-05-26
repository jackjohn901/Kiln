import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Heart, Bookmark, Users, Crown, Star,
  TrendingUp, Share2, Award, Flame, Calendar,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

const ALL_ARTISTS = [...artists, ...seedArtists];

interface Milestone {
  id: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
  sublabel: string;
  date?: string;
}

const JOINED_DATE = "March 2025";

interface CollectorLevel {
  level: string; icon: string; color: string;
  totalSpentCents: number; nextLevel: string | null;
  nextLevelMinCents: number | null; progressPct: number;
}

const LEVEL_COLORS: Record<string, { badge: string; bar: string }> = {
  stone:  { badge: "border-stone-500/30 bg-stone-500/10 text-stone-400",  bar: "from-stone-500 to-stone-400" },
  amber:  { badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",  bar: "from-amber-500 to-amber-300" },
  orange: { badge: "border-orange-500/30 bg-orange-500/10 text-orange-400", bar: "from-orange-500 to-amber-400" },
  violet: { badge: "border-violet-500/30 bg-violet-500/10 text-violet-400", bar: "from-violet-500 to-violet-300" },
  yellow: { badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400", bar: "from-yellow-500 to-amber-300" },
};

export default function CollectorJourney() {
  const { following, subscriptions, reelLikes, reelSaves } = useSocial();
  const { profile } = useProfile();
  const [journeyCopied, setJourneyCopied] = useState(false);
  const [levelData, setLevelData] = useState<CollectorLevel | null>(null);

  useEffect(() => {
    fetch("/api/me/collector-level", { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: CollectorLevel) => setLevelData(d))
      .catch(() => {});
  }, []);

  const followedArtists = useMemo(() =>
    following.slice(0, 6).map((id) => ALL_ARTISTS.find((a) => a.id === id)).filter(Boolean),
    [following]
  );

  const milestones: Milestone[] = useMemo(() => {
    const ms: Milestone[] = [
      {
        id: "joined",
        icon: Flame,
        color: "text-amber-400",
        bg: "bg-amber-500/15 border-amber-500/30",
        label: "Joined Kiln",
        sublabel: "Your craft journey begins",
        date: JOINED_DATE,
      },
    ];

    if (following.length >= 1) {
      ms.push({
        id: "first-follow",
        icon: Heart,
        color: "text-rose-400",
        bg: "bg-rose-500/15 border-rose-500/30",
        label: "First artist followed",
        sublabel: `@${following[0]}`,
        date: "March 2025",
      });
    }
    if (following.length >= 5) {
      ms.push({
        id: "five-follows",
        icon: Users,
        color: "text-sky-400",
        bg: "bg-sky-500/15 border-sky-500/30",
        label: "Following 5 artists",
        sublabel: "Your taste is taking shape",
        date: "April 2025",
      });
    }
    if (Object.values(reelSaves).some(Boolean)) {
      ms.push({
        id: "first-save",
        icon: Bookmark,
        color: "text-violet-400",
        bg: "bg-violet-500/15 border-violet-500/30",
        label: "First reel saved",
        sublabel: "You're building a reference library",
        date: "April 2025",
      });
    }
    if (subscriptions.length >= 1) {
      ms.push({
        id: "first-patron",
        icon: Crown,
        color: "text-amber-400",
        bg: "bg-amber-500/20 border-amber-500/40",
        label: "Became a Patron",
        sublabel: `Supporting @${subscriptions[0]}`,
        date: "May 2025",
      });
    }
    if (Object.values(reelLikes).filter(Boolean).length >= 10) {
      ms.push({
        id: "ten-likes",
        icon: Star,
        color: "text-yellow-400",
        bg: "bg-yellow-500/15 border-yellow-500/30",
        label: "10 reels liked",
        sublabel: "Your taste is showing",
        date: "May 2025",
      });
    }
    if (following.length >= 10) {
      ms.push({
        id: "ten-follows",
        icon: TrendingUp,
        color: "text-emerald-400",
        bg: "bg-emerald-500/15 border-emerald-500/30",
        label: "Following 10 artists",
        sublabel: "Deep in the craft world now",
        date: "May 2025",
      });
    }
    if (subscriptions.length >= 3) {
      ms.push({
        id: "three-patrons",
        icon: Award,
        color: "text-amber-400",
        bg: "bg-amber-500/20 border-amber-500/40",
        label: "Patron of 3 artists",
        sublabel: "A true craft collector",
        date: "June 2025",
      });
    }
    if (Object.values(reelLikes).filter(Boolean).length >= 25) {
      ms.push({
        id: "twenty-five-likes",
        icon: Heart,
        color: "text-rose-400",
        bg: "bg-rose-500/15 border-rose-500/30",
        label: "25 reels liked",
        sublabel: "Your eye for craft is undeniable",
        date: "June 2025",
      });
    }
    if (following.length >= 20) {
      ms.push({
        id: "twenty-follows",
        icon: Users,
        color: "text-sky-400",
        bg: "bg-sky-500/15 border-sky-500/30",
        label: "Following 20 artists",
        sublabel: "You've built a serious orbit",
        date: "July 2025",
      });
    }
    if (subscriptions.length >= 5) {
      ms.push({
        id: "five-patrons",
        icon: Crown,
        color: "text-amber-300",
        bg: "bg-amber-500/25 border-amber-400/50",
        label: "Patron of 5 artists",
        sublabel: "You are the backbone of craft",
        date: "August 2025",
      });
    }
    if (Object.values(reelSaves).filter(Boolean).length >= 10) {
      ms.push({
        id: "ten-saves",
        icon: Bookmark,
        color: "text-violet-400",
        bg: "bg-violet-500/15 border-violet-500/30",
        label: "10 reels saved",
        sublabel: "A curated reference library taking shape",
        date: "July 2025",
      });
    }

    return ms;
  }, [following, subscriptions, reelLikes, reelSaves]);

  const stats = [
    { label: "Artists followed", value: following.length, icon: Users, color: "text-sky-400" },
    { label: "Reels saved", value: Object.values(reelSaves).filter(Boolean).length, icon: Bookmark, color: "text-violet-400" },
    { label: "Reels liked", value: Object.values(reelLikes).filter(Boolean).length, icon: Heart, color: "text-rose-400" },
    { label: "Patrons of", value: subscriptions.length, icon: Crown, color: "text-amber-400" },
  ];

  const completionPercent = Math.min(100, Math.round((milestones.length / 12) * 100));

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/collection">
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Your Collector Journey</h1>
            <p className="text-xs text-stone-500">Every great collection has a story</p>
          </div>
        </div>

        {/* Hero card */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-amber-950/30 to-stone-900 border border-amber-500/20 p-6">
          <div className="flex items-center gap-4 mb-5">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover border-2 border-amber-500/40" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-stone-800 border-2 border-amber-500/40 flex items-center justify-center">
                <Users size={22} className="text-stone-600" />
              </div>
            )}
            <div>
              <p className="font-serif text-xl text-amber-100">{profile?.name ?? "Craft Collector"}</p>
              <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                <Calendar size={10} /> Member since {JOINED_DATE}
              </p>
            </div>
          </div>

          {/* Collector level badge */}
          {levelData && (() => {
            const colors = LEVEL_COLORS[levelData.color] ?? LEVEL_COLORS.amber;
            const spentDollars = (levelData.totalSpentCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
            return (
              <div className={`mb-4 rounded-xl border p-3 ${colors.badge}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{levelData.icon}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">{levelData.level}</p>
                      <p className="text-[10px] opacity-70">{spentDollars} collected</p>
                    </div>
                  </div>
                  {levelData.nextLevel && (
                    <div className="text-right">
                      <p className="text-[10px] opacity-60">Next: {levelData.nextLevel}</p>
                      <p className="text-[10px] font-semibold opacity-80">{levelData.progressPct}%</p>
                    </div>
                  )}
                  {!levelData.nextLevel && (
                    <Crown size={14} className="opacity-80" />
                  )}
                </div>
                {levelData.nextLevel && (
                  <div className="h-1 w-full rounded-full bg-black/20 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${colors.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${levelData.progressPct}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    />
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-4 gap-3 mb-5">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <s.icon size={16} className={`${s.color} mx-auto mb-1`} />
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-stone-600 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-2 flex justify-between text-xs text-stone-500">
            <span>Journey progress</span>
            <span className="text-amber-400 font-semibold">{completionPercent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-stone-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>

          <button
            onClick={() => {
              const text = `My Kiln collector journey: ${following.length} artists followed, ${subscriptions.length} patrons, ${Object.values(reelSaves).filter(Boolean).length} reels saved. Building my craft collection at kiln.art`;
              navigator.clipboard.writeText(text).then(() => {
                setJourneyCopied(true);
                setTimeout(() => setJourneyCopied(false), 2500);
              }).catch(() => {});
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/30 py-2.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <Share2 size={13} /> {journeyCopied ? "Copied to clipboard!" : "Share your journey"}
          </button>
        </div>

        {/* Timeline */}
        <h2 className="text-sm font-semibold text-stone-400 mb-4 uppercase tracking-wider">Milestones</h2>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-stone-800" />
          <div className="space-y-4">
            {milestones.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="relative flex gap-4 pl-14"
              >
                <div className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border ${m.bg}`}>
                  <m.icon size={16} className={m.color} />
                </div>
                <div className="flex-1 rounded-2xl border border-white/8 bg-stone-900/60 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-200">{m.label}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{m.sublabel}</p>
                    </div>
                    {m.date && (
                      <span className="shrink-0 text-[10px] text-stone-700 mt-0.5">{m.date}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Upcoming */}
            {following.length < 5 && (
              <div className="relative flex gap-4 pl-14 opacity-40">
                <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-800">
                  <Users size={16} className="text-stone-600" />
                </div>
                <div className="flex-1 rounded-2xl border border-dashed border-stone-800 p-4">
                  <p className="text-xs text-stone-600 font-medium">Follow {5 - following.length} more artists to unlock next milestone</p>
                </div>
              </div>
            )}
            {subscriptions.length === 0 && (
              <div className="relative flex gap-4 pl-14 opacity-40">
                <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-800">
                  <Crown size={16} className="text-stone-600" />
                </div>
                <div className="flex-1 rounded-2xl border border-dashed border-stone-800 p-4">
                  <p className="text-xs text-stone-600 font-medium">Subscribe to an artist to become a Patron</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Artists you follow */}
        {followedArtists.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-stone-400 mb-4 uppercase tracking-wider">Artists in your orbit</h2>
            <div className="flex flex-wrap gap-3">
              {followedArtists.map((a) => {
                if (!a) return null;
                const avatar = a.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${a.id}`;
                return (
                  <Link key={a.id} href={`/artists/${a.id}`}>
                    <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
                      <img src={avatar} alt={a.name} className="h-12 w-12 rounded-full object-cover border-2 border-white/10 group-hover:border-amber-400/50 transition-colors" />
                      <p className="text-[10px] text-stone-500 group-hover:text-amber-300 transition-colors text-center max-w-[56px] truncate">{a.name.split(" ")[0]}</p>
                    </div>
                  </Link>
                );
              })}
              {following.length > 6 && (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-12 w-12 rounded-full bg-stone-800 border-2 border-white/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-stone-500">+{following.length - 6}</span>
                  </div>
                  <p className="text-[10px] text-stone-600">more</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
