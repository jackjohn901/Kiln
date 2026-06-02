import { useState, useEffect } from "react";
import { markFeatureVisited } from "@/lib/featureDiscovery";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Users, Plus, X, MessageCircle, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import { toast } from "@/hooks/use-toast";

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
            {(() => {
              const t = guild.technique ?? "";
              if (t.includes("Glass")) return "🔥";
              if (t.includes("Ceramic") || t.includes("Pottery")) return "🏺";
              if (t.includes("Metal")) return "⚒️";
              if (t.includes("Fiber")) return "🧵";
              if (t.includes("Jewel")) return "💍";
              if (t.includes("Teach") || t.includes("Educat")) return "🎓";
              if (t.includes("Student") || t.includes("Learn")) return "📚";
              if (t.includes("Collect")) return "🖼️";
              if (t.includes("Wood")) return "🪵";
              return "🎨";
            })()}
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

function CreateGuildModal({ onClose, onCreated }: { onClose: () => void; onCreated: (g: Guild) => void }) {
  const [name, setName] = useState("");
  const [technique, setTechnique] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length >= 3 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/guilds", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          technique: technique.trim() || null,
          description: description.trim() || null,
          isPublic: true,
        }),
      });
      if (r.status === 401) {
        setError("Please sign in to create a community.");
        setSubmitting(false);
        return;
      }
      if (!r.ok) {
        setError("Couldn't create your community. Please try again.");
        setSubmitting(false);
        return;
      }
      const guild = await r.json();
      onCreated(guild);
    } catch {
      setError("Couldn't create your community. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1a1714] p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-amber-100">Start a community</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X size={18} /></button>
        </div>
        <p className="mb-5 text-sm text-stone-500">Create a focused guild for your craft. You'll be its first admin — invite others and get the conversation going.</p>

        <label className="mb-1 block text-xs font-medium text-stone-400">Community name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
          placeholder="e.g. Enamel &amp; Kiln Jewelers"
          className="mb-4 w-full rounded-xl border border-white/10 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none" />

        <label className="mb-1 block text-xs font-medium text-stone-400">Craft / focus <span className="text-stone-600">(optional)</span></label>
        <input value={technique} onChange={(e) => setTechnique(e.target.value)} maxLength={100}
          placeholder="e.g. Jewelry, Teaching, Collecting"
          className="mb-4 w-full rounded-xl border border-white/10 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none" />

        <label className="mb-1 block text-xs font-medium text-stone-400">What's it about? <span className="text-stone-600">(optional)</span></label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} rows={3}
          placeholder="A short welcome describing who this community is for."
          className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none" />

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        <button onClick={handleSubmit} disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {submitting ? "Creating…" : "Create community"}
        </button>
        {name.trim().length > 0 && name.trim().length < 3 && (
          <p className="mt-2 text-[11px] text-stone-600">Name needs at least 3 characters.</p>
        )}
      </motion.div>
    </div>
  );
}

export default function Guilds() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [, navigate] = useLocation();

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

  const handleCreated = (g: Guild) => {
    setShowCreate(false);
    toast({ title: "Community created", description: `${g.name} is live — you're its first admin.` });
    navigate(`/guilds/${g.id}`);
  };

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        <div className="mb-8 flex items-start gap-3">
          <Link href="/discover" className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100">Craft Guilds</h1>
            <p className="mt-1 text-sm text-stone-500">Technique-based communities for craft artists. Join guilds to connect, share, and learn.</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-stone-950 transition-colors hover:bg-amber-400">
            <Plus size={13} /> New
          </button>
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
          <p className="text-sm text-stone-500 mb-4">Guilds are community-founded. If you're a maker without a home here, start one — it takes a few seconds and you'll be its first admin.</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400">
            <Plus size={14} /> Start a community
          </button>
        </div>
      </div>

      {showCreate && <CreateGuildModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </div>
  );
}
