import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Flame, Check, Star, Zap, Shield, Users, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";

const BENEFITS = [
  { icon: Shield, label: "Permanent Founding Artist badge on your profile", color: "text-amber-400" },
  { icon: Zap, label: "Boosted algorithm reach for every post you publish", color: "text-amber-400" },
  { icon: Star, label: "Early access to monetisation features before public release", color: "text-amber-400" },
  { icon: Check, label: "Profile verification included automatically", color: "text-amber-400" },
  { icon: Users, label: "Invitation-only Founding Artist community and events", color: "text-amber-400" },
  { icon: Flame, label: "Your number in the original 100 — permanent and public", color: "text-amber-400" },
];

const TECHNIQUES = [
  "Glassblowing", "Flamework", "Kiln-formed glass", "Ceramics", "Pottery", "Stoneware",
  "Woodworking", "Woodturning", "Furniture making", "Metalwork", "Blacksmithing", "Silversmithing",
  "Weaving", "Fiber arts", "Textile design", "Printmaking", "Bookbinding", "Leather craft",
  "Jewellery making", "Sculpture", "Mixed media", "Other",
];

interface Status {
  isFoundingArtist: boolean;
  foundingArtistNumber: number | null;
  application: { status: string; submittedAt: string; reviewNote: string | null } | null;
}

export default function FoundingArtist() {
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { isAuthenticated } = useAuth();

  const [spotsCount, setSpotsCount] = useState<number | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [medium, setMedium] = useState("");
  const [statement, setStatement] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [yearsActive, setYearsActive] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/founding-artists/count")
      .then((r) => r.json())
      .then((d) => setSpotsCount(d.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingStatus(true);
    fetch("/api/me/founding-artist/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, [isAuthenticated]);

  const spotsLeft = spotsCount !== null ? 100 - spotsCount : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) { navigate("/setup"); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/me/founding-artist/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          medium,
          statement,
          instagram: instagram || undefined,
          website: website || undefined,
          yearsActive: yearsActive ? parseInt(yearsActive) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status?.isFoundingArtist) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 border-2 border-amber-500/40">
              <Flame size={36} className="text-amber-400" />
            </div>
          </div>
          <h1 className="font-serif text-3xl text-amber-100 mb-2">Founding Artist</h1>
          <p className="text-amber-400 font-bold text-lg mb-1">#{status.foundingArtistNumber}</p>
          <p className="text-stone-400 mb-8">You are one of the original 100 artists who built Kiln from the ground up. Thank you.</p>
          <button
            onClick={() => navigate(`/artists/${profile?.id ?? ""}`)}
            className="rounded-full bg-amber-500 px-8 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            View your profile
          </button>
        </div>
      </div>
    );
  }

  if (submitted || status?.application?.status === "pending") {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30">
              <Check size={36} className="text-amber-400" />
            </div>
          </div>
          <h1 className="font-serif text-3xl text-amber-100 mb-3">Application received</h1>
          <p className="text-stone-400 mb-8">
            We review every application personally. You'll hear back within a few days — watch your notifications.
          </p>
          <button
            onClick={() => navigate("/")}
            className="rounded-full border border-white/10 px-8 py-3 text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            Back to feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e] pb-28 md:pb-8">
      <Nav />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/30 via-transparent to-[#12100e]" />
        <div className="mx-auto max-w-2xl px-4 pt-16 pb-12 text-center relative z-10">
          <div className="mb-5 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5">
              <Flame size={14} className="text-amber-400" />
              <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">Founding 100</span>
            </div>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-amber-100 mb-4 leading-tight">
            Be one of the first<br />artists on Kiln
          </h1>
          <p className="text-stone-400 text-lg mb-6 max-w-lg mx-auto">
            We're inviting 100 craft artists to help build the platform from the ground up. Your work, your process, your community — first.
          </p>

          {spotsLeft !== null && (
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-stone-900/60 px-5 py-3 mb-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{spotsLeft}</p>
                <p className="text-xs text-stone-500">spots left</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold text-stone-300">{spotsCount}</p>
                <p className="text-xs text-stone-500">of 100 filled</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Benefits */}
      <div className="mx-auto max-w-2xl px-4 mb-12">
        <h2 className="font-serif text-xl text-amber-100 mb-5 text-center">What Founding Artists get</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BENEFITS.map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl border border-white/8 bg-stone-900/40 p-4">
              <Icon size={16} className={`${color} mt-0.5 shrink-0`} />
              <p className="text-sm text-stone-300">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Application form */}
      <div className="mx-auto max-w-lg px-4">
        <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-6">
          <h2 className="font-serif text-xl text-amber-100 mb-1">Apply now</h2>
          <p className="text-sm text-stone-500 mb-6">Every application is reviewed by the team. We're looking for artists who document their process.</p>

          {!isAuthenticated ? (
            <div className="text-center py-6">
              <p className="text-stone-400 mb-4">You'll need an account to apply.</p>
              <button
                onClick={() => navigate("/setup")}
                className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                Create your profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">Your craft / medium <span className="text-red-400">*</span></label>
                <select
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                >
                  <option value="">Select your technique</option>
                  {TECHNIQUES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">
                  Why do you want to be a Founding Artist? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  required
                  minLength={50}
                  rows={5}
                  placeholder="Tell us about your practice, how you document your process, and what you'd bring to the Kiln community..."
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
                />
                <p className="text-xs text-stone-600 mt-1">{statement.length} / 50 min characters</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">Instagram handle</label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@yourhandle"
                    className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">Years active</label>
                  <input
                    type="number"
                    value={yearsActive}
                    onChange={(e) => setYearsActive(e.target.value)}
                    placeholder="e.g. 8"
                    min={0}
                    max={60}
                    className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">Portfolio or website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              {submitError && (
                <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting || statement.length < 50 || !medium}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
                {submitting ? "Submitting…" : "Apply to be a Founding Artist"}
              </button>

              <p className="text-center text-xs text-stone-600">
                We review every application personally and reply within a few days.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
