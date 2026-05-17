import { useState, useEffect } from "react";
import { Flag, CheckCircle, XCircle, Eye, AlertTriangle, ChevronDown } from "lucide-react";
import Nav from "@/components/Nav";
import { useMeta } from "@/hooks/useMeta";
import { useAuth } from "@/contexts/AuthContext";

interface Report {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  otherText: string | null;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Flag }> = {
  pending:    { label: "Pending",    color: "text-amber-400",  icon: AlertTriangle },
  reviewed:   { label: "Reviewed",   color: "text-sky-400",    icon: Eye },
  actioned:   { label: "Actioned",   color: "text-rose-400",   icon: CheckCircle },
  dismissed:  { label: "Dismissed",  color: "text-stone-500",  icon: XCircle },
};

export default function AdminReports() {
  useMeta({ title: "Moderation Queue" });
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reports?status=${filter}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { reports?: Report[] } | null) => {
        setReports(data?.reports ?? []);
      })
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [filter]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id || status === filter));
        if (status !== filter) setReports((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      // silent
    } finally {
      setUpdating(null);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <p className="text-stone-500">Please sign in to access this page.</p>
      </div>
    );
  }

  const filters = ["pending", "reviewed", "actioned", "dismissed"];

  return (
    <div className="min-h-screen bg-[#12100e] pb-20">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Flag size={18} className="text-amber-400" />
            <h1 className="font-serif text-2xl text-amber-100">Moderation Queue</h1>
          </div>
          <p className="text-sm text-stone-500">Review and action user-submitted content reports.</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {filters.map((f) => {
            const cfg = STATUS_CONFIG[f];
            const Icon = cfg.icon;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-amber-500 text-stone-950"
                    : "border border-white/10 bg-stone-900 text-stone-400 hover:text-stone-200"
                }`}
              >
                <Icon size={11} />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1,2,3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-stone-900 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle size={36} className="text-stone-600 mb-3" />
            <p className="text-stone-400 font-medium">All clear</p>
            <p className="text-stone-600 text-sm mt-1">No {filter} reports right now.</p>
          </div>
        )}

        {/* Report cards */}
        <div className="space-y-3">
          {reports.map((r) => {
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["pending"];
            const Icon = cfg.icon;
            return (
              <div key={r.id} className="rounded-2xl border border-white/8 bg-stone-900 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-stone-600">{r.targetType}:{r.targetId.slice(0, 8)}</span>
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${cfg.color}`}>
                        <Icon size={10} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-stone-200 mt-0.5">{r.reason}</p>
                    {r.otherText && (
                      <p className="text-xs text-stone-500 mt-0.5 italic">"{r.otherText}"</p>
                    )}
                  </div>
                  <p className="text-[10px] text-stone-600 shrink-0">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateStatus(r.id, "reviewed")}
                        disabled={updating === r.id}
                        className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400 hover:bg-sky-500/20 transition-colors disabled:opacity-40"
                      >
                        <Eye size={11} /> Mark reviewed
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, "actioned")}
                        disabled={updating === r.id}
                        className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                      >
                        <CheckCircle size={11} /> Action
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, "dismissed")}
                        disabled={updating === r.id}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-stone-800 px-3 py-1 text-xs font-medium text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-40"
                      >
                        <XCircle size={11} /> Dismiss
                      </button>
                    </>
                  )}
                  {r.status === "reviewed" && (
                    <>
                      <button onClick={() => updateStatus(r.id, "actioned")} disabled={updating === r.id}
                        className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-40">
                        <CheckCircle size={11} /> Action
                      </button>
                      <button onClick={() => updateStatus(r.id, "dismissed")} disabled={updating === r.id}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-stone-800 px-3 py-1 text-xs font-medium text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-40">
                        <XCircle size={11} /> Dismiss
                      </button>
                    </>
                  )}
                  {(r.status === "actioned" || r.status === "dismissed") && (
                    <button onClick={() => updateStatus(r.id, "pending")} disabled={updating === r.id}
                      className="text-xs text-stone-600 hover:text-stone-400 transition-colors disabled:opacity-40">
                      Reopen
                    </button>
                  )}
                  <a
                    href={`/${r.targetType === "post" ? "posts" : r.targetType}/${r.targetId}`}
                    target="_blank"
                    rel="noopener"
                    className="ml-auto flex items-center gap-1 text-[10px] text-stone-600 hover:text-amber-400 transition-colors"
                  >
                    <Eye size={10} /> View
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
