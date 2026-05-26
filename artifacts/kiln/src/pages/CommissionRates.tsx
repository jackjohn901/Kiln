import { useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, DollarSign, Clock, Shield, Check,
  MessageSquare, ChevronRight, Info, Star, Sparkles,
} from "lucide-react";
import Nav from "@/components/Nav";
import { getArtistById, artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial } from "@/contexts/SocialContext";

const ALL_ARTISTS = [...artists, ...seedArtists];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

interface RateTier {
  name: string;
  range: string;
  description: string;
  timeline: string;
  deposit: string;
  includes: string[];
  highlight?: boolean;
}

function getRates(artistId: string): RateTier[] {
  const h = hash(artistId);
  const base = 800 + (h % 1200);
  return [
    {
      name: "Small work",
      range: `$${base.toLocaleString()} – $${(base * 2).toLocaleString()}`,
      description: "Single piece, tabletop scale",
      timeline: "6–10 weeks",
      deposit: "30%",
      includes: ["One revision round", "Certificate of authenticity", "Studio documentation photos"],
    },
    {
      name: "Signature piece",
      range: `$${(base * 2.5).toLocaleString()} – $${(base * 6).toLocaleString()}`,
      description: "Statement work, full custom brief",
      timeline: "10–18 weeks",
      deposit: "40%",
      highlight: true,
      includes: ["Two revision rounds", "Certificate of authenticity", "Professional photography", "Detailed process documentation", "Studio visit (local) or video call walkthrough"],
    },
    {
      name: "Installation / series",
      range: `$${(base * 8).toLocaleString()}+`,
      description: "Multi-piece or large-scale work",
      timeline: "4–12 months",
      deposit: "50%",
      includes: ["Full scope consultation", "Iterative approvals", "All documentation and certificates", "Shipping and installation coordination", "Ongoing relationship pricing for return collectors"],
    },
    {
      name: "Collaboration",
      range: "On request",
      description: "Brand, editorial, or institutional projects",
      timeline: "Negotiated",
      deposit: "50%",
      includes: ["Initial discovery call", "Detailed proposal", "Usage licensing included", "Co-credit in all publications"],
    },
  ];
}

export default function CommissionRates() {
  const { artistId } = useParams<{ artistId: string }>();
  const { getArtistCommissionStatus } = useSocial();

  const artist = getArtistById(artistId ?? "") ?? ALL_ARTISTS.find((a) => a.id === artistId);
  const avatar = artist?.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${artistId}`;
  const rates = getRates(artistId ?? "anon");
  const status = getArtistCommissionStatus(artistId ?? "");

  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-3">
        <Nav />
        <p className="text-stone-500">Artist not found</p>
        <Link href="/discover"><button className="rounded-full border border-amber-500/30 px-4 py-2 text-sm text-amber-400">Browse artists</button></Link>
      </div>
    );
  }

  const statusConfig = {
    open: { label: "Open for commissions", color: "text-emerald-400", dot: "bg-emerald-400" },
    waitlisted: { label: "Waitlisted — accepting for later queue", color: "text-amber-400", dot: "bg-amber-400" },
    closed: { label: "Closed for new commissions", color: "text-rose-400", dot: "bg-rose-400" },
  }[status] ?? { label: "Status unknown", color: "text-stone-500", dot: "bg-stone-500" };

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">

        {/* Back */}
        <Link href={`/artists/${artistId}`} className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors mb-6">
          <ChevronLeft size={14} /> Back to profile
        </Link>

        {/* Artist header */}
        <div className="flex items-center gap-4 mb-7">
          <img src={avatar} alt={artist.name}
            className="h-16 w-16 rounded-full object-cover border-2 border-amber-500/30 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${artistId}`; }}
          />
          <div>
            <h1 className="font-serif text-2xl text-amber-100">{artist.name}</h1>
            <p className="text-sm text-stone-500 mt-0.5">{artist.medium.split(",")[0]} · {artist.location}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
              <span className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</span>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5 mb-6">
          <p className="text-sm text-stone-300 leading-relaxed">
            {artist.name} accepts a limited number of commissions each year. Every work is made to order in the studio with the same care and attention as gallery pieces.
            Pricing reflects material costs, studio time, and artist expertise.
          </p>
          <div className="flex items-start gap-2 mt-3 text-xs text-amber-400/70">
            <Info size={12} className="shrink-0 mt-0.5" />
            <span>Rates below are indicative. Final pricing is agreed in writing before any work begins.</span>
          </div>
        </div>

        {/* Rate tiers */}
        <div className="space-y-3 mb-8">
          {rates.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => setSelectedTier(selectedTier === tier.name ? null : tier.name)}
              className={`rounded-2xl border cursor-pointer transition-all overflow-hidden ${
                tier.highlight
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-white/8 bg-stone-900/50"
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-stone-200">{tier.name}</h3>
                      {tier.highlight && (
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wide">
                          Most requested
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mb-2">{tier.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                      <span className="flex items-center gap-1"><DollarSign size={11} className="text-amber-400" /> {tier.range}</span>
                      <span className="flex items-center gap-1"><Clock size={11} className="text-blue-400" /> {tier.timeline}</span>
                      <span className="flex items-center gap-1"><Shield size={11} className="text-stone-500" /> {tier.deposit} deposit</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`shrink-0 text-stone-600 transition-transform mt-1 ${selectedTier === tier.name ? "rotate-90" : ""}`} />
                </div>

                {/* Expanded includes */}
                {selectedTier === tier.name && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 pt-4 border-t border-white/8"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600 mb-2.5">What's included</p>
                    <ul className="space-y-1.5">
                      {tier.includes.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-stone-400">
                          <Check size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Process overview */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-4">How it works</p>
          <div className="space-y-4">
            {[
              { n: "1", title: "Submit an inquiry", desc: "Share your vision, intended space, dimensions, and timeline. No commitment required at this stage." },
              { n: "2", title: "Brief & quote", desc: `${artist.name.split(" ")[0]} reviews your inquiry and sends a detailed quote with timeline and payment schedule.` },
              { n: "3", title: "Deposit & start", desc: "Once you approve the quote, a deposit secures your place on the calendar and work begins." },
              { n: "4", title: "Updates & delivery", desc: "You receive studio progress photos at key milestones. Final balance due on completion." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-3">
                <div className="shrink-0 h-6 w-6 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-xs font-bold text-amber-400">{n}</div>
                <div>
                  <p className="text-sm font-semibold text-stone-200 mb-0.5">{title}</p>
                  <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews snippet */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-3">Collector reviews</p>
          {[
            { name: "Rachel Osei", rating: 5, text: "The piece arrived perfectly packed and exceeded every expectation. Communication throughout was exceptional." },
            { name: "James Whitfield", rating: 5, text: "Working on a gallery acquisition. Professional, responsive, and the documentation was impeccable." },
          ].map((r) => (
            <div key={r.name} className="rounded-xl border border-white/8 bg-stone-900/30 p-4 mb-2.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-stone-300">{r.name}</p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={10} className="text-amber-400 fill-amber-400" />)}
                </div>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="sticky bottom-6">
          <div className="rounded-2xl border border-amber-500/20 bg-stone-950/95 backdrop-blur-md p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-200">Ready to commission a work?</p>
              <p className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</p>
            </div>
            <Link href={`/commission/${artistId}`}>
              <button
                disabled={status === "closed"}
                className="flex items-center gap-1.5 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <MessageSquare size={14} /> Inquire
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
