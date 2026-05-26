import { useState } from "react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, ChevronLeft, Play, Pause, Send, Flame,
  Users, Sparkles, Video, MessageCircle, Plus, X,
} from "lucide-react";
import Nav from "@/components/Nav";
import { ALL_REELS, getReelById } from "@/data/reels";
import { getArtistById, artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useProfile } from "@/contexts/ProfileContext";
import { motion as m } from "framer-motion";
import RelativeTime, { relativeLabel } from "@/components/RelativeTime";

const ALL_ARTISTS = [...artists, ...seedArtists];

function getAvatar(artistId: string) {
  const a = getArtistById(artistId) ?? ALL_ARTISTS.find((x) => x.id === artistId);
  return a?.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${artistId}`;
}

const FEATURED_DIALOGUES = [
  {
    id: "dial-001",
    originalReelId: ALL_REELS[0]?.id ?? "reel1",
    originalArtistId: ALL_REELS[0]?.artistId ?? "alex-bernstein",
    originalArtistName: ALL_REELS[0]?.artistName ?? "Alex Bernstein",
    originalCaption: ALL_REELS[0]?.caption ?? "Optical glass series",
    originalThumb: ALL_REELS[0]?.thumbnail ?? "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=700&fit=crop&seed=dial1",
    responseArtistId: "maya-chen",
    responseArtistName: "Maya Chen",
    responseCaption: "Responding to Alex's optical series — trying a similar optical approach in ceramic. The way light refracts through glazed surfaces has always fascinated me.",
    responseThumb: `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=700&fit=crop&seed=maya-response`,
    responseVideoId: "dQhKVFbpZoQ",
    views: 4821,
    replies: 23,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "dial-002",
    originalReelId: ALL_REELS[2]?.id ?? "reel3",
    originalArtistId: ALL_REELS[2]?.artistId ?? "lino-tagliapietra",
    originalArtistName: ALL_REELS[2]?.artistName ?? "Lino Tagliapietra",
    originalCaption: ALL_REELS[2]?.caption ?? "Murrine technique",
    originalThumb: ALL_REELS[2]?.thumbnail ?? "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=700&fit=crop&seed=dial2",
    responseArtistId: "dante-marioni",
    responseArtistName: "Dante Marioni",
    responseCaption: "Lino's murrine cane technique is the foundation of everything I do. Here's how I've adapted it for blown vessels — the key difference is timing the gather.",
    responseThumb: `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=700&fit=crop&seed=dante-response`,
    responseVideoId: "7xZfRTsNBos",
    views: 12400,
    replies: 61,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];

const SUGGESTED_REELS = ALL_REELS.slice(0, 8);

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}


export default function StudioDialogue() {
  const { profile } = useProfile();
  const [creating, setCreating] = useState(false);
  const [selectedReel, setSelectedReel] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  function handleSubmit() {
    if (!selectedReel || !responseText.trim()) return;
    setSubmitted(true);
    setTimeout(() => { setCreating(false); setSubmitted(false); setSelectedReel(null); setResponseText(""); }, 2000);
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">

        <div className="mb-7 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-amber-100 flex items-center gap-2">
              <Mic2 size={22} className="text-amber-400" /> Studio Dialogue
            </h1>
            <p className="text-sm text-stone-500 mt-1">Respond to another artist's work with your own craft perspective</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors shrink-0"
          >
            <Plus size={14} /> Start dialogue
          </button>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 mb-6 flex items-start gap-3">
          <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-stone-400 leading-relaxed">
            Studio Dialogue is Kiln's answer to the duet. Pick any reel on the platform,
            record your craft response, and your work appears side-by-side with theirs.
            Great for technique responses, cross-medium experiments, and mentorship exchanges.
          </p>
        </div>

        {/* Featured dialogues */}
        <div className="space-y-4">
          {FEATURED_DIALOGUES.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/8 bg-stone-900/50 overflow-hidden"
            >
              {/* Side-by-side thumbnails */}
              <div className="flex">
                <div className="relative flex-1 aspect-[9/14] overflow-hidden bg-stone-800">
                  <img src={d.originalThumb} alt={d.originalCaption}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=700&fit=crop&seed=${d.id}-orig`; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src={getAvatar(d.originalArtistId)} alt={d.originalArtistName}
                        className="h-5 w-5 rounded-full border border-white/30 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${d.originalArtistId}`; }}
                      />
                      <span className="text-[10px] text-white/80 font-medium">{d.originalArtistName}</span>
                    </div>
                    <p className="text-[9px] text-white/60 line-clamp-2">{d.originalCaption}</p>
                  </div>
                  <div className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[9px] text-white/70">
                    Original
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-amber-500/30 relative flex items-center justify-center z-10">
                  <div className="absolute h-8 w-8 rounded-full bg-amber-500 border-2 border-stone-900 flex items-center justify-center shadow-lg">
                    <Mic2 size={12} className="text-stone-950" />
                  </div>
                </div>

                <div className="relative flex-1 aspect-[9/14] overflow-hidden bg-stone-800">
                  {playingId === d.id ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${d.responseVideoId}?autoplay=1&mute=0&controls=0&loop=1&rel=0&playsinline=1&playlist=${d.responseVideoId}`}
                      className="w-full h-full border-none"
                      allow="autoplay; encrypted-media"
                    />
                  ) : (
                    <>
                      <img src={d.responseThumb} alt={d.responseCaption}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=700&fit=crop&seed=${d.id}-resp`; }}
                      />
                      <button
                        onClick={() => setPlayingId(playingId === d.id ? null : d.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors"
                      >
                        <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                          <Play size={18} className="text-white ml-1" fill="white" />
                        </div>
                      </button>
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src={getAvatar(d.responseArtistId)} alt={d.responseArtistName}
                        className="h-5 w-5 rounded-full border border-amber-400/50 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${d.responseArtistId}`; }}
                      />
                      <span className="text-[10px] text-amber-300 font-medium">{d.responseArtistName}</span>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 rounded-full bg-amber-500/80 px-2 py-0.5 text-[9px] text-stone-950 font-bold">
                    Response
                  </div>
                </div>
              </div>

              {/* Response caption + stats */}
              <div className="p-4">
                <p className="text-sm text-stone-300 leading-relaxed mb-3">{d.responseCaption}</p>
                <div className="flex items-center gap-4 text-xs text-stone-600">
                  <span className="flex items-center gap-1"><Flame size={11} className="text-amber-500" /> {fmt(d.views)} views</span>
                  <span className="flex items-center gap-1"><MessageCircle size={11} /> {d.replies} replies</span>
                  <RelativeTime since={d.createdAt} className="ml-auto text-xs text-stone-500" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Create dialogue sheet */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setCreating(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-stone-900 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <h2 className="font-semibold text-stone-200 flex items-center gap-2">
                  <Mic2 size={16} className="text-amber-400" /> Start a Studio Dialogue
                </h2>
                <button onClick={() => setCreating(false)} className="p-1 rounded-full hover:bg-white/5">
                  <X size={16} className="text-stone-500" />
                </button>
              </div>

              {submitted ? (
                <div className="p-10 text-center">
                  <div className="text-4xl mb-3">🔥</div>
                  <p className="font-semibold text-stone-200 mb-1">Dialogue started!</p>
                  <p className="text-sm text-stone-500">Your response has been posted alongside the original.</p>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-3">1. Choose a reel to respond to</p>
                    <div className="grid grid-cols-4 gap-2">
                      {SUGGESTED_REELS.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setSelectedReel(r.id)}
                          className={`relative aspect-[9/14] rounded-xl overflow-hidden border-2 transition-colors ${
                            selectedReel === r.id ? "border-amber-500" : "border-transparent"
                          }`}
                        >
                          <img src={r.thumbnail} alt={r.caption}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=350&fit=crop&seed=${r.id}`; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-1 left-1 right-1">
                            <p className="text-[8px] text-white/80 line-clamp-1">{r.artistName}</p>
                          </div>
                          {selectedReel === r.id && (
                            <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                              <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                                <Play size={10} className="text-stone-950 ml-0.5" fill="currentColor" />
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-2">2. Your response</p>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Describe your perspective — how does this work inform, challenge, or inspire your own practice?"
                      rows={4}
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="rounded-xl border border-white/8 bg-stone-800/40 p-3">
                    <p className="text-xs text-stone-500 flex items-center gap-2">
                      <Video size={12} className="text-amber-400 shrink-0" />
                      In the full app, you'd upload or record a video response here. Your work appears side-by-side with the original.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setCreating(false)} className="flex-1 rounded-full border border-white/10 py-2.5 text-sm text-stone-400 hover:border-white/20 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!selectedReel || !responseText.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
                    >
                      <Send size={13} /> Post dialogue
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
