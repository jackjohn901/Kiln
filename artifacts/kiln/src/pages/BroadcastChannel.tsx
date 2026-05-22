import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { Bell, BellOff, Send, ChevronLeft, Lock, Loader2, Radio } from "lucide-react";
import { getArtistById } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import RelativeTime, { relativeLabel } from "@/components/RelativeTime";

interface Broadcast {
  id: string; artistId: string; artistName: string; artistAvatarUrl: string | null;
  content: string; mediaUrl: string | null; isPatronOnly: boolean; reachCount: number; createdAt: string;
}


export default function BroadcastChannel() {
  const { artistId } = useParams<{ artistId: string }>();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [content, setContent] = useState("");
  const [toggling, setToggling] = useState(false);
  const { profile } = useProfile();
  const isOwner = profile?.id === artistId;
  const artist = getArtistById(artistId) ?? seedArtists.find(a => a.id === artistId);

  useEffect(() => {
    fetch(`/api/broadcasts/${artistId}`, { credentials: "include" })
      .then(r => r.json()).then(d => {
        setBroadcasts(d.broadcasts ?? []);
        setIsSubscribed(d.isSubscribed ?? false);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [artistId]);

  async function toggleSubscribe() {
    setToggling(true);
    const method = isSubscribed ? "DELETE" : "POST";
    await fetch(`/api/broadcasts/${artistId}/subscribe`, { method, credentials: "include" });
    setIsSubscribed(!isSubscribed);
    setToggling(false);
  }

  async function handlePost() {
    if (!content.trim()) return;
    setPosting(true);
    const res = await fetch("/api/broadcasts", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (data.id) { setBroadcasts(b => [data, ...b]); setContent(""); }
    setPosting(false);
  }

  const artistName = artist?.name ?? broadcasts[0]?.artistName ?? "Artist";
  const artistAvatar = artist?.images?.[0]?.url ?? broadcasts[0]?.artistAvatarUrl ?? `https://picsum.photos/seed/${artistId}/80/80`;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href={`/artists/${artistId}`} className="flex items-center gap-1.5 text-stone-400 hover:text-amber-300 text-sm mb-6 transition-colors">
          <ChevronLeft size={15} /> Back to Profile
        </Link>

        <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-stone-900 border border-white/8">
          <img src={artistAvatar} alt={artistName} className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/30" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Radio size={13} className="text-amber-400" />
              <h1 className="font-bold text-stone-100 truncate">{artistName}</h1>
            </div>
            <p className="text-xs text-stone-500">Broadcast Channel · {broadcasts.length} messages</p>
          </div>
          {!isOwner && profile && (
            <button onClick={toggleSubscribe} disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${isSubscribed ? "bg-stone-800 text-stone-300 hover:bg-rose-500/10 hover:text-rose-400 border border-stone-700" : "bg-amber-500 text-stone-950 hover:bg-amber-400"}`}>
              {toggling ? <Loader2 size={14} className="animate-spin" /> : isSubscribed ? <><BellOff size={14} /> Subscribed</> : <><Bell size={14} /> Subscribe</>}
            </button>
          )}
        </div>

        {isOwner && (
          <div className="mb-6 rounded-2xl bg-stone-900 border border-white/8 p-4">
            <p className="text-xs text-stone-500 mb-2 font-medium uppercase tracking-wider">New Broadcast</p>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
              placeholder="Share an update with your followers…"
              className="w-full bg-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 resize-none outline-none focus:ring-1 focus:ring-amber-500 mb-3" />
            <button onClick={handlePost} disabled={!content.trim() || posting}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors">
              {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {posting ? "Sending…" : "Send"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-16">
            <Radio size={32} className="mx-auto text-stone-700 mb-3" />
            <p className="text-stone-500">No broadcasts yet</p>
            {!isOwner && <p className="text-xs text-stone-600 mt-1">Subscribe to get notified when {artistName} posts</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-stone-900 border border-white/5 p-4">
                <div className="flex items-start gap-3">
                  <img src={artistAvatar} alt={artistName} className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-stone-200">{artistName}</span>
                      {b.isPatronOnly && <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full"><Lock size={8} /> Patrons</span>}
                      <RelativeTime since={b.createdAt} className="text-xs text-stone-600 ml-auto" />
                    </div>
                    <p className="text-sm text-stone-300 leading-relaxed">{b.content}</p>
                    {b.mediaUrl && <img src={b.mediaUrl} alt="" className="mt-2 rounded-xl max-h-48 object-cover w-full" />}
                    {b.reachCount > 0 && <p className="text-xs text-stone-600 mt-2">{b.reachCount} reached</p>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
