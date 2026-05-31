import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, CheckCircle, MapPin, Clock, Users, Star, CalendarPlus, Download, Video } from "lucide-react";
import Nav from "@/components/Nav";
import { workshops, type Workshop } from "@/data/workshops";
import { useProfile } from "@/contexts/ProfileContext";
import ReviewsSection from "@/components/ReviewsSection";
import CheckoutErrorNotice from "@/components/CheckoutErrorNotice";

function buildGcalUrl(workshop: Workshop): string {
  const details = `Workshop with ${workshop.artistName} on Kiln.`;
  const location = workshop.location ?? "";

  const match = workshop.startDate.match(/^([A-Za-z]+ \d+)[–\-]?\d*,?\s*(\d{4})/);
  let datesParam = "";
  if (match) {
    const parsed = new Date(`${match[1]}, ${match[2]}`);
    if (!isNaN(parsed.getTime())) {
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      const durationMs = (() => {
        const dur = workshop.duration.toLowerCase();
        const dayMatch = dur.match(/(\d+)\s*day/);
        const hourMatch = dur.match(/(\d+)\s*hour/);
        if (dayMatch) return parseInt(dayMatch[1]) * 8 * 60 * 60 * 1000;
        if (hourMatch) return parseInt(hourMatch[1]) * 60 * 60 * 1000;
        return 6 * 60 * 60 * 1000;
      })();
      datesParam = `${fmt(parsed)}/${fmt(new Date(parsed.getTime() + durationMs))}`;
    }
  }

  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: workshop.title,
    details,
    ...(datesParam ? { dates: datesParam } : {}),
    ...(location ? { location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

type Step = "info" | "confirm";

export default function WorkshopCheckout() {
  const { workshopId } = useParams<{ workshopId: string }>();
  const { profile } = useProfile();

  const workshop = workshops.find((w) => w.id === workshopId);

  const [step, setStep] = useState<Step>("info");
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    email: "",
    phone: "",
    experience: "",
    dietary: "",
    notes: "",
  });
  const [processing, setProcessing] = useState(false);
  const [bookingId] = useState(() => `WS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("booked") === "1") {
      setStep("confirm");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (!workshop) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <p className="text-stone-400">Workshop not found.</p>
          <Link href="/workshops" className="text-amber-400 hover:text-amber-300 text-sm">← Back to Workshops</Link>
        </div>
      </div>
    );
  }

  if (workshop.spotsLeft === 0) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <p className="text-stone-200 font-semibold">This workshop is sold out</p>
          <p className="text-stone-500 text-sm">Join the waitlist to be notified if a spot opens.</p>
          <Link href="/workshops" className="rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400">
            Browse Other Workshops
          </Link>
        </div>
      </div>
    );
  }

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleReserve() {
    if (!workshop || !form.name || !form.email) return;
    setProcessing(true);
    setBookingError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: [{
            name: workshop.title,
            price: workshop.price ?? 0,
            quantity: 1,
            artistName: workshop.artistName,
          }],
          customerEmail: form.email,
          successPath: `/workshops/book/${workshop.id}?booked=1`,
          cancelPath: `/workshops/book/${workshop.id}`,
          metadata: {
            type: "workshop",
            workshopId: workshop.id,
            userId: profile?.id ?? "",
          },
        }),
      });
      const data = await res.json().catch(() => ({} as { url?: string; error?: string }));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setBookingError(
        data.error ?? "We couldn't reserve your spot. This workshop may no longer be available. Please try again or contact support.",
      );
    } catch {
      setBookingError("Something went wrong. Please try again.");
    }
    setProcessing(false);
  }

  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <CheckCircle size={36} className="text-emerald-400" />
          </div>
          <h2 className="font-serif text-3xl text-amber-100 mb-2">You're In!</h2>
          <p className="text-stone-400 mb-1">Booking <span className="font-mono text-amber-300">{bookingId}</span></p>
          <p className="text-stone-500 text-sm mb-6">
            {workshop.artistName} will send a confirmation to {form.email || "your email"} with all the details. Please arrive 15 minutes early.
          </p>

          <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-5 mb-8 text-left">
            <img
              src={workshop.imageUrl}
              alt={workshop.title}
              className="w-full h-32 object-cover rounded-xl mb-4"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=200&fit=crop&seed=${workshop.id}`; }}
            />
            <p className="font-semibold text-stone-100 mb-1">{workshop.title}</p>
            <p className="text-xs text-amber-400 mb-3">with {workshop.artistName}</p>
            <div className="space-y-1.5 text-xs text-stone-400">
              <div className="flex items-center gap-2"><Star size={11} className="text-amber-400" />{workshop.startDate}</div>
              {workshop.isOnline && workshop.meetingUrl ? (
                <div className="flex items-center gap-2">
                  <Video size={11} className="text-sky-400 shrink-0" />
                  <a
                    href={workshop.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 underline underline-offset-2 truncate"
                  >
                    {workshop.meetingUrl}
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2"><MapPin size={11} className="shrink-0" />{workshop.location}</div>
              )}
              <div className="flex items-center gap-2"><Clock size={11} />{workshop.duration}</div>
              <div className="flex items-center gap-2"><Users size={11} />{workshop.spotsLeft - 1} spots remaining after yours</div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/8 flex justify-between items-center">
              <span className="text-xs text-stone-500">Amount paid</span>
              <span className="font-bold text-stone-100">${workshop.price}</span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs text-stone-500 mb-3">Add this workshop to your calendar:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href={buildGcalUrl(workshop)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <CalendarPlus size={14} />
                Google Calendar
              </a>
              <a
                href={`/api/workshops/${workshop.id}/calendar.ics`}
                download
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-stone-800 px-5 py-2.5 text-sm font-semibold text-stone-300 hover:border-amber-500/40 hover:text-stone-100 transition-colors"
              >
                <Download size={14} />
                Download .ics
              </a>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link href="/workshops">
              <button className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                More Workshops
              </button>
            </Link>
            <Link href={`/artists/${workshop.artistId}`}>
              <button className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
                Artist Profile
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
        <Link href="/workshops">
          <button className="mb-6 flex items-center gap-1.5 text-sm text-stone-500 hover:text-amber-300 transition-colors">
            <ArrowLeft size={14} /> Back to Workshops
          </button>
        </Link>

        <h1 className="font-serif text-2xl text-amber-100 mb-6">Reserve Your Spot</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Form */}
          <div className="rounded-2xl border border-white/10 bg-stone-900/40 p-5 space-y-4">
            <h2 className="font-semibold text-stone-100">Attendee Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Full name *</label>
                <input value={form.name} onChange={(e) => field("name", e.target.value)} placeholder="Jane Smith" className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Email *</label>
                <input value={form.email} onChange={(e) => field("email", e.target.value)} type="email" placeholder="jane@example.com" className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Phone (optional)</label>
                <input value={form.phone} onChange={(e) => field("phone", e.target.value)} placeholder="+1 (555) 000-0000" className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Experience level</label>
                <select value={form.experience} onChange={(e) => field("experience", e.target.value)} className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none">
                  <option value="">Select…</option>
                  <option>Complete beginner</option>
                  <option>Some experience (1–2 years)</option>
                  <option>Intermediate (3–5 years)</option>
                  <option>Advanced (5+ years)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1 block">Dietary requirements (if lunch included)</label>
              <input value={form.dietary} onChange={(e) => field("dietary", e.target.value)} placeholder="e.g. vegetarian, gluten-free, none" className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Anything you'd like the instructor to know?</label>
              <textarea value={form.notes} onChange={(e) => field("notes", e.target.value)} rows={2} placeholder="Goals, physical limitations, specific questions…" className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none" />
            </div>

            <button
              onClick={handleReserve}
              disabled={processing || !form.name || !form.email}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
            >
              {processing ? "Redirecting to checkout…" : `Pay & Reserve · $${workshop.price}`}
            </button>
            {bookingError && (
              <CheckoutErrorNotice message={bookingError} heading="Reservation couldn't be completed" />
            )}
          </div>

          {/* Workshop summary */}
          <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-5 h-fit">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Workshop Details</h3>
            <img
              src={workshop.imageUrl}
              alt={workshop.title}
              className="w-full h-36 object-cover rounded-xl mb-4"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=200&fit=crop&seed=${workshop.id}`; }}
            />
            <p className="font-semibold text-stone-100 mb-1 leading-snug">{workshop.title}</p>
            <div className="flex items-center gap-2 mb-3">
              <img src={workshop.artistAvatarUrl} alt={workshop.artistName} className="h-5 w-5 rounded-full object-cover" />
              <span className="text-xs text-amber-400">{workshop.artistName}</span>
            </div>
            <div className="space-y-2 text-xs text-stone-400 mb-4">
              <div className="flex items-center gap-2"><Star size={11} className="text-amber-400 shrink-0" />{workshop.startDate}</div>
              <div className="flex items-center gap-2"><MapPin size={11} className="shrink-0" />{workshop.location}</div>
              <div className="flex items-center gap-2"><Clock size={11} className="shrink-0" />{workshop.duration}</div>
              <div className="flex items-center gap-2"><Users size={11} className="shrink-0" />{workshop.spotsLeft} of {workshop.spots} spots left</div>
            </div>
            {workshop.includes.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-stone-500 mb-2">What's included:</p>
                <div className="flex flex-wrap gap-1">
                  {workshop.includes.map((inc) => (
                    <span key={inc} className="rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-400">{inc}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-white/8 pt-3 flex justify-between items-center">
              <span className="text-xs text-stone-500">Per person</span>
              <span className="text-xl font-bold text-stone-100">${workshop.price}</span>
            </div>
          </div>
        </div>

        {workshopId && (
          <div className="mt-10">
            <ReviewsSection targetId={workshopId} targetType="workshop" />
          </div>
        )}
      </div>
    </div>
  );
}
