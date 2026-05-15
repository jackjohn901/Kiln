import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MessageCircle, ChevronLeft, CheckCircle2, Heart, Share2, ExternalLink, BookOpen, Crown, Shield } from "lucide-react";
import Nav from "@/components/Nav";
import { getGuildById, type GuildMember } from "@/data/guilds";

const JOINED_KEY = "kiln_guilds_joined";

function getJoined(): string[] {
  try { return JSON.parse(localStorage.getItem(JOINED_KEY) ?? "[]"); } catch { return []; }
}
function saveJoined(ids: string[]) {
  try { localStorage.setItem(JOINED_KEY, JSON.stringify(ids)); } catch {}
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

const ROLE_BADGES: Record<GuildMember["role"], { label: string; icon: React.ElementType; color: string } | null> = {
  founder: { label: "Founder", icon: Crown, color: "text-amber-400" },
  moderator: { label: "Mod", icon: Shield, color: "text-sky-400" },
  member: null,
};

type Tab = "feed" | "members" | "events" | "resources";

export default function GuildDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const guild = getGuildById(id ?? "");
  const [joined, setJoined] = useState(() => getJoined().includes(id ?? ""));
  const [tab, setTab] = useState<Tab>("feed");
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setJoined(getJoined().includes(id ?? ""));
  }, [id]);

  function toggleJoin() {
    const current = getJoined();
    const next = current.includes(id ?? "") ? current.filter((i) => i !== id) : [...current, id ?? ""];
    saveJoined(next);
    setJoined(!joined);
  }

  if (!guild) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
          <p className="text-stone-500">Guild not found.</p>
          <Link href="/guilds" className="text-amber-400 hover:text-amber-300 text-sm">← Back to guilds</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />

      {/* Banner */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={guild.bannerUrl}
          alt={guild.name}
          className="h-full w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${guild.id}/1200/400`; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12100e] via-black/40 to-black/20" />
        <button
          onClick={() => navigate("/guilds")}
          className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-4">
        {/* Guild header */}
        <div className="flex items-end gap-4 -mt-8 mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-stone-950 bg-stone-800 text-3xl shadow-lg">
            {guild.emoji}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="font-serif text-xl text-amber-100 leading-tight">{guild.name}</h1>
            <p className="text-xs text-stone-500">{guild.medium}</p>
          </div>
          <button
            onClick={toggleJoin}
            className={`mb-1 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
              joined
                ? "border border-stone-700 text-stone-400 hover:border-red-500/40 hover:text-red-400"
                : "bg-amber-500 text-stone-950 hover:bg-amber-400"
            }`}
          >
            {joined ? <><CheckCircle2 size={14} /> Joined</> : "Join Guild"}
          </button>
        </div>

        {/* Stats */}
        <div className="mb-5 flex gap-5 text-xs text-stone-500">
          <span className="flex items-center gap-1"><Users size={12} /> {formatCount(guild.memberCount)} members</span>
          <span className="flex items-center gap-1"><MessageCircle size={12} /> {formatCount(guild.postCount)} posts</span>
          <span>Founded {new Date(guild.founded).getFullYear()}</span>
        </div>

        <p className="mb-6 text-sm text-stone-400 leading-relaxed">{guild.longDescription}</p>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-white/10 gap-1">
          {(["feed", "members", "events", "resources"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? "border-amber-400 text-amber-300" : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* FEED */}
          {tab === "feed" && (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {guild.posts.length === 0 ? (
                <div className="py-16 text-center text-stone-600">No posts yet. Be the first!</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {guild.posts.map((post) => (
                    <div key={post.id} className="overflow-hidden rounded-2xl border border-white/8 bg-stone-900/60">
                      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                        <img src={post.avatarUrl} alt={post.artistName} className="h-9 w-9 rounded-full object-cover border border-white/10"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${post.artistId}/80/80`; }} />
                        <div className="flex-1 min-w-0">
                          <Link href={`/artists/${post.artistId}`} className="text-sm font-semibold text-stone-200 hover:text-amber-300 transition-colors">
                            {post.artistName}
                          </Link>
                          <p className="text-[11px] text-stone-600">{timeAgo(post.createdAt)}</p>
                        </div>
                      </div>
                      <img
                        src={post.imageUrl}
                        alt={post.caption}
                        className="w-full aspect-video object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${post.id}/600/400`; }}
                      />
                      <div className="px-4 py-3">
                        <p className="text-sm text-stone-300 leading-relaxed">{post.caption}</p>
                        <div className="mt-3 flex items-center gap-4">
                          <button
                            onClick={() => setLikedPosts((p) => ({ ...p, [post.id]: !p[post.id] }))}
                            className={`flex items-center gap-1.5 text-xs transition-colors ${likedPosts[post.id] ? "text-rose-400" : "text-stone-500 hover:text-rose-400"}`}
                          >
                            <Heart size={14} fill={likedPosts[post.id] ? "currentColor" : "none"} />
                            {post.likes + (likedPosts[post.id] ? 1 : 0)}
                          </button>
                          <button className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors">
                            <Share2 size={13} /> Share
                          </button>
                          <Link href={`/artists/${post.artistId}`} className="ml-auto text-xs text-amber-500 hover:text-amber-400 transition-colors">
                            View profile →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Encourage posting */}
                  <div className="rounded-2xl border border-dashed border-white/12 p-6 text-center">
                    <p className="text-sm text-stone-500 mb-3">Share your work with the guild</p>
                    <Link href="/create" className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-5 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors">
                      + Post to guild
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* MEMBERS */}
          {tab === "members" && (
            <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col gap-3">
                {guild.members.map((member) => {
                  const badge = ROLE_BADGES[member.role];
                  const Icon = badge?.icon;
                  return (
                    <Link key={member.artistId} href={`/artists/${member.artistId}`}>
                      <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-stone-900/40 px-4 py-3 hover:border-white/16 transition-colors">
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="h-10 w-10 rounded-full object-cover border border-white/10"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${member.artistId}/80/80`; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-stone-200">{member.name}</span>
                            {badge && Icon && (
                              <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${badge.color}`}>
                                <Icon size={10} /> {badge.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500">{member.medium} · {member.location}</p>
                        </div>
                        <ChevronLeft size={14} className="text-stone-600 rotate-180" />
                      </div>
                    </Link>
                  );
                })}
                <p className="py-4 text-center text-xs text-stone-600">
                  + {formatCount(guild.memberCount - guild.members.length)} more members
                </p>
              </div>
            </motion.div>
          )}

          {/* EVENTS */}
          {tab === "events" && (
            <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {guild.events.length === 0 ? (
                <div className="py-20 text-center text-stone-600">No upcoming events. Check back soon.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {guild.events.map((ev, i) => (
                    <div key={i} className="rounded-2xl border border-white/8 bg-stone-900/60 p-5">
                      <p className="text-xs text-amber-400 font-semibold mb-1">
                        {new Date(ev.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      </p>
                      <h3 className="text-base font-bold text-amber-100 mb-1">{ev.title}</h3>
                      <p className="text-xs text-stone-500 mb-3 flex items-center gap-1">
                        <ExternalLink size={10} /> {ev.location}
                      </p>
                      <p className="text-sm text-stone-400 leading-relaxed">{ev.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* RESOURCES */}
          {tab === "resources" && (
            <motion.div key="resources" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col gap-3">
                {guild.resources.map((r, i) => (
                  <div key={i} className="rounded-xl border border-white/8 bg-stone-900/40 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-800">
                        <BookOpen size={13} className="text-stone-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-stone-200">{r.title}</p>
                        <p className="mt-0.5 text-xs text-stone-500 leading-relaxed">{r.description}</p>
                        <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          r.type === "guide" ? "bg-amber-500/10 text-amber-400" :
                          r.type === "glossary" ? "bg-sky-500/10 text-sky-400" :
                          r.type === "supplier" ? "bg-emerald-500/10 text-emerald-400" :
                          r.type === "community" ? "bg-purple-500/10 text-purple-400" :
                          "bg-stone-800 text-stone-400"
                        }`}>
                          {r.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Community rules */}
              <div className="mt-6 rounded-2xl border border-white/8 bg-stone-900/40 p-5">
                <h3 className="mb-3 text-sm font-bold text-stone-300">Guild Rules</h3>
                <ol className="flex flex-col gap-2">
                  {guild.rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-stone-500">
                      <span className="shrink-0 text-amber-500 font-bold">{i + 1}.</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-20" />
      </div>
    </div>
  );
}
