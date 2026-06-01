import { Link } from "wouter";
import {
  ShoppingBag, Gavel, Timer, GraduationCap, Palette, Crown, Heart,
  Camera, DollarSign, Package, CheckCircle2, ArrowRight,
} from "lucide-react";
import Nav from "@/components/Nav";

const STEPS = [
  {
    icon: Camera,
    title: "1. Share your work",
    desc: "Post a photo or a short process video. People follow the maker, not just the finished piece — so let them see how it's made.",
  },
  {
    icon: ShoppingBag,
    title: "2. Put it up for sale",
    desc: "Turn any piece into a listing (a fixed price) or an auction (let buyers bid). You set the price, shipping, and where you ship to.",
  },
  {
    icon: DollarSign,
    title: "3. The buyer pays securely",
    desc: "Kiln handles checkout and payment. The money is collected safely — you don't have to chase anyone or share bank details with strangers.",
  },
  {
    icon: Package,
    title: "4. You ship it",
    desc: "When something sells, you get the order with the buyer's address. Print the packing slip, pack the piece, and send it on its way.",
  },
  {
    icon: CheckCircle2,
    title: "5. You get paid",
    desc: "Your earnings land in your Kiln balance. Track everything — sales, tips, and subscriptions — on your Earnings page.",
  },
];

const WAYS = [
  { icon: ShoppingBag, title: "Listings", desc: "Sell a finished piece at a fixed price.", href: "/create-listing" },
  { icon: Gavel, title: "Auctions", desc: "Let collectors bid on one-of-a-kind work.", href: "/create-auction" },
  { icon: Timer, title: "Drops", desc: "Limited-edition releases on a countdown.", href: "/drops" },
  { icon: GraduationCap, title: "Workshops", desc: "Teach a class, in person or online.", href: "/workshops" },
  { icon: Palette, title: "Commissions", desc: "Take custom requests from buyers.", href: "/inbox" },
  { icon: Crown, title: "Patron tiers", desc: "Monthly support from your biggest fans.", href: "/earnings" },
];

export default function SellingGuide() {
  return (
    <div className="min-h-screen bg-[#12100e] text-stone-200">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 py-10 pb-28 md:pb-12">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
            <Heart size={12} /> No listing fees · You set your prices
          </div>
          <h1 className="font-serif text-4xl font-bold leading-tight text-amber-100 sm:text-5xl">
            How selling on Kiln works
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-stone-400 leading-relaxed">
            Sell your work directly to the people who love it — no middlemen, no
            gallery cut. Here's the whole journey, start to finish.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((s) => (
            <div
              key={s.title}
              className="flex items-start gap-4 rounded-2xl border border-white/8 bg-stone-900/50 p-5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                <s.icon size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-100">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Ways to sell */}
        <div className="mt-12">
          <h2 className="mb-1 font-serif text-2xl text-amber-100">Ways to earn on Kiln</h2>
          <p className="mb-5 text-sm text-stone-500">
            Pick one or mix them all — every artist sells differently.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {WAYS.map((w) => (
              <Link
                key={w.title}
                href={w.href}
                className="flex items-start gap-3 rounded-2xl border border-white/8 bg-stone-900/50 p-4 hover:border-amber-500/30 transition-colors"
              >
                <w.icon size={18} className="mt-0.5 shrink-0 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-stone-100">{w.title}</h3>
                  <p className="text-sm text-stone-400">{w.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <h2 className="font-serif text-2xl text-amber-100">Ready to sell your first piece?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">
            It takes a couple of minutes. Add a photo, set your price, and you're live.
          </p>
          <Link
            href="/create-listing"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-base font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            List a piece for sale <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
