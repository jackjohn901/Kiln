import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Flame, Play, ShoppingBag, Users, DollarSign, Sparkles,
  ArrowRight, Star, MapPin, Zap, BookOpen, CalendarDays,
} from "lucide-react";

const FEATURES = [
  {
    icon: Play,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    title: "Process Video Feed",
    desc: "TikTok-style vertical feed built for craft. Share your making process — glassblowing, ceramics, weaving, metalwork — and get discovered by collectors who love seeing how things are made.",
  },
  {
    icon: ShoppingBag,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    title: "Direct Sales — No Fees",
    desc: "List original works and sell directly to collectors. No listing fees, no commissions taken on sales. Your price is your price.",
  },
  {
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    title: "Technique Guilds",
    desc: "Join communities organised by discipline — the Ceramics Guild, Glass Blowers Guild, Metal Forge Society, and more. Real conversations with artists who share your tools.",
  },
  {
    icon: DollarSign,
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
    title: "Patron Subscriptions",
    desc: "Let your biggest supporters pay a monthly amount to fund your practice. Offer early access to drops, behind-the-scenes posts, and process Q&As in return.",
  },
  {
    icon: CalendarDays,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    title: "Workshops & Classes",
    desc: "List in-person and online workshops. Kiln handles booking and payment so you can focus on teaching.",
  },
  {
    icon: Sparkles,
    color: "text-amber-300",
    bg: "bg-amber-400/10 border-amber-400/20",
    title: "AI Tools for Artists",
    desc: "Built-in AI caption writer, artist bio generator, gallery pitch tool, grant writer, and a craft assistant that answers technique questions.",
  },
];

const DISCIPLINES = [
  "Ceramics", "Glass Blowing", "Flamework", "Weaving", "Natural Dyeing",
  "Blacksmithing", "Enamelwork", "Woodworking", "Bronze Casting", "Fiber Arts",
  "Kiln Forming", "Lost-Wax Casting", "Woodfire Pottery", "Raku", "Slab Building",
];

type ShowcaseArtist = { userId: string; displayName: string | null; medium: string | null; location: string | null; avatarUrl: string | null };

export default function Landing() {
  const [artists, setArtists] = useState<ShowcaseArtist[]>([]);
  useEffect(() => {
    fetch("/api/leaderboard?limit=6")
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((d) => setArtists(Array.isArray(d.profiles) ? d.profiles : []))
      .catch(() => {});
  }, []);
  return (
    <div className="min-h-screen bg-[#12100e] text-stone-200">
      {/* Minimal nav for guests */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#12100e]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-amber-400" />
            <span className="font-serif text-xl font-bold tracking-tight text-amber-100">Kiln</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/?skipLanding=true"
              className="text-sm font-medium text-stone-300 hover:text-amber-300 transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/setup"
              className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
            >
              Join free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
          <Flame size={12} />
          The platform built exclusively for craft artists
        </div>
        <h1 className="font-serif text-5xl font-bold leading-tight text-amber-100 sm:text-6xl">
          Where craft artists<br />build their world
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-400 leading-relaxed">
          A TikTok-style process video feed, a direct shop with no fees, workshops, patron subscriptions, and a community that speaks your language — all in one place for ceramicists, glassblowers, weavers, and every maker in between.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/setup"
            className="flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-base font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            Join Kiln free
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/?skipLanding=true"
            className="rounded-full border border-amber-500/40 px-6 py-3 text-base font-medium text-amber-200 hover:border-amber-400 hover:text-amber-100 transition-colors"
          >
            Explore the feed — no account needed
          </Link>
        </div>
        <p className="mt-4 text-xs text-stone-600">Look around first · Free to join · No listing fees · Cancel anytime</p>
      </section>

      {/* Discipline pills */}
      <section className="overflow-hidden py-4">
        <div className="flex animate-marquee gap-2 whitespace-nowrap">
          {[...DISCIPLINES, ...DISCIPLINES].map((d, i) => (
            <span
              key={i}
              className="inline-flex shrink-0 items-center rounded-full border border-white/8 bg-stone-800/60 px-3 py-1.5 text-xs font-medium text-stone-400"
            >
              {d}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-2 text-center font-serif text-3xl text-amber-100">Everything a craft artist needs</h2>
        <p className="mb-10 text-center text-sm text-stone-500">Replace five platforms with one. Built by and for makers.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className={`rounded-2xl border p-5 ${f.bg}`}>
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border ${f.bg}`}>
                <f.icon size={18} className={f.color} />
              </div>
              <h3 className="mb-1.5 font-semibold text-stone-100">{f.title}</h3>
              <p className="text-sm leading-relaxed text-stone-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Artist showcase — real artists from the platform, ranked by followers */}
      {artists.length > 0 && (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-3xl text-amber-100">Meet the artists</h2>
            <p className="mt-1 text-sm text-stone-500">Working craft artists sharing their process on Kiln</p>
          </div>
          <Link href="/?skipLanding=true" className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors">
            See all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a) => (
            <Link
              key={a.userId}
              href={`/artists/${a.userId}`}
              className="flex items-center gap-3 rounded-2xl border border-white/8 bg-stone-900/60 p-4 hover:border-amber-500/30 transition-colors"
            >
              {a.avatarUrl ? (
                <img src={a.avatarUrl} alt={a.displayName ?? "Artist"} className="h-12 w-12 shrink-0 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-700 text-lg font-bold text-white">
                  {(a.displayName ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-stone-100 truncate">{a.displayName}</p>
                {a.medium && <p className="text-xs text-stone-500">{a.medium}</p>}
                {a.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-600">
                    <MapPin size={9} /> {a.location}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {/* Revenue streams callout */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 to-stone-900/60 p-8 sm:p-12">
          <div className="grid gap-8 sm:grid-cols-2 items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                <Zap size={11} />
                Multiple revenue streams
              </div>
              <h2 className="font-serif text-3xl text-amber-100">
                More ways to earn from your craft
              </h2>
              <p className="mt-3 text-stone-400 leading-relaxed">
                Most platforms give you one way to make money. Kiln gives you seven — all from one profile.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Shop sales", sub: "No listing fees or commission" },
                { label: "Patron subscriptions", sub: "Monthly recurring from your fans" },
                { label: "Workshop bookings", sub: "In-person and online classes" },
                { label: "Custom commissions", sub: "Milestone-based bespoke work" },
                { label: "Limited drops", sub: "Scarcity pricing with waitlists" },
                { label: "Live auctions", sub: "Real-time bidding on unique pieces" },
                { label: "Direct tips", sub: "From anyone who loves your work" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <Star size={12} className="shrink-0 text-amber-400" />
                  <div>
                    <span className="text-sm font-medium text-stone-200">{item.label}</span>
                    <span className="ml-2 text-xs text-stone-500">{item.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI tools callout */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-white/8 bg-stone-900/60 p-8 sm:p-12 text-center">
          <Sparkles size={28} className="mx-auto mb-4 text-amber-400" />
          <h2 className="font-serif text-3xl text-amber-100">AI tools that actually understand craft</h2>
          <p className="mx-auto mt-3 max-w-2xl text-stone-400 leading-relaxed">
            Write a gallery pitch email, generate an artist bio, research the best hashtags for your medium, or get technique questions answered by an assistant that knows the difference between cone 6 and cone 10. All included.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["AI Caption Writer", "Artist Bio Generator", "Gallery Pitch Tool", "Grant Writer", "Craft Assistant", "Hashtag Research"].map((t) => (
              <span key={t} className="rounded-full border border-amber-500/20 bg-amber-500/8 px-3 py-1.5 text-xs font-medium text-amber-300">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-3xl px-4 pb-24 pt-12 text-center">
        <Flame size={32} className="mx-auto mb-4 text-amber-400" />
        <h2 className="font-serif text-4xl text-amber-100">Ready to build your world?</h2>
        <p className="mx-auto mt-4 max-w-xl text-stone-400">
          Join the craft artists already on Kiln. Your profile, your shop, your community — free to start.
        </p>
        <Link
          href="/setup"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber-500 px-8 py-4 text-base font-bold text-stone-950 hover:bg-amber-400 transition-colors"
        >
          Create your free profile
          <ArrowRight size={16} />
        </Link>
        <p className="mt-4 text-xs text-stone-600">No credit card required</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 py-8">
        <div className="mx-auto max-w-7xl px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-amber-400" />
            <span className="font-serif text-sm text-amber-100">Kiln</span>
            <span className="text-xs text-stone-600 ml-2">The platform for craft artists</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-stone-600">
            <Link href="/privacy" className="hover:text-stone-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-stone-400 transition-colors">Terms</Link>
            <Link href="/help" className="hover:text-stone-400 transition-colors">Help</Link>
            <Link href="/selling" className="hover:text-stone-400 transition-colors">Selling on Kiln</Link>
            <Link href="/techniques" className="hover:text-stone-400 transition-colors">Techniques</Link>
            <Link href="/opportunities" className="hover:text-stone-400 transition-colors">Opportunities</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
