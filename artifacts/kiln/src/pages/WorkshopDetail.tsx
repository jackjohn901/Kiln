import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  Calendar, MapPin, Clock, Users, CheckCircle2, Loader2, ChevronLeft, X, Star, Video, Pencil,
} from "lucide-react";
import Nav from "@/components/Nav";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Workshop {
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
  meetingUrl: string | null;
  price: number;
  maxSpots: number;
  spotsBooked: number;
  spotsLeft: number;
  durationHours: number;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  tags: string[] | null;
  isBooked: boolean;
  bookingCount: number;
}

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  Intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  Advanced: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  "All levels": "text-sky-400 bg-sky-500/10 border-sky-500/30",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function WorkshopDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [w, setW] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/workshops/${id}`, { credentials: "include" })
      .then(r => {
        if (r.status === 404) { if (!cancelled) setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((data: Workshop | null) => {
        if (cancelled || !data?.id) return;
        setW(data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const soldOut = !!w && w.spotsLeft <= 0;
  const isOwner = !!w && !!user && user.id === w.artistId;

  const handleBook = async () => {
    if (!w || soldOut || w.isBooked) return;
    // Paid workshops require Stripe checkout; navigate there instead of direct booking.
    if (w.price > 0) {
      navigate(`/workshop-checkout/${w.id}`);
      return;
    }
    setBooking(true);
    try {
      const r = await fetch(`/api/workshops/${w.id}/book`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error();
      setW(prev => prev ? { ...prev, isBooked: true, spotsBooked: prev.spotsBooked + 1, spotsLeft: prev.spotsLeft - 1 } : prev);
      toast({ title: "Spot reserved!", description: "You\u2019re booked. See you there." });
    } catch {
      toast({ title: "Couldn\u2019t reserve your spot", description: "Please try again.", variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async () => {
    if (!w) return;
    setCancelling(true);
    try {
      const r = await fetch(`/api/workshops/${w.id}/book`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error();
      setW(prev => prev ? { ...prev, isBooked: false, spotsBooked: Math.max(0, prev.spotsBooked - 1), spotsLeft: prev.spotsLeft + 1 } : prev);
      toast({ title: "Booking cancelled", description: "Your spot has been released." });
    } catch {
      toast({ title: "Couldn\u2019t cancel booking", description: "Please try again.", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-stone-600" />
        </div>
      </div>
    );
  }

  if (notFound || !w) {
    return (
      <div className="min-h-screen bg-stone-950">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <Star size={32} className="mx-auto mb-3 text-stone-700" />
          <p className="text-stone-400 text-sm mb-4">Workshop not found.</p>
          <Link href="/workshops">
            <button className="rounded-full border border-white/10 px-5 py-2 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Back to Workshops
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-28 md:pb-8">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 pt-16">
        <Link href="/workshops" className="mt-4 mb-5 inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-400 transition-colors">
          <ChevronLeft size={14} /> Back to Workshops
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-stone-900/60">
            {w.imageUrl ? (
              <img src={w.imageUrl} alt={w.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-800">
                <Star size={40} className="text-stone-700" />
              </div>
            )}
            <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full border text-xs font-medium ${LEVEL_COLORS[w.level] ?? "text-stone-400 bg-stone-800 border-stone-700"}`}>
              {w.level}
            </span>
            {w.isBooked && (
              <span className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-white text-xs font-bold">
                <CheckCircle2 size={11} /> Booked
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <Link href={`/artists/${w.artistId}`} className="mb-4 flex items-center gap-2.5 w-fit group">
              {w.artistAvatarUrl ? (
                <img src={w.artistAvatarUrl} alt={w.artistName}
                  className="h-9 w-9 rounded-full object-cover border border-white/10 group-hover:border-amber-500/40 transition-colors" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 border border-white/10 text-xs text-stone-400">
                  {w.artistName.charAt(0)}
                </div>
              )}
              <span className="text-sm font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">{w.artistName}</span>
            </Link>

            <h1 className="font-serif text-3xl text-amber-100 leading-tight">{w.title}</h1>
            {w.technique && <p className="mt-2 text-sm text-amber-400/80">{w.technique}</p>}

            {w.description && (
              <p className="mt-4 text-sm text-stone-300 leading-relaxed whitespace-pre-line">{w.description}</p>
            )}

            <div className="mt-5 space-y-2.5 rounded-2xl border border-white/8 bg-stone-900/60 p-4">
              {w.startDate && (
                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <Calendar size={14} className="text-amber-400 shrink-0" />
                  <span>{formatDate(w.startDate)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-stone-300">
                {w.isOnline ? <Video size={14} className="text-amber-400 shrink-0" /> : <MapPin size={14} className="text-amber-400 shrink-0" />}
                <span>{w.isOnline ? "Online session" : (w.location ?? "Location TBA")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-stone-300">
                <Clock size={14} className="text-amber-400 shrink-0" />
                <span>{w.durationHours}h session</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-stone-300">
                <Users size={14} className="text-amber-400 shrink-0" />
                <span>{soldOut ? "Sold out" : `${w.spotsLeft} of ${w.maxSpots} spots left`}</span>
              </div>
            </div>

            {w.tags && w.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {w.tags.map(t => (
                  <span key={t} className="rounded-full border border-white/8 bg-stone-900/60 px-2.5 py-0.5 text-[11px] text-stone-400">#{t}</span>
                ))}
              </div>
            )}

            <p className="mt-5 text-3xl font-semibold text-amber-300">{w.price > 0 ? `$${w.price}` : "Free"}</p>

            {/* CTA */}
            <div className="mt-6">
              {isOwner ? (
                <button
                  onClick={() => navigate(`/workshops/${w.id}/edit`)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-purple-500/40 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/10 transition-colors"
                >
                  <Pencil size={15} /> Edit Workshop
                </button>
              ) : w.isBooked ? (
                <div className="flex items-center gap-3">
                  <span className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 py-3 text-sm font-semibold text-emerald-400">
                    <CheckCircle2 size={15} /> Reserved
                  </span>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex items-center gap-1.5 rounded-full border border-stone-700 px-4 py-3 text-sm text-stone-400 hover:border-rose-500/40 hover:text-rose-400 transition-colors disabled:opacity-50"
                  >
                    {cancelling ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleBook}
                  disabled={soldOut || booking}
                  className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-colors disabled:opacity-60 ${
                    soldOut ? "bg-stone-800 text-stone-500" : "bg-amber-500 text-stone-950 hover:bg-amber-400"
                  }`}
                >
                  {booking ? <Loader2 size={15} className="animate-spin" /> : null}
                  {soldOut ? "Sold out" : w.price > 0 ? "Reserve your spot" : "Reserve Spot — Free"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
