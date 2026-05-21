import { useState } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, Sparkles, Copy, Check, Loader2,
  FileText, Hash, Mail, MessageSquare, Megaphone,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

type Tool = "caption" | "bio" | "pitch" | "hashtags" | "subject";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
  { id: "twitter", label: "Twitter / X", emoji: "𝕏" },
  { id: "linkedin", label: "LinkedIn", emoji: "💼" },
  { id: "pinterest", label: "Pinterest", emoji: "📌" },
];

const PITCH_TARGETS = [
  { id: "gallery", label: "Gallery / Curator" },
  { id: "press", label: "Art Press / Journalist" },
  { id: "magazine", label: "Craft Magazine" },
  { id: "residency", label: "Residency Program" },
  { id: "collector", label: "Private Collector" },
  { id: "brand", label: "Brand / Corporate Buyer" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-stone-800/60 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ResultBox({ label, content }: { label?: string; content: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-stone-900/60 p-4">
      {label && <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-500">{label}</p>}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-200">{content}</p>
      <div className="mt-3 flex justify-end">
        <CopyButton text={content} />
      </div>
    </div>
  );
}

export default function AIMarketing() {
  const { profile } = useProfile();
  const [activeTool, setActiveTool] = useState<Tool>("caption");

  // Caption tool state
  const [captionDesc, setCaptionDesc] = useState("");
  const [captionPlatform, setCaptionPlatform] = useState("instagram");
  const [captionResult, setCaptionResult] = useState("");
  const [captionLoading, setCaptionLoading] = useState(false);

  // Bio tool state
  const [bioMedium, setBioMedium] = useState(profile?.mediums?.join(", ") ?? "");
  const [bioLocation, setBioLocation] = useState(profile?.location ?? "");
  const [bioStyle, setBioStyle] = useState("");
  const [bioYears, setBioYears] = useState("");
  const [bioResult, setBioResult] = useState("");
  const [bioLoading, setBioLoading] = useState(false);

  // Pitch tool state
  const [pitchTarget, setPitchTarget] = useState("gallery");
  const [pitchMedium, setPitchMedium] = useState(profile?.mediums?.join(", ") ?? "");
  const [pitchStyle, setPitchStyle] = useState("");
  const [pitchAchievements, setPitchAchievements] = useState("");
  const [pitchResult, setPitchResult] = useState("");
  const [pitchLoading, setPitchLoading] = useState(false);

  // Hashtag tool state
  const [hashtagMedium, setHashtagMedium] = useState(profile?.mediums?.join(", ") ?? "");
  const [hashtagPlatform, setHashtagPlatform] = useState("instagram");
  const [hashtagStyle, setHashtagStyle] = useState("");
  const [hashtagResult, setHashtagResult] = useState<{ niche: string[]; community: string[]; broad: string[] } | null>(null);
  const [hashtagLoading, setHashtagLoading] = useState(false);

  // Subject line tool state
  const [subjectTopic, setSubjectTopic] = useState("");
  const [subjectAudience, setSubjectAudience] = useState("");
  const [subjectResults, setSubjectResults] = useState<string[]>([]);
  const [subjectLoading, setSubjectLoading] = useState(false);

  async function generateCaption() {
    if (!captionDesc.trim()) return;
    setCaptionLoading(true);
    setCaptionResult("");
    try {
      const res = await fetch("/api/ai/marketing/social-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description: captionDesc, platform: captionPlatform }),
      });
      const data = await res.json() as { caption?: string };
      setCaptionResult(data.caption ?? "");
    } catch {
      setCaptionResult("Something went wrong. Please try again.");
    } finally {
      setCaptionLoading(false);
    }
  }

  async function generateBio() {
    if (!bioMedium.trim()) return;
    setBioLoading(true);
    setBioResult("");
    try {
      const res = await fetch("/api/ai/marketing/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: profile?.name ?? "",
          medium: bioMedium,
          location: bioLocation,
          styleNotes: bioStyle,
          yearsActive: bioYears,
        }),
      });
      const data = await res.json() as { bio?: string };
      setBioResult(data.bio ?? "");
    } catch {
      setBioResult("Something went wrong. Please try again.");
    } finally {
      setBioLoading(false);
    }
  }

  async function generatePitch() {
    if (!pitchMedium.trim()) return;
    setPitchLoading(true);
    setPitchResult("");
    try {
      const res = await fetch("/api/ai/marketing/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: profile?.name ?? "",
          medium: pitchMedium,
          location: profile?.location ?? "",
          targetType: pitchTarget,
          styleNotes: pitchStyle,
          achievements: pitchAchievements,
        }),
      });
      const data = await res.json() as { email?: string };
      setPitchResult(data.email ?? "");
    } catch {
      setPitchResult("Something went wrong. Please try again.");
    } finally {
      setPitchLoading(false);
    }
  }

  async function generateHashtags() {
    if (!hashtagMedium.trim()) return;
    setHashtagLoading(true);
    setHashtagResult(null);
    try {
      const res = await fetch("/api/ai/marketing/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ medium: hashtagMedium, platform: hashtagPlatform, style: hashtagStyle }),
      });
      const data = await res.json() as { hashtags?: { niche: string[]; community: string[]; broad: string[] } };
      setHashtagResult(data.hashtags ?? null);
    } catch {
      setHashtagResult(null);
    } finally {
      setHashtagLoading(false);
    }
  }

  async function generateSubjects() {
    if (!subjectTopic.trim()) return;
    setSubjectLoading(true);
    setSubjectResults([]);
    try {
      const res = await fetch("/api/ai/marketing/email-subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: subjectTopic, audience: subjectAudience }),
      });
      const data = await res.json() as { subjects?: string[] };
      setSubjectResults(data.subjects ?? []);
    } catch {
      setSubjectResults([]);
    } finally {
      setSubjectLoading(false);
    }
  }

  const TOOLS: { id: Tool; label: string; icon: React.ReactNode; description: string }[] = [
    { id: "caption", label: "Social Caption", icon: <MessageSquare size={15} />, description: "Platform-optimized post captions" },
    { id: "bio", label: "Artist Bio", icon: <FileText size={15} />, description: "Gallery-quality bio for your profile" },
    { id: "pitch", label: "Pitch Email", icon: <Mail size={15} />, description: "Reach galleries, press & collectors" },
    { id: "hashtags", label: "Hashtag Sets", icon: <Hash size={15} />, description: "Tiered discovery hashtags" },
    { id: "subject", label: "Email Subject Lines", icon: <Megaphone size={15} />, description: "Newsletter subject line options" },
  ];

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <h1 className="font-serif text-2xl text-amber-100">AI Marketing Hub</h1>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">AI tools to spread your work globally</p>
          </div>
        </div>

        {/* Tool tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTool === t.id
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                  : "border-white/10 text-stone-500 hover:text-stone-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CAPTION TOOL ─────────────────────────────────────────────── */}
        {activeTool === "caption" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setCaptionPlatform(p.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        captionPlatform === p.id
                          ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                          : "border-white/10 text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      <span>{p.emoji}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">Describe your post</label>
                <textarea
                  value={captionDesc}
                  onChange={(e) => setCaptionDesc(e.target.value)}
                  rows={3}
                  placeholder="e.g. Hand-thrown stoneware mug with ash glaze, fresh from the kiln. Still warm. Posted a close-up of the surface texture."
                  className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40 resize-none"
                />
              </div>
              <button
                onClick={generateCaption}
                disabled={captionLoading || !captionDesc.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {captionLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {captionLoading ? "Writing caption..." : "Generate Caption"}
              </button>
            </div>
            {captionResult && <ResultBox content={captionResult} />}
          </div>
        )}

        {/* ── BIO TOOL ─────────────────────────────────────────────────── */}
        {activeTool === "bio" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-400">Medium / discipline *</label>
                  <input
                    value={bioMedium}
                    onChange={(e) => setBioMedium(e.target.value)}
                    placeholder="e.g. Ceramics, glass blowing"
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-400">Location</label>
                  <input
                    value={bioLocation}
                    onChange={(e) => setBioLocation(e.target.value)}
                    placeholder="e.g. Portland, OR"
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">Years active</label>
                <input
                  value={bioYears}
                  onChange={(e) => setBioYears(e.target.value)}
                  placeholder="e.g. 12 years, since 2008"
                  className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">Your style and approach</label>
                <textarea
                  value={bioStyle}
                  onChange={(e) => setBioStyle(e.target.value)}
                  rows={3}
                  placeholder="e.g. I work with reduction-fired stoneware, focusing on functional pieces with organic ash glazes. My work is influenced by Japanese mingei aesthetics."
                  className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40 resize-none"
                />
              </div>
              <button
                onClick={generateBio}
                disabled={bioLoading || !bioMedium.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {bioLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {bioLoading ? "Writing bio..." : "Generate Artist Bio"}
              </button>
            </div>
            {bioResult && <ResultBox label="Your Artist Bio" content={bioResult} />}
          </div>
        )}

        {/* ── PITCH TOOL ───────────────────────────────────────────────── */}
        {activeTool === "pitch" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">Who are you pitching to? *</label>
                <div className="flex flex-wrap gap-2">
                  {PITCH_TARGETS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setPitchTarget(t.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        pitchTarget === t.id
                          ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                          : "border-white/10 text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">Your medium *</label>
                <input
                  value={pitchMedium}
                  onChange={(e) => setPitchMedium(e.target.value)}
                  placeholder="e.g. Wood-fired ceramics"
                  className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">Describe your work</label>
                <textarea
                  value={pitchStyle}
                  onChange={(e) => setPitchStyle(e.target.value)}
                  rows={2}
                  placeholder="e.g. Large-scale functional vessels with ash glaze effects from the anagama kiln. Each piece takes 3 weeks to complete."
                  className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40 resize-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">Exhibitions or recognition (optional)</label>
                <input
                  value={pitchAchievements}
                  onChange={(e) => setPitchAchievements(e.target.value)}
                  placeholder="e.g. NCECA 2024, Archie Bray resident, featured in Ceramics Monthly"
                  className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40"
                />
              </div>
              <button
                onClick={generatePitch}
                disabled={pitchLoading || !pitchMedium.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {pitchLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {pitchLoading ? "Writing pitch..." : "Generate Pitch Email"}
              </button>
            </div>
            {pitchResult && <ResultBox label="Your Pitch Email" content={pitchResult} />}
          </div>
        )}

        {/* ── HASHTAG TOOL ─────────────────────────────────────────────── */}
        {activeTool === "hashtags" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-400">Medium / discipline *</label>
                  <input
                    value={hashtagMedium}
                    onChange={(e) => setHashtagMedium(e.target.value)}
                    placeholder="e.g. Glassblowing"
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-400">Platform</label>
                  <select
                    value={hashtagPlatform}
                    onChange={(e) => setHashtagPlatform(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 outline-none focus:border-amber-500/40"
                  >
                    {PLATFORMS.slice(0, 4).map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">Describe your style (optional)</label>
                <input
                  value={hashtagStyle}
                  onChange={(e) => setHashtagStyle(e.target.value)}
                  placeholder="e.g. functional vessels, earthy tones, Japanese influence"
                  className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40"
                />
              </div>
              <button
                onClick={generateHashtags}
                disabled={hashtagLoading || !hashtagMedium.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {hashtagLoading ? <Loader2 size={15} className="animate-spin" /> : <Hash size={15} />}
                {hashtagLoading ? "Researching hashtags..." : "Generate Hashtag Set"}
              </button>
            </div>
            {hashtagResult && (
              <div className="space-y-3">
                {(["niche", "community", "broad"] as const).map((tier) => {
                  const labels = { niche: "Niche — high relevance, low competition", community: "Community — your craft audience", broad: "Broad — maximum discovery reach" };
                  const colors = { niche: "text-emerald-400", community: "text-sky-400", broad: "text-purple-400" };
                  const tags = hashtagResult[tier] ?? [];
                  const tagString = tags.join(" ");
                  return (
                    <div key={tier} className="rounded-xl border border-white/8 bg-stone-900/60 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${colors[tier]}`}>{labels[tier]}</p>
                        <CopyButton text={tagString} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-stone-800 px-2.5 py-1 text-xs text-stone-300">{tag.startsWith("#") ? tag : `#${tag}`}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">Full set — copy all</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...hashtagResult.niche, ...hashtagResult.community, ...hashtagResult.broad].map((tag) => (
                      <span key={tag} className="rounded-full bg-stone-800 px-2.5 py-1 text-xs text-stone-300">{tag.startsWith("#") ? tag : `#${tag}`}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <CopyButton text={[...hashtagResult.niche, ...hashtagResult.community, ...hashtagResult.broad].join(" ")} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EMAIL SUBJECT TOOL ───────────────────────────────────────── */}
        {activeTool === "subject" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">What's the email about? *</label>
                <textarea
                  value={subjectTopic}
                  onChange={(e) => setSubjectTopic(e.target.value)}
                  rows={2}
                  placeholder="e.g. Announcing my new limited edition kiln drop — 6 ash-glazed yunomi available this Friday at noon"
                  className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40 resize-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-400">Who's reading it?</label>
                <input
                  value={subjectAudience}
                  onChange={(e) => setSubjectAudience(e.target.value)}
                  placeholder="e.g. Collectors who follow my ceramics work, patrons"
                  className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40"
                />
              </div>
              <button
                onClick={generateSubjects}
                disabled={subjectLoading || !subjectTopic.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {subjectLoading ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />}
                {subjectLoading ? "Generating options..." : "Generate Subject Lines"}
              </button>
            </div>
            {subjectResults.length > 0 && (
              <div className="space-y-2">
                {subjectResults.map((subject, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-stone-900/60 px-4 py-3">
                    <p className="text-sm text-stone-200">{subject}</p>
                    <CopyButton text={subject} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tip box */}
        <div className="mt-8 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5">
          <p className="mb-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">How it works</p>
          <p className="text-xs text-stone-500 leading-relaxed">
            These tools are trained on Kiln's craft artist context — they know your platform, your audience, and what performs in handmade art communities. Results are generated instantly using AI and are ready to copy and post. The weekly press system also auto-publishes Kiln updates to Bluesky, Mastodon, Dev.to, and Pinterest every week on your behalf.
          </p>
        </div>
      </div>
    </div>
  );
}
