import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  MapPin, Calendar, Users, Video, Plus, X, Check,
  ExternalLink, Flame, ChevronRight, Clock, Globe,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import BetaBanner from "@/components/BetaBanner";

const STORAGE_KEY = "kiln_event_rsvps_v1";
const CUSTOM_KEY = "kiln_custom_events_v1";

type EventType = "open-studio" | "gallery" | "fair" | "virtual" | "workshop-social" | "other";
type EventMode = "in-person" | "virtual" | "hybrid";

interface CommunityEvent {
  id: string;
  title: string;
  type: EventType;
  mode: EventMode;
  date: string;
  time: string;
  location: string;
  city: string;
  artistName: string;
  description: string;
  attendees: number;
  link?: string;
}

const SEED_EVENTS: CommunityEvent[] = [
  {
    id: "evt-001",
    title: "Open Studio: Summer Works",
    type: "open-studio",
    mode: "in-person",
    date: "2026-05-24",
    time: "12:00 PM – 5:00 PM",
    location: "Bernstein Glass Studio, Asheville NC",
    city: "Asheville, NC",
    artistName: "Alex Bernstein",
    description: "Come visit the studio and see the new Summer series in progress. Glass blowing demonstrations every hour. Light refreshments, no reservation required.",
    attendees: 42,
  },
  {
    id: "evt-002",
    title: "Pacific Northwest Glass Summit",
    type: "gallery",
    mode: "in-person",
    date: "2026-06-07",
    time: "6:00 PM – 9:00 PM",
    location: "Habatat Gallery, Seattle WA",
    city: "Seattle, WA",
    artistName: "Multiple Artists",
    description: "Annual gathering of PNW studio glass artists. Opening reception for the summer group show featuring Lino Tagliapietra, Dante Marioni, Richard Royal, and eight emerging artists.",
    attendees: 178,
    link: "https://habatat.com",
  },
  {
    id: "evt-003",
    title: "Virtual Critique Circle: Process & Intent",
    type: "virtual",
    mode: "virtual",
    date: "2026-05-28",
    time: "7:00 PM ET",
    location: "Zoom — link sent on RSVP",
    city: "Virtual",
    artistName: "Kiln Community",
    description: "Monthly group critique session open to all Kiln members. Bring 1–3 images of recent work and be ready to share your process. Max 12 participants for deep conversation.",
    attendees: 9,
  },
  {
    id: "evt-004",
    title: "Craft Fair & Collector Preview",
    type: "fair",
    mode: "in-person",
    date: "2026-06-14",
    time: "10:00 AM – 4:00 PM",
    location: "Union Hall, Portland OR",
    city: "Portland, OR",
    artistName: "Portland Craft Collective",
    description: "Juried craft market featuring 35 studio artists across glass, ceramics, metalwork, and fiber. Collector preview 9–10 AM with introductions by the artists.",
    attendees: 312,
  },
  {
    id: "evt-005",
    title: "Kiln Meetup: NYC Glass Community",
    type: "workshop-social",
    mode: "hybrid",
    date: "2026-06-02",
    time: "6:30 PM – 9:00 PM",
    location: "Urban Glass, Brooklyn NY",
    city: "New York, NY",
    artistName: "Kiln NYC Chapter",
    description: "Informal gathering for NYC-area Kiln members. Studio tour of Urban Glass, then drinks and conversation. Virtual attendees welcome — we'll keep a camera rolling.",
    attendees: 27,
  },
  {
    id: "evt-006",
    title: "Virtual Artist Talk: Developing a Series",
    type: "virtual",
    mode: "virtual",
    date: "2026-06-10",
    time: "2:00 PM PT",
    location: "Kiln Live — watch in the app",
    city: "Virtual",
    artistName: "Laura Donefer",
    description: "Award-winning glass artist Laura Donefer talks through her process for developing a major series — from initial concept to final exhibition. Q&A to follow.",
    attendees: 204,
  },
];

const TYPE_LABELS: Record<EventType, string> = {
  "open-studio": "Open Studio",
  gallery: "Gallery Opening",
  fair: "Craft Fair",
  virtual: "Virtual Event",
  "workshop-social": "Meetup",
  other: "Other",
};

const TYPE_COLORS: Record<EventType, string> = {
  "open-studio": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  gallery: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  fair: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  virtual: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "workshop-social": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  other: "bg-stone-500/10 text-stone-400 border-stone-500/20",
};

function readRsvps(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { return new Set(); }
}
function toggleRsvp(id: string, rsvps: Set<string>): Set<string> {
  const next = new Set(rsvps);
  if (next.has(id)) next.delete(id); else next.add(id);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
  return next;
}
function readCustom(): CommunityEvent[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]"); } catch { return []; }
}
function saveCustom(events: CommunityEvent[]) {
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(events)); } catch {}
}

const EMPTY_FORM = { title: "", type: "open-studio" as EventType, mode: "in-person" as EventMode, date: "", time: "", location: "", description: "" };

export default function CommunityEvents() {
  const { profile } = useProfile();
  const [rsvps, setRsvps] = useState<Set<string>>(readRsvps);
  const [customEvents, setCustomEvents] = useState<CommunityEvent[]>(readCustom);
  const [apiEvents, setApiEvents] = useState<CommunityEvent[]>([]);
  const [filter, setFilter] = useState<"all" | EventType | EventMode>("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    fetch("/api/community-events", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ events: CommunityEvent[]; rsvps: string[] }> : null)
      .then(data => {
        if (!data) return;
        setApiEvents(data.events);
        if (data.rsvps?.length) setRsvps(new Set(data.rsvps));
      })
      .catch(() => {});
  }, []);

  const allEvents = [...SEED_EVENTS, ...apiEvents, ...customEvents]
    .filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const filtered = allEvents.filter((e) => {
    if (filter === "all") return true;
    return e.type === filter || e.mode === filter;
  });

  async function handleRsvp(id: string) {
    setRsvps((prev) => toggleRsvp(id, prev));
    try {
      await fetch(`/api/community-events/${id}/rsvp`, { method: "POST", credentials: "include" });
    } catch { /* optimistic update stands */ }
  }

  async function handleAdd() {
    if (!form.title || !form.date) return;
    const tempId = `custom-${Date.now()}`;
    const evt: CommunityEvent = {
      id: tempId,
      title: form.title,
      type: form.type,
      mode: form.mode,
      date: form.date,
      time: form.time || "TBD",
      location: form.location || "TBD",
      city: form.location.split(",").pop()?.trim() || "Unknown",
      artistName: profile?.name ?? "Community member",
      description: form.description || "",
      attendees: 1,
    };
    const next = [...customEvents, evt];
    setCustomEvents(next);
    saveCustom(next);
    setRsvps((prev) => toggleRsvp(evt.id, prev));
    setForm(EMPTY_FORM);
    setAdding(false);
    try {
      const res = await fetch("/api/community-events", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: evt.title, type: evt.type, mode: evt.mode,
          date: evt.date, time: evt.time, location: evt.location,
          city: evt.city, artistName: evt.artistName, description: evt.description,
        }),
      });
      if (res.ok) {
        const saved = await res.json() as CommunityEvent;
        setCustomEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: saved.id } : e));
        setRsvps(prev => { const n = new Set(prev); n.delete(tempId); n.add(saved.id); return n; });
      }
    } catch { /* keep optimistic */ }
  }

  const FILTERS = [
    { key: "all", label: "All events" },
    { key: "virtual", label: "Virtual" },
    { key: "in-person", label: "In person" },
    { key: "open-studio", label: "Open studios" },
    { key: "gallery", label: "Galleries" },
    { key: "fair", label: "Fairs" },
    { key: "workshop-social", label: "Meetups" },
  ];

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-6">
        <BetaBanner label="Community Events" />

        <div className="mt-4 mb-7 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-amber-100 flex items-center gap-2">
              <Flame size={22} className="text-amber-400" /> Community Events
            </h1>
            <p className="text-sm text-stone-500 mt-1">Open studios, gallery openings, meetups, and more</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors shrink-0"
          >
            <Plus size={14} /> Add event
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === key ? "bg-amber-500 text-stone-950 font-bold" : "border border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Events */}
        <div className="space-y-3">
          {filtered.map((evt, i) => {
            const going = rsvps.has(evt.id);
            const d = new Date(evt.date + "T12:00:00");
            const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            const isUpcoming = d >= new Date();
            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-white/8 bg-stone-900/50 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Date block */}
                    <div className="shrink-0 w-14 text-center rounded-xl border border-white/8 bg-stone-900 py-2">
                      <p className="text-[9px] uppercase tracking-widest text-stone-600">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </p>
                      <p className="text-2xl font-bold text-amber-300 leading-none">{d.getDate()}</p>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${TYPE_COLORS[evt.type]}`}>
                          {TYPE_LABELS[evt.type]}
                        </span>
                        {evt.mode === "virtual" && <Globe size={11} className="text-blue-400" />}
                        {evt.mode === "hybrid" && <span className="text-[9px] text-stone-600">Hybrid</span>}
                      </div>
                      <h3 className="font-semibold text-stone-100 text-base leading-snug mb-1">{evt.title}</h3>
                      <p className="text-xs text-amber-500/80 mb-1.5">{evt.artistName}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 mb-2">
                        <span className="flex items-center gap-1"><Clock size={11} /> {dateStr} · {evt.time}</span>
                        <span className="flex items-center gap-1"><MapPin size={11} /> {evt.city}</span>
                        <span className="flex items-center gap-1"><Users size={11} /> {evt.attendees + (going ? 1 : 0)} going</span>
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{evt.description}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                    <button
                      onClick={() => handleRsvp(evt.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                        going
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      }`}
                    >
                      {going ? <><Check size={11} /> Going</> : "RSVP"}
                    </button>
                    {evt.link && (
                      <a href={evt.link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        <ExternalLink size={11} /> Details
                      </a>
                    )}
                    {evt.mode === "virtual" && going && (
                      <span className="text-xs text-blue-400/70 flex items-center gap-1">
                        <Video size={11} /> Link will be emailed on confirmation
                      </span>
                    )}
                    {!isUpcoming && (
                      <span className="ml-auto text-[10px] text-stone-700 uppercase tracking-wide">Past event</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <Calendar size={36} className="mx-auto mb-3 text-stone-700" />
              <p className="text-stone-500 mb-3">No events match this filter</p>
              <button onClick={() => setAdding(true)} className="rounded-full border border-amber-500/30 px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors">
                Add the first one
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add event modal */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setAdding(false); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-stone-900 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <h2 className="font-semibold text-stone-200">Add an event</h2>
                <button onClick={() => setAdding(false)} className="p-1 rounded-full hover:bg-white/5">
                  <X size={16} className="text-stone-500" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-xs text-stone-500 block mb-1">Event name *</label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Open Studio, Gallery Opening…"
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Type</label>
                    <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EventType }))}
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none appearance-none">
                      {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Format</label>
                    <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as EventMode }))}
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none appearance-none">
                      <option value="in-person">In person</option>
                      <option value="virtual">Virtual</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Date *</label>
                    <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Time</label>
                    <input value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                      placeholder="e.g. 6:00 PM – 9:00 PM"
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-stone-500 block mb-1">Location / link</label>
                  <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Studio address or Zoom link"
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 block mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What can attendees expect?" rows={3}
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none resize-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setAdding(false)} className="flex-1 rounded-full border border-white/10 py-2.5 text-sm text-stone-400 hover:border-white/20 transition-colors">Cancel</button>
                  <button onClick={handleAdd} disabled={!form.title || !form.date}
                    className="flex-1 rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 transition-colors">
                    Add event
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
