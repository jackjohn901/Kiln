import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  TrendingUp, DollarSign, Zap, MessageSquare, Star, ArrowUpRight,
  BarChart2, Loader2, Banknote, X, Pencil, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

interface EarningLine {
  id: string;
  type: "subscription" | "tip" | "commission" | "drop" | "listing";
  label: string;
  sublabel: string;
  amount: number;
  date: string;
}

interface EarningTotals {
  tips: number;
  subscriptions: number;
  total: number;
}

interface PayoutRecord {
  id: string;
  amountCents: number;
  status: string;
  method: string | null;
  requestedAt: string;
  processedAt: string | null;
}

interface PatronTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  perks: string[];
  subscriberCount: number;
}

const TYPE_CONFIG = {
  subscription: { icon: Star,          color: "text-amber-400",   bg: "bg-amber-500/15",   label: "Subscription" },
  tip:          { icon: DollarSign,    color: "text-emerald-400", bg: "bg-emerald-500/15", label: "Tip" },
  commission:   { icon: MessageSquare, color: "text-blue-400",    bg: "bg-blue-500/15",    label: "Commission" },
  drop:         { icon: Zap,           color: "text-orange-400",  bg: "bg-orange-500/15",  label: "Drop" },
  listing:      { icon: BarChart2,     color: "text-stone-400",   bg: "bg-stone-500/15",   label: "Sale" },
};

const STATUS_COLOR: Record<string, string> = {
  pending:   "text-amber-400 bg-amber-500/10 border-amber-500/20",
  approved:  "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  paid:      "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  rejected:  "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Earnings() {
  const { profile } = useProfile();

  const [earnings, setEarnings]   = useState<EarningLine[]>([]);
  const [totals, setTotals]       = useState<EarningTotals>({ tips: 0, subscriptions: 0, total: 0 });
  const [loading, setLoading]     = useState(true);

  // Payout state
  const [payouts, setPayouts]           = useState<PayoutRecord[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank");
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutError, setPayoutError]   = useState("");
  const [showPayouts, setShowPayouts]   = useState(false);

  // Patron tier state
  const [myTiers, setMyTiers]           = useState<PatronTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierName, setTierName]         = useState("");
  const [tierPrice, setTierPrice]       = useState("");
  const [savingTier, setSavingTier]     = useState(false);
  const [showTiers, setShowTiers]       = useState(false);

  useEffect(() => {
    fetch("/api/me/earnings", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setEarnings(data.earnings ?? []);
        setTotals(data.totals ?? { tips: 0, subscriptions: 0, total: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/payouts", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setPayouts(data.payouts ?? []))
      .catch(() => {})
      .finally(() => setPayoutLoading(false));
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    fetch(`/api/patron-tiers/${profile.id}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setMyTiers(data.tiers ?? []))
      .catch(() => {})
      .finally(() => setTiersLoading(false));
  }, [profile?.id]);

  async function handleRequestPayout() {
    const cents = Math.round(parseFloat(payoutAmount) * 100);
    if (!cents || cents < 100) { setPayoutError("Minimum payout is $1.00"); return; }
    setRequestingPayout(true);
    setPayoutError("");
    try {
      const res = await fetch("/api/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amountCents: cents, method: payoutMethod }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setPayoutError(d.error ?? "Request failed");
        return;
      }
      const data = await res.json() as PayoutRecord;
      setPayouts(prev => [data, ...prev]);
      setShowPayoutModal(false);
      setPayoutAmount("");
      setShowPayouts(true);
    } catch { setPayoutError("Request failed. Try again."); }
    finally { setRequestingPayout(false); }
  }

  function startEditTier(tier: PatronTier) {
    setEditingTierId(tier.id);
    setTierName(tier.name);
    setTierPrice(String(tier.price / 100));
  }

  async function handleSaveTier(tierId: string) {
    setSavingTier(true);
    try {
      const res = await fetch(`/api/patron-tiers/${tierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: tierName,
          price: Math.round(parseFloat(tierPrice) * 100),
        }),
      });
      if (res.ok) {
        const updated = await res.json() as PatronTier;
        setMyTiers(prev => prev.map(t => t.id === tierId ? { ...t, ...updated } : t));
        setEditingTierId(null);
      }
    } catch { /* ignore */ }
    finally { setSavingTier(false); }
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Earnings</h1>
            <p className="mt-1 text-sm text-stone-500">Revenue from your creative work on Kiln.</p>
          </div>
          <button
            onClick={() => { setShowPayoutModal(true); setPayoutError(""); }}
            className="flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Banknote size={13} /> Request Payout
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-8 grid grid-cols-3 gap-3">
              {[
                { label: "Total", value: formatPrice(totals.total), icon: TrendingUp, color: "text-amber-400" },
                { label: "Tips", value: formatPrice(totals.tips), icon: DollarSign, color: "text-emerald-400" },
                { label: "Subscriptions", value: formatPrice(totals.subscriptions), icon: Star, color: "text-purple-400" },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-white/8 bg-stone-900/50 p-4">
                    <Icon size={16} className={`mb-2 ${stat.color}`} />
                    <p className="text-xs text-stone-500 mb-0.5">{stat.label}</p>
                    <p className="text-lg font-bold text-stone-100">{stat.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Recent transactions */}
            {earnings.length === 0 ? (
              <div className="py-16 text-center">
                <BarChart2 size={32} className="mx-auto mb-3 text-stone-700" />
                <p className="text-stone-500 text-sm">No earnings recorded yet.</p>
                <p className="text-stone-600 text-xs mt-1">Set up patron tiers or accept tips to start earning.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <Link href="/patrons" className="rounded-full border border-amber-500/30 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
                    Set up tiers
                  </Link>
                  <Link href="/shop" className="rounded-full border border-stone-700 px-4 py-1.5 text-xs text-stone-400 hover:border-stone-500 transition-colors">
                    List work
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-8">
                <h2 className="text-xs uppercase tracking-wider text-stone-600 mb-3">Recent Transactions</h2>
                {earnings.map(line => {
                  const conf = TYPE_CONFIG[line.type] ?? TYPE_CONFIG.tip;
                  const Icon = conf.icon;
                  return (
                    <div key={line.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-stone-900/40 p-3">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${conf.bg}`}>
                        <Icon size={15} className={conf.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-200 leading-tight">{line.label}</p>
                        {line.sublabel && <p className="text-xs text-stone-600 mt-0.5">{line.sublabel}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-emerald-400">+{formatPrice(line.amount)}</p>
                        <p className="text-[10px] text-stone-600">{formatDate(line.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Patron tiers — quick edit */}
            <div className="mb-6 rounded-2xl border border-white/8 bg-stone-900/40">
              <button
                onClick={() => setShowTiers(v => !v)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-amber-400" />
                  <span className="text-sm font-medium text-stone-200">Patron Tiers</span>
                  {myTiers.length > 0 && (
                    <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-500">{myTiers.length}</span>
                  )}
                </div>
                {showTiers ? <ChevronUp size={14} className="text-stone-600" /> : <ChevronDown size={14} className="text-stone-600" />}
              </button>

              {showTiers && (
                <div className="border-t border-white/5 p-4 space-y-3">
                  {tiersLoading ? (
                    <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-stone-600" /></div>
                  ) : myTiers.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-stone-600">No tiers yet.</p>
                      <Link href="/patrons" className="mt-2 inline-block text-xs text-amber-400 hover:text-amber-300">
                        Create your first tier →
                      </Link>
                    </div>
                  ) : (
                    myTiers.map(tier => (
                      <div key={tier.id} className="rounded-xl border border-white/5 bg-stone-900/60 p-3">
                        {editingTierId === tier.id ? (
                          <div className="space-y-2">
                            <input
                              value={tierName}
                              onChange={e => setTierName(e.target.value)}
                              placeholder="Tier name"
                              className="w-full rounded-lg border border-white/10 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-stone-500 text-sm">$</span>
                              <input
                                type="number"
                                value={tierPrice}
                                onChange={e => setTierPrice(e.target.value)}
                                placeholder="Price / month"
                                className="flex-1 rounded-lg border border-white/10 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                              />
                              <span className="text-xs text-stone-600">/ mo</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveTier(tier.id)}
                                disabled={savingTier}
                                className="flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
                              >
                                {savingTier ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                              </button>
                              <button
                                onClick={() => setEditingTierId(null)}
                                className="flex items-center gap-1 rounded-lg border border-white/8 px-3 py-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                              >
                                <X size={11} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-stone-200">{tier.name}</p>
                              <p className="text-xs text-stone-500">${(tier.price / 100).toFixed(0)}/mo · {tier.subscriberCount} patron{tier.subscriberCount !== 1 ? "s" : ""}</p>
                            </div>
                            <button
                              onClick={() => startEditTier(tier)}
                              className="flex items-center gap-1 rounded-lg border border-white/8 px-2.5 py-1.5 text-xs text-stone-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Payout history */}
            <div className="mb-6 rounded-2xl border border-white/8 bg-stone-900/40">
              <button
                onClick={() => setShowPayouts(v => !v)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-2">
                  <Banknote size={14} className="text-stone-400" />
                  <span className="text-sm font-medium text-stone-200">Payout History</span>
                  {payouts.length > 0 && (
                    <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-500">{payouts.length}</span>
                  )}
                </div>
                {showPayouts ? <ChevronUp size={14} className="text-stone-600" /> : <ChevronDown size={14} className="text-stone-600" />}
              </button>

              {showPayouts && (
                <div className="border-t border-white/5 p-4 space-y-2">
                  {payoutLoading ? (
                    <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-stone-600" /></div>
                  ) : payouts.length === 0 ? (
                    <p className="text-xs text-stone-600 text-center py-4">No payout requests yet.</p>
                  ) : (
                    payouts.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-stone-900/60 p-3">
                        <div>
                          <p className="text-sm font-medium text-stone-200">{formatPrice(p.amountCents / 100)}</p>
                          <p className="text-[10px] text-stone-600">{formatDate(p.requestedAt)} · {p.method ?? "bank"}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${STATUS_COLOR[p.status] ?? "text-stone-400 bg-stone-800 border-white/8"}`}>
                          {p.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Expand your revenue */}
            <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-4">
              <p className="text-xs text-stone-500 mb-3">Expand your revenue</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: "/patrons", icon: Star,         color: "text-amber-400", label: "Patron tiers" },
                  { href: "/drops",   icon: Zap,          color: "text-amber-400", label: "Drops" },
                  { href: "/commissions", icon: MessageSquare, color: "text-blue-400", label: "Commissions" },
                  { href: "/shop",    icon: BarChart2,     color: "text-stone-400", label: "Shop listings" },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-xl border border-white/8 bg-stone-900/60 p-3 hover:border-amber-500/30 transition-colors">
                      <Icon size={14} className={item.color} />
                      <span className="text-xs text-stone-300">{item.label}</span>
                      <ArrowUpRight size={10} className="ml-auto text-stone-600" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payout request modal */}
      {showPayoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setShowPayoutModal(false)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-stone-900 border border-white/10 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-lg text-amber-100">Request Payout</h2>
              <button onClick={() => setShowPayoutModal(false)} className="rounded-full p-1.5 hover:bg-white/5 text-stone-500">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-500">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">$</span>
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={e => setPayoutAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="w-full rounded-xl border border-white/10 bg-stone-800 py-3 pl-7 pr-4 text-stone-100 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-500">Method</label>
                <select
                  value={payoutMethod}
                  onChange={e => setPayoutMethod(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-3 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                >
                  <option value="bank">Bank transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="check">Check</option>
                </select>
              </div>

              {payoutError && <p className="text-xs text-rose-400">{payoutError}</p>}

              <p className="text-[11px] text-stone-600">Payout requests are reviewed and processed within 3–5 business days.</p>

              <button
                onClick={handleRequestPayout}
                disabled={requestingPayout || !payoutAmount}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {requestingPayout ? <Loader2 size={15} className="animate-spin" /> : <Banknote size={15} />}
                {requestingPayout ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
