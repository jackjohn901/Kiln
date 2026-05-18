import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, Video, MapPin, Clock, Users, CheckCircle, ExternalLink, Mail, Star, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import { MENTORS, type MentorProfile } from "@/data/mentors";
import { useProfile } from "@/contexts/ProfileContext";

const AVAIL_COLORS = {
  open: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  waitlisted: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  closed: "text-stone-500 bg-stone-800 border-stone-700",
};

const FORMAT_LABELS: Record<string, string> = {
  "video-call": "Video Call",
  "studio-visit": "Studio Visit",
  "async-feedback": "Async Feedback",
  email: "Email",
};

const FORMAT_ICONS: Record<string, React.ElementType> = {
  "video-call": Video,
  "studio-visit": MapPin,
  "async-feedback": Clock,
  email: Mail,
};

function MediumBadge({ medium }: { medium: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-stone-800/80 px-2.5 py-0.5 text-[10px] font-semibold text-stone-400">
      {medium}
    </span>
  );
}

export default function Mentorship() {
  const { profile } = useProfile();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [appliedTo, setAppliedTo] = useState<Set<string>>(new Set());
  const [applyText, setApplyText] = useState("");
  const [applying, setApplying] = useState(false);
  const [mediumFilter, setMediumFilter] = useState<string>("all");

  const mediums = ["all", ...Array.from(new Set(MENTORS.map(m => m.medium.split(" & ")[0])))];

  const filtered = MENTORS.filter(m => mediumFilter === "all" || m.medium.includes(mediumFilter));

  // Load already-applied mentor IDs from server
  useEffect(() => {
    fetch("/api/me/mentorship/applications", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data?.applications?.length) {
          setAppliedTo(new Set(data.applications.map((a: { mentorId: string }) => a.mentorId)));
        }
      })
      .catch(() => {});
  }, []);

  async function handleApply(mentorId: string) {
    if (!applyText.trim() || applying) return;
    setApplying(true);
    try {
      await fetch("/api/mentorship/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorId, message: applyText }),
      });
    } catch {}
    setAppliedTo(s => new Set([...s, mentorId]));
    setApplyingTo(null);
    setApplyText("");
    setApplying(false);
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/discover" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100">Mentorship Board</h1>
            <p className="text-xs text-stone-500 mt-0.5">Connect with experienced craft artists for guidance and feedback</p>
          </div>
        </div>

        {/* Medium filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {mediums.map(m => (
            <button
              key={m}
              onClick={() => setMediumFilter(m)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                mediumFilter === m ? "bg-amber-500 text-stone-950" : "border border-white/10 text-stone-500 hover:text-stone-300"
              }`}
            >
              {m === "all" ? "All Disciplines" : m}
            </button>
          ))}
        </div>

        {/* Offer mentorship CTA */}
        {profile && (
          <div className="mb-6 rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 p-5 text-center">
            <p className="text-sm font-semibold text-stone-300 mb-1">Offer your expertise</p>
            <p className="text-xs text-stone-500 mb-3">If you've been working in craft for 5+ years, consider offering mentorship slots.</p>
            <a href="mailto:mentorship@kiln.art" className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors">
              Apply to be a mentor
            </a>
          </div>
        )}

        {/* Mentor cards */}
        <div className="flex flex-col gap-4">
          {filtered.map((mentor, idx) => (
            <MentorCard
              key={mentor.id}
              mentor={mentor}
              expanded={expanded === mentor.id}
              onExpand={() => setExpanded(expanded === mentor.id ? null : mentor.id)}
              applyingTo={applyingTo}
              applyText={applyText}
              setApplyText={setApplyText}
              onStartApply={() => setApplyingTo(mentor.id)}
              onCancelApply={() => setApplyingTo(null)}
              onApply={() => handleApply(mentor.id)}
              applied={appliedTo.has(mentor.id)}
              hasProfile={!!profile}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MentorCard({ mentor, expanded, onExpand, applyingTo, applyText, setApplyText, onStartApply, onCancelApply, onApply, applied, hasProfile }: {
  mentor: MentorProfile;
  expanded: boolean;
  onExpand: () => void;
  applyingTo: string | null;
  applyText: string;
  setApplyText: (v: string) => void;
  onStartApply: () => void;
  onCancelApply: () => void;
  onApply: () => void;
  applied: boolean;
  hasProfile: boolean;
}) {
  const isApplying = applyingTo === mentor.id;

  return (
    <motion.div layout className="overflow-hidden rounded-2xl border border-white/8 bg-stone-900/60">
      {/* Main card */}
      <button className="w-full text-left px-5 py-5" onClick={onExpand}>
        <div className="flex items-start gap-4">
          <img
            src={mentor.avatarUrl}
            alt={mentor.name}
            className="h-14 w-14 shrink-0 rounded-full object-cover border-2 border-stone-800"
            onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${mentor.artistId}/80/80`; }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-stone-200 text-sm">{mentor.name}</h3>
                <p className="text-[11px] text-stone-500 mt-0.5">{mentor.medium} · {mentor.yearsExperience} years</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${AVAIL_COLORS[mentor.availability]}`}>
                  {mentor.availability === "open" ? `${mentor.spotsAvailable} open` : mentor.availability}
                </span>
                {expanded ? <ChevronUp size={14} className="text-stone-600" /> : <ChevronDown size={14} className="text-stone-600" />}
              </div>
            </div>
            <p className="mt-2 text-xs text-stone-400 line-clamp-2 leading-relaxed">{mentor.bio}</p>
            <div className="mt-2.5 flex items-center gap-3 text-[10px] text-stone-600">
              <span className="flex items-center gap-1"><MapPin size={9} /> {mentor.location}</span>
              <span className="flex items-center gap-1"><Users size={9} /> {mentor.totalMentored} mentored</span>
            </div>
            {/* Format badges */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {mentor.format.map(f => {
                const Icon = FORMAT_ICONS[f];
                return (
                  <span key={f} className="flex items-center gap-1 rounded-full border border-white/10 bg-stone-800 px-2 py-0.5 text-[10px] text-stone-400">
                    <Icon size={9} /> {FORMAT_LABELS[f]}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-white/8 px-5 py-5 space-y-4">
              {/* Areas */}
              <div>
                <p className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider mb-2">Mentorship Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {mentor.mentorshipAreas.map(a => (
                    <span key={a} className="rounded-full bg-stone-800 border border-white/8 px-2.5 py-1 text-[11px] text-stone-300">{a}</span>
                  ))}
                </div>
              </div>

              {/* Fee + Commitment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-stone-800/60 p-3">
                  <p className="text-[10px] text-stone-600 mb-1">Fee</p>
                  <p className="text-xs text-stone-300 leading-snug">{mentor.fee}</p>
                </div>
                <div className="rounded-xl bg-stone-800/60 p-3">
                  <p className="text-[10px] text-stone-600 mb-1">Commitment</p>
                  <p className="text-xs text-stone-300 leading-snug">{mentor.commitment}</p>
                </div>
              </div>

              {/* Testimonials */}
              {mentor.testimonials.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider mb-2">Mentee Testimonials</p>
                  <div className="space-y-2">
                    {mentor.testimonials.map((t, i) => (
                      <div key={i} className="rounded-xl border border-white/8 bg-stone-800/40 p-3">
                        <p className="text-xs text-stone-400 leading-relaxed italic">"{t.text}"</p>
                        <p className="text-[11px] text-stone-600 mt-1">— {t.mentee}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply / Applied */}
              {applied ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-medium">Application sent — {mentor.name} will be in touch.</span>
                </div>
              ) : isApplying ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-stone-400">Application to {mentor.name}</p>
                  <textarea
                    value={applyText}
                    onChange={e => setApplyText(e.target.value)}
                    rows={4}
                    placeholder={`Introduce yourself: where you are in your practice, what you're working on, and what you most want to develop. ${mentor.requiresPortfolio ? "Include a portfolio link." : ""}`}
                    className="w-full rounded-lg border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={onApply} disabled={!applyText.trim()} className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Send Application
                    </button>
                    <button onClick={onCancelApply} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={hasProfile ? onStartApply : undefined}
                  disabled={mentor.availability === "closed"}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${
                    mentor.availability === "closed" ? "bg-stone-800 text-stone-600 cursor-not-allowed" :
                    mentor.availability === "waitlisted" ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20" :
                    "bg-amber-500 text-stone-950 hover:bg-amber-400"
                  }`}
                >
                  {!hasProfile ? "Create a profile to apply" :
                   mentor.availability === "closed" ? "Currently closed" :
                   mentor.availability === "waitlisted" ? "Join Waitlist" : "Apply for Mentorship"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
