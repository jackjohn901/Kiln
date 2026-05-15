import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, ChevronRight, MessageCircle, ChevronLeft, CheckCircle2 } from "lucide-react";
import Nav from "@/components/Nav";
import { GUILDS } from "@/data/guilds";
import { useSocial } from "@/contexts/SocialContext";

const SAVED_KEY = "kiln_guilds_joined";

function getJoined(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
}
function saveJoined(ids: string[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); } catch {}
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function Guilds() {
  const { isFollowing } = useSocial();

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        {/* Header */}
        <div className="mb-8 flex items-start gap-3">
          <Link href="/discover" className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Craft Guilds</h1>
            <p className="mt-1 text-sm text-stone-500">
              Technique-based communities for craft artists. Join guilds to connect, share, and learn.
            </p>
          </div>
        </div>

        {/* Guild cards */}
        <div className="flex flex-col gap-4">
          {GUILDS.map((guild, i) => (
            <GuildCard key={guild.id} guild={guild} index={i} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl border border-white/8 bg-stone-900/40 p-6 text-center">
          <MessageCircle size={28} className="mx-auto mb-3 text-stone-600" />
          <h3 className="font-semibold text-stone-300 mb-1">Don't see your craft?</h3>
          <p className="text-sm text-stone-500 mb-4">
            Guilds are community-founded. If you're a craft artist without a home here, start one.
          </p>
          <a
            href="mailto:guilds@kiln.art"
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 px-5 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            Propose a new guild
          </a>
        </div>
      </div>
    </div>
  );
}

function GuildCard({ guild, index }: { guild: typeof GUILDS[0]; index: number }) {
  const joined = getJoined().includes(guild.id);

  function toggleJoin(e: React.MouseEvent) {
    e.preventDefault();
    const current = getJoined();
    const next = current.includes(guild.id) ? current.filter((id) => id !== guild.id) : [...current, guild.id];
    saveJoined(next);
    window.dispatchEvent(new Event("guilds-updated"));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/guilds/${guild.id}`}>
        <div className="group overflow-hidden rounded-2xl border border-white/8 bg-stone-900/60 hover:border-white/16 transition-all">
          {/* Banner */}
          <div className="relative h-28 overflow-hidden">
            <img
              src={guild.bannerUrl}
              alt={guild.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${guild.id}/800/200`; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 to-black/30" />
            <div className="absolute bottom-3 left-4 flex items-center gap-2">
              <span className="text-3xl">{guild.emoji}</span>
              <div>
                <h2 className="font-bold text-white text-base leading-tight">{guild.name}</h2>
                <p className="text-[11px] text-white/60">{guild.medium}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-4">
            <p className="text-sm text-stone-400 leading-relaxed mb-4">{guild.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <Users size={11} /> {formatCount(guild.memberCount)} members
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={11} /> {formatCount(guild.postCount)} posts
                </span>
              </div>

              <div className="flex items-center gap-2">
                {joined && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle2 size={11} /> Member
                  </span>
                )}
                <button
                  onClick={toggleJoin}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    joined
                      ? "border border-stone-700 text-stone-500 hover:border-red-500/40 hover:text-red-400"
                      : "bg-amber-500 text-stone-950 hover:bg-amber-400"
                  }`}
                >
                  {joined ? "Leave" : "Join"}
                </button>
                <ChevronRight size={15} className="text-stone-600 group-hover:text-stone-400 transition-colors" />
              </div>
            </div>

            {/* Members preview */}
            <div className="mt-3 flex items-center gap-1.5">
              {guild.members.slice(0, 6).map((m) => (
                <img
                  key={m.artistId}
                  src={m.avatarUrl}
                  alt={m.name}
                  className="h-6 w-6 rounded-full border-2 border-stone-950 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${m.artistId}/60/60`; }}
                />
              ))}
              {guild.memberCount > 6 && (
                <span className="text-[11px] text-stone-600 ml-1">+{formatCount(guild.memberCount - 6)} more</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
