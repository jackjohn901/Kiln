import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, Users, FileText, Heart, UserCheck,
  ShoppingBag, Hammer, Briefcase, TrendingUp, RefreshCw,
  ArrowUp, ArrowDown, Eye, Sparkles, AlertTriangle, Lightbulb,
  ChevronDown, ChevronUp,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";

interface PlatformTotals {
  users: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  posts: number;
  postsThisWeek: number;
  likes: number;
  follows: number;
  orders: number;
  commissions: number;
  workshopBookings: number;
}

interface TrendingPost {
  id: string;
  caption: string;
  thumbnailUrl?: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  authorId: string;
  createdAt: string;
}

interface TopArtist {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  followerCount: number;
  location?: string | null;
}

interface AiInsight {
  priority: "high" | "medium" | "low";
  category: "growth" | "engagement" | "content" | "commerce" | "retention" | "feature";
  title: string;
  insight: string;
  action: string;
  impact: string;
}

interface PlatformStats {
  asOf: string;
  totals: PlatformTotals;
  trendingPosts: TrendingPost[];
  topArtists: TopArtist[];
  charts: {
    usersByDay: Record<string, number>;
    postsByDay: Record<string, number>;
  };
}

function MiniLineChart({ data, color, height = 64 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 300;
  if (data.length < 2) return <div style={{ height }} className="flex items-center justify-center text-stone-700 text-xs">Not enough data</div>;
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
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#${gradId})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {(() => {
        const last = pts[pts.length - 1].split(",");
        return <circle cx={last[0]} cy={last[1]} r="3" fill={color} />;
      })()}
    </svg>
  );
}

function buildChart(dayMap: Record<string, number>, days: number): { data: number[]; labels: string[] } {
  const now = new Date();
  const data: number[] = [];
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    data.push(dayMap[key] ?? 0);
    labels.push(i % Math.floor(days / 5) === 0 ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
  }
  return { data, labels };
}

function KpiCard({
  label, value, sub, icon: Icon, color, badge, badgeUp,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; badge?: string | number; badgeUp?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}><Icon size={13} /></div>
      </div>
      <p className="text-2xl font-bold text-amber-100">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {badge !== undefined && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${badgeUp ? "text-emerald-400" : "text-stone-500"}`}>
          {badgeUp ? <ArrowUp size={9} /> : null}
          <span>+{badge} this week</span>
        </div>
      )}
      {sub && <p className="text-[11px] text-stone-600">{sub}</p>}
    </div>
  );
}

type ChartPeriod = "30d" | "90d";

export default function PlatformAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<ChartPeriod>("30d");
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<AiInsight[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/platform-stats", { credentials: "include" });
      if (res.status === 403) { setError("Access denied — owner only."); setLoading(false); setRefreshing(false); return; }
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as PlatformStats;
      setStats(data);
      setError(null);
    } catch {
      setError("Could not load stats. Make sure you're logged in.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadInsights = async (currentStats: PlatformStats) => {
    setInsightsLoading(true);
    setInsightsError(null);
    setInsights(null);
    setExpandedInsight(null);
    try {
      const payload = {
        totals: currentStats.totals,
        trendingPostCount: currentStats.trendingPosts.length,
        topTrendingLikes: currentStats.trendingPosts[0]?.likeCount ?? 0,
        topArtistFollowers: currentStats.topArtists[0]?.followerCount ?? 0,
        charts: currentStats.charts,
      };
      const res = await fetch("/api/admin/platform-insights", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { insights: AiInsight[] };
      setInsights(Array.isArray(data.insights) ? data.insights : []);
    } catch {
      setInsightsError("Could not generate insights. Try again.");
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const days = period === "30d" ? 30 : 90;
  const userChart = useMemo(() => buildChart(stats?.charts.usersByDay ?? {}, days), [stats, days]);
  const postChart = useMemo(() => buildChart(stats?.charts.postsByDay ?? {}, days), [stats, days]);

  const totalUserActivity = userChart.data.reduce((s, v) => s + v, 0);
  const totalPostActivity = postChart.data.reduce((s, v) => s + v, 0);

  const asOfStr = stats ? new Date(stats.asOf).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }) : null;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 p-24 text-center">
          <TrendingUp size={40} className="text-stone-700" />
          <p className="text-stone-400">Sign in to access the platform dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100">Platform Analytics</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {asOfStr ? `Updated ${asOfStr}` : "Kiln — Owner Dashboard"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["30d", "90d"] as ChartPeriod[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${period === p ? "bg-amber-500 text-stone-950" : "border border-white/10 text-stone-500 hover:text-stone-300"}`}>
                  {p}
                </button>
              ))}
            </div>
            <button onClick={load} disabled={refreshing}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-40">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 text-stone-600">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading platform data…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* KPI grid — users */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3">Users</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Total Users" value={stats.totals.users} icon={Users} color="bg-sky-500/10 text-sky-400" />
                <KpiCard label="New Today" value={stats.totals.newUsersToday} icon={UserCheck} color="bg-emerald-500/10 text-emerald-400" sub="Signed up today" />
                <KpiCard label="New This Week" value={stats.totals.newUsersThisWeek} icon={UserCheck} color="bg-emerald-500/10 text-emerald-400" />
                <KpiCard label="New This Month" value={stats.totals.newUsersThisMonth} icon={UserCheck} color="bg-amber-500/10 text-amber-400" sub="Last 30 days" />
              </div>
            </div>

            {/* KPI grid — content */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3 mt-5">Content</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Total Posts" value={stats.totals.posts} icon={FileText} color="bg-purple-500/10 text-purple-400" badge={stats.totals.postsThisWeek} badgeUp={stats.totals.postsThisWeek > 0} />
                <KpiCard label="Total Likes" value={stats.totals.likes} icon={Heart} color="bg-red-500/10 text-red-400" />
                <KpiCard label="Total Follows" value={stats.totals.follows} icon={Users} color="bg-sky-500/10 text-sky-400" />
                <KpiCard label="Total Views" value={stats.trendingPosts.reduce((s, p) => s + (p.viewCount ?? 0), 0)} icon={Eye} color="bg-amber-500/10 text-amber-400" sub="Trending this week" />
              </div>
            </div>

            {/* KPI grid — commerce */}
            <div className="mb-6">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3 mt-5">Commerce</p>
              <div className="grid grid-cols-3 gap-3">
                <KpiCard label="Orders" value={stats.totals.orders} icon={ShoppingBag} color="bg-amber-500/10 text-amber-400" />
                <KpiCard label="Workshop Bookings" value={stats.totals.workshopBookings} icon={Hammer} color="bg-orange-500/10 text-orange-400" />
                <KpiCard label="Commissions" value={stats.totals.commissions} icon={Briefcase} color="bg-teal-500/10 text-teal-400" />
              </div>
            </div>

            {/* User growth chart */}
            <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-stone-200">New Users</h2>
                  <p className="text-xs text-stone-500">{totalUserActivity} new user{totalUserActivity !== 1 ? "s" : ""} in the last {days} days</p>
                </div>
                {totalUserActivity > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    <ArrowUp size={9} /> Growing
                  </span>
                )}
              </div>
              <MiniLineChart data={userChart.data} color="#38bdf8" height={80} />
              <div className="mt-1.5 flex justify-between">
                {userChart.labels.filter(Boolean).map((l, i) => (
                  <span key={i} className="text-[9px] text-stone-700">{l}</span>
                ))}
              </div>
            </div>

            {/* Post activity chart */}
            <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-stone-200">New Posts</h2>
                  <p className="text-xs text-stone-500">{totalPostActivity} post{totalPostActivity !== 1 ? "s" : ""} published in the last {days} days</p>
                </div>
              </div>
              <MiniLineChart data={postChart.data} color="#f59e0b" height={80} />
              <div className="mt-1.5 flex justify-between">
                {postChart.labels.filter(Boolean).map((l, i) => (
                  <span key={i} className="text-[9px] text-stone-700">{l}</span>
                ))}
              </div>
            </div>

            {/* Trending posts this week */}
            <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-stone-200">Trending This Week</h2>
                <p className="text-xs text-stone-500 mt-0.5">Most liked posts in the last 7 days</p>
              </div>
              {stats.trendingPosts.length === 0 ? (
                <p className="text-stone-600 text-sm text-center py-4">No posts this week yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.trendingPosts.map((post, i) => (
                    <Link key={post.id} href={`/posts/${post.id}`}
                      className="flex items-center gap-3 rounded-xl bg-stone-800/50 hover:bg-stone-800 transition-colors p-3">
                      <span className="text-[11px] font-bold text-stone-600 w-4 shrink-0">#{i + 1}</span>
                      {post.thumbnailUrl ? (
                        <img src={post.thumbnailUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 bg-stone-700" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-stone-700 shrink-0 flex items-center justify-center text-stone-600">
                          <FileText size={16} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-stone-300 truncate">{post.caption || "No caption"}</p>
                        <p className="text-[10px] text-stone-600 mt-0.5">by {post.authorId.replace("seed-", "")}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-[11px] text-red-400">
                          <Heart size={11} /> {(post.likeCount ?? 0).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-stone-500">
                          <Eye size={11} /> {(post.viewCount ?? 0).toLocaleString()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top artists */}
            <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-5">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-stone-200">Top Artists</h2>
                <p className="text-xs text-stone-500 mt-0.5">By follower count</p>
              </div>
              {stats.topArtists.length === 0 ? (
                <p className="text-stone-600 text-sm text-center py-4">No artists yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.topArtists.map((artist, i) => (
                    <Link key={artist.userId} href={`/artists/${artist.userId}`}
                      className="flex items-center gap-3 rounded-xl bg-stone-800/50 hover:bg-stone-800 transition-colors p-3">
                      <span className="text-[11px] font-bold text-stone-600 w-4 shrink-0">#{i + 1}</span>
                      {artist.avatarUrl ? (
                        <img src={artist.avatarUrl} alt={artist.displayName ?? ""} className="h-9 w-9 rounded-full object-cover shrink-0 bg-stone-700" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-stone-700 shrink-0 flex items-center justify-center text-stone-400 text-xs font-bold">
                          {artist.displayName?.[0] ?? "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-200 truncate">{artist.displayName ?? artist.userId}</p>
                        <p className="text-[10px] text-stone-600 mt-0.5">{artist.location ?? ""}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-sky-400 shrink-0">
                        <Users size={11} /> {(artist.followerCount ?? 0).toLocaleString()}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* AI Insights panel */}
            <div className="mb-4 rounded-2xl border border-amber-500/20 bg-stone-900/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
                    <Sparkles size={14} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-200">AI Growth Advisor</h2>
                    <p className="text-xs text-stone-500 mt-0.5">Analyzes your data and suggests what to do next</p>
                  </div>
                </div>
                {!insightsLoading && (
                  <button
                    onClick={() => stats && loadInsights(stats)}
                    disabled={insightsLoading}
                    className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    <Sparkles size={11} />
                    {insights ? "Refresh" : "Analyze"}
                  </button>
                )}
              </div>

              {insightsLoading && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="h-8 w-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                  <p className="text-xs text-stone-500">Analyzing your platform data…</p>
                </div>
              )}

              {insightsError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                  <AlertTriangle size={14} /> {insightsError}
                  <button onClick={() => stats && loadInsights(stats)} className="ml-auto underline">Retry</button>
                </div>
              )}

              {!insights && !insightsLoading && !insightsError && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Lightbulb size={28} className="text-stone-700" />
                  <p className="text-xs text-stone-500 max-w-xs">
                    Tap <strong className="text-stone-400">Analyze</strong> to get 6 AI-generated recommendations based on your live platform data — covering growth, engagement, content, and commerce.
                  </p>
                </div>
              )}

              {insights && insights.length > 0 && (
                <div className="space-y-2">
                  {insights.map((item, i) => {
                    const priorityColor = item.priority === "high"
                      ? "text-red-400 bg-red-500/10 border-red-500/20"
                      : item.priority === "medium"
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-sky-400 bg-sky-500/10 border-sky-500/20";
                    const categoryColor: Record<string, string> = {
                      growth: "text-emerald-400", engagement: "text-purple-400",
                      content: "text-blue-400", commerce: "text-amber-400",
                      retention: "text-orange-400", feature: "text-teal-400",
                    };
                    const isExpanded = expandedInsight === i;
                    return (
                      <div key={i} className="rounded-xl border border-white/8 bg-stone-800/50 overflow-hidden">
                        <button
                          onClick={() => setExpandedInsight(isExpanded ? null : i)}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-stone-800/80 transition-colors"
                        >
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityColor}`}>
                            {item.priority}
                          </span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider shrink-0 ${categoryColor[item.category] ?? "text-stone-400"}`}>
                            {item.category}
                          </span>
                          <span className="flex-1 text-xs font-semibold text-stone-200 truncate">{item.title}</span>
                          {isExpanded ? <ChevronUp size={14} className="text-stone-600 shrink-0" /> : <ChevronDown size={14} className="text-stone-600 shrink-0" />}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                            <div>
                              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">What the data shows</p>
                              <p className="text-xs text-stone-300">{item.insight}</p>
                            </div>
                            <div className="rounded-lg bg-amber-500/8 border border-amber-500/15 p-3">
                              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Action this week</p>
                              <p className="text-xs text-amber-200/90">{item.action}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Expected impact</p>
                              <p className="text-xs text-stone-400">{item.impact}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Admin links */}
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5">
              <h2 className="text-sm font-bold text-stone-200 mb-3">Other Admin Tools</h2>
              <div className="flex flex-wrap gap-2">
                <Link href="/admin/reports" className="rounded-full border border-white/10 px-4 py-2 text-xs text-stone-400 hover:text-stone-200 hover:border-white/20 transition-colors">
                  Moderation Reports
                </Link>
                <Link href="/admin/founding-artists" className="rounded-full border border-white/10 px-4 py-2 text-xs text-stone-400 hover:text-stone-200 hover:border-white/20 transition-colors">
                  Founding Artist Applications
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
