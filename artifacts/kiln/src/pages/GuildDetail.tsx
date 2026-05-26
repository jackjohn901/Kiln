import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MessageCircle, ChevronLeft, CheckCircle2, Heart, Share2, ExternalLink, BookOpen, Crown, Shield, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import { getGuildById, type GuildMember } from "@/data/guilds";
import RelativeTime, { relativeLabel } from "@/components/RelativeTime";
import { Composer, PostCard, type CommunityPost } from "@/pages/Community";

const ROLE_BADGES: Record<GuildMember["role"], { label: string; icon: React.ElementType; color: string } | null> = {
  founder: { label: "Founder", icon: Crown, color: "text-amber-400" },
  moderator: { label: "Mod", icon: Shield, color: "text-sky-400" },
  member: null,
};

type Tab = "feed" | "discussions" | "members" | "events" | "resources";

interface ApiMember { userId: string; role: string; joinedAt: string; }
interface ApiMemberWithProfile extends ApiMember {
  displayName?: string;
  avatarUrl?: string;
  medium?: string;
  location?: string;
}

interface ApiGuild {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  technique: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
  postCount: number;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  isJoined: boolean;
  members: ApiMember[];
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}


const TECHNIQUE_EMOJI: Record<string, string> = {
  Ceramics: "🏺", Glasswork: "🔮", Woodwork: "🪵", Metalwork: "⚒️",
  "Fiber Arts": "🧵", Weaving: "🧶", Pottery: "🫙", Blacksmithing: "🔨",
  Flameworking: "🔥", "Glass Blowing": "💨",
};

const DEFAULT_RULES = [
  "Share your own work only — no reposting without credit.",
  "Keep critique constructive and specific.",
  "No spam, self-promotion, or off-topic links.",
  "Respect all skill levels — everyone is learning.",
  "Safety first: always note when sharing dangerous techniques.",
];

export default function GuildDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("feed");
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [apiGuild, setApiGuild] = useState<ApiGuild | null>(null);
  const [apiMembers, setApiMembers] = useState<ApiMemberWithProfile[]>([]);
  const [apiEvents, setApiEvents] = useState<{ title: string; date: string; location: string; description: string }[]>([]);
  const [discussionPosts, setDiscussionPosts] = useState<CommunityPost[]>([]);
  const [discussionsLoaded, setDiscussionsLoaded] = useState(false);

  const staticGuild = getGuildById(id ?? "");

  // Load guild discussions when tab is first opened
  useEffect(() => {
    if (tab !== "discussions" || discussionsLoaded || !id) return;
    const guildId = staticGuild?.id ?? apiGuild?.id ?? id;
    setDiscussionsLoaded(true);
    fetch(`/api/community/guilds/${guildId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.posts) setDiscussionPosts(data.posts); })
      .catch(() => {});
  }, [tab, discussionsLoaded, id, staticGuild, apiGuild]);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    if (staticGuild) { setLoading(false); return; }

    fetch(`/api/guilds/${id}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(async (data: ApiGuild) => {
        setApiGuild(data);
        setJoined(data.isJoined);
        const profiles = await Promise.all(
          data.members.map(m =>
            fetch(`/api/users/${m.userId}/profile`, { credentials: "include" })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        );
        setApiMembers(data.members.map((m, i) => ({
          ...m,
          displayName: profiles[i]?.displayName,
          avatarUrl: profiles[i]?.avatarUrl,
          medium: profiles[i]?.medium,
          location: profiles[i]?.location,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch(`/api/community-events`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { events: [] })
      .then(data => setApiEvents((data.events ?? []).map((e: { title: string; date: string; location?: string; city?: string; description?: string }) => ({
        title: e.title,
        date: e.date,
        location: e.location ?? e.city ?? "",
        description: e.description ?? "",
      }))))
      .catch(() => {});
  }, [id, staticGuild]);

  async function toggleJoin() {
    if (!apiGuild) return;
    setToggling(true);
    try {
      const r = await fetch(`/api/guilds/${apiGuild.id}/join`, { method: "POST", credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setJoined(data.joined);
        setApiGuild(prev => prev ? { ...prev, memberCount: prev.memberCount + (data.joined ? 1 : -1) } : prev);
      }
    } catch {}
    setToggling(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-stone-600" />
        </div>
      </div>
    );
  }

  if (!staticGuild && !apiGuild) {
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

  if (staticGuild) {
    const staticJoined = joined;
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="relative h-48 overflow-hidden">
          <img src={staticGuild.bannerUrl} alt={staticGuild.name} className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=400&fit=crop&seed=${staticGuild.id}`; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12100e] via-black/40 to-black/20" />
          <button onClick={() => navigate("/guilds")}
            className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors">
            <ChevronLeft size={16} />
          </button>
        </div>
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex items-end gap-4 -mt-8 mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-stone-950 bg-stone-800 text-3xl shadow-lg">
              {staticGuild.emoji}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="font-serif text-xl text-amber-100 leading-tight">{staticGuild.name}</h1>
              <p className="text-xs text-stone-500">{staticGuild.medium}</p>
            </div>
            <button onClick={() => setJoined(!staticJoined)}
              className={`mb-1 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${staticJoined ? "border border-stone-700 text-stone-400 hover:border-red-500/40 hover:text-red-400" : "bg-amber-500 text-stone-950 hover:bg-amber-400"}`}>
              {staticJoined ? <><CheckCircle2 size={14} /> Joined</> : "Join Guild"}
            </button>
          </div>
          <div className="mb-5 flex gap-5 text-xs text-stone-500">
            <span className="flex items-center gap-1"><Users size={12} /> {formatCount(staticGuild.memberCount)} members</span>
            <span className="flex items-center gap-1"><MessageCircle size={12} /> {formatCount(staticGuild.postCount)} posts</span>
            <span>Founded {new Date(staticGuild.founded).getFullYear()}</span>
          </div>
          <p className="mb-6 text-sm text-stone-400 leading-relaxed">{staticGuild.longDescription}</p>
          <GuildTabs tab={tab} setTab={setTab} likedPosts={likedPosts} setLikedPosts={setLikedPosts}
            posts={staticGuild.posts} members={staticGuild.members.map(m => ({ userId: m.artistId, role: m.role, joinedAt: new Date().toISOString(), displayName: m.name, avatarUrl: m.avatarUrl, medium: m.medium, location: m.location }))}
            events={staticGuild.events} resources={staticGuild.resources} rules={staticGuild.rules}
            memberCount={staticGuild.memberCount}
            guildId={staticGuild.id}
            discussionPosts={discussionPosts}
            onDiscussionPosted={(p) => setDiscussionPosts((prev) => [p, ...prev])}
            onDiscussionDelete={(id) => setDiscussionPosts((prev) => prev.filter((p) => p.id !== id))} />
          <div className="h-20" />
        </div>
      </div>
    );
  }

  const guild = apiGuild!;
  const emoji = TECHNIQUE_EMOJI[guild.technique ?? ""] ?? "🔨";
  const bannerUrl = guild.bannerUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=400&fit=crop&seed=${guild.id}-banner`;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="relative h-48 overflow-hidden">
        <img src={bannerUrl} alt={guild.name} className="h-full w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=400&fit=crop&seed=${guild.id}`; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12100e] via-black/40 to-black/20" />
        <button onClick={() => navigate("/guilds")}
          className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors">
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-4">
        <div className="flex items-end gap-4 -mt-8 mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-stone-950 bg-stone-800 text-3xl shadow-lg">
            {emoji}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="font-serif text-xl text-amber-100 leading-tight">{guild.name}</h1>
            {guild.technique && <p className="text-xs text-stone-500">{guild.technique}</p>}
          </div>
          <button onClick={toggleJoin} disabled={toggling}
            className={`mb-1 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all disabled:opacity-60 ${joined ? "border border-stone-700 text-stone-400 hover:border-red-500/40 hover:text-red-400" : "bg-amber-500 text-stone-950 hover:bg-amber-400"}`}>
            {toggling ? <Loader2 size={14} className="animate-spin" /> : joined ? <><CheckCircle2 size={14} /> Joined</> : "Join Guild"}
          </button>
        </div>

        <div className="mb-5 flex gap-5 text-xs text-stone-500">
          <span className="flex items-center gap-1"><Users size={12} /> {formatCount(guild.memberCount)} members</span>
          <span className="flex items-center gap-1"><MessageCircle size={12} /> {formatCount(guild.postCount)} posts</span>
          <span>Est. {new Date(guild.createdAt).getFullYear()}</span>
        </div>

        {guild.description && <p className="mb-6 text-sm text-stone-400 leading-relaxed">{guild.description}</p>}

        <GuildTabs tab={tab} setTab={setTab} likedPosts={likedPosts} setLikedPosts={setLikedPosts}
          posts={[]} members={apiMembers} events={apiEvents} resources={[]} rules={DEFAULT_RULES}
          memberCount={guild.memberCount}
          guildId={guild.id}
          discussionPosts={discussionPosts}
          onDiscussionPosted={(p) => setDiscussionPosts((prev) => [p, ...prev])}
          onDiscussionDelete={(id) => setDiscussionPosts((prev) => prev.filter((p) => p.id !== id))} />

        <div className="h-20" />
      </div>
    </div>
  );
}

interface GuildTabsProps {
  tab: Tab;
  setTab: (t: Tab) => void;
  likedPosts: Record<string, boolean>;
  setLikedPosts: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  posts: { id: string; artistId: string; artistName: string; avatarUrl: string; imageUrl: string; caption: string; likes: number; createdAt: string }[];
  members: ApiMemberWithProfile[];
  events: { title: string; date: string; location: string; description: string }[];
  resources: { title: string; description: string; type: string; url?: string }[];
  rules: string[];
  memberCount: number;
  guildId: string;
  discussionPosts: CommunityPost[];
  onDiscussionPosted: (p: CommunityPost) => void;
  onDiscussionDelete: (id: string) => void;
}

const TAB_LABELS: Record<Tab, string> = {
  feed: "Feed",
  discussions: "Discussions",
  members: "Members",
  events: "Events",
  resources: "Resources",
};

function GuildTabs({ tab, setTab, likedPosts, setLikedPosts, posts, members, events, resources, rules, memberCount, guildId, discussionPosts, onDiscussionPosted, onDiscussionDelete }: GuildTabsProps) {
  return (
    <>
      <div className="mb-6 flex border-b border-white/10 gap-1 overflow-x-auto scrollbar-none">
        {(["feed", "discussions", "members", "events", "resources"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? "border-amber-400 text-amber-300" : "border-transparent text-stone-500 hover:text-stone-300"}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "feed" && (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {posts.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-stone-600 mb-4">No posts yet. Be the first to share!</p>
                <Link href="/create" className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-5 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors">
                  + Post to guild
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <div key={post.id} className="overflow-hidden rounded-2xl border border-white/8 bg-stone-900/60">
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      <img src={post.avatarUrl} alt={post.artistName} className="h-9 w-9 rounded-full object-cover border border-white/10"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${post.artistId}`; }} />
                      <div className="flex-1 min-w-0">
                        <Link href={`/artists/${post.artistId}`} className="text-sm font-semibold text-stone-200 hover:text-amber-300 transition-colors">
                          {post.artistName}
                        </Link>
                        <p className="text-[11px] text-stone-600"><RelativeTime since={post.createdAt} className="" /></p>
                      </div>
                    </div>
                    <img src={post.imageUrl} alt={post.caption} className="w-full aspect-video object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=${post.id}`; }} />
                    <div className="px-4 py-3">
                      <p className="text-sm text-stone-300 leading-relaxed">{post.caption}</p>
                      <div className="mt-3 flex items-center gap-4">
                        <button onClick={() => setLikedPosts((p) => ({ ...p, [post.id]: !p[post.id] }))}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${likedPosts[post.id] ? "text-rose-400" : "text-stone-500 hover:text-rose-400"}`}>
                          <Heart size={14} fill={likedPosts[post.id] ? "currentColor" : "none"} />
                          {post.likes + (likedPosts[post.id] ? 1 : 0)}
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/artists/${post.artistId}`).catch(() => {})}
                          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                          title="Copy link">
                          <Share2 size={13} /> Share
                        </button>
                        <Link href={`/artists/${post.artistId}`} className="ml-auto text-xs text-amber-500 hover:text-amber-400 transition-colors">
                          View profile →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
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

        {tab === "discussions" && (
          <motion.div key="discussions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex flex-col gap-4">
              <Composer
                placeholder="Start a discussion, ask a question, or share a tip…"
                guildId={guildId}
                onPosted={onDiscussionPosted}
              />
              {discussionPosts.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-stone-600 mb-2">No discussions yet.</p>
                  <p className="text-xs text-stone-700">Be the first to start a conversation in this guild.</p>
                </div>
              ) : (
                discussionPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={() => {}}
                    onDelete={onDiscussionDelete}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}

        {tab === "members" && (
          <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex flex-col gap-3">
              {members.map((member) => {
                const roleMap: Record<string, GuildMember["role"]> = { admin: "founder", moderator: "moderator", member: "member" };
                const role = roleMap[member.role] ?? "member";
                const badge = ROLE_BADGES[role];
                const Icon = badge?.icon;
                const name = member.displayName ?? member.userId;
                const avatar = member.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${member.userId}`;
                return (
                  <Link key={member.userId} href={`/artists/${member.userId}`}>
                    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-stone-900/40 px-4 py-3 hover:border-white/16 transition-colors">
                      <img src={avatar} alt={name} className="h-10 w-10 rounded-full object-cover border border-white/10"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${member.userId}`; }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-stone-200">{name}</span>
                          {badge && Icon && (
                            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${badge.color}`}>
                              <Icon size={10} /> {badge.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500">{[member.medium, member.location].filter(Boolean).join(" · ")}</p>
                      </div>
                      <ChevronLeft size={14} className="text-stone-600 rotate-180" />
                    </div>
                  </Link>
                );
              })}
              {memberCount > members.length && (
                <p className="py-4 text-center text-xs text-stone-600">
                  + {formatCount(memberCount - members.length)} more members
                </p>
              )}
            </div>
          </motion.div>
        )}

        {tab === "events" && (
          <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {events.length === 0 ? (
              <div className="py-20 text-center text-stone-600">No upcoming events. Check back soon.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {events.map((ev, i) => (
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

        {tab === "resources" && (
          <motion.div key="resources" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {resources.length > 0 && (
              <div className="flex flex-col gap-3 mb-6">
                {resources.map((r, i) => (
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
                        }`}>{r.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5">
              <h3 className="mb-3 text-sm font-bold text-stone-300">Guild Rules</h3>
              <ol className="flex flex-col gap-2">
                {rules.map((rule, i) => (
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
    </>
  );
}
