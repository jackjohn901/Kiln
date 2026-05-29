import { useState } from "react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, Play, Send,
  Sparkles, Video, Plus, X,
} from "lucide-react";
import Nav from "@/components/Nav";
import { ALL_REELS, getReelById } from "@/data/reels";
import { useProfile } from "@/contexts/ProfileContext";

const SUGGESTED_REELS = ALL_REELS.slice(0, 8);


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
        <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-10 text-center">
          <Mic2 size={26} className="text-stone-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-300">No dialogues yet</p>
          <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">Be the first to respond to another artist's work and start a studio dialogue.</p>
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
                  <p className="font-semibold text-stone-200 mb-1">Thanks for trying it out</p>
                  <p className="text-sm text-stone-500">Studio Dialogue is a preview — video responses aren't live yet, so nothing was posted.</p>
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
