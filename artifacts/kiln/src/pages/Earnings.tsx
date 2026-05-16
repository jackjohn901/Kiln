import { useEffect, useState } from "react";
import { Link } from "wouter";
import { TrendingUp, DollarSign, Zap, MessageSquare, Star, ArrowUpRight, BarChart2, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";

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

const TYPE_CONFIG = {
  subscription: { icon: Star,          color: "text-amber-400",   bg: "bg-amber-500/15",   label: "Subscription" },
  tip:          { icon: DollarSign,    color: "text-emerald-400", bg: "bg-emerald-500/15", label: "Tip" },
  commission:   { icon: MessageSquare, color: "text-blue-400",    bg: "bg-blue-500/15",    label: "Commission" },
  drop:         { icon: Zap,           color: "text-orange-400",  bg: "bg-orange-500/15",  label: "Drop" },
  listing:      { icon: BarChart2,     color: "text-stone-400",   bg: "bg-stone-500/15",   label: "Sale" },
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
  const [earnings, setEarnings] = useState<EarningLine[]>([]);
  const [totals, setTotals] = useState<EarningTotals>({ tips: 0, subscriptions: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/earnings", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setEarnings(data.earnings ?? []);
        setTotals(data.totals ?? { tips: 0, subscriptions: 0, total: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        <div className="mb-6">
          <h1 className="font-serif text-2xl text-amber-100">Earnings</h1>
          <p className="mt-1 text-sm text-stone-500">Revenue from your creative work on Kiln.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        ) : (
          <>
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
              <div className="space-y-2">
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

            <div className="mt-8 rounded-2xl border border-white/8 bg-stone-900/40 p-4">
              <p className="text-xs text-stone-500 mb-3">Expand your revenue</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: "/patrons", icon: Star, color: "text-amber-400", label: "Patron tiers" },
                  { href: "/drops", icon: Zap, color: "text-amber-400", label: "Drops" },
                  { href: "/commissions", icon: MessageSquare, color: "text-blue-400", label: "Commissions" },
                  { href: "/shop", icon: BarChart2, color: "text-stone-400", label: "Shop listings" },
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
    </div>
  );
}
