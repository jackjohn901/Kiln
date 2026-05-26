import { useState, useEffect } from "react";
import { Flame, Check, X, ChevronDown, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

interface Application {
  id: string;
  userId: string;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  followerCount: number | null;
  medium: string;
  statement: string;
  instagram: string | null;
  website: string | null;
  yearsActive: number | null;
  status: string;
  reviewNote: string | null;
  submittedAt: string;
}

export default function AdminFoundingArtists() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);
  const [spotsCount, setSpotsCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/founding-artists/count")
      .then((r) => r.json())
      .then((d) => setSpotsCount(d.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    fetch(`/api/admin/founding-artists?status=${tab}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setApps(d.applications ?? []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, [tab, isAuthenticated]);

  async function action(userId: string, action: "approve" | "reject") {
    setActioning(userId);
    try {
      const res = await fetch(`/api/admin/founding-artists/${userId}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reviewNote: reviewNote[userId] ?? "" }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Failed");
        return;
      }
      setApps((prev) => prev.filter((a) => a.userId !== userId));
      if (action === "approve") setSpotsCount((c) => (c ?? 0) + 1);
    } finally {
      setActioning(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <p className="text-stone-400">Not authenticated.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e] pb-16">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Flame size={20} className="text-amber-400" />
          <h1 className="font-serif text-2xl text-amber-100">Founding Artist Applications</h1>
          {spotsCount !== null && (
            <span className="ml-auto text-sm text-stone-500">{spotsCount} / 100 approved</span>
          )}
        </div>

        <div className="flex gap-1 rounded-xl bg-stone-900/60 border border-white/8 p-1 mb-6">
          {(["pending", "approved", "rejected"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-stone-600" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-16 text-stone-500">No {tab} applications</div>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => (
              <div key={app.id} className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3 transition-colors"
                  onClick={() => setExpanded(expanded === app.userId ? null : app.userId)}
                >
                  <img
                    src={app.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=40&h=40&fit=crop&seed=${app.userId}`}
                    alt={app.displayName ?? app.handle ?? ""}
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-200 truncate">{app.displayName ?? app.handle ?? app.userId}</p>
                    <p className="text-xs text-stone-500">{app.medium} · {app.yearsActive ? `${app.yearsActive}y active` : ""} · {new Date(app.submittedAt).toLocaleDateString()}</p>
                  </div>
                  {app.followerCount ? (
                    <span className="text-xs text-stone-500 shrink-0">{app.followerCount.toLocaleString()} followers</span>
                  ) : null}
                  <ChevronDown size={14} className={`text-stone-500 transition-transform ${expanded === app.userId ? "rotate-180" : ""}`} />
                </button>

                {expanded === app.userId && (
                  <div className="border-t border-white/8 p-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-stone-500 mb-1">Statement</p>
                      <p className="text-sm text-stone-300 leading-relaxed">{app.statement}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {app.instagram && (
                        <div>
                          <p className="text-xs text-stone-500 mb-0.5">Instagram</p>
                          <a href={app.instagram.startsWith("http") ? app.instagram : `https://instagram.com/${app.instagram.replace("@", "").replace(/^\//, "").split("/").pop() ?? ""}`} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">{app.instagram.replace("@", "").replace(/^https?:\/\/.*instagram\.com\//, "").split("/").pop() ?? ""}</a>
                        </div>
                      )}
                      {app.website && (
                        <div>
                          <p className="text-xs text-stone-500 mb-0.5">Website</p>
                          <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline truncate block">{app.website}</a>
                        </div>
                      )}
                    </div>

                    {tab === "pending" && (
                      <div className="space-y-3 pt-2">
                        <textarea
                          value={reviewNote[app.userId] ?? ""}
                          onChange={(e) => setReviewNote((prev) => ({ ...prev, [app.userId]: e.target.value }))}
                          placeholder="Optional note to the artist (shown on rejection)…"
                          rows={2}
                          className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => action(app.userId, "approve")}
                            disabled={actioning === app.userId}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
                          >
                            {actioning === app.userId ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Approve
                          </button>
                          <button
                            onClick={() => action(app.userId, "reject")}
                            disabled={actioning === app.userId}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {app.reviewNote && (
                      <div className="rounded-lg bg-stone-800/60 px-3 py-2">
                        <p className="text-xs text-stone-500 mb-0.5">Review note</p>
                        <p className="text-sm text-stone-400">{app.reviewNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
