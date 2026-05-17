import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Heart, Check, Star, Flame, Lock } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

const ALL_ARTISTS = [...artists, ...seedArtists];

const TIERS = [
  {
    id: "supporter",
    label: "Studio Supporter",
    price: 5,
    icon: <Heart size={18} className="text-rose-400" />,
    color: "border-rose-500/30 bg-rose-500/5",
    activeColor: "border-rose-500 bg-rose-500/10",
    benefits: [
      "Early access to commission slots — before they go public",
      "Exclusive process posts from the studio",
      "Name listed in annual studio credits",
      "Direct message the artist",
    ],
  },
  {
    id: "patron",
    label: "Studio Patron",
    price: 15,
    icon: <Star size={18} className="text-amber-400" />,
    color: "border-amber-500/30 bg-amber-500/5",
    activeColor: "border-amber-500 bg-amber-500/10",
    benefits: [
      "Everything in Studio Supporter",
      "First access to limited drops — 24 hours before public",
      "Studio visit invitation (once a year)",
      "Signed artwork print mailed annually",
    ],
  },
  {
    id: "founding",
    label: "Founding Patron",
    price: 50,
    icon: <Flame size={18} className="text-orange-400" />,
    color: "border-orange-500/30 bg-orange-500/5",
    activeColor: "border-orange-500 bg-orange-500/10",
    benefits: [
      "Everything in Studio Patron",
      "Exclusive 1-on-1 video studio tour",
      "Name on a permanent piece (one per year)",
      "Input on the next collection concept",
    ],
  },
];

export default function Subscribe() {
  const params = useParams<{ artistId: string }>();
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { isSubscribed, subscribe, unsubscribe, isVerified } = useSocial();
  const [selectedTier, setSelectedTier] = useState("supporter");
  const [step, setStep] = useState<"select" | "confirm" | "done">("select");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const artist = ALL_ARTISTS.find(
    (a) => "id" in a && a.id === params.artistId
  ) as (typeof ALL_ARTISTS)[number] | undefined;

  if (!artist || !("id" in artist)) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
          <p className="text-stone-500">Artist not found.</p>
          <button onClick={() => navigate("/discover")} className="text-amber-400 hover:text-amber-300 text-sm">
            Browse artists
          </button>
        </div>
      </div>
    );
  }

  const artistId = artist.id as string;
  const artistName = artist.name;
  const avatarUrl = (artist as { images?: { url: string }[] }).images?.[0]?.url ?? `https://picsum.photos/seed/${artistId}/200/200`;
  const alreadySubscribed = isSubscribed(artistId);
  const tier = TIERS.find((t) => t.id === selectedTier)!;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") === "1") {
      subscribe(artistId, artistName, avatarUrl);
      setStep("done");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [artistId]);

  async function handleStripeSubscription() {
    if (!profile) { navigate("/setup"); return; }
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/stripe/subscription-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          artistId,
          tierId: selectedTier,
          tierLabel: `${tier.label} — ${artistName}`,
          amount: tier.price,
          successPath: `/subscribe/${artistId}`,
          cancelPath: `/subscribe/${artistId}`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? "Checkout failed");
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setCheckingOut(false);
    }
  }

  function handleSubscribe() {
    if (!profile) { navigate("/setup"); return; }
    if (step === "select") { handleStripeSubscription(); return; }
    subscribe(artistId, artistName, avatarUrl);
    setStep("done");
  }

  if (step === "done" || alreadySubscribed) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-6 p-16 text-center max-w-md mx-auto">
          <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-amber-500/40">
            <img src={avatarUrl} alt={artistName} className="h-full w-full object-cover" />
          </div>
          <div className="h-14 w-14 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
            <Check size={24} className="text-green-400" />
          </div>
          <div>
            <h2 className="font-serif text-2xl text-amber-100">You're a Studio Supporter</h2>
            <p className="text-stone-400 mt-2">
              You're now supporting {artistName}. Your subscription helps fund the studio and the work.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-white/10 bg-stone-900/60 p-4 text-sm text-stone-400 text-left space-y-2">
            {TIERS.find((t) => t.id === selectedTier)!.benefits.map((b) => (
              <div key={b} className="flex items-start gap-2">
                <Check size={12} className="text-green-400 mt-1 shrink-0" />
                {b}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/artists/${artistId}`)} className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
              Visit studio
            </button>
            <button onClick={() => unsubscribe(artistId)} className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">
              Cancel support
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-md px-4 py-16">
          <div className="text-center mb-8">
            <img src={avatarUrl} alt={artistName} className="h-20 w-20 rounded-full object-cover mx-auto mb-4 border-2 border-amber-500/40" />
            <h2 className="font-serif text-2xl text-amber-100">Confirm your support</h2>
          </div>
          <div className={`rounded-2xl border p-5 mb-6 ${tier.activeColor}`}>
            <div className="flex items-center gap-3 mb-4">
              {tier.icon}
              <div>
                <p className="font-semibold text-amber-100">{tier.label}</p>
                <p className="text-sm text-stone-400">${tier.price}/month · Cancel anytime</p>
              </div>
            </div>
            <ul className="space-y-2">
              {tier.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-stone-300">
                  <Check size={12} className="text-green-400 mt-1 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-4 mb-6">
            <p className="text-sm font-medium text-stone-400 mb-3">Payment method</p>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-stone-800 px-4 py-3">
              <Lock size={14} className="text-stone-500" />
              <span className="text-sm text-stone-400">•••• •••• •••• 4242  Visa</span>
            </div>
            <p className="text-xs text-stone-600 mt-2">This is a demo — no real payment is processed.</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("select")} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-stone-400 hover:text-stone-200 transition-colors">
              Back
            </button>
            <button
              onClick={handleSubscribe}
              className="flex-1 rounded-xl bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
            >
              Support for ${tier.price}/mo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Artist header */}
        <div className="flex items-center gap-4 mb-8">
          <img src={avatarUrl} alt={artistName} className="h-16 w-16 rounded-full object-cover border-2 border-amber-500/40" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl text-amber-100">{artistName}</h2>
              {isVerified(artistId) && (
                <span title="Verified studio" className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                  <Check size={10} className="text-white" />
                </span>
              )}
            </div>
            <p className="text-sm text-stone-400">Support this studio directly, every month.</p>
          </div>
        </div>

        <p className="text-stone-300 text-sm mb-6 leading-relaxed">
          Studio subscriptions go directly to the artist — no middleman, no gallery commission. Every subscriber helps fund materials, kiln time, and the ability to take creative risks.
        </p>

        {/* Tier selection */}
        <div className="space-y-3 mb-8">
          {TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTier(t.id)}
              className={`w-full text-left rounded-2xl border p-4 transition-all ${
                selectedTier === t.id ? t.activeColor : t.color + " hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {t.icon}
                  <span className="font-medium text-amber-100">{t.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-amber-300">${t.price}</span>
                  <span className="text-xs text-stone-500">/mo</span>
                  {selectedTier === t.id && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
                      <Check size={10} className="text-stone-950" />
                    </div>
                  )}
                </div>
              </div>
              <ul className="space-y-1.5">
                {t.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-xs text-stone-400">
                    <Check size={10} className="text-stone-600 mt-0.5 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubscribe}
          disabled={checkingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          <Heart size={16} />
          {checkingOut ? "Redirecting to checkout…" : `Support ${artistName} for $${tier.price}/mo`}
        </button>
        {checkoutError && <p className="text-center text-xs text-rose-400 mt-2">{checkoutError}</p>}
        <p className="text-center text-xs text-stone-600 mt-3">Cancel anytime. No commitment.</p>
      </div>
    </div>
  );
}
