import { useState } from "react";
import { useParams, Link } from "wouter";
import { ChevronLeft, Check, Lock, Zap, Star, Crown, Heart, Video, Bell, Tag, Package } from "lucide-react";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { getArtistById } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useProfile } from "@/contexts/ProfileContext";

interface Tier {
  id: string;
  name: string;
  price: number;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  description: string;
  perks: { icon: React.ElementType; text: string }[];
}

const TIERS: Tier[] = [
  {
    id: "supporter",
    name: "Supporter",
    price: 5,
    icon: Heart,
    color: "text-rose-400",
    borderColor: "border-rose-500/30",
    description: "Support the work and stay close to the studio.",
    perks: [
      { icon: Bell, text: "Early notifications on new work and drops" },
      { icon: Heart, text: "Your name in the studio supporters list" },
      { icon: Tag, text: "5% discount on all shop purchases" },
      { icon: Video, text: "Monthly supporters-only process update" },
    ],
  },
  {
    id: "studio",
    name: "Studio Access",
    price: 15,
    icon: Star,
    color: "text-amber-400",
    borderColor: "border-amber-500/40",
    description: "Go deeper into the process. See what most people never see.",
    perks: [
      { icon: Bell, text: "Everything in Supporter" },
      { icon: Video, text: "Full process journal updates — every step documented" },
      { icon: Lock, text: "Behind-the-scenes studio videos (not posted publicly)" },
      { icon: Tag, text: "10% discount on all shop and commissions" },
      { icon: Zap, text: "24-hour early access to all drops before public release" },
      { icon: Package, text: "Annual studio postcard — signed and mailed" },
    ],
  },
  {
    id: "patron",
    name: "Patron",
    price: 25,
    icon: Crown,
    color: "text-purple-400",
    borderColor: "border-purple-500/40",
    description: "The inner circle. You're part of what gets made.",
    perks: [
      { icon: Bell, text: "Everything in Studio Access" },
      { icon: Crown, text: "Direct messaging — ask questions, request content" },
      { icon: Video, text: "Monthly patron-only video call or Q&A session" },
      { icon: Tag, text: "15% discount on all shop, commissions, and workshops" },
      { icon: Star, text: "Vote on upcoming work direction and series themes" },
      { icon: Package, text: "Annual small original work (signed, shipped) — first come, first served" },
      { icon: Zap, text: "48-hour early access + reserved spot on all drops" },
    ],
  },
];

const PATRON_KEY = "kiln_patrons";

function getPatrons(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(PATRON_KEY) ?? "{}"); } catch { return {}; }
}
function setPatron(artistId: string, tierId: string) {
  const p = getPatrons();
  p[artistId] = tierId;
  try { localStorage.setItem(PATRON_KEY, JSON.stringify(p)); } catch {}
}
function clearPatron(artistId: string) {
  const p = getPatrons();
  delete p[artistId];
  try { localStorage.setItem(PATRON_KEY, JSON.stringify(p)); } catch {}
}

export default function PatronTiers() {
  const { artistId } = useParams<{ artistId: string }>();
  const { profile } = useProfile();

  const artist = getArtistById(artistId ?? "") ?? seedArtists.find(a => a.id === artistId);
  const [currentTier, setCurrentTier] = useState<string | null>(() => getPatrons()[artistId ?? ""] ?? null);
  const [confirming, setConfirming] = useState<string | null>(null);

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex items-center justify-center p-24 text-stone-600">Artist not found.</div>
      </div>
    );
  }

  function handleSubscribe(tierId: string) {
    setPatron(artist!.id, tierId);
    setCurrentTier(tierId);
    setConfirming(tierId);
    setTimeout(() => setConfirming(null), 3000);
  }

  function handleCancel() {
    clearPatron(artist!.id);
    setCurrentTier(null);
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link href={`/artists/${artist.id}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={artist.images[0]?.url ?? `https://picsum.photos/seed/${artist.id}/80/80`}
              alt={artist.name}
              className="h-10 w-10 rounded-full object-cover border border-white/10"
              onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${artist.id}/80/80`; }}
            />
            <div>
              <h1 className="font-serif text-xl text-amber-100">Support {artist.name.split(" ")[0]}</h1>
              <p className="text-xs text-stone-500">{artist.medium}</p>
            </div>
          </div>
        </div>

        {/* Current tier banner */}
        {currentTier && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  You're a {TIERS.find(t => t.id === currentTier)?.name}
                </p>
                <p className="text-xs text-stone-500">${TIERS.find(t => t.id === currentTier)?.price}/month</p>
              </div>
            </div>
            <button onClick={handleCancel} className="text-xs text-stone-600 hover:text-red-400 transition-colors">
              Cancel
            </button>
          </div>
        )}

        {confirming && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center"
          >
            <p className="text-sm font-semibold text-amber-300">🎉 Welcome to the inner circle! You'll get an email confirmation shortly.</p>
          </motion.div>
        )}

        {/* Artist pitch */}
        <div className="mb-8 rounded-2xl border border-white/8 bg-stone-900/60 p-6">
          <p className="font-serif text-lg text-amber-100 mb-2">From {artist.name.split(" ")[0]}</p>
          <p className="text-sm text-stone-400 leading-relaxed">
            "{artist.artistStatement ?? `My work depends on having the time and space to fully commit to the process. Every patron subscription directly funds studio time, materials, and the ability to take creative risks that never appear in a shop listing. If my work has meant something to you, consider becoming a patron.`}"
          </p>
        </div>

        {/* Tier cards */}
        <div className="flex flex-col gap-4">
          {TIERS.map((tier, i) => {
            const Icon = tier.icon;
            const isCurrent = currentTier === tier.id;
            const isPopular = i === 1;

            return (
              <div
                key={tier.id}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isCurrent ? "border-emerald-500/40 bg-emerald-500/5" :
                  isPopular ? `${tier.borderColor} bg-gradient-to-br from-amber-500/5 to-stone-900/80` :
                  "border-white/8 bg-stone-900/60"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tier.borderColor} bg-stone-800 ${tier.color}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-stone-200">{tier.name}</h3>
                          {isPopular && <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">Most popular</span>}
                        </div>
                        <p className="text-xs text-stone-500">{tier.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-bold text-amber-100">${tier.price}</span>
                      <span className="text-xs text-stone-500">/mo</span>
                    </div>
                  </div>

                  {/* Perks */}
                  <div className="space-y-2 mb-4">
                    {tier.perks.map((perk, pi) => {
                      const PerkIcon = perk.icon;
                      return (
                        <div key={pi} className="flex items-start gap-2.5">
                          <PerkIcon size={12} className={`mt-0.5 shrink-0 ${tier.color}`} />
                          <span className="text-xs text-stone-400 leading-snug">{perk.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA */}
                  {isCurrent ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-400 font-semibold">
                      <Check size={14} /> Current plan
                    </div>
                  ) : !profile ? (
                    <Link href="/edit-profile" className={`block w-full rounded-xl py-3 text-center text-sm font-bold transition-all bg-stone-800 text-stone-400 hover:text-stone-200`}>
                      Create profile to subscribe
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(tier.id)}
                      className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${
                        isPopular ? "bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]" :
                        `border ${tier.borderColor} ${tier.color} hover:bg-stone-800`
                      }`}
                    >
                      {currentTier ? "Switch to this tier" : `Become a ${tier.name}`} — ${tier.price}/mo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-stone-700">Cancel anytime. Billing is monthly. Payments processed securely.</p>
      </div>
    </div>
  );
}
