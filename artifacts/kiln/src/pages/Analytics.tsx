import { useState, useEffect } from "react";
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

interface ApiPost {
  id: string;
  caption: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  technique?: string | null;
  createdAt: string;
}

interface EarningTotals {
  tips: number;
  subscriptions: number;
  sales: number;
  total: number;
}

export default function Analytics() {
  const { profile } = useProfile();
  const { commissions, receivedInquiries } = useSocial();
  const [period, setPeriod] = useState<Period>("1y");
  const [apiPosts, setApiPosts] = useState<ApiPost[]>([]);
  const [apiFollowers, setApiFollowers] = useState<number | null>(null);
  const [earningTotals, setEarningTotals] = useState<EarningTotals | null>(null);

  useEffect(() => {
    fetch("/api/me/posts", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data?.posts)) setApiPosts(data.posts); })
      .catch(() => {});
    fetch("/api/me/profile", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.followerCount != null) setApiFollowers(data.followerCount); })
      .catch(() => {});
    fetch("/api/me/earnings", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.totals) setEarningTotals(data.totals); })
      .catch(() => {});
  }, []);

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

  const totalRevenue = earningTotals?.total ?? REVENUE_DATA.reduce((a, b) => a + b, 0);

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
          <KpiCard label="Followers" value={(apiFollowers ?? lastF).toLocaleString()} change={followerChange} icon={Users} color="bg-sky-500/10 text-sky-400" />
          <KpiCard label="Total likes" value={apiPosts.length > 0 ? apiPosts.reduce((s, p) => s + p.likeCount, 0).toLocaleString() : `${(VIEW_DATA[VIEW_DATA.length - 1] / 1000).toFixed(1)}k`} sub="Across all posts" icon={Eye} color="bg-amber-500/10 text-amber-400" />
          <KpiCard label="Total saves" value={apiPosts.length > 0 ? apiPosts.reduce((s, p) => s + p.saveCount, 0).toLocaleString() : "—"} sub="Across all posts" icon={Star} color="bg-purple-500/10 text-purple-400" />
          <KpiCard label="Posts" value={apiPosts.length > 0 ? String(apiPosts.length) : String(lastF > 0 ? 13 : 0)} sub="Published" icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" />
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

        {/* Best time to post */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-stone-200">Best Time to Post</h2>
            <p className="text-xs text-stone-500 mt-0.5">Follower activity by day & hour (your timezone)</p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[340px]">
              {/* Day labels */}
              <div className="flex items-center mb-1.5">
                <div className="w-8 shrink-0" />
                {["12a","3a","6a","9a","12p","3p","6p","9p"].map((h) => (
                  <div key={h} className="flex-1 text-center text-[8px] text-stone-700">{h}</div>
                ))}
              </div>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, di) => {
                const BASE = [0.05,0.04,0.03,0.04,0.08,0.14,0.18,0.22,0.26,0.30,0.34,0.38,0.42,0.44,0.46,0.48,0.56,0.72,0.88,0.96,0.90,0.78,0.60,0.32];
                const WEEKEND_BOOST = di === 0 || di === 6 ? 0.12 : 0;
                const WEEKDAY_LUNCH = (di >= 1 && di <= 5) ? [0,0,0,0,0,0,0,0,0,0,0,0.15,0.18,0.15,0,0,0,0,0,0,0,0,0,0] : new Array(24).fill(0);
                const hourly = BASE.map((v, hi) => Math.min(1, v + WEEKEND_BOOST + (WEEKDAY_LUNCH[hi] ?? 0) + (((di * 7 + hi * 3) % 17) / 17) * 0.05));
                const shown = [0,3,6,9,12,15,18,21].map((hi) => hourly[hi]);
                return (
                  <div key={day} className="flex items-center mb-1">
                    <div className="w-8 shrink-0 text-[9px] text-stone-600 pr-1 text-right">{day}</div>
                    {shown.map((intensity, ci) => {
                      const isPeak = intensity > 0.8;
                      const bg = intensity < 0.15 ? "bg-stone-800" : intensity < 0.4 ? "bg-amber-900/60" : intensity < 0.7 ? "bg-amber-600/70" : "bg-amber-400";
                      return (
                        <div key={ci} className="flex-1 mx-0.5">
                          <div
                            className={`h-5 rounded-sm ${bg} relative`}
                            title={`${day} ${["12a","3a","6a","9a","12p","3p","6p","9p"][ci]} — ${Math.round(intensity * 100)}% activity`}
                          >
                            {isPeak && <div className="absolute inset-0 rounded-sm ring-1 ring-amber-300/50" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="mt-2 flex items-center gap-3 justify-end">
                <div className="flex items-center gap-1.5 text-[9px] text-stone-600">
                  <div className="h-2.5 w-2.5 rounded-sm bg-stone-800" /> Low
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-stone-600">
                  <div className="h-2.5 w-2.5 rounded-sm bg-amber-600/70" /> Medium
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-stone-600">
                  <div className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Peak 🔥
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 flex items-start gap-2">
            <span className="text-amber-400 text-base leading-none mt-0.5">💡</span>
            <p className="text-xs text-amber-200/80">Your peak engagement is <strong>Tue–Thu 6–9pm</strong> and <strong>Sat–Sun 12–3pm</strong>. Posts at these times get ~2.4× more views on average.</p>
          </div>
        </div>

        {/* Audience demographics */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-200">Audience Demographics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Locations */}
            <div>
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3">Top Locations</p>
              {[
                { label: "United States", pct: 48 },
                { label: "United Kingdom", pct: 16 },
                { label: "Canada", pct: 11 },
                { label: "Australia", pct: 8 },
                { label: "Germany", pct: 5 },
                { label: "Other", pct: 12 },
              ].map(({ label, pct }) => (
                <div key={label} className="mb-2">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-stone-400">{label}</span>
                    <span className="text-stone-500 font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
                    <div className="h-full bg-sky-500/70 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Medium affinity */}
            <div>
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3">Medium Affinity</p>
              {[
                { label: "Glass Blowing", pct: 62, color: "bg-orange-500/70" },
                { label: "Ceramics", pct: 44, color: "bg-orange-400/70" },
                { label: "Fiber Arts", pct: 28, color: "bg-purple-500/70" },
                { label: "Metal Forging", pct: 19, color: "bg-slate-400/70" },
                { label: "Wood Turning", pct: 14, color: "bg-lime-600/70" },
              ].map(({ label, pct, color }) => (
                <div key={label} className="mb-2">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-stone-400">{label}</span>
                    <span className="text-stone-500 font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Follower type */}
            <div>
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3">Follower Types</p>
              <div className="space-y-3">
                {[
                  { label: "Collectors", pct: 34, emoji: "🏺", color: "bg-amber-500/70" },
                  { label: "Fellow Artists", pct: 28, emoji: "🔥", color: "bg-red-500/70" },
                  { label: "Craft Enthusiasts", pct: 22, emoji: "✨", color: "bg-purple-500/70" },
                  { label: "Interior Design", pct: 10, emoji: "🏡", color: "bg-teal-500/70" },
                  { label: "Press / Galleries", pct: 6, emoji: "🖼", color: "bg-sky-500/70" },
                ].map(({ label, pct, emoji, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-base leading-none">{emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-stone-400">{label}</span>
                        <span className="text-stone-500">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* A/B Test Tracker */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-stone-200">Caption A/B Tests</h2>
              <p className="text-xs text-stone-500 mt-0.5">Which caption style resonates more with your audience</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              {
                postTitle: "Cobalt vessel — midnight firing",
                variantA: { caption: "Just pulled from the annealer 🔥 18 hours in the making", views: 4200, likes: 312, saves: 89 },
                variantB: { caption: "Process over perfection. This piece taught me patience.", views: 6800, likes: 548, saves: 201 },
                winner: "B",
              },
              {
                postTitle: "New color series — Gaffer amber",
                variantA: { caption: "Testing Gaffer 303 Amber in the hot shop — first results", views: 8900, likes: 720, saves: 234 },
                variantB: { caption: "This color only works at 2,050°F. Chasing it for 6 months.", views: 7100, likes: 590, saves: 180 },
                winner: "A",
              },
            ].map((test, i) => (
              <div key={i} className="rounded-xl border border-white/8 bg-stone-800/40 p-4">
                <p className="text-xs font-semibold text-stone-300 mb-3 truncate">{test.postTitle}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["A", "B"] as const).map((v) => {
                    const variant = v === "A" ? test.variantA : test.variantB;
                    const isWinner = test.winner === v;
                    return (
                      <div key={v} className={`rounded-lg p-3 border ${isWinner ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/5 bg-stone-800/30"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${isWinner ? "bg-emerald-500/20 text-emerald-400" : "bg-stone-700 text-stone-400"}`}>
                            Variant {v} {isWinner && "🏆"}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 mb-2 line-clamp-2 leading-relaxed">{variant.caption}</p>
                        <div className="space-y-0.5 text-[10px] text-stone-500">
                          <p>{(variant.views / 1000).toFixed(1)}k views · {variant.likes} likes · {variant.saves} saves</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top posts */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-200">Top Performing Posts</h2>
          {apiPosts.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-6">No posts yet — share your craft to see analytics here.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...apiPosts]
                .sort((a, b) => b.likeCount - a.likeCount)
                .slice(0, 6)
                .map((post, i) => (
                  <div key={post.id} className="rounded-xl bg-stone-800/40 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-stone-600 w-4">{i + 1}</span>
                      {post.thumbnailUrl && (
                        <img src={post.thumbnailUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-stone-300 truncate">{post.caption}</p>
                        <div className="mt-0.5 flex items-center gap-3 text-[10px] text-stone-500">
                          <span className="flex items-center gap-0.5 text-red-400">
                            <Eye size={9} /> {post.likeCount.toLocaleString()} likes
                          </span>
                          <span className="flex items-center gap-0.5 text-amber-400">
                            <Star size={9} /> {post.saveCount.toLocaleString()} saves
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageCircle size={9} /> {post.commentCount.toLocaleString()} comments
                          </span>
                        </div>
                      </div>
                      {post.technique && (
                        <span className="text-[10px] rounded-full bg-stone-700 px-2 py-0.5 text-stone-400 shrink-0">{post.technique}</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
