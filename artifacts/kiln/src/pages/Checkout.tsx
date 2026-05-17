import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, CreditCard, Lock, CheckCircle, ShoppingBag, Flame } from "lucide-react";
import Nav from "@/components/Nav";
import { listings, formatPrice } from "@/data/listings";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useProfile } from "@/contexts/ProfileContext";

const ALL_ARTISTS = [...artists, ...seedArtists];

function getArtistName(artistId: string): string {
  return ALL_ARTISTS.find((a) => a.id === artistId)?.name ?? artistId;
}

type Step = "review" | "billing" | "confirm";

function OrderSummary({ listingId }: { listingId: string }) {
  const listing = listings.find((l) => l.id === listingId);
  if (!listing) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-5">
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Order Summary</h3>
      <div className="flex gap-3 mb-4">
        {listing.imageUrl && (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="h-20 w-20 rounded-xl object-cover shrink-0 bg-stone-800"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${listing.id}/200/200`; }}
          />
        )}
        <div className="min-w-0">
          <p className="text-xs text-amber-400 mb-0.5">{getArtistName(listing.artistId)}</p>
          <p className="font-medium text-stone-100 text-sm leading-snug">{listing.title}</p>
          <p className="text-xs text-stone-500 mt-0.5">{listing.year} · {listing.medium.split(",")[0]}</p>
          <p className="text-xs text-stone-600">{listing.dimensions}</p>
        </div>
      </div>
      <div className="space-y-2 border-t border-white/8 pt-3 text-sm">
        <div className="flex justify-between text-stone-400">
          <span>Subtotal</span>
          <span>{formatPrice(listing.price)}</span>
        </div>
        <div className="flex justify-between text-stone-400">
          <span>Authentication & handling</span>
          <span>{formatPrice(Math.round(listing.price * 0.025))}</span>
        </div>
        <div className="flex justify-between text-stone-400">
          <span>Insured shipping</span>
          <span>Included</span>
        </div>
        <div className="flex justify-between font-bold text-stone-100 border-t border-white/8 pt-2 text-base">
          <span>Total</span>
          <span>{formatPrice(listing.price + Math.round(listing.price * 0.025))}</span>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { listingId } = useParams<{ listingId: string }>();
  const { profile } = useProfile();

  const listing = listings.find((l) => l.id === listingId);

  const [step, setStep] = useState<Step>("review");
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
  });
  const [processing, setProcessing] = useState(false);
  const [orderId, setOrderId] = useState(() => `KLN-${Math.random().toString(36).slice(2, 9).toUpperCase()}`);

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <ShoppingBag size={32} className="text-stone-700" />
          <p className="text-stone-400">Listing not found.</p>
          <Link href="/shop" className="text-amber-400 hover:text-amber-300 text-sm">← Back to Shop</Link>
        </div>
      </div>
    );
  }

  if (!listing.available) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <ShoppingBag size={32} className="text-stone-700" />
          <p className="text-stone-200 font-semibold">This work has been sold</p>
          <p className="text-stone-500 text-sm">It's no longer available for purchase.</p>
          <Link href="/shop" className="rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400">
            Browse Available Works
          </Link>
        </div>
      </div>
    );
  }

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePurchase() {
    if (!listing) return;
    setProcessing(true);
    try {
      const total = listing.price + Math.round(listing.price * 0.025);
      const res = await fetch("/api/me/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: listing.title,
          sellerId: listing.artistId,
          type: "listing",
          refId: listing.id,
          imageUrl: listing.imageUrl ?? null,
          amount: total,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { orderId: string };
        setOrderId(`KLN-${data.orderId.slice(0, 8).toUpperCase()}`);
      }
    } catch { /* proceed to confirm even if API fails */ }
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
          <h2 className="font-serif text-3xl text-amber-100 mb-2">Purchase Complete</h2>
          <p className="text-stone-400 mb-1">Order <span className="font-mono text-amber-300">{orderId}</span></p>
          <p className="text-stone-500 text-sm mb-8">
            {getArtistName(listing.artistId)} will be notified and will be in touch within 2 business days to arrange shipment. All works are insured during transit.
          </p>
          {listing.imageUrl && (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="mx-auto h-48 w-48 rounded-2xl object-cover mb-6 border border-white/10"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${listing.id}/300/300`; }}
            />
          )}
          <p className="text-lg font-medium text-stone-100 mb-1">{listing.title}</p>
          <p className="text-sm text-amber-400 mb-8">{getArtistName(listing.artistId)}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/collection">
              <button className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                My Collection
              </button>
            </Link>
            <Link href="/shop">
              <button className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
                Continue Shopping
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
        <Link href="/shop">
          <button className="mb-6 flex items-center gap-1.5 text-sm text-stone-500 hover:text-amber-300 transition-colors">
            <ArrowLeft size={14} /> Back to Shop
          </button>
        </Link>

        <div className="mb-6">
          <h1 className="font-serif text-2xl text-amber-100">Checkout</h1>
          <p className="text-sm text-stone-500 mt-0.5">Secure purchase · Insured shipping · Authentication included</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["review", "billing"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === s ? "bg-amber-500 text-stone-950" : (["review", "billing"].indexOf(step) > i) ? "bg-emerald-500 text-white" : "bg-stone-800 text-stone-500"
              }`}>
                {(["review", "billing"].indexOf(step) > i) ? <CheckCircle size={12} /> : i + 1}
              </div>
              <span className={`text-sm capitalize ${step === s ? "text-amber-200" : "text-stone-600"}`}>{s}</span>
              {i < 1 && <div className="h-px w-8 bg-stone-700" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Left: form */}
          <div className="space-y-6">
            {step === "review" && (
              <div className="rounded-2xl border border-white/10 bg-stone-900/40 p-5 space-y-4">
                <h2 className="font-semibold text-stone-100">Shipping Information</h2>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Full name</label>
                    <input value={form.name} onChange={(e) => field("name", e.target.value)} placeholder="Jane Smith" className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Email</label>
                    <input value={form.email} onChange={(e) => field("email", e.target.value)} type="email" placeholder="jane@example.com" className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Street address</label>
                    <input value={form.address} onChange={(e) => field("address", e.target.value)} placeholder="123 Main St" className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-stone-500 mb-1 block">City</label>
                      <input value={form.city} onChange={(e) => field("city", e.target.value)} placeholder="Portland" className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">ZIP</label>
                      <input value={form.zip} onChange={(e) => field("zip", e.target.value)} placeholder="97201" className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setStep("billing")}
                  disabled={!form.name || !form.email || !form.address || !form.city || !form.zip}
                  className="w-full rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {step === "billing" && (
              <div className="rounded-2xl border border-white/10 bg-stone-900/40 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-stone-400" />
                  <h2 className="font-semibold text-stone-100">Payment</h2>
                  <div className="ml-auto flex items-center gap-1 text-xs text-stone-500">
                    <Lock size={10} /> Secure
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Card number</label>
                    <input
                      value={form.cardNumber}
                      onChange={(e) => field("cardNumber", e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())}
                      placeholder="4242 4242 4242 4242"
                      className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm font-mono text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">Expiry</label>
                      <input
                        value={form.cardExpiry}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                          field("cardExpiry", val.length > 2 ? val.slice(0, 2) + "/" + val.slice(2) : val);
                        }}
                        placeholder="MM/YY"
                        className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm font-mono text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">CVC</label>
                      <input
                        value={form.cardCvc}
                        onChange={(e) => field("cardCvc", e.target.value.replace(/\D/g, "").slice(0, 3))}
                        placeholder="123"
                        className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm font-mono text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-3 py-2 text-xs text-stone-500">
                  <Flame size={10} className="inline mr-1 text-amber-400" />
                  Card details are not charged — this demo records a confirmed order in your account.
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep("review")} className="rounded-full border border-white/10 px-4 py-3 text-sm text-stone-400 hover:border-white/20 transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={processing || !form.cardNumber || !form.cardExpiry || !form.cardCvc}
                    className="flex-1 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
                  >
                    {processing ? "Processing…" : `Complete Purchase · ${formatPrice(listing.price + Math.round(listing.price * 0.025))}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: order summary */}
          <OrderSummary listingId={listingId ?? ""} />
        </div>
      </div>
    </div>
  );
}
