import { useState, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  ChevronLeft, Scissors, Video, Upload,
  Flame, AlertCircle,
} from "lucide-react";
import Nav from "@/components/Nav";
import BetaBanner from "@/components/BetaBanner";
import { getReelById } from "@/data/reels";
import { useUpload } from "@/hooks/useUpload";

const STITCH_LENGTHS = [
  { value: 3, label: "3 sec" },
  { value: 5, label: "5 sec" },
  { value: 10, label: "10 sec" },
];

export default function StitchStudio() {
  const { reelId } = useParams<{ reelId?: string }>();
  const [, navigate] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload } = useUpload();

  const [stitchLength, setStitchLength] = useState(5);
  const [caption, setCaption] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceReel = reelId ? getReelById(reelId) : null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handlePublish() {
    if (!videoFile) return;
    setPublishing(true);
    setError(null);
    try {
      // 1. Upload video to Object Storage — a stitch requires the video
      let videoUrl: string | null = null;
      try {
        const result = await upload(videoFile);
        videoUrl = result.servingUrl;
      } catch (err) {
        console.error("Video upload failed", err);
      }
      if (!videoUrl) {
        setError("We couldn't upload your video. Please check your connection and try again.");
        setPublishing(false);
        return;
      }

      // 2. Create post with uploaded URL
      const postRes = await fetch("/api/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          videoUrl,
          tags: ["stitch"],
        }),
      });

      if (!postRes.ok) {
        setError("We couldn't publish your stitch. Please try again in a moment.");
        setPublishing(false);
        return;
      }

      const createdPost = await postRes.json().catch(() => null);
      if (createdPost?.id) {
        // Success is confirmed only once the post actually exists — land on it.
        navigate(`/posts/db-${createdPost.id}`);
        return;
      }
      setError("Something went wrong publishing your stitch. Please try again.");
      setPublishing(false);
    } catch (err) {
      console.error("Stitch publish failed", err);
      setError("Something went wrong publishing your stitch. Please try again.");
      setPublishing(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 pb-24">
      <Nav />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <BetaBanner label="Stitch Studio" />
        <Link href="/" className="mt-4 mb-4 flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200 transition-colors">
          <ChevronLeft size={16} /> Back to feed
        </Link>

        <div className="mb-5 flex items-center gap-2">
          <Scissors size={20} className="text-amber-400" />
          <h1 className="text-xl font-bold text-white">Stitch</h1>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-5">
            {/* What is a Stitch */}
            <div className="rounded-xl bg-stone-900 border border-white/5 p-4">
              <div className="flex items-start gap-3">
                <Scissors size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-stone-200">What is a Stitch?</p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                    Clip up to 10 seconds from someone's reel, then record your response — your clip plays first, then theirs. Great for technique critiques, continuations, and reactions.
                  </p>
                </div>
              </div>
            </div>

            {/* Source reel */}
            {sourceReel ? (
              <div className="rounded-2xl overflow-hidden bg-stone-900 border border-white/5">
                <div className="relative h-36 bg-stone-800">
                  <img
                    src={sourceReel.thumbnail}
                    alt={sourceReel.caption}
                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=200&fit=crop&seed=${sourceReel.id}`; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <p className="text-xs text-stone-400">Stitching from</p>
                    <p className="font-semibold text-white">{sourceReel.artistName}</p>
                    <p className="text-xs text-amber-400">{sourceReel.technique}</p>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1">
                    <Scissors size={11} className="text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-300">Clip source</span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-stone-500 line-clamp-2">{sourceReel.caption}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/50 p-6 text-center">
                <AlertCircle size={24} className="mx-auto mb-2 text-stone-600" />
                <p className="text-sm text-stone-500 mb-1">No source reel selected</p>
                <p className="text-xs text-stone-700">Tap "Stitch" on any reel in the feed to use it as your source, or choose one below.</p>
              </div>
            )}

            {/* Clip length */}
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">Clip length from source</label>
              <div className="flex gap-2">
                {STITCH_LENGTHS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStitchLength(s.value)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all ${
                      stitchLength === s.value
                        ? "border-amber-500 bg-amber-500/15 text-amber-300"
                        : "border-white/8 bg-stone-800 text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-stone-600">The clip will begin at the start of the source reel.</p>
            </div>

            {/* Your response */}
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">Your response video</label>
              {previewUrl ? (
                <div className="relative h-44 rounded-2xl overflow-hidden bg-stone-800">
                  <video src={previewUrl} className="h-full w-full object-cover" controls />
                  <button
                    onClick={() => { setVideoFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-stone-300 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-700 bg-stone-900/50 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                    <Upload size={18} className="text-amber-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-stone-300">Upload your response</p>
                    <p className="text-xs text-stone-600">MP4, MOV up to 60 seconds</p>
                  </div>
                </button>
              )}
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Caption */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Caption</label>
              <textarea
                rows={3}
                placeholder="What's your take? Add context to your response…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handlePublish}
              disabled={!previewUrl || !caption.trim() || publishing}
              className="w-full rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {publishing ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-950 border-t-transparent" />
                  Publishing…
                </>
              ) : (
                "Publish Stitch"
              )}
            </button>
          </div>

      </div>
    </div>
  );
}
