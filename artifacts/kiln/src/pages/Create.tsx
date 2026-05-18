import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Upload, Video, ImageIcon, ChevronRight, ChevronLeft,
  X, Music, Flame, Check, Tag, Loader2, Layers, Zap, Calendar, Users,
  Sparkles, Share2, Plus, Crown, Heart, MessageCircle, Bookmark,
} from "lucide-react";
import Nav from "@/components/Nav";
import ImageEditor, { type FilterSettings } from "@/components/ImageEditor";
import MusicPicker from "@/components/MusicPicker";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import { addPost, generateId, saveDraft } from "@/data/posts";
import { getTrackById, type MusicTrack } from "@/data/music";
import { useUpload } from "@/hooks/useUpload";
import { storeBlob } from "@/lib/videoDB";

function captureVideoThumbnail(src: string): Promise<string> {
  return new Promise((resolve) => {
    const vid = document.createElement("video");
    vid.muted = true;
    vid.playsInline = true;
    vid.src = src;
    vid.onloadeddata = () => {
      const w = Math.min(vid.videoWidth || 640, 640);
      const h = vid.videoHeight ? Math.round(w * vid.videoHeight / vid.videoWidth) : 360;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(vid, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    vid.onerror = () => resolve("");
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

type Step = "upload" | "edit" | "preview" | "details" | "done";

export default function Create() {
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { recordPost } = useSocial();
  const { upload, uploading, progress } = useUpload();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [filterSettings, setFilterSettings] = useState<FilterSettings | null>(null);
  const [filterCss, setFilterCss] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(() => {
    try {
      const raw = sessionStorage.getItem("kiln_pending_beat");
      if (!raw) return null;
      sessionStorage.removeItem("kiln_pending_beat");
      const d = JSON.parse(raw) as { id: string; title: string; artist: string; url: string; license: string; bpm: number };
      return { id: d.id, title: d.title, artist: d.artist, genre: "Electronic" as const, mood: "Original", craftMood: "Studio Vibes", bpm: d.bpm ?? 0, duration: 0, url: d.url, license: d.license };
    } catch { return null; }
  });
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [caption, setCaption] = useState("");
  const [technique, setTechnique] = useState("");
  const [stage, setStage] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [seriesName, setSeriesName] = useState("");
  const [isDrop, setIsDrop] = useState(false);
  const [dropPrice, setDropPrice] = useState("");
  const [dropDate, setDropDate] = useState("");
  const [collabArtist, setCollabArtist] = useState("");
  const [isPatronOnly, setIsPatronOnly] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [captionSuggestions, setCaptionSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [crossPost, setCrossPost] = useState({ instagram: false, tiktok: false });
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [durationError, setDurationError] = useState("");
  const [scheduledAt, setScheduledAt] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  const MAX_VIDEO_SECONDS = 60;

  const handleFile = useCallback((f: File) => {
    setDurationError("");
    const isVid = f.type.startsWith("video/");
    if (isVid) {
      const url = URL.createObjectURL(f);
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (vid.duration > MAX_VIDEO_SECONDS) {
          setDurationError(
            `Videos must be ${MAX_VIDEO_SECONDS} seconds or less. Yours is ${Math.round(vid.duration)}s — trim it and try again.`
          );
          return;
        }
        setFile(f);
        setMediaType("video");
        setPreviewUrl(URL.createObjectURL(f));
        setStep("edit");
      };
      vid.src = url;
    } else {
      setFile(f);
      setMediaType("image");
      setPreviewUrl(URL.createObjectURL(f));
      setStep("edit");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  function handleAddMore(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const previews = files.map((f) => URL.createObjectURL(f));
    setAdditionalFiles((p) => [...p, ...files]);
    setAdditionalPreviews((p) => [...p, ...previews]);
    e.target.value = "";
  }

  async function handleSuggestCaptions() {
    if (!technique && !stage && tags.length === 0) return;
    setLoadingSuggestions(true);
    setCaptionSuggestions([]);
    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technique, stage, tags }),
      });
      const data = await res.json() as { captions?: string[] };
      setCaptionSuggestions(data.captions ?? []);
    } catch {
      setCaptionSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function addTag(raw: string) {
    const t = raw.replace(/^#+/, "").trim().toLowerCase().replace(/\s+/g, "");
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
  }

  async function handleSaveDraft() {
    if (!profile) return;
    setSavingDraft(true);
    // Persist to API (DB-backed)
    try {
      await fetch("/api/me/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caption: caption || "",
          videoUrl: mediaType === "video" ? previewUrl || null : null,
          thumbnailUrl: mediaType === "image" ? previewUrl || null : null,
          technique: technique || null,
          tags,
          isPatronOnly,
        }),
      });
    } catch {
      // fall back to localStorage on network error
      saveDraft({ type: mediaType, mediaUrl: previewUrl, caption, technique, stage, tags, seriesName, isDrop, dropPrice, dropDate, musicTrackId: selectedTrack?.id, filter: filterSettings?.preset });
    }
    setSavingDraft(false);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  }

  async function handlePublish() {
    if (!profile) {
      navigate("/setup");
      return;
    }
    setPublishing(true);
    try {
      let thumbnailUrl: string | undefined;
      let mediaUrl = previewUrl;

      if (file && mediaType === "video") {
        // Capture thumbnail while the blob URL is still valid
        thumbnailUrl = await captureVideoThumbnail(previewUrl) || undefined;
        // Upload video to Object Storage; fall back to IndexedDB
        try {
          const result = await upload(file);
          mediaUrl = result.servingUrl;
        } catch {
          mediaUrl = await storeBlob(file);
        }
      } else if (file) {
        // Images: try server upload, fall back to base64
        try {
          const result = await upload(file);
          mediaUrl = result.servingUrl;
        } catch {
          try { mediaUrl = await fileToDataUrl(file); } catch { /* keep previewUrl */ }
        }
      }

      // Upload additional carousel images
      const extraUrls: string[] = [];
      for (const extraFile of additionalFiles) {
        try {
          const r = await upload(extraFile);
          extraUrls.push(r.servingUrl);
        } catch {
          if (extraFile.type.startsWith("image/")) {
            try { extraUrls.push(await fileToDataUrl(extraFile)); } catch { /* skip */ }
          }
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
        thumbnailUrl,
        mediaUrls: extraUrls.length > 0 ? [mediaUrl, ...extraUrls] : undefined,
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
        patronOnly: isPatronOnly || undefined,
      });
      window.dispatchEvent(new CustomEvent("kiln:post-added"));

      // Persist to the real database so the post appears in the global feed
      fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caption: caption || technique,
          videoUrl: mediaType === "video" ? mediaUrl : null,
          thumbnailUrl: mediaType === "image" ? mediaUrl : null,
          technique: technique || null,
          tags: [...(technique ? [technique] : []), ...(stage ? [stage] : []), ...tags],
          isPatronOnly,
          scheduledAt: scheduledAt || null,
          isDraft: scheduledAt ? true : false,
        }),
      }).catch(() => {});

      // Instagram cross-post if enabled and media is server-hosted
      if (crossPost.instagram && mediaUrl && !mediaUrl.startsWith("blob:") && !mediaUrl.startsWith("data:") && !mediaUrl.startsWith("idb:")) {
        fetch("/api/instagram/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mediaUrl,
            caption: `${caption || technique}${tags.map((t: string) => ` #${t.replace(/\s+/g, "")}`).join("")}`,
            isVideo: mediaType === "video",
          }),
        }).catch(() => {});
      }

      recordPost();
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
        {/* AI Reel Studio CTA */}
        <button
          onClick={() => navigate("/reel-studio")}
          className="w-full max-w-xs flex items-center gap-3 p-4 rounded-2xl border border-amber-400/30 bg-amber-400/6 hover:bg-amber-400/12 transition-colors text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-100">Turn it into a cinematic clip</p>
            <p className="text-xs text-stone-400 mt-0.5">AI Reel Studio — movie trailer, ad, or 7-sec clip</p>
          </div>
        </button>

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
            {step !== "upload" && step !== "preview" && (
              <button
                onClick={() => {
                  if (step === "details") setStep("preview");
                  else if (step === "edit") setStep("upload");
                  else setStep("upload");
                }}
                className="text-stone-500 hover:text-amber-300 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="font-serif text-xl text-amber-100">
                {step === "upload" ? "Share your process"
                  : step === "edit" ? "Edit"
                  : step === "preview" ? "Preview"
                  : "Details"}
              </h1>
              <p className="text-xs text-stone-500">
                {step === "upload" ? "Show what you're making and how you're making it"
                  : step === "edit" ? "Enhance your photo or add music"
                  : step === "preview" ? "This is how your post will look in the feed"
                  : "Caption and publish"}
              </p>
            </div>
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5">
            {(["upload", "edit", "preview", "details"] as Step[]).map((s) => {
              const order = ["upload", "edit", "preview", "details"];
              const cur = order.indexOf(step);
              const idx = order.indexOf(s);
              return (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step ? "w-4 bg-amber-400" : idx < cur ? "w-1.5 bg-amber-500/50" : "w-1.5 bg-stone-700"
                  }`}
                />
              );
            })}
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
                <p className="mt-0.5 text-xs text-stone-700">MP4, MOV, JPG, PNG, WEBP · Videos up to 60s</p>
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

            {/* Duration error */}
            {durationError && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <span className="mt-0.5 text-red-400 text-lg">⏱</span>
                <div>
                  <p className="text-sm font-medium text-red-400">Video too long</p>
                  <p className="mt-0.5 text-xs text-red-400/80">{durationError}</p>
                </div>
              </div>
            )}
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

            {/* Music Studio shortcut */}
            <button
              onClick={() => navigate("/music-studio")}
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-stone-700 px-4 py-2.5 text-left hover:border-amber-500/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🎹</span>
                <div>
                  <p className="text-xs font-medium text-stone-300">Music Studio</p>
                  <p className="text-[10px] text-stone-600">Build your own beat &amp; license it to other creators</p>
                </div>
              </div>
              <ChevronRight size={13} className="text-stone-600" />
            </button>

            {/* Carousel strip — only for image posts */}
            {mediaType === "image" && (
              <div>
                <p className="mb-2 text-xs font-medium text-stone-400">Add more photos (carousel)</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-amber-500/50">
                    <img src={previewUrl} alt="" className="h-full w-full object-cover" style={{ filter: filterCss || undefined }} />
                  </div>
                  {additionalPreviews.map((url, i) => (
                    <div key={i} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/15">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => {
                          setAdditionalPreviews((p) => p.filter((_, j) => j !== i));
                          setAdditionalFiles((p) => p.filter((_, j) => j !== i));
                        }}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                  {additionalPreviews.length < 9 && (
                    <button
                      onClick={() => additionalInputRef.current?.click()}
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-600 text-stone-500 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                  <input ref={additionalInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddMore} />
                </div>
              </div>
            )}

            <button
              onClick={() => setStep("preview")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
            >
              Preview <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 3: Preview */}
        {step === "preview" && previewUrl && (
          <div className="space-y-4">
            {/* Phone-frame preview */}
            <div className="mx-auto max-w-xs">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-stone-600">
                Feed preview
              </p>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl"
                style={{ aspectRatio: "9/16" }}>
                {/* Media */}
                {mediaType === "image" ? (
                  <img
                    src={previewUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ filter: filterCss || undefined }}
                  />
                ) : (
                  <video
                    src={previewUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/30 pointer-events-none" />

                {/* Right-side action buttons */}
                <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                      <Heart size={18} className="text-white" />
                    </div>
                    <span className="text-[10px] text-white/60">0</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                      <MessageCircle size={18} className="text-white" />
                    </div>
                    <span className="text-[10px] text-white/60">0</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                      <Bookmark size={18} className="text-white" />
                    </div>
                    <span className="text-[10px] text-white/60">0</span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                    <Share2 size={18} className="text-white" />
                  </div>
                </div>

                {/* Bottom info overlay */}
                <div className="absolute bottom-0 left-0 right-12 p-4 space-y-2">
                  {/* Artist row */}
                  <div className="flex items-center gap-2">
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover border border-white/20" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300">
                        {profile?.name?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-white">@{profile?.handle ?? "you"}</span>
                    {technique && (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        {technique}
                      </span>
                    )}
                  </div>
                  {/* Caption preview */}
                  {caption ? (
                    <p className="text-xs text-white/80 leading-relaxed line-clamp-2">{caption}</p>
                  ) : (
                    <p className="text-xs text-white/30 italic">Caption will appear here…</p>
                  )}
                  {/* Music bar */}
                  {selectedTrack && (
                    <div className="flex items-center gap-1.5">
                      <Music size={11} className="text-amber-300 shrink-0" />
                      <p className="text-[10px] text-white/60 truncate">{selectedTrack.title} — {selectedTrack.artist}</p>
                    </div>
                  )}
                </div>

                {/* "New" badge */}
                <div className="absolute top-3 left-3">
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-stone-950">NEW</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep("edit")}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 py-3 text-sm font-medium text-stone-300 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
              >
                <ChevronLeft size={15} /> Edit
              </button>
              <button
                onClick={() => setStep("details")}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                Add caption <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Details */}
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
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-stone-400">Caption</label>
                <button
                  onClick={handleSuggestCaptions}
                  disabled={loadingSuggestions || (!technique && !stage && tags.length === 0)}
                  className="flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                >
                  {loadingSuggestions ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  Suggest captions
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Describe what's happening in this moment — the technique, the challenge, the material..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
              />
              {captionSuggestions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {captionSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setCaption(s); setCaptionSuggestions([]); }}
                      className="block w-full rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-left text-xs text-amber-200 hover:bg-amber-500/15 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
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

            {/* Collab tag */}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-400">
                <Users size={12} /> Tag a collaborator (optional)
              </label>
              <input
                type="text"
                placeholder="@artist-handle or name"
                value={collabArtist}
                onChange={(e) => setCollabArtist(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
              {collabArtist && (
                <p className="mt-1 text-xs text-stone-600">This will appear on both your profiles as a collaborative post.</p>
              )}
            </div>

            {/* Patron-only toggle */}
            <div className="rounded-2xl border border-white/10 bg-stone-900/40 p-4">
              <button
                onClick={() => setIsPatronOnly((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Crown size={14} className={isPatronOnly ? "text-amber-400" : "text-stone-500"} />
                  <div>
                    <p className={`text-sm font-medium ${isPatronOnly ? "text-amber-200" : "text-stone-300"}`}>
                      Patron-exclusive post
                    </p>
                    <p className="text-xs text-stone-600">Only paying subscribers can view this</p>
                  </div>
                </div>
                <div className={`h-5 w-9 rounded-full transition-colors ${isPatronOnly ? "bg-amber-500" : "bg-stone-700"} relative`}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPatronOnly ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
              </button>
              {isPatronOnly && (
                <p className="mt-2 text-xs text-amber-600/80">This post will be blurred in the feed for non-patrons with an invitation to subscribe.</p>
              )}
            </div>

            {/* Series */}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-400">
                <Layers size={12} /> Series (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Vessel Studies, Summer 2026"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
              <p className="mt-1 text-xs text-stone-700">Group this post with related work as part of a series</p>
            </div>

            {/* Drop scheduling */}
            <div className="rounded-2xl border border-white/10 bg-stone-900/40 p-4 space-y-3">
              <button
                onClick={() => setIsDrop((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Zap size={14} className={isDrop ? "text-amber-400" : "text-stone-500"} />
                  <div>
                    <p className={`text-sm font-medium ${isDrop ? "text-amber-200" : "text-stone-300"}`}>
                      Schedule as a limited drop
                    </p>
                    <p className="text-xs text-stone-600">Release this work at a specific date and time</p>
                  </div>
                </div>
                <div className={`h-5 w-9 rounded-full transition-colors ${isDrop ? "bg-amber-500" : "bg-stone-700"} relative`}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isDrop ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
              </button>

              {isDrop && (
                <div className="space-y-3 pt-1 border-t border-white/8">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500">Price (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={dropPrice}
                          onChange={(e) => setDropPrice(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-stone-800 pl-7 pr-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-stone-500">
                        <Calendar size={10} /> Drop date &amp; time
                      </label>
                      <input
                        type="datetime-local"
                        value={dropDate}
                        onChange={(e) => setDropDate(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>
                  </div>
                  {dropPrice && dropDate && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300">
                      This work will drop for ${parseFloat(dropPrice).toLocaleString()} on {new Date(dropDate).toLocaleDateString("en-US", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}.
                    </div>
                  )}
                </div>
              )}
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

            {/* Cross-posting */}
            <div className="rounded-2xl border border-white/10 bg-stone-900/40 p-4 space-y-3">
              <p className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
                <Share2 size={12} /> Cross-post to other platforms
              </p>
              {[
                { key: "instagram" as const, label: "Instagram", hint: "Share as a Reel" },
                { key: "tiktok" as const, label: "TikTok", hint: "Share as a video" },
              ].map(({ key, label, hint }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-300">{label}</p>
                    <p className="text-xs text-stone-600">{hint}</p>
                  </div>
                  <button
                    onClick={() => setCrossPost((p) => ({ ...p, [key]: !p[key] }))}
                    className={`h-5 w-9 rounded-full transition-colors relative ${crossPost[key] ? "bg-amber-500" : "bg-stone-700"}`}
                  >
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${crossPost[key] ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
              {(crossPost.instagram || crossPost.tiktok) && (
                <p className="text-[10px] text-stone-600">Your post will appear on Kiln and be queued for sharing to selected platforms.</p>
              )}
            </div>

            {/* Schedule for later */}
            <div className="rounded-2xl border border-white/10 bg-stone-900/40 p-4">
              <button
                onClick={() => setScheduledAt(scheduledAt ? "" : new Date(Date.now() + 3600000).toISOString().slice(0, 16))}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={14} className={scheduledAt ? "text-amber-400" : "text-stone-500"} />
                  <div>
                    <p className={`text-sm font-medium ${scheduledAt ? "text-amber-200" : "text-stone-300"}`}>Schedule for later</p>
                    <p className="text-xs text-stone-600">Set a future date and time for this post to go live</p>
                  </div>
                </div>
                <div className={`h-5 w-9 rounded-full transition-colors ${scheduledAt ? "bg-amber-500" : "bg-stone-700"} relative`}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${scheduledAt ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
              </button>
              {scheduledAt && (
                <div className="mt-3 pt-3 border-t border-white/8">
                  <label className="mb-1 block text-xs font-medium text-stone-500">Publish date &amp; time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                  />
                  <p className="mt-1.5 text-xs text-amber-600/80">
                    This post will be saved as a draft and published automatically at the scheduled time.
                  </p>
                </div>
              )}
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
              {publishing ? (scheduledAt ? "Scheduling…" : "Publishing…") : (scheduledAt ? `Schedule for ${new Date(scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Post to Kiln")}
            </button>

            <button
              onClick={handleSaveDraft}
              disabled={savingDraft || publishing || !previewUrl}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 py-2.5 text-sm text-stone-400 hover:border-amber-500/30 hover:text-amber-300 transition-all disabled:opacity-40"
            >
              {savingDraft ? (
                <Loader2 size={14} className="animate-spin" />
              ) : draftSaved ? (
                <Check size={14} className="text-emerald-400" />
              ) : null}
              {draftSaved ? "Draft saved" : savingDraft ? "Saving…" : "Save as Draft"}
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
