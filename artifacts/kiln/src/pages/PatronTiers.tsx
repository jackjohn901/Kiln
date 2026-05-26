import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { ChevronLeft, Check, Lock, Zap, Star, Crown, Heart, Video, Bell, Tag, Package, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { getArtistById } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

interface ApiTier {
  id: string;
  artistId: string;
  name: string;
  description: string | null;
  price: number;
  perks: string[];
  isSubscribed: boolean;
  subscriberCount: number;
  sortOrder: number;
}

const FALLBACK_TIERS = [
  {
    name: "Supporter",
    price: 5,
    icon: Heart,
    color: "text-rose-400",
    borderColor: "border-rose-500/30",
    description: "Support the work and stay close to the studio.",
    perks: ["Early notifications on new work and drops", "Your name in the studio supporters list", "5% discount on all shop purchases", "Monthly supporters-only process update"],
  },
  {
    name: "Studio Access",
    price: 15,
    icon: Star,
    color: "text-amber-400",
    borderColor: "border-amber-500/40",
    description: "Go deeper into the process. See what most people never see.",
    perks: ["Everything in Supporter", "Full process journal updates", "Behind-the-scenes studio videos", "10% discount on shop and commissions", "24-hour early access to all drops", "Annual studio postcard — signed and mailed"],
  },
  {
    name: "Patron",
    price: 25,
    icon: Crown,
    color: "text-purple-400",
    borderColor: "border-purple-500/40",
    description: "The inner circle. You're part of what gets made.",
    perks: ["Everything in Studio Access", "Direct messaging", "Monthly patron-only Q&A session", "15% discount on all shop, commissions, workshops", "Vote on upcoming work direction", "Annual small original work (signed, shipped)", "48-hour early access + reserved spot on drops"],
  },
];

const PERK_ICONS = [Bell, Video, Lock, Tag, Zap, Package, Star, Heart, Crown];

interface ApiProfile {
  displayName?: string;
  avatarUrl?: string;
  medium?: string;
  bio?: string;
}

export default function PatronTiers() {
  const { artistId } = useParams<{ artistId: string }>();
  const [tiers, setTiers] = useState<ApiTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [apiProfile, setApiProfile] = useState<ApiProfile | null>(null);
  const [stripeSuccess, setStripeSuccess] = useState(false);

  const localArtist = getArtistById(artistId ?? "") ?? seedArtists.find(a => a.id === artistId);

  const fetchTiers = (id: string) =>
    fetch(`/api/patron-tiers/${id}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setTiers(data.tiers ?? []))
      .catch(() => {});

  useEffect(() => {
    if (!artistId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("subscribed")) {
      setStripeSuccess(true);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setStripeSuccess(false), 6000);
    }
    Promise.all([
      fetchTiers(artistId),
      !localArtist
        ? fetch(`/api/users/${artistId}/profile`, { credentials: "include" })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => setApiProfile(data.profile ?? data))
            .catch(() => {})
        : Promise.resolve(),
    ]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId, localArtist]);

  const handleSubscribe = async (tierId: string, tierName: string) => {
    const tier = tiers.find(t => t.id === tierId);
    const isFallback = tierId.startsWith("fallback-");
    const isCurrentlySubscribed = tier?.isSubscribed ?? false;

    setToggling(tierId);
    try {
      if (isCurrentlySubscribed || isFallback) {
        const r = await fetch(`/api/patron-tiers/${tierId}/subscribe`, { method: "POST", credentials: "include" });
        if (r.ok) {
          const data = await r.json();
          setTiers(prev => prev.map(t => t.id === tierId ? { ...t, isSubscribed: data.subscribed, subscriberCount: data.subscribed ? t.subscriberCount + 1 : t.subscriberCount - 1 } : t));
          if (data.subscribed) { setConfirming(tierId); setTimeout(() => setConfirming(null), 3000); }
        }
      } else {
        const label = `${tierName} — ${artistName}`;
        const amount = tier?.price ?? 5;
        const r = await fetch(`/api/stripe/subscription-checkout`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artistId,
            tierId,
            tierLabel: label,
            amount,
            successPath: `/patron-tiers/${artistId}`,
            cancelPath: `/patron-tiers/${artistId}`,
          }),
        });
        if (r.ok) {
          const data = await r.json();
          if (data.url) { window.location.href = data.url; return; }
        }
      }
    } catch {}
    setToggling(null);
  };

  const currentTier = tiers.find(t => t.isSubscribed);
  const artistName = localArtist?.name ?? apiProfile?.displayName ?? "this artist";
  const artistMedium = localArtist?.medium ?? apiProfile?.medium;
  const avatarUrl = localArtist?.images?.[0]?.url ?? apiProfile?.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${artistId}`;

  const displayTiers = tiers.length > 0 ? tiers : FALLBACK_TIERS.map((t, i) => ({
    id: `fallback-${i}`, artistId: artistId ?? "", name: t.name, description: t.description,
    price: t.price, perks: t.perks, isSubscribed: false, subscriberCount: 0, sortOrder: i,
  }));

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        <div className="mb-8 flex items-center gap-3">
          <Link href={localArtist ? `/artists/${artistId}` : "/discover"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img src={avatarUrl} alt={artistName} className="h-10 w-10 rounded-full object-cover border border-white/10" onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${artistId}`; }} />
            <div>
              <h1 className="font-serif text-xl text-amber-100">Support {artistName.split(" ")[0]}</h1>
              {artistMedium && <p className="text-xs text-stone-500">{artistMedium}</p>}
            </div>
          </div>
        </div>

        {currentTier && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">You're a {currentTier.name}</p>
                <p className="text-xs text-stone-500">${currentTier.price}/month</p>
              </div>
            </div>
            <button onClick={() => handleSubscribe(currentTier.id, currentTier.name)} className="text-xs text-stone-600 hover:text-red-400 transition-colors">Cancel</button>
          </div>
        )}

        {stripeSuccess && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-emerald-300">Payment confirmed — welcome as a patron! Your subscription is now active.</p>
          </motion.div>
        )}

        {confirming && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-amber-300">🎉 Welcome! You'll get email confirmation shortly.</p>
          </motion.div>
        )}

        <div className="mb-8 rounded-2xl border border-white/8 bg-stone-900/60 p-6">
          <p className="font-serif text-lg text-amber-100 mb-2">From {artistName.split(" ")[0]}</p>
          <p className="text-sm text-stone-400 leading-relaxed">
            "{localArtist?.artistStatement ?? `My work depends on having the time and space to fully commit to the process. Every patron subscription directly funds studio time, materials, and the ability to take creative risks that never appear in a shop listing. If my work has meant something to you, consider becoming a patron.`}"
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayTiers.map((tier, i) => {
              const TIER_STYLES = [
                { icon: Heart, color: "text-rose-400", borderColor: "border-rose-500/30" },
                { icon: Star, color: "text-amber-400", borderColor: "border-amber-500/40" },
                { icon: Crown, color: "text-purple-400", borderColor: "border-purple-500/40" },
              ];
              const style = TIER_STYLES[i % TIER_STYLES.length]!;
              const Icon = style.icon;
              const isCurrent = tier.isSubscribed;
              const isPopular = i === 1;
              const isToggling = toggling === tier.id;

              return (
                <div key={tier.id} className={`overflow-hidden rounded-2xl border transition-all ${isCurrent ? "border-emerald-500/40 bg-emerald-500/5" : isPopular ? `${style.borderColor} bg-gradient-to-br from-amber-500/5 to-stone-900/80` : "border-white/8 bg-stone-900/60"}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${style.borderColor} bg-stone-800 ${style.color}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-stone-200">{tier.name}</h3>
                            {isPopular && <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">Most popular</span>}
                          </div>
                          {tier.description && <p className="text-xs text-stone-500">{tier.description}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-2xl font-bold text-amber-100">${tier.price}</span>
                        <span className="text-xs text-stone-500">/mo</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {tier.perks.map((perk, pi) => {
                        const PerkIcon = PERK_ICONS[pi % PERK_ICONS.length]!;
                        return (
                          <div key={pi} className="flex items-start gap-2.5">
                            <PerkIcon size={12} className={`mt-0.5 shrink-0 ${style.color}`} />
                            <span className="text-xs text-stone-400 leading-snug">{perk}</span>
                          </div>
                        );
                      })}
                    </div>

                    {tier.subscriberCount > 0 && (
                      <p className="text-[10px] text-stone-700 mb-3">{tier.subscriberCount} subscriber{tier.subscriberCount !== 1 ? "s" : ""}</p>
                    )}

                    {isCurrent ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-400 font-semibold">
                        <Check size={14} /> Current plan
                      </div>
                    ) : tier.id.startsWith("fallback-") ? (
                      <Link href="/edit-profile" className="block w-full rounded-xl py-3 text-center text-sm font-bold transition-all bg-stone-800 text-stone-400 hover:text-stone-200">
                        Sign in to subscribe
                      </Link>
                    ) : (
                      <button onClick={() => handleSubscribe(tier.id, tier.name)} disabled={isToggling}
                        className={`w-full rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-60 ${isPopular ? "bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : `border ${style.borderColor} ${style.color} hover:bg-stone-800`}`}>
                        {isToggling ? <Loader2 size={14} className="animate-spin mx-auto" /> : currentTier ? "Switch to this tier" : `Become a ${tier.name}`} {!isToggling && `— $${tier.price}/mo`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-stone-700">Cancel anytime. Billing is monthly. Payments processed securely.</p>
      </div>
    </div>
  );
}
