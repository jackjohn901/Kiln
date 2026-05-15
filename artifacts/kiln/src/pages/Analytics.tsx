import { useMemo } from "react";
import { TrendingUp, Eye, Heart, MessageCircle, Users, Hammer, DollarSign, BarChart2 } from "lucide-react";
import { useLocation } from "wouter";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import Nav from "@/components/Nav";

function seededRand(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

function generateViewData(seed: number) {
  return Array.from({ length: 30 }, (_, i) => {
    const base = seededRand(seed + i, 80, 800);
    const trend = Math.floor(i * 8);
    return base + trend;
  });
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof Eye; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-stone-900 rounded-2xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xs text-stone-500">{label}</p>
        <p className="text-lg font-bold text-stone-100">{value}</p>
        {sub && <p className="text-xs text-emerald-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-500 w-6 text-right">{label}</span>
      <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-stone-400 w-10 text-right">{value.toLocaleString()}</span>
    </div>
  );
}

export default function Analytics() {
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { commissions, tips, following } = useSocial();

  const seed = useMemo(() => {
    if (!profile) return 42;
    return profile.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  }, [profile]);

  const viewData = useMemo(() => generateViewData(seed), [seed]);
  const maxView = Math.max(...viewData);
  const totalViews = viewData.reduce((a, b) => a + b, 0);
  const totalLikes = Math.floor(totalViews * seededRand(seed + 100, 4, 12) / 100);
  const totalComments = Math.floor(totalViews * seededRand(seed + 200, 1, 4) / 100);
  const followerCount = seededRand(seed + 300, 400, 8000);
  const commissionCount = commissions.length;
  const tipTotal = tips.reduce((a, t) => a + t.amount, 0);

  const topReels = useMemo(() => {
    const names = [
      "Pulling from the gather",
      "Annealing — the slow cool",
      "First gather of the day",
      "Colour application",
      "Final cold work",
      "Marvering the parison",
    ];
    return names.slice(0, 5).map((name, i) => ({
      name,
      views: seededRand(seed + i * 17, 800, 12000),
    })).sort((a, b) => b.views - a.views);
  }, [seed]);

  const geoData = useMemo(() => [
    { label: "United States", pct: seededRand(seed + 50, 38, 52) },
    { label: "United Kingdom", pct: seededRand(seed + 51, 8, 18) },
    { label: "Canada", pct: seededRand(seed + 52, 5, 12) },
    { label: "Australia", pct: seededRand(seed + 53, 4, 9) },
    { label: "Germany", pct: seededRand(seed + 54, 3, 7) },
  ], [seed]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <BarChart2 size={40} className="text-stone-700 mx-auto mb-3" />
          <p className="text-stone-300 font-medium mb-1">Analytics for artists</p>
          <p className="text-stone-500 text-sm mb-4">Create a profile to see your studio metrics</p>
          <button onClick={() => navigate("/setup")} className="px-5 py-2.5 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors">
            Create profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="pt-16 max-w-3xl mx-auto px-4 pb-12">
        <div className="py-8">
          <h1 className="text-2xl font-bold text-stone-100 mb-1">Studio Analytics</h1>
          <p className="text-sm text-stone-400">Last 30 days · {profile.name}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <StatCard icon={Eye} label="Total views" value={totalViews.toLocaleString()} sub={`↑ ${seededRand(seed + 10, 8, 34)}% vs last month`} color="bg-blue-500/20 text-blue-400" />
          <StatCard icon={Heart} label="Total likes" value={totalLikes.toLocaleString()} sub={`↑ ${seededRand(seed + 11, 5, 28)}% vs last month`} color="bg-rose-500/20 text-rose-400" />
          <StatCard icon={Users} label="Followers" value={followerCount.toLocaleString()} sub={`+${seededRand(seed + 12, 18, 220)} this month`} color="bg-purple-500/20 text-purple-400" />
          <StatCard icon={MessageCircle} label="Comments" value={totalComments.toLocaleString()} color="bg-amber-500/20 text-amber-400" />
          <StatCard icon={Hammer} label="Commission inquiries" value={commissionCount.toString()} sub={commissionCount > 0 ? "via Kiln" : "Send a reel to get started"} color="bg-emerald-500/20 text-emerald-400" />
          <StatCard icon={DollarSign} label="Tips received" value={tipTotal > 0 ? `$${tipTotal}` : "$0"} color="bg-sky-500/20 text-sky-400" />
        </div>

        <div className="bg-stone-900 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-amber-400" />
            <span className="text-sm font-semibold text-stone-100">Daily views — last 30 days</span>
          </div>
          <div className="flex items-end gap-0.5 h-24">
            {viewData.map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-amber-500/70 rounded-t-sm hover:bg-amber-400 transition-colors cursor-default"
                style={{ height: `${Math.round((v / maxView) * 100)}%` }}
                title={`Day ${i + 1}: ${v.toLocaleString()} views`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-stone-600 mt-1">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-stone-900 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-stone-100 mb-3">Top reels by views</h3>
            <div className="space-y-2.5">
              {topReels.map((r, i) => (
                <MiniBar key={i} value={r.views} max={topReels[0].views} label={String(i + 1)} />
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {topReels.map((r, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-stone-400 truncate flex-1">{r.name}</span>
                  <span className="text-stone-500 ml-2">{r.views.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-stone-900 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-stone-100 mb-3">Audience location</h3>
            <div className="space-y-3">
              {geoData.map((g) => (
                <div key={g.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-300">{g.label}</span>
                    <span className="text-stone-500">{g.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/70 rounded-full" style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
