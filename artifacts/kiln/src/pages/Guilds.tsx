import { useState, useEffect } from "react";
import { markFeatureVisited } from "@/lib/featureDiscovery";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, ChevronRight, MessageCircle, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";

interface Guild {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  technique: string | null;
  imageUrl: string | null;
  memberCount: number;
  postCount: number;
  isPublic: boolean;
  isJoined: boolean;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function GuildCard({ guild, onToggle }: { guild: Guild; onToggle: (id: string) => void }) {
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/guilds/${guild.id}/join`, { method: "POST", credentials: "include" });
      if (r.ok) onToggle(guild.id);
    } catch {}
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4 hover:bg-stone-900/70 transition-colors">
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-stone-800">
        {guild.imageUrl ? (
          <img src={guild.imageUrl} alt={guild.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-lg">
            {guild.technique?.includes("Glass") ? "🔥" : guild.technique?.includes("Ceramic") ? "🏺" : guild.technique?.includes("Metal") ? "⚒️" : guild.technique?.includes("Fiber") ? "🧵" : "🎨"}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-stone-100 text-sm">{guild.name}</h3>
            {guild.technique && <p className="text-xs text-amber-400/80 mt-0.5">{guild.technique}</p>}
          </div>
          <button onClick={handleJoin} disabled={loading}
            className={`flex-shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              guild.isJoined
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/5"
                : "border-stone-600 text-stone-400 hover:border-amber-500/40 hover:text-amber-300"
            }`}>
            {loading ? <Loader2 size={10} className="animate-spin" /> : guild.isJoined ? <><CheckCircle2 size={11} />Joined</> : "Join"}
          </button>
        </div>
        {guild.description && <p className="mt-1.5 text-xs text-stone-500 line-clamp-2 leading-relaxed">{guild.description}</p>}
        <div className="mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-stone-600">
            <Users size={10} /> {formatCount(guild.memberCount)} members
          </span>
          {guild.postCount > 0 && (
            <span className="text-[11px] text-stone-700">{formatCount(guild.postCount)} posts</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Guilds() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { markFeatureVisited("guilds"); }, []);

  useEffect(() => {
    fetch("/api/guilds", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setGuilds(data.guilds ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (guildId: string) => {
    setGuilds(prev => prev.map(g => g.id === guildId ? { ...g, isJoined: !g.isJoined, memberCount: g.isJoined ? g.memberCount - 1 : g.memberCount + 1 } : g));
  };

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        <div className="mb-8 flex items-start gap-3">
          <Link href="/discover" className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Craft Guilds</h1>
            <p className="mt-1 text-sm text-stone-500">Technique-based communities for craft artists. Join guilds to connect, share, and learn.</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-stone-600" />
          </div>
        )}

        {!loading && guilds.length === 0 && (
          <div className="py-16 text-center">
            <Users size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No guilds yet.</p>
            <p className="text-stone-600 text-xs mt-1">Be the first to propose one below.</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {guilds.map((guild, i) => (
            <GuildCard key={guild.id} guild={guild} onToggle={handleToggle} />
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-white/8 bg-stone-900/40 p-6 text-center">
          <MessageCircle size={28} className="mx-auto mb-3 text-stone-600" />
          <h3 className="font-semibold text-stone-300 mb-1">Don't see your craft?</h3>
          <p className="text-sm text-stone-500 mb-4">Guilds are community-founded. If you're a craft artist without a home here, start one.</p>
          <a href="mailto:guilds@kiln.art"
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 px-5 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors">
            Propose a new guild <ChevronRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
