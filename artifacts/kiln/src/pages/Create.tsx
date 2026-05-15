import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Upload, Video, ImageIcon, ChevronRight, ChevronLeft,
  X, Music, Flame, Check, Tag, Loader2,
} from "lucide-react";
import Nav from "@/components/Nav";
import ImageEditor, { type FilterSettings } from "@/components/ImageEditor";
import MusicPicker from "@/components/MusicPicker";
import { useProfile } from "@/contexts/ProfileContext";
import { addPost, generateId } from "@/data/posts";
import { getTrackById, type MusicTrack } from "@/data/music";
import { useUpload } from "@/hooks/useUpload";

const TECHNIQUES = [
  { id: "glass-blow", label: "Glass Blowing", emoji: "🔥" },
  { id: "glass-cast", label: "Lost-Wax Cast", emoji: "⚗️" },
  { id: "glass-fuse", label: "Kiln Forming", emoji: "🌡️" },
  { id: "metal-forge", label: "Metal Forging", emoji: "🔨" },
  { id: "metal-weld", label: "Welding", emoji: "⚡" },
  { id: "sculpt-stone", label: "Stone Carving", emoji: "🪨" },
  { id: "ceramics", label: "Ceramics", emoji: "🏺" },
  { id: "fiber", label: "Fiber Arts", emoji: "🧵" },
  { id: "finished", label: "Finished Work", emoji: "✨" },
];

const STAGES = [
  "In the Hot Shop", "Forming", "Annealing", "Cold Working",
  "Polishing", "Assembly", "Final Reveal",
];

type Step = "upload" | "edit" | "details" | "done";

export default function Create() {
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { upload, uploading, progress } = useUpload();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [filterSettings, setFilterSettings] = useState<FilterSettings | null>(null);
  const [filterCss, setFilterCss] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [caption, setCaption] = useState("");
  const [technique, setTechnique] = useState("");
  const [stage, setStage] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const isVid = f.type.startsWith("video/");
    setFile(f);
    setMediaType(isVid ? "video" : "image");
    setPreviewUrl(URL.createObjectURL(f));
    setStep("edit");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  function addTag(raw: string) {
    const t = raw.replace(/^#+/, "").trim().toLowerCase().replace(/\s+/g, "");
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
  }

  async function handlePublish() {
    if (!profile) {
      navigate("/setup");
      return;
    }
    setPublishing(true);
    try {
      let mediaUrl = previewUrl;
      if (file) {
        try {
          const result = await upload(file);
          mediaUrl = result.servingUrl;
        } catch {
          // fall back to local blob URL for preview purposes
        }
      }

      addPost({
        id: generateId(),
        artistId: profile.id,
        artistName: profile.name,
        artistHandle: profile.handle,
        artistAvatarUrl: profile.avatarUrl ?? "",
        type: mediaType,
        mediaUrl,
        caption: caption || technique,
        tags: [
          ...(technique ? [technique] : []),
          ...(stage ? [stage] : []),
          ...tags,
        ],
        filter: filterSettings?.preset,
        musicTrackId: selectedTrack?.id,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        saves: 0,
      });

      setStep("done");
    } finally {
      setPublishing(false);
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Flame size={36} className="text-amber-400" />
        <h2 className="font-serif text-2xl text-amber-100">Join Kiln first</h2>
        <p className="text-stone-400">Set up your free artist profile to start posting.</p>
        <button
          onClick={() => navigate("/setup")}
          className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
        >
          Create Profile
        </button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="h-20 w-20 overflow-hidden rounded-2xl border border-amber-500/30">
          {previewUrl && (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" style={{ filter: filterCss || undefined }} />
          )}
        </div>
        <Check size={40} className="text-amber-400" />
        <h2 className="font-serif text-2xl text-amber-100">Posted to Kiln</h2>
        <p className="text-stone-400">Your process is live. Artists and collectors can now discover your work.</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/")}
            className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            View Feed
          </button>
          <button
            onClick={() => {
              setStep("upload");
              setFile(null);
              setPreviewUrl("");
              setCaption("");
              setTags([]);
              setSelectedTrack(null);
            }}
            className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors"
          >
            Post Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />

      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step !== "upload" && (
              <button
                onClick={() => setStep(step === "details" ? "edit" : "upload")}
                className="text-stone-500 hover:text-amber-300 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="font-serif text-xl text-amber-100">
                {step === "upload" ? "Share your process" : step === "edit" ? "Edit" : "Details"}
              </h1>
              <p className="text-xs text-stone-500">
                {step === "upload"
                  ? "Show what you're making and how you're making it"
                  : step === "edit"
                  ? "Enhance your photo or add music"
                  : "Caption and publish"}
              </p>
            </div>
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5">
            {(["upload", "edit", "details"] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? "w-4 bg-amber-400" : (["upload", "edit", "details"] as string[]).indexOf(s) < (["upload", "edit", "details"] as string[]).indexOf(step as string) ? "w-1.5 bg-amber-500/50" : "w-1.5 bg-stone-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Technique selector */}
            <div>
              <p className="mb-2 text-xs font-medium text-stone-400">What process are you sharing?</p>
              <div className="flex flex-wrap gap-2">
                {TECHNIQUES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTechnique(t.label)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      technique === t.label
                        ? "bg-amber-500 text-stone-950"
                        : "border border-white/10 bg-stone-800 text-stone-400 hover:border-amber-500/30"
                    }`}
                  >
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-stone-700 bg-stone-900/40 p-12 transition-colors hover:border-amber-500/40 cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <div className="flex gap-4 text-stone-600">
                <Video size={32} />
                <ImageIcon size={32} />
              </div>
              <div className="text-center">
                <p className="font-medium text-stone-300">Drop your video or photo here</p>
                <p className="mt-1 text-sm text-stone-600">
                  Process videos, work-in-progress shots, studio moments
                </p>
                <p className="mt-0.5 text-xs text-stone-700">MP4, MOV, JPG, PNG, WEBP</p>
              </div>
              <button className="rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-stone-300 hover:bg-stone-700 transition-colors">
                <Upload size={14} className="mr-1.5 inline" />
                Choose file
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="video/*,image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          </div>
        )}

        {/* STEP 2: Edit */}
        {step === "edit" && previewUrl && (
          <div className="space-y-4">
            {mediaType === "image" ? (
              <ImageEditor
                previewUrl={previewUrl}
                onChange={(s, css) => { setFilterSettings(s); setFilterCss(css); }}
              />
            ) : (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                <video src={previewUrl} controls className="h-full w-full" />
              </div>
            )}

            {/* Music picker toggle */}
            <button
              onClick={() => setShowMusicPicker(!showMusicPicker)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                selectedTrack
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-white/10 bg-stone-900/60 hover:border-amber-500/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <Music size={16} className={selectedTrack ? "text-amber-400" : "text-stone-500"} />
                <span className={`text-sm ${selectedTrack ? "text-amber-200" : "text-stone-400"}`}>
                  {selectedTrack ? `${selectedTrack.title} — ${selectedTrack.artist}` : "Add music to your post"}
                </span>
              </div>
              <ChevronRight size={14} className={`transition-transform ${showMusicPicker ? "rotate-90" : ""} text-stone-600`} />
            </button>

            {showMusicPicker && (
              <MusicPicker
                selectedTrackId={selectedTrack?.id ?? null}
                selectedTrack={selectedTrack}
                onSelect={(t) => { setSelectedTrack(t); if (t) setShowMusicPicker(false); }}
              />
            )}

            <button
              onClick={() => setStep("details")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
            >
              Next: Add details <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 3: Details */}
        {step === "details" && (
          <div className="space-y-4">
            {/* Preview thumbnail */}
            {previewUrl && (
              <div className="flex items-start gap-4">
                <div
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-stone-800"
                  style={{ filter: filterCss || undefined }}
                >
                  {mediaType === "image" ? (
                    <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video src={previewUrl} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-stone-500">
                    {technique && <span className="mr-2 font-medium text-amber-400">{technique}</span>}
                    {mediaType === "video" ? "Process video" : "Photo"}
                  </p>
                  {selectedTrack && (
                    <div className="flex items-center gap-1.5 text-xs text-stone-500">
                      <Music size={11} />
                      {selectedTrack.title}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Caption */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Caption</label>
              <textarea
                rows={3}
                placeholder="Describe what's happening in this moment — the technique, the challenge, the material..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
              />
            </div>

            {/* Process stage */}
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">Process stage</label>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStage(stage === s ? "" : s)}
                    className={`rounded-full px-3 py-1 text-xs transition-all ${
                      stage === s
                        ? "bg-amber-500/20 border border-amber-500/50 text-amber-300"
                        : "border border-white/8 bg-stone-800 text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-full bg-stone-800 px-2.5 py-1 text-xs text-stone-300">
                    #{t}
                    <button onClick={() => setTags((p) => p.filter((x) => x !== t))} className="text-stone-600 hover:text-red-400">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="#glassblow #hotshop"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " " || e.key === ",") {
                      e.preventDefault();
                      tagInput.split(/[\s,]+/).forEach(addTag);
                      setTagInput("");
                    }
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                />
                <button
                  onClick={() => { tagInput.split(/[\s,]+/).forEach(addTag); setTagInput(""); }}
                  className="rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-400 hover:text-amber-300 transition-colors"
                >
                  <Tag size={14} />
                </button>
              </div>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="rounded-xl bg-stone-900/60 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-stone-400">Uploading…</span>
                  <span className="text-xs text-amber-400">{progress}%</span>
                </div>
                <div className="h-1 rounded-full bg-stone-700">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handlePublish}
              disabled={publishing || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-all disabled:opacity-50"
            >
              {publishing ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
              {publishing ? "Publishing…" : "Post to Kiln"}
            </button>

            <p className="text-center text-xs text-stone-700">
              Your process will appear in the Kiln discovery feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
