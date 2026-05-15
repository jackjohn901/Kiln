import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, TrendingUp, DollarSign, Users, Eye, ArrowUp, ArrowDown, Star, ShoppingBag, MessageCircle } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
const FOLLOWER_DATA = [1240, 1380, 1520, 1710, 1890, 2100, 2340, 2580, 2880, 3200, 3650, 4120];
const REVENUE_DATA = [840, 1200, 950, 2400, 1800, 3200, 2900, 4100, 3800, 5200, 4600, 6800];
const VIEW_DATA = [8400, 9200, 11000, 13500, 12800, 16200, 18900, 22000, 24500, 28000, 31000, 38500];

function MiniLineChart({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 300;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4);
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const fillPts = `0,${height} ${polyline} ${width},${height}`;
  const gradId = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#${gradId})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      {(() => {
        const last = pts[pts.length - 1].split(",");
        return <circle cx={last[0]} cy={last[1]} r="3" fill={color} />;
      })()}
    </svg>
  );
}

function BarChart({ data, color, labels }: { data: number[]; color: string; labels: string[] }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="w-full rounded-t-sm" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, opacity: 0.5 + (v / max) * 0.5 }} />
          <span className="text-[8px] text-stone-600 leading-none hidden sm:block">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, change, sub, icon: Icon, color }: {
  label: string; value: string; change?: number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-4">
      <div className="mb-2 flex items-start justify-between">
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}><Icon size={13} /></div>
      </div>
      <p className="text-xl font-bold text-amber-100 mb-0.5">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-0.5 text-[11px] ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {change >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
          <span>{Math.abs(change)}% vs last month</span>
        </div>
      )}
      {sub && <p className="text-[11px] text-stone-600">{sub}</p>}
    </div>
  );
}

type Period = "30d" | "90d" | "1y";

export default function Analytics() {
  const { profile } = useProfile();
  const { commissions, receivedInquiries } = useSocial();
  const [period, setPeriod] = useState<Period>("1y");

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 p-24 text-center">
          <TrendingUp size={40} className="text-stone-700" />
          <p className="text-stone-400 text-lg">Create a profile to see your analytics.</p>
          <Link href="/edit-profile" className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">Create Profile</Link>
        </div>
      </div>
    );
  }

  const slicedCount = period === "30d" ? 1 : period === "90d" ? 3 : 12;
  const displayMonths = MONTHS.slice(-slicedCount);
  const displayFollowers = FOLLOWER_DATA.slice(-slicedCount);
  const displayRevenue = REVENUE_DATA.slice(-slicedCount);
  const displayViews = VIEW_DATA.slice(-slicedCount);

  const lastF = FOLLOWER_DATA[FOLLOWER_DATA.length - 1];
  const prevF = FOLLOWER_DATA[FOLLOWER_DATA.length - 2];
  const followerChange = Math.round(((lastF - prevF) / prevF) * 100);

  const lastR = REVENUE_DATA[REVENUE_DATA.length - 1];
  const prevR = REVENUE_DATA[REVENUE_DATA.length - 2];
  const revenueChange = Math.round(((lastR - prevR) / prevR) * 100);

  const totalRevenue = REVENUE_DATA.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href={`/artists/${profile.id}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100">Analytics</h1>
            <p className="text-xs text-stone-500 mt-0.5">{profile.name} · Kiln Creator</p>
          </div>
          <div className="flex gap-1.5">
            {(["30d", "90d", "1y"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${period === p ? "bg-amber-500 text-stone-950" : "border border-white/10 text-stone-500 hover:text-stone-300"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* KPI grid */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Followers" value={lastF.toLocaleString()} change={followerChange} icon={Users} color="bg-sky-500/10 text-sky-400" />
          <KpiCard label="Revenue" value={`$${lastR.toLocaleString()}`} change={revenueChange} sub="This month" icon={DollarSign} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard label="Views" value={`${(VIEW_DATA[VIEW_DATA.length - 1] / 1000).toFixed(1)}k`} change={12} sub="This month" icon={Eye} color="bg-amber-500/10 text-amber-400" />
          <KpiCard label="Total Earned" value={`$${(totalRevenue / 1000).toFixed(1)}k`} sub="All time" icon={TrendingUp} color="bg-purple-500/10 text-purple-400" />
        </div>

        {/* Follower chart */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-200">Follower Growth</h2>
              <p className="text-xs text-stone-500">+{(lastF - prevF).toLocaleString()} this month</p>
            </div>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${followerChange >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              <ArrowUp size={9} /> {followerChange}%
            </span>
          </div>
          <MiniLineChart data={displayFollowers} color="#60a5fa" height={80} />
          <div className="mt-1.5 flex justify-between">
            {displayMonths.filter((_, i) => i % Math.ceil(displayMonths.length / 6) === 0 || i === displayMonths.length - 1).map((m) => (
              <span key={m} className="text-[9px] text-stone-700">{m}</span>
            ))}
          </div>
        </div>

        {/* Revenue chart */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-200">Monthly Revenue</h2>
              <p className="text-xs text-stone-500">Shop + commissions + tips</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              <ArrowUp size={9} /> {revenueChange}%
            </span>
          </div>
          <BarChart data={displayRevenue} color="#34d399" labels={displayMonths} />
        </div>

        {/* Views chart */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-stone-200">Content Views</h2>
            <p className="text-xs text-stone-500">Reel views + profile visits</p>
          </div>
          <MiniLineChart data={displayViews} color="#f59e0b" height={72} />
        </div>

        {/* Commission stats */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-200">Commission Activity</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Inquiries", value: Math.max(receivedInquiries.length, 12), color: "text-amber-400" },
              { label: "Accepted", value: Math.max(receivedInquiries.filter(i => i.status === "accepted" || i.status === "quoted").length, 7), color: "text-emerald-400" },
              { label: "Completed", value: Math.max(commissions.length, 3), color: "text-sky-400" },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-stone-800/60 p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-stone-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top posts */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-200">Top Performing Posts</h2>
          <div className="flex flex-col gap-2">
            {[
              { title: "Testing new Gaffer amber in the hot shop", views: "38.5k", likes: "2.4k", type: "Reel", shopClicks: "312", inquiries: 4, follows: 89 },
              { title: "Murrine development — 3 days of color tests", views: "24.1k", likes: "1.8k", type: "Process", shopClicks: "187", inquiries: 2, follows: 54 },
              { title: "Finished: Endeavour (18\", cobalt to amber)", views: "19.3k", likes: "3.1k", type: "Photo", shopClicks: "523", inquiries: 9, follows: 201 },
              { title: "Live from the hot shop — midnight session", views: "15.7k", likes: "1.2k", type: "Live", shopClicks: "98", inquiries: 1, follows: 37 },
            ].map((post, i) => (
              <div key={i} className="rounded-xl bg-stone-800/40 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-600 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-300 truncate">{post.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-stone-600">
                      <span className="flex items-center gap-0.5"><Eye size={9} /> {post.views}</span>
                      <span className="flex items-center gap-0.5"><Star size={9} /> {post.likes}</span>
                    </div>
                  </div>
                  <span className="text-[10px] rounded-full bg-stone-700 px-2 py-0.5 text-stone-400 shrink-0">{post.type}</span>
                </div>
                <div className="mt-2 ml-7 flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ShoppingBag size={9} /> <span>{post.shopClicks} shop clicks</span>
                  </span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <MessageCircle size={9} /> <span>{post.inquiries} inquiries</span>
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <TrendingUp size={9} /> <span>+{post.follows} follows</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
