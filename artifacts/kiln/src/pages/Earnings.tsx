import { useMemo } from "react";
import { Link } from "wouter";
import { TrendingUp, DollarSign, Users, Zap, MessageSquare, Star, ArrowUpRight, BarChart2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";

interface EarningLine {
  id: string;
  type: "subscription" | "tip" | "commission" | "drop";
  label: string;
  sublabel: string;
  amount: number;
  date: string;
}

const SEED_EARNINGS: EarningLine[] = [
  { id: "e1", type: "commission", label: "Commission — Mei Lin", sublabel: "Hotel lobby statement piece", amount: 9500, date: "2026-05-08T11:00:00Z" },
  { id: "e2", type: "drop",       label: "Drop sale — Vessel Series No. 3", sublabel: "Limited edition, 1 of 3", amount: 2400, date: "2026-05-05T18:00:00Z" },
  { id: "e3", type: "tip",        label: "Tip from @rachel-osei", sublabel: "Loved the new reel", amount: 50, date: "2026-05-03T09:00:00Z" },
  { id: "e4", type: "subscription", label: "Studio Supporter — 4 subscribers", sublabel: "$15/mo × 4", amount: 60, date: "2026-05-01T00:00:00Z" },
  { id: "e5", type: "drop",       label: "Drop sale — Cobalt Gathering Vessel", sublabel: "Unique piece", amount: 3200, date: "2026-04-28T14:00:00Z" },
  { id: "e6", type: "commission", label: "Commission deposit — James Whitfield", sublabel: "Gallery show, 3 pieces", amount: 1800, date: "2026-04-20T10:00:00Z" },
  { id: "e7", type: "tip",        label: "Tip from @whitfield-gallery", sublabel: "Process video — thank you!", amount: 25, date: "2026-04-15T16:00:00Z" },
  { id: "e8", type: "subscription", label: "Studio Supporter — 3 subscribers", sublabel: "$15/mo × 3", amount: 45, date: "2026-04-01T00:00:00Z" },
];

const MONTHLY_BARS = [
  { month: "Dec", amount: 2100 },
  { month: "Jan", amount: 3800 },
  { month: "Feb", amount: 2900 },
  { month: "Mar", amount: 5100 },
  { month: "Apr", amount: 7600 },
  { month: "May", amount: 17080 },
];

const TYPE_CONFIG = {
  subscription: { icon: Star,         color: "text-amber-400",   bg: "bg-amber-500/15",   label: "Subscription" },
  tip:          { icon: DollarSign,   color: "text-emerald-400", bg: "bg-emerald-500/15", label: "Tip" },
  commission:   { icon: MessageSquare,color: "text-blue-400",    bg: "bg-blue-500/15",    label: "Commission" },
  drop:         { icon: Zap,          color: "text-orange-400",  bg: "bg-orange-500/15",  label: "Drop" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Earnings() {
  const { profile } = useProfile();
  const { tips, subscriptions, receivedInquiries } = useSocial();

  const allEarnings = useMemo<EarningLine[]>(() => {
    const lines = [...SEED_EARNINGS];
    for (const t of tips) {
      lines.push({ id: t.id, type: "tip", label: `Tip from ${t.toArtistName}`, sublabel: t.message ?? "", amount: t.amount, date: t.createdAt });
    }
    return lines.sort((a, b) => b.date.localeCompare(a.date));
  }, [tips, subscriptions, receivedInquiries]);

  const total = allEarnings.reduce((s, e) => s + e.amount, 0);
  const byType = { subscription: 0, tip: 0, commission: 0, drop: 0 };
  for (const e of allEarnings) byType[e.type] += e.amount;

  const maxBar = Math.max(...MONTHLY_BARS.map((b) => b.amount));

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <p className="mb-4 text-stone-400">Sign in to see your earnings.</p>
          <Link href="/setup" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950">Set up profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold text-amber-100">Earnings</h1>
          <p className="text-sm text-stone-500">Your revenue across all channels</p>
        </div>

        {/* Total card */}
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 p-6">
          <p className="text-sm text-amber-400/70 font-medium">Lifetime earnings</p>
          <p className="mt-1 font-serif text-4xl font-bold text-amber-100">${total.toLocaleString()}</p>
          <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-sm">
            <TrendingUp size={14} />
            <span>+124% vs last 6 months</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {(Object.entries(byType) as Array<[keyof typeof byType, number]>).map(([type, amount]) => {
            const cfg = TYPE_CONFIG[type];
            const Icon = cfg.icon;
            return (
              <div key={type} className="rounded-2xl border border-white/8 bg-stone-900/40 p-4">
                <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl ${cfg.bg}`}>
                  <Icon size={14} className={cfg.color} />
                </div>
                <p className="text-xs text-stone-500">{cfg.label}</p>
                <p className="mt-0.5 text-lg font-bold text-stone-200">${amount.toLocaleString()}</p>
              </div>
            );
          })}
        </div>

        {/* Monthly chart */}
        <div className="mb-6 rounded-2xl border border-white/8 bg-stone-900/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 size={14} className="text-amber-400" />
            <p className="text-sm font-medium text-stone-300">Monthly revenue</p>
          </div>
          <div className="flex items-end gap-2 h-28">
            {MONTHLY_BARS.map((b) => {
              const pct = (b.amount / maxBar) * 100;
              const isLatest = b.month === "May";
              return (
                <div key={b.month} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center" style={{ height: "88px" }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${isLatest ? "bg-amber-500" : "bg-stone-700"}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-stone-600">{b.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction history */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-600">Recent transactions</p>
          <div className="space-y-1">
            {allEarnings.map((e) => {
              const cfg = TYPE_CONFIG[e.type];
              const Icon = cfg.icon;
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/3 transition-colors">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                    <Icon size={14} className={cfg.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-300 truncate">{e.label}</p>
                    {e.sublabel && <p className="text-xs text-stone-600 truncate">{e.sublabel}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-400">+${e.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-stone-600">{timeAgo(e.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payout CTA */}
        <div className="mt-8 rounded-2xl border border-white/8 bg-stone-900/40 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-200">Ready to pay out</p>
            <p className="text-2xl font-bold text-amber-100 mt-0.5">${Math.floor(total * 0.85).toLocaleString()}</p>
            <p className="text-xs text-stone-600 mt-0.5">After 15% platform fee</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
            Withdraw <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
