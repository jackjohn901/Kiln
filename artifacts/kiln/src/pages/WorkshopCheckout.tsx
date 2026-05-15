import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, CheckCircle, MapPin, Clock, Users, Star, Flame } from "lucide-react";
import Nav from "@/components/Nav";
import { workshops } from "@/data/workshops";
import { useProfile } from "@/contexts/ProfileContext";

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
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1600));
    setProcessing(false);
    setStep("confirm");
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
              onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${workshop.id}/400/200`; }}
            />
            <p className="font-semibold text-stone-100 mb-1">{workshop.title}</p>
            <p className="text-xs text-amber-400 mb-3">with {workshop.artistName}</p>
            <div className="space-y-1.5 text-xs text-stone-400">
              <div className="flex items-center gap-2"><Star size={11} className="text-amber-400" />{workshop.startDate}</div>
              <div className="flex items-center gap-2"><MapPin size={11} />{workshop.location}</div>
              <div className="flex items-center gap-2"><Clock size={11} />{workshop.duration}</div>
              <div className="flex items-center gap-2"><Users size={11} />{workshop.spotsLeft - 1} spots remaining after yours</div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/8 flex justify-between items-center">
              <span className="text-xs text-stone-500">Amount paid</span>
              <span className="font-bold text-stone-100">${workshop.price}</span>
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

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-3 py-2 text-xs text-stone-500">
              <Flame size={10} className="inline mr-1 text-amber-400" />
              This is a demo booking. No real payment is processed.
            </div>

            <button
              onClick={handleReserve}
              disabled={processing || !form.name || !form.email}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
            >
              {processing ? "Reserving…" : `Reserve My Spot · $${workshop.price}`}
            </button>
          </div>

          {/* Workshop summary */}
          <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-5 h-fit">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Workshop Details</h3>
            <img
              src={workshop.imageUrl}
              alt={workshop.title}
              className="w-full h-36 object-cover rounded-xl mb-4"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${workshop.id}/400/200`; }}
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
      </div>
    </div>
  );
}
