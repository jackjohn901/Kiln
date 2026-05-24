import { useState, useEffect } from "react";
import { markFeatureVisited } from "@/lib/featureDiscovery";
import { MapPin, Clock, Users, ChevronRight, Star, MessageSquare, Loader2, CheckCircle2, X, CalendarPlus, Download } from "lucide-react";
import { useLocation } from "wouter";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";

interface ApiWorkshop {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatarUrl: string | null;
  title: string;
  description: string | null;
  technique: string | null;
  level: string;
  location: string | null;
  isOnline: boolean;
  price: number;
  maxSpots: number;
  spotsBooked: number;
  spotsLeft: number;
  durationHours: number;
  imageUrl: string | null;
  startDate: string | null;
  isBooked: boolean;
  tags: string[];
}

function buildApiWorkshopGcalUrl(w: ApiWorkshop): string {
  if (!w.startDate) return "";
  const start = new Date(w.startDate);
  const end = new Date(start.getTime() + w.durationHours * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const location = w.isOnline ? "Online" : (w.location ?? "");
  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: w.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Workshop with ${w.artistName} on Kiln.`,
    ...(location ? { location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

function BookingConfirmedModal({ w, onClose }: { w: ApiWorkshop; onClose: () => void }) {
  const gcalUrl = buildApiWorkshopGcalUrl(w);
  const icsUrl = `/api/workshops/${w.id}/calendar.ics`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-stone-900 p-6 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
          <CheckCircle2 size={30} className="text-emerald-400" />
        </div>
        <h2 className="font-serif text-2xl text-amber-100 mb-1">You're In!</h2>
        <p className="text-sm text-stone-400 mb-1 font-semibold">{w.title}</p>
        <p className="text-xs text-amber-400 mb-4">with {w.artistName}</p>
        {w.startDate && (
          <p className="text-xs text-stone-500 mb-5">
            {new Date(w.startDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" · "}{w.isOnline ? "Online" : (w.location ?? "")}
          </p>
        )}
        <p className="text-xs text-stone-500 mb-3">Add this workshop to your calendar:</p>
        <div className="flex flex-wrap gap-2 justify-center mb-5">
          {gcalUrl && (
            <a href={gcalUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors">
              <CalendarPlus size={13} /> Google Calendar
            </a>
          )}
          <a href={icsUrl} download
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-stone-800 px-4 py-2 text-xs font-semibold text-stone-300 hover:border-amber-500/40 hover:text-stone-100 transition-colors">
            <Download size={13} /> Download .ics
          </a>
        </div>
        <button onClick={onClose} className="text-xs text-stone-500 hover:text-stone-300 transition-colors">Close</button>
      </div>
    </div>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  Intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  Advanced: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  "All levels": "text-sky-400 bg-sky-500/10 border-sky-500/30",
};

function StarRating({ value, size = 11 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size} fill={s <= value ? "#f59e0b" : "none"} className={s <= value ? "text-amber-400" : "text-stone-700"} />
      ))}
    </div>
  );
}

function WorkshopCard({ w, onBook, onCancel }: { w: ApiWorkshop; onBook: (workshop: ApiWorkshop) => void; onCancel: (id: string) => void }) {
  const [, navigate] = useLocation();
  const soldOut = w.spotsLeft === 0;
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleBook = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (soldOut || w.isBooked) return;
    // Paid workshops require Stripe checkout; navigate there instead of direct booking
    if (w.price > 0) {
      navigate(`/workshop-checkout/${w.id}`);
      return;
    }
    setBooking(true);
    try {
      const r = await fetch(`/api/workshops/${w.id}/book`, { method: "POST", credentials: "include" });
      if (r.ok) onBook(w);
    } catch {}
    setBooking(false);
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCancelling(true);
    try {
      const r = await fetch(`/api/workshops/${w.id}/book`, { method: "DELETE", credentials: "include" });
      if (r.ok) onCancel(w.id);
    } catch {}
    setCancelling(false);
  };

  return (
    <div className="bg-stone-900 rounded-2xl overflow-hidden hover:ring-1 hover:ring-amber-500/40 transition-all group">
      <div className="relative aspect-video bg-stone-800">
        {w.imageUrl ? (
          <img src={w.imageUrl} alt={w.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Star size={32} className="text-stone-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
        <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full border text-xs font-medium ${LEVEL_COLORS[w.level] ?? "text-stone-400 bg-stone-800 border-stone-700"}`}>
          {w.level}
        </span>
        {soldOut && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-stone-900/90 text-rose-400 text-xs font-medium border border-rose-500/30">Sold out</span>
        )}
        {w.isBooked && (
          <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-xs font-bold">
            <CheckCircle2 size={10} /> Booked
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-stone-100 mb-1 leading-snug">{w.title}</h3>
        <button onClick={() => navigate(`/artists/${w.artistId}`)} className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity">
          <img src={w.artistAvatarUrl ?? `https://picsum.photos/seed/${w.artistId}/80/80`} alt={w.artistName} className="w-5 h-5 rounded-full object-cover" />
          <span className="text-xs text-amber-400">{w.artistName}</span>
        </button>
        {w.description && <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed mb-3">{w.description}</p>}

        <div className="space-y-1.5 mb-4">
          {w.startDate && (
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <Star size={11} className="text-amber-400 flex-shrink-0" />
              <span>{new Date(w.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <MapPin size={11} className="text-stone-500 flex-shrink-0" />
            <span>{w.isOnline ? "Online" : (w.location ?? "TBA")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Clock size={11} className="text-stone-500 flex-shrink-0" />
            <span>{w.durationHours}h session</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Users size={11} className="text-stone-500 flex-shrink-0" />
            <span>{soldOut ? "Sold out" : `${w.spotsLeft} of ${w.maxSpots} spots left`}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-stone-100">${w.price}</span>
          {w.isBooked ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <CheckCircle2 size={12} /> Reserved
              </span>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-stone-700 text-xs text-stone-400 hover:border-red-500/40 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {cancelling ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={handleBook} disabled={soldOut || booking}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-xs transition-colors disabled:opacity-60 ${
                soldOut ? "bg-stone-700 text-stone-500" : "bg-amber-500 text-stone-950 hover:bg-amber-400"
              }`}>
              {booking ? <Loader2 size={12} className="animate-spin" /> : null}
              {soldOut ? "Waitlist" : "Reserve Spot"}
              {!soldOut && <ChevronRight size={13} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Workshops() {
  const [workshops, setWorkshops] = useState<ApiWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [medium, setMedium] = useState("All");
  const [confirmedWorkshop, setConfirmedWorkshop] = useState<ApiWorkshop | null>(null);
  const { markTypeRead } = useSocial();

  useEffect(() => { markFeatureVisited("workshops"); }, []);
  useEffect(() => { markTypeRead("workshop_booking"); }, [markTypeRead]);

  useEffect(() => {
    fetch("/api/workshops", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setWorkshops(data.workshops ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const techniques = ["All", ...Array.from(new Set(workshops.map(w => w.technique).filter(Boolean) as string[]))];
  const filtered = medium === "All" ? workshops : workshops.filter(w => w.technique === medium);

  const handleBook = (workshop: ApiWorkshop) => {
    setWorkshops(prev => prev.map(w => w.id === workshop.id ? { ...w, isBooked: true, spotsBooked: w.spotsBooked + 1, spotsLeft: w.spotsLeft - 1 } : w));
    setConfirmedWorkshop(workshop);
  };

  const handleCancel = (workshopId: string) => {
    setWorkshops(prev => prev.map(w => w.id === workshopId ? { ...w, isBooked: false, spotsBooked: Math.max(0, w.spotsBooked - 1), spotsLeft: w.spotsLeft + 1 } : w));
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {confirmedWorkshop && (
        <BookingConfirmedModal w={confirmedWorkshop} onClose={() => setConfirmedWorkshop(null)} />
      )}
      <Nav />
      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-4 pb-12">
          <div className="py-8">
            <h1 className="text-2xl font-bold text-stone-100 mb-1">Workshops</h1>
            <p className="text-sm text-stone-400">Hands-on craft workshops taught by working artists — small classes, big technique</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {techniques.map(t => (
              <button key={t} onClick={() => setMedium(t)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${medium === t ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-stone-700 text-stone-400 hover:border-stone-500"}`}>
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-stone-600" />
            </div>
          ) : (
            <>
              {!loading && <p className="text-xs text-stone-500 mb-4">{filtered.length} workshop{filtered.length !== 1 ? "s" : ""}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(w => <WorkshopCard key={w.id} w={w} onBook={handleBook} onCancel={handleCancel} />)}
              </div>
              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <MessageSquare size={32} className="mx-auto mb-3 text-stone-700" />
                  <p className="text-sm text-stone-500">No workshops yet.</p>
                  <p className="text-stone-600 text-xs mt-1">Artists can create workshops from their profile.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
