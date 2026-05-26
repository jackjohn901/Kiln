import { useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft, Play, Mic, Video, SplitSquareHorizontal, Upload,
  Check, Heart, Share2, ChevronRight, Flame,
} from "lucide-react";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { ALL_REELS } from "@/data/reels";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import BetaBanner from "@/components/BetaBanner";

const ALL_ARTISTS = [...artists, ...seedArtists];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const DUET_RESPONSES = [
  "Trying this technique in porcelain — the results were completely different 🔥",
  "Never seen this approach before. Had to try it myself",
  "Response to this glaze breakdown — my version at Cone 6",
  "Inspired by this method. Here's my take on the form",
  "Duetting with this because it changed how I approach handles",
  "Responding to this firing technique — tried it in my wood kiln",
];

const EXISTING_DUETS = ALL_REELS.slice(0, 6).map((r, i) => ({
  id: `duet-${r.id}-${i}`,
  responderName: ALL_ARTISTS[(hash(r.id) + i) % ALL_ARTISTS.length].name,
  responderId: ALL_ARTISTS[(hash(r.id) + i) % ALL_ARTISTS.length].id,
  responderAvatar: ALL_ARTISTS[(hash(r.id) + i) % ALL_ARTISTS.length].images[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${r.id}-duet-${i}`,
  thumbnail: `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=700&fit=crop&seed=${r.id}-duet-${i}`,
  caption: DUET_RESPONSES[(hash(r.id) + i) % DUET_RESPONSES.length],
  likes: 400 + (hash(r.id + i) % 8000),
  originalReel: r,
}));

type DuetStep = "browse" | "record" | "preview" | "done";

export default function DuetStudio() {
  const { reelId } = useParams<{ reelId: string }>();
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { reelLikes, toggleReelLike } = useSocial();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<DuetStep>("browse");
  const [layout, setLayout] = useState<"side-by-side" | "reaction" | "green-screen">("side-by-side");
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reel = ALL_REELS.find((r) => r.id === reelId);
  const existingDuets = reelId
    ? EXISTING_DUETS.filter((d) => d.originalReel.id === reelId)
    : EXISTING_DUETS;

  async function handlePublish() {
    if (!response.trim() || !profile) return;
    setSubmitting(true);
    try {
      await fetch("/api/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: response,
          mediaUrl: reel?.thumbnail ?? null,
          mediaType: "image",
          tags: ["duet"],
          technique: reel?.technique ?? null,
          duetOfId: reel?.id ?? null,
        }),
      });
    } catch { /* show done regardless */ }
    setSubmitting(false);
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center px-4 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
            <Check size={28} className="text-amber-400" />
          </div>
          <h2 className="font-serif text-2xl text-amber-100">Duet posted!</h2>
          <p className="text-sm text-stone-500 max-w-xs">Your response is now live alongside the original reel. The artist has been notified.</p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/">
              <button className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                Back to feed
              </button>
            </Link>
            <button onClick={() => { setStep("browse"); setResponse(""); }} className="rounded-full border border-stone-700 px-5 py-2.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">
              Create another
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === "record" && reel) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/8 bg-[#12100e]/95 backdrop-blur-md px-4 py-3">
          <button onClick={() => setStep("browse")} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-200 transition-colors">
            <ArrowLeft size={15} />
          </button>
          <p className="font-medium text-stone-300">Create Duet</p>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          {/* Original reel preview */}
          <div className="rounded-2xl border border-white/8 overflow-hidden">
            <div className="relative aspect-video bg-stone-900">
              <img
                src={reel.thumbnail}
                alt={reel.caption}
                className="w-full h-full object-cover opacity-80"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=340&fit=crop&seed=${reel.id}`; }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Play size={20} className="text-white fill-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80">
                <p className="text-xs font-semibold text-white">{reel.artistName}</p>
                <p className="text-[11px] text-stone-400 line-clamp-1">{reel.caption}</p>
              </div>
            </div>
          </div>

          {/* Layout picker */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-3">Duet layout</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "side-by-side", label: "Side by Side", icon: SplitSquareHorizontal },
                { id: "reaction", label: "Reaction", icon: Video },
                { id: "green-screen", label: "Green Screen", icon: Play },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setLayout(id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border py-3 px-2 text-center transition-colors ${layout === id ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-white/8 text-stone-500 hover:border-white/15"}`}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Response caption */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">Your response</p>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={`Responding to ${reel.artistName}'s ${reel.technique} reel…`}
              rows={3}
              maxLength={300}
              className="w-full rounded-xl border border-white/10 bg-stone-900 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none"
            />
            <p className="text-[10px] text-stone-700 mt-1 text-right">{response.length}/300</p>
          </div>

          {/* Upload your video */}
          <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/*" className="hidden" onChange={() => {}} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-stone-700 bg-stone-900/40 p-4 hover:border-amber-500/30 transition-colors group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-800 group-hover:bg-amber-500/10 transition-colors">
              <Upload size={16} className="text-stone-500 group-hover:text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-stone-400 group-hover:text-stone-200 transition-colors">Upload your video response</p>
              <p className="text-[11px] text-stone-700">MP4, MOV · up to 500 MB · max 3 min</p>
            </div>
          </button>

          <button
            onClick={handlePublish}
            disabled={!response.trim() || submitting}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            {submitting ? (
              <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-stone-950/40 border-t-stone-950 animate-spin" />Publishing…</span>
            ) : (
              <><Flame size={15} /> Post duet</>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 py-8 pb-24">
        <BetaBanner label="Duet Studio" />
        <div className="mt-4 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/20">
              <SplitSquareHorizontal size={18} className="text-amber-400" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-amber-100">Duet Studio</h1>
          </div>
          <p className="text-sm text-stone-500">Record a side-by-side response to any reel. The original artist gets notified.</p>
        </div>

        {/* How it works */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          {[
            { step: "1", label: "Choose a reel", desc: "Pick any technique video to respond to" },
            { step: "2", label: "Record response", desc: "Upload your own video or text response" },
            { step: "3", label: "Post duet", desc: "Published side-by-side — artist gets notified" },
          ].map(({ step, label, desc }) => (
            <div key={step} className="rounded-2xl border border-white/8 bg-stone-900/60 p-4 text-center">
              <div className="flex h-7 w-7 mx-auto mb-2 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/20">
                <span className="text-xs font-bold text-amber-400">{step}</span>
              </div>
              <p className="text-xs font-semibold text-stone-300 mb-1">{label}</p>
              <p className="text-[10px] text-stone-600 leading-snug">{desc}</p>
            </div>
          ))}
        </div>

        {/* Existing duets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">Recent duets in the community</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {EXISTING_DUETS.slice(0, 9).map((duet) => {
              const liked = !!reelLikes[duet.id];
              return (
                <div key={duet.id} className="group relative rounded-2xl overflow-hidden bg-stone-900 border border-white/8 hover:border-amber-500/20 transition-colors">
                  {/* Split thumbnail preview */}
                  <div className="relative aspect-[9/16] overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <img
                        src={duet.originalReel.thumbnail}
                        alt="original"
                        className="w-1/2 h-full object-cover opacity-80"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=350&fit=crop&seed=${duet.id}-orig`; }}
                      />
                      <div className="w-px bg-white/20" />
                      <img
                        src={duet.thumbnail}
                        alt="response"
                        className="w-1/2 h-full object-cover opacity-80"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=350&fit=crop&seed=${duet.id}-resp`; }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                    {/* Split icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 border border-white/20">
                        <SplitSquareHorizontal size={12} className="text-white" />
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <img
                          src={duet.responderAvatar}
                          alt={duet.responderName}
                          className="h-4 w-4 rounded-full object-cover border border-white/20"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=40&h=40&fit=crop&seed=${duet.responderId}`; }}
                        />
                        <span className="text-[10px] text-stone-300 truncate">{duet.responderName}</span>
                      </div>
                      <p className="text-[10px] text-stone-400 line-clamp-2 leading-snug">{duet.caption}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button onClick={() => toggleReelLike(duet.id)} className="flex items-center gap-1">
                          <Heart size={10} fill={liked ? "currentColor" : "none"} className={liked ? "text-rose-400" : "text-stone-500"} />
                          <span className="text-[9px] text-stone-500">{(duet.likes + (liked ? 1 : 0) >= 1000 ? ((duet.likes + (liked ? 1 : 0)) / 1000).toFixed(1) + "k" : duet.likes + (liked ? 1 : 0))}</span>
                        </button>
                        <span className="text-[9px] text-stone-700">duet</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA to create */}
        <div className="mt-10 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-6 text-center">
          <SplitSquareHorizontal size={24} className="mx-auto mb-3 text-amber-400" />
          <p className="font-serif text-lg text-amber-100 mb-1">Create your own duet</p>
          <p className="text-sm text-stone-500 mb-4">Browse the feed and tap the duet button on any reel to respond.</p>
          <Link href="/">
            <button className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
              Browse the feed →
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
