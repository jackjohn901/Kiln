import { useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft, Play, Video, SplitSquareHorizontal, Upload,
  Flame, AlertCircle,
} from "lucide-react";
import Nav from "@/components/Nav";
import { ALL_REELS } from "@/data/reels";
import { useProfile } from "@/contexts/ProfileContext";
import BetaBanner from "@/components/BetaBanner";

type DuetStep = "browse" | "record";

export default function DuetStudio() {
  const { reelId } = useParams<{ reelId: string }>();
  const { profile } = useProfile();
  const [, navigate] = useLocation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<DuetStep>("browse");
  const [layout, setLayout] = useState<"side-by-side" | "reaction" | "green-screen">("side-by-side");
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reel = ALL_REELS.find((r) => r.id === reelId);

  async function handlePublish() {
    if (!response.trim() || !profile) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
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
      if (!res.ok) {
        setError("We couldn't post your duet. Please try again in a moment.");
        setSubmitting(false);
        return;
      }
      const created = await res.json().catch(() => null);
      if (created?.id) {
        // Success is confirmed only once the post exists — land on it.
        navigate(`/posts/db-${created.id}`);
        return;
      }
      setError("Something went wrong posting your duet. Please try again.");
      setSubmitting(false);
    } catch {
      setError("Something went wrong posting your duet. Please try again.");
      setSubmitting(false);
    }
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

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
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

        {/* Community duets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">Recent duets in the community</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-8 text-center">
            <SplitSquareHorizontal size={24} className="mx-auto mb-3 text-stone-600" />
            <p className="text-sm text-stone-400">No duets yet</p>
            <p className="text-xs text-stone-600 mt-1">Be the first to respond to a reel — your duet will show up here.</p>
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
