import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, MapPin, Clock, Users, ExternalLink, Briefcase, Calendar } from "lucide-react";
import Nav from "@/components/Nav";
import { OPPORTUNITIES, daysUntilDeadline } from "@/data/opportunities";
import { GUILDS } from "@/data/guilds";

interface CalEvent {
  id: string;
  title: string;
  date: Date;
  type: "opportunity" | "guild-event" | "craft-fair" | "workshop";
  location: string;
  description: string;
  url?: string;
  color: string;
}

const TYPE_COLORS: Record<CalEvent["type"], string> = {
  opportunity: "bg-amber-500/20 border-amber-500/30 text-amber-300",
  "guild-event": "bg-purple-500/20 border-purple-500/30 text-purple-300",
  "craft-fair": "bg-sky-500/20 border-sky-500/30 text-sky-300",
  workshop: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
};

const TYPE_DOT: Record<CalEvent["type"], string> = {
  opportunity: "bg-amber-400",
  "guild-event": "bg-purple-400",
  "craft-fair": "bg-sky-400",
  workshop: "bg-emerald-400",
};

const CRAFT_FAIRS: CalEvent[] = [
  { id: "cf-1", title: "American Craft Council Baltimore Show", date: new Date("2026-02-13"), type: "craft-fair", location: "Baltimore, MD", description: "One of the premier fine craft shows in North America. 700+ juried artists.", color: "sky" },
  { id: "cf-2", title: "Smithsonian Craft Show", date: new Date("2026-04-23"), type: "craft-fair", location: "Washington, D.C.", description: "120 juried artists. The most prestigious craft show in the US.", color: "sky" },
  { id: "cf-3", title: "ACC San Francisco Show", date: new Date("2026-08-07"), type: "craft-fair", location: "San Francisco, CA", description: "West Coast flagship show. 200+ craft artists.", color: "sky" },
  { id: "cf-4", title: "SNAG Conference 2026", date: new Date("2026-05-28"), type: "craft-fair", location: "Denver, CO", description: "Society of North American Goldsmiths annual conference.", color: "sky" },
  { id: "cf-5", title: "Rhinebeck Craft Fair", date: new Date("2026-10-16"), type: "craft-fair", location: "Rhinebeck, NY", description: "300+ artisan vendors. The fall craft fair of the Northeast.", color: "sky" },
  { id: "cf-6", title: "Kentuck Festival of the Arts", date: new Date("2026-10-23"), type: "craft-fair", location: "Northport, AL", description: "Beloved Southern craft fair with strong ceramics and fiber arts presence.", color: "sky" },
];

function buildEvents(): CalEvent[] {
  const events: CalEvent[] = [...CRAFT_FAIRS];

  // Add opportunity deadlines
  for (const opp of OPPORTUNITIES) {
    if (opp.deadline === "Rolling") continue;
    const d = new Date(opp.deadline);
    if (isNaN(d.getTime())) continue;
    events.push({
      id: `opp-${opp.id}`,
      title: `Deadline: ${opp.title}`,
      date: d,
      type: "opportunity",
      location: opp.location,
      description: opp.description,
      url: opp.url,
      color: "amber",
    });
  }

  // Add guild events
  for (const guild of GUILDS) {
    for (const ev of guild.events) {
      events.push({
        id: `guild-${guild.id}-${ev.title}`,
        title: ev.title,
        date: new Date(ev.date),
        type: "guild-event",
        location: ev.location,
        description: `${guild.name}: ${ev.description}`,
        color: "purple",
      });
    }
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

const ALL_EVENTS = buildEvents();

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CraftCalendar() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<CalEvent["type"] | "all">("all");

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const calDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    return { firstDay, daysInMonth };
  }, [viewYear, viewMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const ev of ALL_EVENTS) {
      if (ev.date.getFullYear() === viewYear && ev.date.getMonth() === viewMonth) {
        const key = ev.date.getDate().toString();
        if (!map[key]) map[key] = [];
        map[key].push(ev);
      }
    }
    return map;
  }, [viewYear, viewMonth]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    const evs = eventsByDate[selectedDate] ?? [];
    return filterType === "all" ? evs : evs.filter(e => e.type === filterType);
  }, [selectedDate, eventsByDate, filterType]);

  const upcomingEvents = useMemo(() => {
    return ALL_EVENTS.filter(e => {
      const isPast = e.date < now;
      const typeMatch = filterType === "all" || e.type === filterType;
      return !isPast && typeMatch;
    }).slice(0, 8);
  }, [filterType]);

  const cells = Array.from({ length: calDays.firstDay + calDays.daysInMonth }, (_, i) =>
    i < calDays.firstDay ? null : i - calDays.firstDay + 1
  );
  if (cells.length % 7 !== 0) {
    const pad = 7 - (cells.length % 7);
    for (let i = 0; i < pad; i++) cells.push(null);
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Craft Calendar</h1>
            <p className="text-xs text-stone-500 mt-0.5">Deadlines, shows, guild events, and fairs</p>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-5 flex flex-wrap gap-2">
          {([
            ["all", "All", "bg-stone-500"],
            ["opportunity", "Deadlines", "bg-amber-400"],
            ["guild-event", "Guild Events", "bg-purple-400"],
            ["craft-fair", "Craft Fairs", "bg-sky-400"],
          ] as [CalEvent["type"] | "all", string, string][]).map(([type, label, dotColor]) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === type ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 text-stone-500 hover:text-stone-300"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${dotColor}`} />
              {label}
            </button>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/8 bg-stone-900/60">
          {/* Month header */}
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <button onClick={prevMonth} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <h2 className="font-serif text-lg text-amber-100">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-white/8">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold text-stone-600 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="h-16 border-b border-r border-white/5 last:border-r-0" />;
              const key = day.toString();
              const dayEvents = eventsByDate[key] ?? [];
              const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
              const isSelected = selectedDate === key;
              const filteredEvs = filterType === "all" ? dayEvents : dayEvents.filter(e => e.type === filterType);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(isSelected ? null : key)}
                  className={`flex h-16 flex-col items-center gap-0.5 border-b border-r border-white/5 p-1.5 transition-all last:border-r-0 hover:bg-stone-800/60 ${isSelected ? "bg-amber-500/10 border-amber-500/20" : ""}`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${isToday ? "bg-amber-500 text-stone-950" : "text-stone-400"}`}>
                    {day}
                  </span>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {filteredEvs.slice(0, 3).map((ev, ei) => (
                      <span key={ei} className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[ev.type]}`} />
                    ))}
                    {filteredEvs.length > 3 && (
                      <span className="text-[8px] text-stone-600">+{filteredEvs.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day events */}
        {selectedDate && selectedEvents.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-stone-400">
              {MONTH_NAMES[viewMonth]} {selectedDate}
            </h3>
            <div className="flex flex-col gap-2">
              {selectedEvents.map(ev => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        )}
        {selectedDate && selectedEvents.length === 0 && (
          <div className="mb-6 rounded-xl border border-white/8 bg-stone-900/40 p-5 text-center text-sm text-stone-600">
            No events on {MONTH_NAMES[viewMonth]} {selectedDate}.
          </div>
        )}

        {/* Upcoming events */}
        {!selectedDate && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-stone-400 uppercase tracking-wider">Upcoming</h3>
            <div className="flex flex-col gap-2">
              {upcomingEvents.map(ev => (
                <EventCard key={ev.id} event={ev} />
              ))}
              {upcomingEvents.length === 0 && (
                <p className="py-8 text-center text-stone-600 text-sm">No upcoming events.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: CalEvent }) {
  const colorClass = TYPE_COLORS[event.type];
  const days = Math.ceil((event.date.getTime() - Date.now()) / 86400000);
  return (
    <div className={`rounded-xl border p-4 ${colorClass} bg-opacity-10`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full border px-2 py-0.5 ${colorClass}`}>
              {event.type === "opportunity" ? "Deadline" : event.type === "guild-event" ? "Guild" : event.type === "craft-fair" ? "Fair" : "Workshop"}
            </span>
            {days >= 0 && days <= 7 && (
              <span className="text-[10px] font-semibold text-red-400">{days === 0 ? "Today!" : `${days}d left`}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-stone-200 leading-snug">{event.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
            <span className="flex items-center gap-1"><Calendar size={10} />
              {event.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <span className="flex items-center gap-1"><MapPin size={10} /> {event.location}</span>
          </div>
          <p className="mt-1.5 text-[11px] text-stone-500 line-clamp-2">{event.description}</p>
        </div>
        {event.url && (
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-stone-600 hover:text-stone-300 transition-colors">
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}
