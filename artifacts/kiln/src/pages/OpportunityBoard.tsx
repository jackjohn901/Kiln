import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Clock, DollarSign, ChevronLeft, Star, Search, CheckCircle, ChevronDown } from "lucide-react";
import Nav from "@/components/Nav";
import { OPPORTUNITIES, OPPORTUNITY_TYPES, daysUntilDeadline, type OpportunityType } from "@/data/opportunities";

const TYPE_COLORS: Record<OpportunityType | "all", string> = {
  all: "text-stone-400 bg-stone-800 border-stone-700",
  residency: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  grant: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  fellowship: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  call: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  exhibition: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  job: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

const TYPE_LABELS: Record<OpportunityType, string> = {
  residency: "Residency",
  grant: "Grant",
  fellowship: "Fellowship",
  call: "Call for Entry",
  exhibition: "Exhibition",
  job: "Job",
};

function urgencyColor(days: number | null): string {
  if (days === null) return "text-stone-400";
  if (days <= 7) return "text-red-400";
  if (days <= 21) return "text-amber-400";
  return "text-stone-400";
}

function formatDeadline(deadline: string): string {
  if (deadline === "Rolling") return "Rolling deadline";
  const d = new Date(deadline);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const SAVED_KEY = "kiln_saved_opps";
const APPLIED_KEY = "kiln_opps_applied";

function getSaved(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
}
function setSaved(ids: string[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); } catch {}
}

type ApplicationStatus = "not-applied" | "applied" | "submitted" | "accepted" | "declined";

function getApplications(): Record<string, ApplicationStatus> {
  try { return JSON.parse(localStorage.getItem(APPLIED_KEY) ?? "{}"); } catch { return {}; }
}
function saveApplications(apps: Record<string, ApplicationStatus>) {
  try { localStorage.setItem(APPLIED_KEY, JSON.stringify(apps)); } catch {}
}

export default function OpportunityBoard() {
  const [filter, setFilter] = useState<OpportunityType | "all">("all");
  const [query, setQuery] = useState("");
  const [saved, setSavedState] = useState<string[]>(getSaved);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applications, setApplications] = useState<Record<string, ApplicationStatus>>(getApplications);
  const [showApplied, setShowApplied] = useState(false);

  function setAppStatus(id: string, status: ApplicationStatus) {
    setApplications(prev => {
      const next = { ...prev, [id]: status };
      saveApplications(next);
      return next;
    });
  }

  function toggleSave(id: string) {
    setSavedState((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      setSaved(next);
      return next;
    });
  }

  const filtered = OPPORTUNITIES.filter((o) => {
    const typeMatch = filter === "all" || o.type === filter;
    const q = query.toLowerCase();
    const textMatch = !q || o.title.toLowerCase().includes(q) || o.organization.toLowerCase().includes(q) || o.medium.some((m) => m.toLowerCase().includes(q)) || o.location.toLowerCase().includes(q);
    return typeMatch && textMatch;
  });

  const featured = filtered.filter((o) => o.featured);
  const rest = filtered.filter((o) => !o.featured);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <Link href="/" className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl text-amber-100">Opportunity Board</h1>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                {OPPORTUNITIES.length} open
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              Residencies, grants, calls for entry, and fellowships — curated for craft artists.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by medium, location, or keyword..."
            className="w-full rounded-full border border-white/10 bg-stone-900/80 py-2.5 pl-9 pr-4 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
          />
        </div>

        {/* Type filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {OPPORTUNITY_TYPES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filter === key
                  ? TYPE_COLORS[key].replace("text-", "bg-").replace(/bg-\S+\/10/, "").replace("border-", "") + " bg-amber-500 text-stone-950 border-amber-500"
                  : "border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
              } ${filter === key ? "!bg-amber-500 !text-stone-950 !border-amber-500" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center text-stone-600">
            <p className="text-lg">No opportunities match.</p>
            <button onClick={() => { setFilter("all"); setQuery(""); }} className="mt-3 text-sm text-amber-500 hover:text-amber-400">
              Clear filters
            </button>
          </div>
        )}

        {/* Application tracker toggle */}
        {Object.keys(applications).length > 0 && (
          <div className="mb-5">
            <button
              onClick={() => setShowApplied(s => !s)}
              className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <CheckCircle size={12} /> {Object.keys(applications).length} application{Object.keys(applications).length !== 1 ? "s" : ""} tracked
              <span className="text-stone-600">{showApplied ? "▲" : "▼"}</span>
            </button>
            {showApplied && (
              <div className="mt-3 flex flex-col gap-2">
                {OPPORTUNITIES.filter(o => applications[o.id]).map(opp => (
                  <div key={opp.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-stone-900/40 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-300 truncate">{opp.title}</p>
                      <p className="text-[10px] text-stone-600">{opp.organization}</p>
                    </div>
                    <select
                      value={applications[opp.id]}
                      onChange={e => setAppStatus(opp.id, e.target.value as ApplicationStatus)}
                      onClick={e => e.stopPropagation()}
                      className="rounded-lg border border-white/10 bg-stone-800 px-2 py-1 text-[10px] font-semibold text-stone-300 focus:outline-none"
                    >
                      <option value="applied">Applied</option>
                      <option value="submitted">Submitted</option>
                      <option value="accepted">Accepted ✓</option>
                      <option value="declined">Declined</option>
                      <option value="not-applied">Remove</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Featured */}
        {featured.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Star size={12} className="text-amber-400" fill="currentColor" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Featured</span>
            </div>
            <div className="flex flex-col gap-3">
              {featured.map((opp) => (
                <OppCard key={opp.id} opp={opp} saved={saved.includes(opp.id)} onSave={() => toggleSave(opp.id)} expanded={expanded === opp.id} onExpand={() => setExpanded(expanded === opp.id ? null : opp.id)} appStatus={applications[opp.id] ?? "not-applied"} onSetStatus={s => setAppStatus(opp.id, s)} />
              ))}
            </div>
          </div>
        )}

        {/* Rest */}
        {rest.length > 0 && (
          <div className="flex flex-col gap-3">
            {rest.map((opp) => (
              <OppCard key={opp.id} opp={opp} saved={saved.includes(opp.id)} onSave={() => toggleSave(opp.id)} expanded={expanded === opp.id} onExpand={() => setExpanded(expanded === opp.id ? null : opp.id)} appStatus={applications[opp.id] ?? "not-applied"} onSetStatus={s => setAppStatus(opp.id, s)} />
            ))}
          </div>
        )}

        {/* Saved section */}
        {saved.length > 0 && filter === "all" && !query && (
          <div className="mt-10 border-t border-white/8 pt-8">
            <p className="mb-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              <BookmarkCheck size={12} className="inline mr-1.5 text-amber-400" />
              Saved ({saved.length})
            </p>
            <div className="flex flex-col gap-2">
              {OPPORTUNITIES.filter((o) => saved.includes(o.id)).map((opp) => (
                <div key={opp.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-stone-900/40 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-200 truncate">{opp.title}</p>
                    <p className="text-xs text-stone-500">{opp.organization}</p>
                  </div>
                  <span className={`text-xs ${urgencyColor(daysUntilDeadline(opp.deadline))}`}>
                    {opp.deadline === "Rolling" ? "Rolling" : `${daysUntilDeadline(opp.deadline)}d`}
                  </span>
                  <button onClick={() => toggleSave(opp.id)} className="text-amber-400 hover:text-stone-400 transition-colors">
                    <BookmarkCheck size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const APP_STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  "not-applied": { label: "Mark Applied", color: "text-stone-500 hover:text-amber-400" },
  applied: { label: "Applied ✓", color: "text-amber-400" },
  submitted: { label: "Submitted", color: "text-sky-400" },
  accepted: { label: "Accepted 🎉", color: "text-emerald-400" },
  declined: { label: "Declined", color: "text-stone-500" },
};

function OppCard({ opp, saved, onSave, expanded, onExpand, appStatus, onSetStatus }: {
  opp: typeof OPPORTUNITIES[0];
  saved: boolean;
  onSave: () => void;
  expanded: boolean;
  onExpand: () => void;
  appStatus: ApplicationStatus;
  onSetStatus: (s: ApplicationStatus) => void;
}) {
  const days = daysUntilDeadline(opp.deadline);

  return (
    <motion.div
      layout
      className={`overflow-hidden rounded-2xl border transition-all ${opp.featured ? "border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-stone-900/80" : "border-white/8 bg-stone-900/60"}`}
    >
      <div className="w-full cursor-pointer px-5 py-4 text-left" onClick={onExpand}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_COLORS[opp.type]}`}>
                {TYPE_LABELS[opp.type]}
              </span>
              {opp.featured && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400">
                  <Star size={9} fill="currentColor" /> Featured
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-amber-100 leading-snug">{opp.title}</h3>
            <p className="text-xs text-stone-500 mt-0.5">{opp.organization}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onSave(); }}
            className={`mt-0.5 shrink-0 transition-colors ${saved ? "text-amber-400" : "text-stone-600 hover:text-stone-400"}`}
          >
            {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <MapPin size={11} /> {opp.location}
          </span>
          <span className={`flex items-center gap-1 ${urgencyColor(days)}`}>
            <Clock size={11} />
            {opp.deadline === "Rolling" ? "Rolling deadline" : days !== null && days <= 0 ? "Deadline passed" : days === 1 ? "Due tomorrow!" : days !== null && days <= 7 ? `${days} days left!` : `Due ${formatDeadline(opp.deadline)}`}
          </span>
          {opp.stipend && (
            <span className="flex items-center gap-1 text-emerald-400">
              <DollarSign size={11} /> {opp.stipend}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {opp.medium.slice(0, 4).map((m) => (
            <span key={m} className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-400">{m}</span>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/8 px-5 py-4">
              <p className="text-sm text-stone-300 leading-relaxed mb-4">{opp.description}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href={opp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
                >
                  Apply / Learn more <ExternalLink size={13} />
                </a>
                {/* Application status tracker */}
                <div className="flex items-center gap-2">
                  {appStatus === "not-applied" ? (
                    <button
                      onClick={e => { e.stopPropagation(); onSetStatus("applied"); }}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-stone-500 hover:border-amber-500/30 hover:text-amber-400 transition-colors"
                    >
                      <CheckCircle size={11} /> Track application
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold ${APP_STATUS_CONFIG[appStatus].color}`}>
                        {APP_STATUS_CONFIG[appStatus].label}
                      </span>
                      <select
                        value={appStatus}
                        onChange={e => { e.stopPropagation(); onSetStatus(e.target.value as ApplicationStatus); }}
                        onClick={e => e.stopPropagation()}
                        className="rounded-lg border border-white/10 bg-stone-800 px-2 py-1 text-[10px] text-stone-400 focus:outline-none"
                      >
                        <option value="applied">Applied</option>
                        <option value="submitted">Submitted</option>
                        <option value="accepted">Accepted</option>
                        <option value="declined">Declined</option>
                        <option value="not-applied">Remove</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
