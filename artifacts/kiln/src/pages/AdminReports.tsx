import { useState, useEffect } from "react";
import { Flag, CheckCircle, XCircle, Eye, AlertTriangle, BadgeCheck, X, Wrench, RefreshCw } from "lucide-react";
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

interface VerificationApp {
  id: string;
  userId: string;
  website: string | null;
  instagram: string | null;
  yearsActive: number | null;
  exhibitions: string | null;
  galleries: string | null;
  statement: string | null;
  status: string;
  submittedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Flag }> = {
  pending:    { label: "Pending",    color: "text-amber-400",  icon: AlertTriangle },
  reviewed:   { label: "Reviewed",   color: "text-sky-400",    icon: Eye },
  actioned:   { label: "Actioned",   color: "text-rose-400",   icon: CheckCircle },
  dismissed:  { label: "Dismissed",  color: "text-stone-500",  icon: XCircle },
};

interface BackfillResult {
  dryRun: boolean;
  backfilled: number;
  orderIds: string[];
}

export default function AdminReports() {
  useMeta({ title: "Moderation Queue" });
  const { user } = useAuth();
  const [section, setSection] = useState<"reports" | "verifications" | "maintenance">("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [updating, setUpdating] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<VerificationApp[]>([]);
  const [vFilter, setVFilter] = useState("pending");
  const [vLoading, setVLoading] = useState(false);
  const [vUpdating, setVUpdating] = useState<string | null>(null);

  // Backfill state
  const [backfillPreview, setBackfillPreview] = useState<BackfillResult | null>(null);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  async function runBackfill(dryRun: boolean) {
    setBackfillLoading(true);
    setBackfillError(null);
    try {
      const res = await fetch(`/api/admin/backfill-order-notes${dryRun ? "?dry_run=true" : ""}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setBackfillError(data?.error ?? "Request failed");
        return;
      }
      const data = await res.json() as BackfillResult;
      if (dryRun) {
        setBackfillPreview(data);
        setBackfillResult(null);
      } else {
        setBackfillResult(data);
        setBackfillPreview(null);
      }
    } catch {
      setBackfillError("Network error — please try again");
    } finally {
      setBackfillLoading(false);
    }
  }

  function resetBackfill() {
    setBackfillPreview(null);
    setBackfillResult(null);
    setBackfillError(null);
  }

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

  useEffect(() => {
    if (section !== "verifications") return;
    setVLoading(true);
    fetch(`/api/admin/verifications?status=${vFilter}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { applications?: VerificationApp[] } | null) => setVerifications(data?.applications ?? []))
      .catch(() => setVerifications([]))
      .finally(() => setVLoading(false));
  }, [section, vFilter]);

  async function updateVerification(id: string, action: "approve" | "reject") {
    setVUpdating(id);
    try {
      const res = await fetch(`/api/admin/verifications/${id}/${action}`, {
        method: "PATCH", credentials: "include",
      });
      if (res.ok) setVerifications(prev => prev.filter(v => v.id !== id));
    } catch {}
    setVUpdating(null);
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
            <h1 className="font-serif text-2xl text-amber-100">Admin Panel</h1>
          </div>
          <p className="text-sm text-stone-500">Moderation and verification management.</p>
        </div>

        {/* Section switcher */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setSection("reports")} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${section === "reports" ? "bg-amber-500 text-stone-950" : "border border-white/10 bg-stone-900 text-stone-400 hover:text-stone-200"}`}>
            <Flag size={13} /> Reports
          </button>
          <button onClick={() => setSection("verifications")} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${section === "verifications" ? "bg-amber-500 text-stone-950" : "border border-white/10 bg-stone-900 text-stone-400 hover:text-stone-200"}`}>
            <BadgeCheck size={13} /> Verify Artists
          </button>
          <button onClick={() => { setSection("maintenance"); resetBackfill(); }} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${section === "maintenance" ? "bg-amber-500 text-stone-950" : "border border-white/10 bg-stone-900 text-stone-400 hover:text-stone-200"}`}>
            <Wrench size={13} /> Maintenance
          </button>
        </div>

        {/* Reports section */}
        {section === "reports" && (<>
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

        {loading && (
          <div className="flex flex-col gap-3">
            {[1,2,3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-stone-900 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle size={36} className="text-stone-600 mb-3" />
            <p className="text-stone-400 font-medium">All clear</p>
            <p className="text-stone-600 text-sm mt-1">No {filter} reports right now.</p>
          </div>
        )}

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
        </>)}

        {/* Verifications section */}
        {section === "verifications" && (<>
          <div className="flex gap-2 mb-6">
            {["pending", "approved", "rejected"].map((f) => (
              <button key={f} onClick={() => setVFilter(f)}
                className={`shrink-0 capitalize rounded-full px-3 py-1.5 text-xs font-medium transition-all ${vFilter === f ? "bg-amber-500 text-stone-950" : "border border-white/10 bg-stone-900 text-stone-400 hover:text-stone-200"}`}>
                {f}
              </button>
            ))}
          </div>

          {vLoading && (
            <div className="flex flex-col gap-3">
              {[1,2,3].map((i) => <div key={i} className="h-32 rounded-2xl bg-stone-900 animate-pulse" />)}
            </div>
          )}

          {!vLoading && verifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BadgeCheck size={36} className="text-stone-600 mb-3" />
              <p className="text-stone-400 font-medium">No {vFilter} applications</p>
            </div>
          )}

          <div className="space-y-3">
            {verifications.map((v) => (
              <div key={v.id} className="rounded-2xl border border-white/8 bg-stone-900 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-stone-600">{v.userId.slice(0, 16)}…</p>
                    {v.statement && (
                      <p className="text-sm text-stone-300 mt-1 line-clamp-2">"{v.statement}"</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                      {v.yearsActive != null && <span className="text-[11px] text-stone-500">{v.yearsActive}y active</span>}
                      {v.website && <a href={v.website} target="_blank" rel="noopener" className="text-[11px] text-amber-500 hover:underline truncate max-w-[140px]">{v.website}</a>}
                      {v.instagram && <span className="text-[11px] text-stone-500">@{v.instagram}</span>}
                    </div>
                    {v.exhibitions && <p className="text-[11px] text-stone-600 mt-0.5">Exhibitions: {v.exhibitions.slice(0, 80)}</p>}
                  </div>
                  <p className="text-[10px] text-stone-600 shrink-0">
                    {new Date(v.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>

                {v.status === "pending" && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <button
                      onClick={() => updateVerification(v.id, "approve")}
                      disabled={vUpdating === v.id}
                      className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                    >
                      <BadgeCheck size={11} /> Approve
                    </button>
                    <button
                      onClick={() => updateVerification(v.id, "reject")}
                      disabled={vUpdating === v.id}
                      className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                    >
                      <X size={11} /> Reject
                    </button>
                  </div>
                )}
                {v.status !== "pending" && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <span className={`text-xs font-medium ${v.status === "approved" ? "text-emerald-400" : "text-rose-400"}`}>
                      {v.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>)}

        {/* Maintenance section */}
        {section === "maintenance" && (
          <div className="space-y-4">
            {/* Backfill order grouping card */}
            <div className="rounded-2xl border border-white/8 bg-stone-900 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <RefreshCw size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-100">Backfill order grouping</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Stamps orphaned manual-payout order rows with the Stripe session key from the first item in the same checkout. Run a dry-run preview first to see how many orders would be affected, then confirm to apply.
                  </p>
                </div>
              </div>

              {/* Error */}
              {backfillError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                  {backfillError}
                </div>
              )}

              {/* Dry-run result */}
              {backfillPreview && !backfillResult && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-3">
                  <p className="text-xs text-amber-200">
                    <span className="font-semibold">{backfillPreview.backfilled}</span>{" "}
                    {backfillPreview.backfilled === 1 ? "order" : "orders"} would be updated.
                  </p>
                  {backfillPreview.backfilled > 0 && (
                    <p className="text-[10px] font-mono text-stone-500 break-all">
                      {backfillPreview.orderIds.slice(0, 8).join(", ")}
                      {backfillPreview.orderIds.length > 8 ? ` …+${backfillPreview.orderIds.length - 8} more` : ""}
                    </p>
                  )}
                  {backfillPreview.backfilled === 0 ? (
                    <p className="text-xs text-stone-500">Nothing to backfill — all orders are already grouped.</p>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => runBackfill(false)}
                        disabled={backfillLoading}
                        className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                      >
                        <CheckCircle size={11} /> Confirm backfill
                      </button>
                      <button
                        onClick={resetBackfill}
                        disabled={backfillLoading}
                        className="text-xs text-stone-600 hover:text-stone-400 transition-colors disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Real-run result */}
              {backfillResult && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 space-y-2">
                  <p className="text-xs text-emerald-300 font-medium">
                    Done — {backfillResult.backfilled} {backfillResult.backfilled === 1 ? "order" : "orders"} updated.
                  </p>
                  {backfillResult.backfilled > 0 && (
                    <p className="text-[10px] font-mono text-stone-500 break-all">
                      {backfillResult.orderIds.slice(0, 8).join(", ")}
                      {backfillResult.orderIds.length > 8 ? ` …+${backfillResult.orderIds.length - 8} more` : ""}
                    </p>
                  )}
                  <button
                    onClick={resetBackfill}
                    className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              )}

              {/* Primary action — only show when no preview/result yet */}
              {!backfillPreview && !backfillResult && (
                <button
                  onClick={() => runBackfill(true)}
                  disabled={backfillLoading}
                  className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                >
                  {backfillLoading ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  {backfillLoading ? "Checking…" : "Preview affected orders"}
                </button>
              )}

              {/* Loading indicator when confirming */}
              {backfillLoading && backfillPreview && (
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <RefreshCw size={12} className="animate-spin" /> Applying backfill…
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
