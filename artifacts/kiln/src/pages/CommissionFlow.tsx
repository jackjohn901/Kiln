import { useState, useEffect } from "react";
import { markFeatureVisited } from "@/lib/featureDiscovery";
import { useParams, Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle, Clock, Image, DollarSign, Ruler, FileText, Flame, ChevronRight, Info } from "lucide-react";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";

const ALL_ARTISTS = [...artists, ...seedArtists];

const WORK_TYPES = [
  "Functional vessel", "Wall-mounted piece", "Sculptural object", "Jewelry / wearable",
  "Architectural installation", "Series of works", "Custom gift", "Other",
];
const BUDGET_RANGES = [
  "Under $500", "$500 – $2,000", "$2,000 – $5,000", "$5,000 – $10,000", "$10,000 – $25,000", "$25,000+", "Open to discussion",
];
const TIMELINES = [
  "ASAP (1–4 weeks)", "3 months", "6 months", "1 year", "Flexible / no rush",
];

type Step = "brief" | "review" | "submitted";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">
        {label}
        {hint && <Info size={10} className="text-stone-600" aria-label={hint} />}
      </label>
      {children}
    </div>
  );
}

export default function CommissionFlow() {
  useEffect(() => { markFeatureVisited("commissions"); }, []);
  const { artistId } = useParams<{ artistId: string }>();
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { sendCommissionInquiry, getArtistCommissionStatus } = useSocial();

  const artist = ALL_ARTISTS.find((a) => a.id === artistId);
  const avatarUrl = artist?.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${artistId}`;
  const commissionStatus = getArtistCommissionStatus(artistId ?? "");

  const [step, setStep] = useState<Step>("brief");
  const [form, setForm] = useState({
    workType: "",
    description: "",
    dimensions: "",
    colorNotes: "",
    budget: "",
    timeline: "",
    referenceUrl: "",
    specialNotes: "",
    contactEmail: "",
    contactName: profile?.name ?? "",
  });
  const [commissionId] = useState(() => `KCM-${Math.random().toString(36).slice(2, 9).toUpperCase()}`);

  function field(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const canSubmit = form.workType && form.description && form.budget && form.timeline && form.contactEmail && form.contactName;

  async function handleSubmit() {
    if (!artist) return;
    try {
      const r = await fetch("/api/commissions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          artistName: artist.name,
          workType: form.workType,
          description: `[${form.workType}] ${form.description}${form.colorNotes ? ` | Colors/materials: ${form.colorNotes}` : ""}${form.referenceUrl ? ` | References: ${form.referenceUrl}` : ""}${form.specialNotes ? ` | Notes: ${form.specialNotes}` : ""}`,
          budgetRange: form.budget,
          timeline: form.timeline,
          dimensions: form.dimensions || undefined,
          referenceUrls: form.referenceUrl ? [form.referenceUrl] : [],
        }),
      });
      if (r.ok) {
        if (profile) {
          sendCommissionInquiry({
            toArtistId: artist.id,
            toArtistName: artist.name,
            fromName: form.contactName || profile.name,
            fromEmail: form.contactEmail,
            fromArtistId: profile.id,
            type: "custom",
            description: form.description,
            budget: form.budget,
            timeline: form.timeline,
            dimensions: form.dimensions || undefined,
          });
        }
        setStep("submitted");
      }
    } catch {
      setStep("submitted");
    }
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <p className="text-stone-400">Artist not found.</p>
          <Link href="/discover" className="text-amber-400 text-sm">← Discover Artists</Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <Flame size={32} className="text-stone-700" />
          <p className="text-stone-200 font-semibold">Create a profile to request a commission</p>
          <Link href="/setup" className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400">
            Create Profile
          </Link>
        </div>
      </div>
    );
  }

  if (step === "submitted") {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <CheckCircle size={36} className="text-emerald-400" />
          </div>
          <h2 className="font-serif text-3xl text-amber-100 mb-2">Brief Sent</h2>
          <p className="text-stone-500 text-sm mb-1">Commission ID: <span className="font-mono text-amber-300">{commissionId}</span></p>
          <p className="text-stone-400 text-sm mb-8 max-w-sm mx-auto">
            {artist.name} typically responds within 3–5 business days. You'll receive an email at {form.contactEmail} when they reply.
          </p>

          <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-5 mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <img src={avatarUrl} alt={artist.name} className="h-12 w-12 rounded-full object-cover border border-white/10" />
              <div>
                <p className="font-semibold text-stone-100">{artist.name}</p>
                <p className="text-xs text-stone-500">{artist.medium.split(",")[0]} · {artist.location}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-stone-600 w-20 shrink-0">Work type</span>
                <span className="text-stone-300">{form.workType}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-stone-600 w-20 shrink-0">Budget</span>
                <span className="text-stone-300">{form.budget}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-stone-600 w-20 shrink-0">Timeline</span>
                <span className="text-stone-300">{form.timeline}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-white/8 pt-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">What happens next</p>
              {[
                { icon: Clock, text: `${artist.name} reviews your brief (3–5 days)` },
                { icon: DollarSign, text: "They send a quote if interested" },
                { icon: CheckCircle, text: "You accept and pay a deposit to confirm" },
                { icon: Flame, text: "Work begins — progress updates via Kiln" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-stone-400">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                    <Icon size={10} className="text-amber-400" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link href={`/artists/${artist.id}`}>
              <button className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                Artist Profile
              </button>
            </Link>
            <Link href="/">
              <button className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
                Back to Feed
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button onClick={() => navigate(-1 as never)} className="mb-6 flex items-center gap-1.5 text-sm text-stone-500 hover:text-amber-300 transition-colors">
          <ArrowLeft size={14} /> Back
        </button>

        <div className="mb-8">
          <h1 className="font-serif text-3xl text-amber-100 mb-1">Request a Commission</h1>
          <p className="text-stone-500 text-sm">Submit a brief and {artist.name} will respond with a quote if they're able to take the work on.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Form */}
          <div className="space-y-5">
            {/* Step tabs */}
            <div className="flex gap-1 rounded-xl bg-stone-900/50 border border-white/5 p-1">
              {(["brief", "review"] as Step[]).map((s, i) => (
                <div key={s} className={`flex-1 rounded-lg py-2 text-sm font-medium text-center transition-colors ${
                  step === s ? "bg-amber-500/20 text-amber-300" : "text-stone-600"
                }`}>
                  {i + 1}. {s === "brief" ? "Your Brief" : "Review & Send"}
                </div>
              ))}
            </div>

            {step === "brief" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 rounded-2xl border border-white/10 bg-stone-900/40 p-5">
                <Field label="Type of work">
                  <div className="flex flex-wrap gap-2">
                    {WORK_TYPES.map((t) => (
                      <button key={t} onClick={() => field("workType", t)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          form.workType === t
                            ? "border-amber-500 bg-amber-500/15 text-amber-300"
                            : "border-stone-700 text-stone-400 hover:border-stone-500"
                        }`}
                      >{t}</button>
                    ))}
                  </div>
                </Field>

                <Field label="Description" hint="Describe the piece you have in mind — style, purpose, feel">
                  <textarea
                    value={form.description}
                    onChange={(e) => field("description", e.target.value)}
                    rows={4}
                    placeholder="I'm imagining a tall vessel for a dining room credenza. Warm amber tones with subtle surface texture, somewhere between functional and sculptural. The space has lots of natural wood and leather..."
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Approximate size">
                    <input
                      value={form.dimensions}
                      onChange={(e) => field("dimensions", e.target.value)}
                      placeholder='e.g. 18" tall × 8" wide'
                      className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                    />
                  </Field>
                  <Field label="Color / palette notes">
                    <input
                      value={form.colorNotes}
                      onChange={(e) => field("colorNotes", e.target.value)}
                      placeholder="e.g. warm ambers, no blues"
                      className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Budget range">
                    <select value={form.budget} onChange={(e) => field("budget", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none">
                      <option value="">Select…</option>
                      {BUDGET_RANGES.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </Field>
                  <Field label="Needed by">
                    <select value={form.timeline} onChange={(e) => field("timeline", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none">
                      <option value="">Select…</option>
                      {TIMELINES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Reference images (optional)" hint="Link to a Pinterest board, Google Drive folder, or any images that inspired you">
                  <input
                    value={form.referenceUrl}
                    onChange={(e) => field("referenceUrl", e.target.value)}
                    placeholder="https://pinterest.com/board/..."
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                  />
                </Field>

                <Field label="Anything else?">
                  <textarea
                    value={form.specialNotes}
                    onChange={(e) => field("specialNotes", e.target.value)}
                    rows={2}
                    placeholder="Special occasion? Specific deadline reason? Anything that helps the artist understand what this piece means to you."
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
                  />
                </Field>

                <div className="border-t border-white/8 pt-4">
                  <p className="mb-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Your contact info</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.contactName} onChange={(e) => field("contactName", e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
                    <input value={form.contactEmail} onChange={(e) => field("contactEmail", e.target.value)}
                      type="email" placeholder="your@email.com"
                      className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
                  </div>
                </div>

                <button
                  onClick={() => setStep("review")}
                  disabled={!form.workType || !form.description || !form.budget || !form.timeline}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
                >
                  Preview Brief <ChevronRight size={15} />
                </button>
              </motion.div>
            )}

            {step === "review" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-stone-900/40 p-5 space-y-4">
                  <h3 className="font-semibold text-stone-200">Review your brief</h3>
                  {[
                    { label: "Work type", value: form.workType, icon: FileText },
                    { label: "Budget", value: form.budget, icon: DollarSign },
                    { label: "Timeline", value: form.timeline, icon: Clock },
                    { label: "Dimensions", value: form.dimensions || "Not specified", icon: Ruler },
                    { label: "Color notes", value: form.colorNotes || "None", icon: Image },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-800">
                        <Icon size={13} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-600 uppercase tracking-wider">{label}</p>
                        <p className="text-sm text-stone-300">{value}</p>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-white/8 pt-3">
                    <p className="text-[10px] text-stone-600 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-stone-300 leading-relaxed">{form.description}</p>
                  </div>
                  {form.referenceUrl && (
                    <div>
                      <p className="text-[10px] text-stone-600 uppercase tracking-wider mb-1">References</p>
                      <a href={form.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-400 hover:text-amber-300 truncate block">{form.referenceUrl}</a>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 text-xs text-stone-500">
                  <Flame size={10} className="inline mr-1 text-amber-400" />
                  Submitting this brief does not commit you to a purchase. {artist.name} will review and respond with a quote if they're interested.
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep("brief")} className="rounded-full border border-white/10 px-5 py-3 text-sm text-stone-400 hover:border-white/20">
                    Edit Brief
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex-1 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
                  >
                    Send to {artist.name}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Artist sidebar */}
          <div className="space-y-4 h-fit">
            <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-5">
              <Link href={`/artists/${artist.id}`}>
                <img src={avatarUrl} alt={artist.name} className="h-20 w-20 rounded-2xl object-cover mb-3 border border-white/10 hover:border-amber-500/40 transition-colors" />
              </Link>
              <Link href={`/artists/${artist.id}`}>
                <h3 className="font-semibold text-amber-100 hover:text-amber-300 transition-colors">{artist.name}</h3>
              </Link>
              <p className="text-xs text-stone-500 mb-2">{artist.medium.split(",")[0]} · {artist.location}</p>
              <p className="text-sm text-stone-400 leading-relaxed line-clamp-4">{artist.bio}</p>

              <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                commissionStatus === "open"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : commissionStatus === "waitlisted"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-400"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${commissionStatus === "open" ? "bg-emerald-400" : commissionStatus === "waitlisted" ? "bg-amber-400" : "bg-rose-400"} animate-pulse`} />
                Commissions {commissionStatus === "open" ? "Open" : commissionStatus === "waitlisted" ? "Waitlisted" : "Closed"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Typical commission</p>
              <div className="space-y-2 text-xs text-stone-400">
                <div className="flex justify-between"><span>Response time</span><span className="text-stone-300">3–5 days</span></div>
                <div className="flex justify-between"><span>Deposit required</span><span className="text-stone-300">30–50%</span></div>
                <div className="flex justify-between"><span>Lead time</span><span className="text-stone-300">8–16 weeks</span></div>
                <div className="flex justify-between"><span>Revisions</span><span className="text-stone-300">1 major, 2 minor</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
