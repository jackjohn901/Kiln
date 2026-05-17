import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Clock, DollarSign, ChevronLeft, Star, Search, CheckCircle, ChevronDown, CalendarPlus } from "lucide-react";
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

type ApplicationStatus = "not-applied" | "applied" | "submitted" | "accepted" | "declined";

const SAVED_KEY = "kiln_saved_opps";
const APPLIED_KEY = "kiln_opps_applied";

export default function OpportunityBoard() {
  const [filter, setFilter] = useState<OpportunityType | "all">("all");
  const [query, setQuery] = useState("");
  const [saved, setSavedState] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applications, setApplications] = useState<Record<string, ApplicationStatus>>(() => {
    try { return JSON.parse(localStorage.getItem(APPLIED_KEY) ?? "{}"); } catch { return {}; }
  });
  const [showApplied, setShowApplied] = useState(false);

  useEffect(() => {
    fetch("/api/me/opportunity-saves", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.savedIds?.length) {
          setSavedState(data.savedIds);
          try { localStorage.setItem(SAVED_KEY, JSON.stringify(data.savedIds)); } catch {}
        }
        if (data.applications && Object.keys(data.applications).length) {
          setApplications(prev => ({ ...prev, ...data.applications }));
          try { localStorage.setItem(APPLIED_KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(APPLIED_KEY) ?? "{}"), ...data.applications })); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  function setAppStatus(id: string, status: ApplicationStatus) {
    setApplications(prev => {
      const next = { ...prev, [id]: status };
      try { localStorage.setItem(APPLIED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    fetch(`/api/me/opportunity-status/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }

  function toggleSave(id: string) {
    setSavedState((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    fetch(`/api/me/opportunity-saves/${id}`, { method: "POST", credentials: "include" }).catch(() => {});
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
                  ? "!bg-amber-500 !text-stone-950 !border-amber-500"
                  : "border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
              }`}
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
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Featured */}
        {featured.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Star size={12} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Featured</span>
            </div>
            <div className="flex flex-col gap-3">
              {featured.map(opp => <OppCard key={opp.id} opp={opp} saved={saved} applications={applications} onToggleSave={toggleSave} onSetStatus={setAppStatus} expanded={expanded} onExpand={setExpanded} />)}
            </div>
          </div>
        )}

        {/* Rest */}
        {rest.length > 0 && (
          <div className="flex flex-col gap-3">
            {rest.map(opp => <OppCard key={opp.id} opp={opp} saved={saved} applications={applications} onToggleSave={toggleSave} onSetStatus={setAppStatus} expanded={expanded} onExpand={setExpanded} />)}
          </div>
        )}
      </div>
    </div>
  );
}

type OppType = (typeof OPPORTUNITIES)[number];

function OppCard({
  opp, saved, applications, onToggleSave, onSetStatus, expanded, onExpand
}: {
  opp: OppType;
  saved: string[];
  applications: Record<string, ApplicationStatus>;
  onToggleSave: (id: string) => void;
  onSetStatus: (id: string, s: ApplicationStatus) => void;
  expanded: string | null;
  onExpand: (id: string | null) => void;
}) {
  const isSaved = saved.includes(opp.id);
  const appStatus = applications[opp.id];
  const days = daysUntilDeadline(opp.deadline);
  const isOpen = expanded === opp.id;

  return (
    <motion.div layout className={`rounded-2xl border transition-colors ${isOpen ? "border-amber-500/30 bg-stone-900/80" : "border-white/8 bg-stone-900/40"}`}>
      <button className="w-full text-left p-4" onClick={() => onExpand(isOpen ? null : opp.id)}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TYPE_COLORS[opp.type]}`}>
                {TYPE_LABELS[opp.type]}
              </span>
              {opp.featured && <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">Featured</span>}
              {appStatus && appStatus !== "not-applied" && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  {appStatus.charAt(0).toUpperCase() + appStatus.slice(1)}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-stone-100 truncate">{opp.title}</p>
            <p className="text-xs text-stone-500">{opp.organization}</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <button onClick={(e) => { e.stopPropagation(); onToggleSave(opp.id); }}
              className={`p-1.5 rounded-full transition-colors ${isSaved ? "text-amber-400" : "text-stone-600 hover:text-stone-400"}`}>
              {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            </button>
            <ChevronDown size={12} className={`text-stone-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
          <span className="flex items-center gap-1"><MapPin size={10} />{opp.location}</span>
          <span className={`flex items-center gap-1 ${urgencyColor(days)}`}>
            <Clock size={10} />
            {days === null ? "Rolling" : days <= 0 ? "Closed" : `${days}d left — ${formatDeadline(opp.deadline)}`}
          </span>
          {opp.stipend && <span className="flex items-center gap-1 text-emerald-400"><DollarSign size={10} />{opp.stipend}</span>}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 pb-4 space-y-3">
            <p className="text-sm text-stone-400 leading-relaxed">{opp.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {opp.medium.map(m => (
                <span key={m} className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[11px] text-stone-400">{m}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {opp.url && (
                <a href={opp.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                  <ExternalLink size={11} /> Apply
                </a>
              )}
              {!appStatus || appStatus === "not-applied" ? (
                <button onClick={() => onSetStatus(opp.id, "applied")}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors">
                  <CalendarPlus size={11} /> Track application
                </button>
              ) : (
                <select
                  value={appStatus}
                  onChange={e => onSetStatus(opp.id, e.target.value as ApplicationStatus)}
                  onClick={e => e.stopPropagation()}
                  className="rounded-full border border-white/10 bg-stone-800 px-3 py-2 text-xs text-stone-300 focus:outline-none"
                >
                  <option value="applied">Applied</option>
                  <option value="submitted">Submitted</option>
                  <option value="accepted">Accepted ✓</option>
                  <option value="declined">Declined</option>
                </select>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
