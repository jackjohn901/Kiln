import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { ChevronLeft, TrendingUp, DollarSign, Users, Eye, ArrowUp, ArrowDown, Star, ShoppingBag, MessageCircle, Radio } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useWebSocket } from "@/hooks/useWebSocket";

function buildDayMap(dayMap: Record<string, number>, period: "30d" | "90d" | "1y"): number[] {
  const now = new Date();
  if (period === "30d") {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return dayMap[d.toISOString().slice(0, 10)] ?? 0;
    });
  }
  const months = period === "90d" ? 3 : 12;
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const monthKey = d.toISOString().slice(0, 7);
    return Object.entries(dayMap)
      .filter(([k]) => k.startsWith(monthKey))
      .reduce((s, [, v]) => s + v, 0);
  });
}

function buildPeriodLabels(period: "30d" | "90d" | "1y"): string[] {
  const now = new Date();
  if (period === "30d") {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return i % 6 === 0 ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    });
  }
  const months = period === "90d" ? 3 : 12;
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return d.toLocaleDateString("en-US", { month: "short" });
  });
}


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

interface StreamPoint {
  label: string;
  shopSales: number;
  tips: number;
  subscriptions: number;
  auctions: number;
}

function StackedBarChart({ data }: { data: StreamPoint[] }) {
  const max = Math.max(...data.map(d => d.shopSales + d.tips + d.subscriptions + d.auctions), 1);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    const dismiss = () => setActive(null);
    window.addEventListener("scroll", dismiss, true);
    return () => window.removeEventListener("scroll", dismiss, true);
  }, [active]);

  return (
    <div>
      <div className="flex items-end gap-1 h-28">
        {data.map((d, i) => {
          const total = d.shopSales + d.tips + d.subscriptions + d.auctions;
          const pct = total / max;
          const salesH = (d.shopSales / max) * 100;
          const tipsH = (d.tips / max) * 100;
          const subsH = (d.subscriptions / max) * 100;
          const auctionsH = (d.auctions / max) * 100;
          const isActive = active === i;
          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-1 group relative cursor-pointer"
              tabIndex={0}
              role="button"
              aria-label={`${d.label}: total $${total.toFixed(2)}, sales $${d.shopSales.toFixed(2)}, auctions $${d.auctions.toFixed(2)}, tips $${d.tips.toFixed(2)}, subscriptions $${d.subscriptions.toFixed(2)}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(a => (a === i ? null : a))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(a => (a === i ? null : a))}
              onClick={() => setActive(a => (a === i ? null : i))}
            >
              {isActive && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 w-40 rounded-lg border border-white/10 bg-stone-950/95 p-2.5 shadow-xl pointer-events-none">
                  <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                    <span className="text-[10px] font-semibold text-stone-300 truncate">{d.label}</span>
                    <span className="text-[10px] font-bold text-white">${total.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      { color: "#34d399", label: "Shop Sales", value: d.shopSales },
                      { color: "#a78bfa", label: "Auctions", value: d.auctions },
                      { color: "#f59e0b", label: "Tips", value: d.tips },
                      { color: "#38bdf8", label: "Subscriptions", value: d.subscriptions },
                    ].map(({ color, label, value }) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                          <span className="text-[10px] text-stone-400">{label}</span>
                        </span>
                        <span className="text-[10px] font-medium text-stone-200">${value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="w-full flex flex-col justify-end" style={{ height: "112px" }}>
                {subsH > 0 && (
                  <div className="w-full rounded-t-sm" style={{ height: `${subsH}%`, backgroundColor: "#38bdf8", opacity: 0.75 + pct * 0.25 }} />
                )}
                {tipsH > 0 && (
                  <div className="w-full" style={{ height: `${tipsH}%`, backgroundColor: "#f59e0b", opacity: 0.75 + pct * 0.25 }} />
                )}
                {auctionsH > 0 && (
                  <div className="w-full" style={{ height: `${auctionsH}%`, backgroundColor: "#a78bfa", opacity: 0.75 + pct * 0.25 }} />
                )}
                {salesH > 0 && (
                  <div className={`w-full ${subsH === 0 && tipsH === 0 && auctionsH === 0 ? "rounded-t-sm" : ""}`} style={{ height: `${salesH}%`, backgroundColor: "#34d399", opacity: 0.75 + pct * 0.25 }} />
                )}
                {total === 0 && (
                  <div className="w-full rounded-t-sm" style={{ height: "4px", backgroundColor: "#292524" }} />
                )}
              </div>
              <span className="text-[8px] text-stone-600 leading-none hidden sm:block truncate w-full text-center">{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 flex-wrap">
        {[
          { color: "#34d399", label: "Shop Sales" },
          { color: "#a78bfa", label: "Auctions" },
          { color: "#f59e0b", label: "Tips" },
          { color: "#38bdf8", label: "Subscriptions" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-stone-500">{label}</span>
          </div>
        ))}
      </div>
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

interface StreamBucketMonth {
  month: string;
  tips: number;
  subscriptions: number;
  shopSales: number;
  auctions: number;
}

interface StreamBucketDay {
  day: string;
  tips: number;
  subscriptions: number;
  shopSales: number;
  auctions: number;
}

interface EarningTotals {
  tips: number;
  subscriptions: number;
  shopSales: number;
  sales?: number;
  total: number;
  timeSeriesByMonth?: StreamBucketMonth[];
  timeSeriesByDay?: StreamBucketDay[];
}

export default function Analytics() {
  const { profile } = useProfile();
  const { commissions, receivedInquiries } = useSocial();
  const { subscribe: wsSubscribe } = useWebSocket();
  const [period, setPeriod] = useState<Period>("1y");
  const [apiPosts, setApiPosts] = useState<ApiPost[]>([]);
  const [apiFollowers, setApiFollowers] = useState<number | null>(null);
  const [earningTotals, setEarningTotals] = useState<EarningTotals | null>(null);
  const [liveViewers, setLiveViewers] = useState<number>(0);
  const [analyticsData, setAnalyticsData] = useState<{
    totalPosts: number; totalLikes: number; totalComments: number;
    totalSaves: number; totalViews: number; followerCount: number; topPosts: ApiPost[];
    postsByDay: Record<string, number>; likesByDay: Record<string, number>; viewsByDay: Record<string, number>;
  } | null>(null);

  // Real "best time to post" derived from the artist's own posts: 7 days x 8 three-hour
  // windows, weighted by the engagement each post earned, bucketed in the viewer's local timezone.
  const postingHeatmap = useMemo(() => {
    const COLS = 8;
    const windows: number[][] = Array.from({ length: 7 }, () => new Array(COLS).fill(0));
    let samples = 0;
    for (const p of apiPosts) {
      const d = new Date(p.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const col = Math.floor(d.getHours() / 3);
      const engagement = (p.likeCount ?? 0) + (p.commentCount ?? 0) + (p.saveCount ?? 0);
      windows[d.getDay()][col] += engagement + 1;
      samples++;
    }
    let max = 0;
    let peak = { day: 0, col: 0, val: 0 };
    for (let di = 0; di < 7; di++) {
      for (let ci = 0; ci < COLS; ci++) {
        const v = windows[di][ci];
        if (v > max) max = v;
        if (v > peak.val) peak = { day: di, col: ci, val: v };
      }
    }
    const intensities = windows.map((row) => row.map((v) => (max > 0 ? v / max : 0)));
    return { intensities, samples, peak };
  }, [apiPosts]);

  // Subscribe to live feed-viewer count updates for this artist
  useEffect(() => {
    if (!profile) return;
    const artistId = profile.id;
    return wsSubscribe("feed-viewers", (e) => {
      if (e.artistId === artistId) setLiveViewers(e.count as number);
    });
  }, [profile, wsSubscribe]);

  // Fetch initial live viewer count
  useEffect(() => {
    if (!profile) return;
    fetch("/api/analytics/me/feed-viewers", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.count != null) setLiveViewers(data.count); })
      .catch(() => {});
  }, [profile]);

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
      .then(data => {
        if (data?.totals) {
          const t = data.totals;
          setEarningTotals({
            tips: t.tips ?? 0,
            subscriptions: t.subscriptions ?? 0,
            shopSales: t.shopSales ?? t.sales ?? 0,
            total: t.total ?? 0,
            timeSeriesByMonth: data.timeSeriesByMonth ?? [],
            timeSeriesByDay: data.timeSeriesByDay ?? [],
          });
        }
      })
      .catch(() => {});
    fetch("/api/analytics/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.totalPosts != null) setAnalyticsData(data); })
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

  const postActivityData = useMemo(() => buildDayMap(analyticsData?.postsByDay ?? {}, period), [analyticsData, period]);
  const likeActivityData = useMemo(() => buildDayMap(analyticsData?.likesByDay ?? {}, period), [analyticsData, period]);
  const periodLabels = useMemo(() => buildPeriodLabels(period), [period]);

  // Build stacked time-series chart data for the current period
  const streamChartData = useMemo<StreamPoint[]>(() => {
    if (period === "30d") {
      const byDay = earningTotals?.timeSeriesByDay ?? [];
      return byDay.map(b => ({
        label: new Date(b.day + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        shopSales: b.shopSales,
        tips: b.tips,
        subscriptions: b.subscriptions,
        auctions: b.auctions ?? 0,
      }));
    }
    const byMonth = earningTotals?.timeSeriesByMonth ?? [];
    const monthCount = period === "90d" ? 3 : 12;
    const slice = byMonth.slice(-monthCount);
    return slice.map(b => ({
      label: new Date(b.month + "-01T00:00:00").toLocaleDateString("en-US", { month: "short" }),
      shopSales: b.shopSales,
      tips: b.tips,
      subscriptions: b.subscriptions,
      auctions: b.auctions ?? 0,
    }));
  }, [earningTotals, period]);

  const streamChartTotal = streamChartData.reduce((s, d) => s + d.shopSales + d.tips + d.subscriptions + d.auctions, 0);

  const totalPostActivity = postActivityData.reduce((s, v) => s + v, 0);
  const halfLen = Math.floor(postActivityData.length / 2);
  const firstHalf = postActivityData.slice(0, halfLen).reduce((s, v) => s + v, 0);
  const secondHalf = postActivityData.slice(halfLen).reduce((s, v) => s + v, 0);
  const postChange = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

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

        {/* Live audience banner */}
        <div className={`mb-5 rounded-2xl border p-4 flex items-center gap-4 transition-colors ${liveViewers > 0 ? "border-emerald-500/30 bg-emerald-500/8" : "border-white/8 bg-stone-900/60"}`}>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${liveViewers > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-stone-800 text-stone-600"}`}>
            <Radio size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-100">
                {liveViewers > 0
                  ? `${liveViewers} follower${liveViewers !== 1 ? "s" : ""} watching right now`
                  : "No followers watching right now"}
              </span>
              {liveViewers > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Followers with your Following tab open — updates in real time
            </p>
          </div>
        </div>

        {/* KPI grid */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Followers" value={(analyticsData?.followerCount ?? apiFollowers ?? 0).toLocaleString()} icon={Users} color="bg-sky-500/10 text-sky-400" />
          <KpiCard label="Total views" value={(analyticsData?.totalViews ?? 0).toLocaleString()} sub="Across all posts" icon={Eye} color="bg-amber-500/10 text-amber-400" />
          <KpiCard label="Total likes" value={(analyticsData?.totalLikes ?? (apiPosts.length > 0 ? apiPosts.reduce((s, p) => s + p.likeCount, 0) : null))?.toLocaleString() ?? "—"} sub="Across all posts" icon={Star} color="bg-purple-500/10 text-purple-400" />
          <KpiCard label="Posts" value={String(analyticsData?.totalPosts ?? apiPosts.length)} sub="Published" icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" />
        </div>

        {/* Earnings breakdown */}
        <div className="mb-5 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-200">Earnings Breakdown</h2>
              <p className="text-xs text-stone-500 mt-0.5">Total earned across all revenue streams</p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign size={13} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-stone-800/60 p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">
                {earningTotals ? `$${earningTotals.shopSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <ShoppingBag size={9} className="text-stone-500" />
                <p className="text-[10px] text-stone-500">Shop Sales</p>
              </div>
            </div>
            <div className="rounded-xl bg-stone-800/60 p-3 text-center">
              <p className="text-xl font-bold text-amber-400">
                {earningTotals ? `$${earningTotals.tips.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <DollarSign size={9} className="text-stone-500" />
                <p className="text-[10px] text-stone-500">Tips</p>
              </div>
            </div>
            <div className="rounded-xl bg-stone-800/60 p-3 text-center">
              <p className="text-xl font-bold text-sky-400">
                {earningTotals ? `$${earningTotals.subscriptions.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <Users size={9} className="text-stone-500" />
                <p className="text-[10px] text-stone-500">Subscriptions</p>
              </div>
            </div>
          </div>
          {earningTotals && (
            <div className="mt-3 border-t border-white/5 pt-3 flex items-center justify-between">
              <span className="text-xs text-stone-500">Total earned</span>
              <span className="text-sm font-bold text-amber-100">
                ${earningTotals.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Post activity chart (real data) */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-200">Posting Activity</h2>
              <p className="text-xs text-stone-500">{totalPostActivity} post{totalPostActivity !== 1 ? "s" : ""} this period</p>
            </div>
            {postChange !== 0 && (
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${postChange >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {postChange >= 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />} {Math.abs(postChange)}%
              </span>
            )}
          </div>
          <MiniLineChart data={postActivityData.length > 0 ? postActivityData : [0, 0]} color="#60a5fa" height={80} />
          <div className="mt-1.5 flex justify-between">
            {periodLabels.filter((l) => l).slice(0, 6).map((m, i) => (
              <span key={i} className="text-[9px] text-stone-700">{m}</span>
            ))}
          </div>
        </div>

        {/* Revenue by stream chart (real data) */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-200">Revenue by Stream</h2>
              <p className="text-xs text-stone-500">
                {earningTotals
                  ? `$${streamChartTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this period`
                  : "Sales · Tips · Subscriptions over time"}
              </p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp size={13} />
            </div>
          </div>
          {earningTotals ? (
            <StackedBarChart data={streamChartData} />
          ) : (
            <div className="h-28 flex items-center justify-center">
              <span className="text-xs text-stone-600">Loading earnings data…</span>
            </div>
          )}
        </div>

        {/* Likes & Engagement chart (real data) */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-stone-200">Likes &amp; Engagement</h2>
            <p className="text-xs text-stone-500">{likeActivityData.reduce((s, v) => s + v, 0).toLocaleString()} likes this period</p>
          </div>
          <MiniLineChart data={likeActivityData.length > 0 ? likeActivityData : [0, 0]} color="#f59e0b" height={72} />
        </div>

        {/* Views chart (real data from view tracking) */}
        {(() => {
          const viewActivityData = buildDayMap(analyticsData?.viewsByDay ?? {}, period);
          const totalViewActivity = viewActivityData.reduce((s, v) => s + v, 0);
          return (
            <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-stone-200">Post Views</h2>
                <p className="text-xs text-stone-500">{totalViewActivity.toLocaleString()} views this period · tracked in real time</p>
              </div>
              <MiniLineChart data={viewActivityData.length > 0 ? viewActivityData : [0, 0]} color="#a78bfa" height={72} />
            </div>
          );
        })()}

        {/* Commission stats */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-200">Commission Activity</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Inquiries", value: receivedInquiries.length, color: "text-amber-400" },
              { label: "Accepted", value: receivedInquiries.filter(i => i.status === "accepted" || i.status === "quoted").length, color: "text-emerald-400" },
              { label: "Completed", value: commissions.length, color: "text-sky-400" },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-stone-800/60 p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-stone-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Best time to post — derived from your own posts' engagement */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-stone-200">Best Time to Post</h2>
            <p className="text-xs text-stone-500 mt-0.5">When your posts have earned the most engagement (your timezone)</p>
          </div>
          {postingHeatmap.samples < 3 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-stone-400">Not enough posts yet to find your best times.</p>
              <p className="text-xs text-stone-600 mt-1.5">Keep posting — once you have a few posts, we'll show which days and hours your work performs best.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-[340px]">
                  {/* Hour labels */}
                  <div className="flex items-center mb-1.5">
                    <div className="w-8 shrink-0" />
                    {["12a","3a","6a","9a","12p","3p","6p","9p"].map((h) => (
                      <div key={h} className="flex-1 text-center text-[8px] text-stone-700">{h}</div>
                    ))}
                  </div>
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, di) => (
                    <div key={day} className="flex items-center mb-1">
                      <div className="w-8 shrink-0 text-[9px] text-stone-600 pr-1 text-right">{day}</div>
                      {postingHeatmap.intensities[di].map((intensity, ci) => {
                        const isPeak = intensity > 0.8;
                        const bg = intensity < 0.15 ? "bg-stone-800" : intensity < 0.4 ? "bg-amber-900/60" : intensity < 0.7 ? "bg-amber-600/70" : "bg-amber-400";
                        return (
                          <div key={ci} className="flex-1 mx-0.5">
                            <div
                              className={`h-5 rounded-sm ${bg} relative`}
                              title={`${day} ${["12–3a","3–6a","6–9a","9a–12p","12–3p","3–6p","6–9p","9p–12a"][ci]} — ${Math.round(intensity * 100)}% of your peak`}
                            >
                              {isPeak && <div className="absolute inset-0 rounded-sm ring-1 ring-amber-300/50" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
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
                <p className="text-xs text-amber-200/80">
                  Your strongest engagement so far has come from posting{" "}
                  <strong>{["Sundays","Mondays","Tuesdays","Wednesdays","Thursdays","Fridays","Saturdays"][postingHeatmap.peak.day]}{" "}
                  {["12–3am","3–6am","6–9am","9am–12pm","12–3pm","3–6pm","6–9pm","9pm–12am"][postingHeatmap.peak.col]}</strong>.
                  Based on {postingHeatmap.samples} of your recent posts.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Top posts */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-200">Top Performing Posts</h2>
          {(analyticsData?.topPosts ?? apiPosts).length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-6">No posts yet — share your craft to see analytics here.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(analyticsData?.topPosts ?? [...apiPosts].sort((a, b) => b.likeCount - a.likeCount).slice(0, 6))
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
