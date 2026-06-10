import { useState, useEffect } from "react";
import { Flag, CheckCircle, XCircle, Eye, AlertTriangle, BadgeCheck, X, Wrench, RefreshCw, Database, Bell, Activity, Mail, Send, History, Inbox, Search, Trash2 } from "lucide-react";
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

interface SeedPreview {
  markerPresent: boolean;
  seedUserCount: number;
  seedPostCount: number;
  markerUserId: string;
  codeMarkerId: string;
}

interface SeedResult {
  users: number;
  posts: number;
  listings: number;
  guilds: number;
}

interface NotifPreview {
  type: string;
  text: string;
  link: string;
}

interface HealthResult {
  db: { ok: boolean; latencyMs: number | null; error: string | null };
  api: { uptimeSeconds: number };
  seed: { markerPresent: boolean; markerUserId: string | null; codeMarkerId: string | null };
  checkedAt: string;
}

interface HealthHistoryEntry {
  checkedAt: string;
  latencyMs: number | null;
  passed: boolean;
}

const HEALTH_HISTORY_KEY = "kiln.admin.healthHistory";
const HEALTH_HISTORY_LIMIT = 20;

function loadHealthHistory(): HealthHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HEALTH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is HealthHistoryEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as HealthHistoryEntry).checkedAt === "string" &&
          typeof (e as HealthHistoryEntry).passed === "boolean",
      )
      .slice(0, HEALTH_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

interface FailedEmail {
  id: number;
  to: string;
  from: string | null;
  subject: string;
  contextId: string | null;
  label: string | null;
  attempts: number;
  lastError: string | null;
  status: string;
  nextRetryAt: string;
  deliveredAt: string | null;
  createdAt: string;
}

interface FailedEmailCounts {
  pending: number;
  delivered: number;
  failed: number;
}

interface OrderLookupOrder {
  id: string;
  buyerId: string;
  sellerId: string;
  type: string;
  refId: string | null;
  title: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface OrderLookupResult {
  sessionId: string;
  dedupeKey: string;
  orderCount: number;
  ordersExist: boolean;
  buyerId: string | null;
  orders: OrderLookupOrder[];
  missingListingIds: string[];
  unresolvedListingIds: string[];
  session: {
    paymentStatus: string | null;
    amountTotal: number | null;
    currency: string | null;
    metaUserId: string | null;
    platform: string | null;
    listingIds: string[];
    error: string | null;
  };
}

interface SeedHistoryEntry {
  id: string;
  operation: string;
  actorId: string | null;
  actorName: string | null;
  oldMarkerId: string | null;
  newMarkerId: string;
  userCount: number;
  postCount: number;
  listingCount: number;
  guildCount: number;
  createdAt: string;
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

  // Reseed state
  const [seedPreview, setSeedPreview] = useState<SeedPreview | null>(null);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [newMarkerInput, setNewMarkerInput] = useState("");
  const [advanceResult, setAdvanceResult] = useState<{ newMarkerId: string; users: number; posts: number; listings: number; guilds: number } | null>(null);
  const [markerMismatch, setMarkerMismatch] = useState<{ dbMarker: string; codeMarker: string } | null>(null);

  // Test notification state
  const [notifPreview, setNotifPreview] = useState<NotifPreview | null>(null);
  const [notifSent, setNotifSent] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  // System health state
  const [healthResult, setHealthResult] = useState<HealthResult | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthHistory, setHealthHistory] = useState<HealthHistoryEntry[]>(loadHealthHistory);
  const [healthHistoryOpen, setHealthHistoryOpen] = useState(false);

  // Seed history state
  const [seedHistory, setSeedHistory] = useState<SeedHistoryEntry[]>([]);
  const [seedHistoryLoading, setSeedHistoryLoading] = useState(false);
  const [seedHistoryError, setSeedHistoryError] = useState<string | null>(null);

  // Broadcast email state
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastCount, setBroadcastCount] = useState<number | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<{ recipientCount: number; sent: number; failed: number } | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // Failed email queue state
  const [failedEmails, setFailedEmails] = useState<FailedEmail[]>([]);
  const [failedEmailCounts, setFailedEmailCounts] = useState<FailedEmailCounts>({ pending: 0, delivered: 0, failed: 0 });
  const [failedEmailFilter, setFailedEmailFilter] = useState("pending");
  const [failedEmailLoading, setFailedEmailLoading] = useState(false);
  const [failedEmailError, setFailedEmailError] = useState<string | null>(null);
  const [retryingEmail, setRetryingEmail] = useState<number | null>(null);
  const [retryNotice, setRetryNotice] = useState<{ id: number; delivered: boolean } | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<number | null>(null);

  // Order lookup (support tool) state
  const [orderLookupInput, setOrderLookupInput] = useState("");
  const [orderLookupResult, setOrderLookupResult] = useState<OrderLookupResult | null>(null);
  const [orderLookupLoading, setOrderLookupLoading] = useState(false);
  const [orderLookupError, setOrderLookupError] = useState<string | null>(null);

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

  async function runReseed(dryRun: boolean) {
    setSeedLoading(true);
    setSeedError(null);
    try {
      const res = await fetch(`/api/admin/reseed${dryRun ? "?dry_run=true" : ""}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setSeedError(data?.error ?? "Request failed");
        return;
      }
      if (dryRun) {
        const data = await res.json() as SeedPreview & { dryRun: boolean };
        setSeedPreview(data);
        setSeedResult(null);
      } else {
        const data = await res.json() as SeedResult & { dryRun: boolean };
        setSeedResult(data);
        setSeedPreview(null);
        void checkMarkerSync();
      }
    } catch {
      setSeedError("Network error — please try again");
    } finally {
      setSeedLoading(false);
    }
  }

  async function runReseedWithMarker() {
    const trimmed = newMarkerInput.trim();
    if (!trimmed) return;
    setSeedLoading(true);
    setSeedError(null);
    try {
      const res = await fetch("/api/admin/reseed-with-marker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newMarkerId: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setSeedError(data?.error ?? "Request failed");
        return;
      }
      const data = await res.json() as { newMarkerId: string; users: number; posts: number; listings: number; guilds: number };
      setAdvanceResult(data);
      setSeedPreview(null);
      setSeedResult(null);
      void checkMarkerSync();
    } catch {
      setSeedError("Network error — please try again");
    } finally {
      setSeedLoading(false);
    }
  }

  function resetSeed() {
    setSeedPreview(null);
    setSeedResult(null);
    setSeedError(null);
    setAdvanceResult(null);
    setNewMarkerInput("");
  }

  async function checkMarkerSync() {
    try {
      const res = await fetch("/api/admin/reseed?dry_run=true", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json() as SeedPreview & { dryRun: boolean };
      setMarkerMismatch(
        data.markerUserId !== data.codeMarkerId
          ? { dbMarker: data.markerUserId, codeMarker: data.codeMarkerId }
          : null,
      );
    } catch {
      // Best-effort background check — leave the banner state untouched on failure.
    }
  }

  async function runTestNotification(dryRun: boolean) {
    setNotifLoading(true);
    setNotifError(null);
    try {
      const res = await fetch(`/api/admin/test-notification${dryRun ? "?dry_run=true" : ""}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setNotifError(data?.error ?? "Request failed");
        return;
      }
      if (dryRun) {
        const data = await res.json() as { dryRun: boolean; preview: NotifPreview };
        setNotifPreview(data.preview);
        setNotifSent(false);
      } else {
        setNotifSent(true);
        setNotifPreview(null);
      }
    } catch {
      setNotifError("Network error — please try again");
    } finally {
      setNotifLoading(false);
    }
  }

  function resetNotif() {
    setNotifPreview(null);
    setNotifSent(false);
    setNotifError(null);
  }

  async function runHealthCheck() {
    setHealthLoading(true);
    setHealthError(null);
    setHealthResult(null);
    try {
      const res = await fetch("/api/admin/health", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setHealthError(data?.error ?? "Request failed");
        return;
      }
      const data = await res.json() as HealthResult;
      setHealthResult(data);
      const passed = data.db.ok && data.seed.markerPresent;
      setHealthHistory((prev) => {
        const next = [
          { checkedAt: data.checkedAt, latencyMs: data.db.latencyMs, passed },
          ...prev,
        ].slice(0, HEALTH_HISTORY_LIMIT);
        try {
          localStorage.setItem(HEALTH_HISTORY_KEY, JSON.stringify(next));
        } catch {
          // localStorage unavailable (private mode / quota) — keep in-memory history
        }
        return next;
      });
    } catch {
      setHealthError("Network error — please try again");
    } finally {
      setHealthLoading(false);
    }
  }

  function resetHealth() {
    setHealthResult(null);
    setHealthError(null);
  }

  async function loadSeedHistory() {
    setSeedHistoryLoading(true);
    setSeedHistoryError(null);
    try {
      const res = await fetch("/api/admin/seed-history", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setSeedHistoryError(data?.error ?? "Request failed");
        return;
      }
      const data = await res.json() as { history: SeedHistoryEntry[] };
      setSeedHistory(data.history ?? []);
    } catch {
      setSeedHistoryError("Network error — please try again");
    } finally {
      setSeedHistoryLoading(false);
    }
  }

  async function previewBroadcast() {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      setBroadcastError("Please enter both a subject and a message.");
      return;
    }
    setBroadcastLoading(true);
    setBroadcastError(null);
    setBroadcastResult(null);
    try {
      const res = await fetch("/api/admin/broadcast-email?dry_run=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: broadcastSubject, message: broadcastMessage }),
      });
      const data = await res.json() as { recipientCount?: number; error?: string };
      if (!res.ok) {
        setBroadcastError(data?.error ?? "Request failed");
        return;
      }
      setBroadcastCount(data.recipientCount ?? 0);
    } catch {
      setBroadcastError("Network error — please try again");
    } finally {
      setBroadcastLoading(false);
    }
  }

  async function sendBroadcast() {
    setBroadcastLoading(true);
    setBroadcastError(null);
    try {
      const res = await fetch("/api/admin/broadcast-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: broadcastSubject, message: broadcastMessage }),
      });
      const data = await res.json() as { recipientCount?: number; sent?: number; failed?: number; error?: string };
      if (!res.ok) {
        setBroadcastError(data?.error ?? "Request failed");
        return;
      }
      setBroadcastResult({ recipientCount: data.recipientCount ?? 0, sent: data.sent ?? 0, failed: data.failed ?? 0 });
      setBroadcastCount(null);
    } catch {
      setBroadcastError("Network error — please try again");
    } finally {
      setBroadcastLoading(false);
    }
  }

  function resetBroadcast() {
    setBroadcastSubject("");
    setBroadcastMessage("");
    setBroadcastCount(null);
    setBroadcastResult(null);
    setBroadcastError(null);
  }

  async function loadFailedEmails(status: string) {
    setFailedEmailLoading(true);
    setFailedEmailError(null);
    try {
      const res = await fetch(`/api/admin/failed-emails?status=${status}`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setFailedEmailError(data?.error ?? "Request failed");
        return;
      }
      const data = await res.json() as { emails?: FailedEmail[]; counts?: FailedEmailCounts };
      setFailedEmails(data.emails ?? []);
      setFailedEmailCounts(data.counts ?? { pending: 0, delivered: 0, failed: 0 });
    } catch {
      setFailedEmailError("Network error — please try again");
    } finally {
      setFailedEmailLoading(false);
    }
  }

  async function retryFailedEmail(id: number) {
    setRetryingEmail(id);
    setFailedEmailError(null);
    setRetryNotice(null);
    try {
      const res = await fetch(`/api/admin/failed-emails/${id}/retry`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json() as { delivered?: boolean; email?: FailedEmail | null; error?: string };
      if (!res.ok) {
        setFailedEmailError(data?.error ?? "Retry failed");
        return;
      }
      setRetryNotice({ id, delivered: data.delivered ?? false });
      // Reload so counts and the row's new state/attempt count are accurate.
      void loadFailedEmails(failedEmailFilter);
    } catch {
      setFailedEmailError("Network error — please try again");
    } finally {
      setRetryingEmail(null);
    }
  }

  async function deleteFailedEmail(id: number) {
    if (!window.confirm("Permanently remove this email from the queue? This cannot be undone.")) return;
    setDeletingEmail(id);
    setFailedEmailError(null);
    setRetryNotice(null);
    try {
      const res = await fetch(`/api/admin/failed-emails/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json() as { deleted?: boolean; counts?: FailedEmailCounts; error?: string };
      if (!res.ok) {
        setFailedEmailError(data?.error ?? "Delete failed");
        return;
      }
      // Drop the row locally and apply the authoritative counts from the server.
      setFailedEmails((prev) => prev.filter((em) => em.id !== id));
      if (data.counts) setFailedEmailCounts(data.counts);
    } catch {
      setFailedEmailError("Network error — please try again");
    } finally {
      setDeletingEmail(null);
    }
  }

  async function runOrderLookup() {
    const trimmed = orderLookupInput.trim();
    if (!trimmed) {
      setOrderLookupError("Enter a Stripe session ID first.");
      return;
    }
    setOrderLookupLoading(true);
    setOrderLookupError(null);
    setOrderLookupResult(null);
    try {
      const res = await fetch(`/api/admin/order-lookup?sessionId=${encodeURIComponent(trimmed)}`, {
        credentials: "include",
      });
      const data = await res.json() as OrderLookupResult & { error?: string };
      if (!res.ok) {
        setOrderLookupError(data?.error ?? "Lookup failed");
        return;
      }
      setOrderLookupResult(data);
    } catch {
      setOrderLookupError("Network error — please try again");
    } finally {
      setOrderLookupLoading(false);
    }
  }

  function resetOrderLookup() {
    setOrderLookupInput("");
    setOrderLookupResult(null);
    setOrderLookupError(null);
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
    if (section !== "maintenance") return;
    void checkMarkerSync();
    void loadSeedHistory();
    void loadFailedEmails(failedEmailFilter);
  }, [section]);

  useEffect(() => {
    if (section !== "maintenance") return;
    void loadFailedEmails(failedEmailFilter);
  }, [failedEmailFilter]);

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
          <button onClick={() => { setSection("maintenance"); resetBackfill(); resetSeed(); resetNotif(); resetHealth(); resetOrderLookup(); }} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${section === "maintenance" ? "bg-amber-500 text-stone-950" : "border border-white/10 bg-stone-900 text-stone-400 hover:text-stone-200"}`}>
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
            {markerMismatch && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-100">Seed marker out of sync</p>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    The database marker{" "}
                    <span className="font-mono bg-stone-800 px-1.5 py-0.5 rounded">{markerMismatch.dbMarker}</span>{" "}
                    doesn't match the code constant{" "}
                    <span className="font-mono bg-stone-800 px-1.5 py-0.5 rounded">{markerMismatch.codeMarker}</span>.
                    On the next server restart, the seed will run again with{" "}
                    <span className="font-mono">{markerMismatch.codeMarker}</span> and overwrite the current marker.
                    Update <span className="font-mono">SEED_MARKER_ID</span> in{" "}
                    <span className="font-mono">seed.ts</span> to match, or advance the DB marker to keep them in sync.
                  </p>
                </div>
              </div>
            )}

            {/* Order lookup (support tool) card */}
            <div className="rounded-2xl border border-white/8 bg-stone-900 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Search size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-100">Look up an order by payment session</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Paste a Stripe checkout session ID to trace what happened during checkout — whether order rows were created, who the buyer was, and which listings (if any) never made it into an order. Useful for diagnosing failed or abandoned checkouts without reading server logs.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={orderLookupInput}
                  onChange={(e) => setOrderLookupInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void runOrderLookup(); }}
                  placeholder="cs_test_… or stripe:cs_test_…"
                  className="flex-1 rounded-xl border border-white/10 bg-stone-950 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none font-mono"
                />
                <button
                  onClick={runOrderLookup}
                  disabled={orderLookupLoading}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40 shrink-0"
                >
                  {orderLookupLoading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                  {orderLookupLoading ? "Looking up…" : "Look up"}
                </button>
              </div>

              {orderLookupError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                  {orderLookupError}
                </div>
              )}

              {orderLookupResult && (
                <div className="rounded-xl border border-white/6 bg-stone-800/60 px-4 py-3 space-y-3">
                  {/* Orders exist summary */}
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 ${orderLookupResult.ordersExist ? "text-emerald-400" : "text-amber-400"}`}>
                      {orderLookupResult.ordersExist ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-stone-200">
                        {orderLookupResult.ordersExist
                          ? `${orderLookupResult.orderCount} order ${orderLookupResult.orderCount === 1 ? "row" : "rows"} found for this session`
                          : "No order rows exist for this session"}
                      </p>
                      <p className="text-[11px] text-stone-500 font-mono break-all">{orderLookupResult.dedupeKey}</p>
                    </div>
                  </div>

                  {/* Buyer */}
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-stone-500"><Eye size={13} /></span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-stone-200">Buyer</p>
                      <p className="text-[11px] text-stone-400">
                        {orderLookupResult.buyerId ? (
                          <span className="font-mono bg-stone-700 px-1.5 py-0.5 rounded text-stone-300">{orderLookupResult.buyerId}</span>
                        ) : (
                          <span className="text-stone-500">Unknown — no order rows and no buyer in the Stripe session metadata.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Stripe session info */}
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-stone-500"><Activity size={13} /></span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-stone-200">Stripe session</p>
                      {orderLookupResult.session.error ? (
                        <p className="text-[11px] text-amber-400">{orderLookupResult.session.error}</p>
                      ) : (
                        <p className="text-[11px] text-stone-400">
                          Payment{" "}
                          <span className={orderLookupResult.session.paymentStatus === "paid" ? "text-emerald-400" : "text-amber-400"}>
                            {orderLookupResult.session.paymentStatus ?? "—"}
                          </span>
                          {orderLookupResult.session.amountTotal != null && (
                            <> · {(orderLookupResult.session.amountTotal / 100).toLocaleString(undefined, { style: "currency", currency: (orderLookupResult.session.currency ?? "usd").toUpperCase() })}</>
                          )}
                          {orderLookupResult.session.platform && orderLookupResult.session.platform !== "kiln" && (
                            <span className="text-rose-400"> · platform "{orderLookupResult.session.platform}" (not kiln)</span>
                          )}
                          {orderLookupResult.session.listingIds.length > 0 && (
                            <> · {orderLookupResult.session.listingIds.length} listing{orderLookupResult.session.listingIds.length === 1 ? "" : "s"} in metadata</>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Missing / unresolved listings */}
                  {orderLookupResult.missingListingIds.length > 0 && (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 text-amber-400"><AlertTriangle size={13} /></span>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-stone-200">
                          {orderLookupResult.missingListingIds.length} listing{orderLookupResult.missingListingIds.length === 1 ? "" : "s"} with no order row
                        </p>
                        <p className="text-[10px] font-mono text-stone-500 break-all">
                          {orderLookupResult.missingListingIds.join(", ")}
                        </p>
                        {orderLookupResult.unresolvedListingIds.length > 0 && (
                          <p className="text-[11px] text-rose-400">
                            {orderLookupResult.unresolvedListingIds.length} of these no longer exist as listings (likely deleted) — this is why the order failed:
                            <span className="block font-mono text-[10px] text-rose-300/80 break-all mt-0.5">
                              {orderLookupResult.unresolvedListingIds.join(", ")}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order rows */}
                  {orderLookupResult.orders.length > 0 && (
                    <div className="border-t border-white/5 pt-2 space-y-2">
                      <p className="text-[11px] font-medium text-stone-400">Order rows</p>
                      <ul className="space-y-1.5">
                        {orderLookupResult.orders.map((o) => (
                          <li key={o.id} className="rounded-lg bg-stone-950/40 border border-white/5 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs text-stone-200 truncate">{o.title}</p>
                                <p className="text-[10px] text-stone-500 font-mono truncate">{o.id}</p>
                              </div>
                              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-stone-700/50 text-stone-300">
                                {o.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-600 mt-1">
                              {o.amount.toLocaleString(undefined, { style: "currency", currency: (o.currency ?? "usd").toUpperCase() })}
                              {o.refId && <> · listing <span className="font-mono">{o.refId}</span></>}
                              {" · "}{new Date(o.createdAt).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t border-white/5 pt-2 flex justify-end">
                    <button
                      onClick={resetOrderLookup}
                      className="text-[11px] text-stone-600 hover:text-stone-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Failed email queue card */}
            <div className="rounded-2xl border border-white/8 bg-stone-900 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Inbox size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-amber-100">Failed email queue</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Emails that couldn't be delivered are saved here and retried automatically with backoff. Investigate the last error, attempt count, and next retry — or force an immediate retry.
                  </p>
                </div>
                <button
                  onClick={() => loadFailedEmails(failedEmailFilter)}
                  disabled={failedEmailLoading}
                  className="shrink-0 text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-40"
                  title="Refresh queue"
                >
                  <RefreshCw size={14} className={failedEmailLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {/* Status filters with counts */}
              <div className="flex gap-2 flex-wrap">
                {(["pending", "failed", "delivered", "all"] as const).map((f) => {
                  const label = f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1);
                  const badge = f === "all"
                    ? failedEmailCounts.pending + failedEmailCounts.delivered + failedEmailCounts.failed
                    : failedEmailCounts[f];
                  return (
                    <button
                      key={f}
                      onClick={() => setFailedEmailFilter(f)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        failedEmailFilter === f
                          ? "bg-amber-500 text-stone-950"
                          : "border border-white/10 bg-stone-800 text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      {label}
                      <span className={`text-[10px] ${failedEmailFilter === f ? "text-stone-800" : "text-stone-500"}`}>{badge}</span>
                    </button>
                  );
                })}
              </div>

              {failedEmailError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                  {failedEmailError}
                </div>
              )}

              {retryNotice && (
                <div className={`rounded-xl border px-4 py-3 text-xs ${retryNotice.delivered ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : "border-amber-500/20 bg-amber-500/5 text-amber-300"}`}>
                  {retryNotice.delivered
                    ? "Retry succeeded — the email was delivered."
                    : "Retry attempted but delivery failed again. The next automatic retry has been rescheduled."}
                </div>
              )}

              {failedEmailLoading && failedEmails.length === 0 && (
                <div className="flex flex-col gap-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-stone-800 animate-pulse" />
                  ))}
                </div>
              )}

              {!failedEmailLoading && failedEmails.length === 0 && !failedEmailError && (
                <p className="text-xs text-stone-600">
                  {failedEmailFilter === "pending"
                    ? "No emails waiting to retry — the queue is clear."
                    : `No ${failedEmailFilter === "all" ? "" : failedEmailFilter + " "}emails in the queue.`}
                </p>
              )}

              {failedEmails.length > 0 && (
                <ul className="space-y-2">
                  {failedEmails.map((em) => {
                    const statusColor = em.status === "delivered"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : em.status === "failed"
                        ? "bg-rose-500/15 text-rose-400"
                        : "bg-amber-500/15 text-amber-400";
                    return (
                      <li key={em.id} className="rounded-xl border border-white/5 bg-stone-950/40 px-4 py-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm text-stone-200 truncate">{em.subject}</p>
                            <p className="text-[11px] text-stone-500 truncate">
                              to <span className="text-stone-400">{em.to}</span>
                              {em.label && <span className="text-stone-600"> · {em.label}</span>}
                            </p>
                          </div>
                          <span className={`shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${statusColor}`}>
                            {em.status}
                          </span>
                        </div>

                        {em.lastError && (
                          <p className="text-[11px] text-rose-300/80 bg-rose-500/5 border border-rose-500/10 rounded-lg px-2 py-1.5 break-words">
                            {em.lastError}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-[10px] text-stone-600">
                            {em.attempts} {em.attempts === 1 ? "attempt" : "attempts"}
                            {em.status === "pending" && (
                              <> · next retry {new Date(em.nextRetryAt).toLocaleString()}</>
                            )}
                            {em.status === "delivered" && em.deliveredAt && (
                              <> · delivered {new Date(em.deliveredAt).toLocaleString()}</>
                            )}
                            {em.status === "failed" && (
                              <> · gave up after max attempts</>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            {em.status !== "delivered" && (
                              <button
                                onClick={() => retryFailedEmail(em.id)}
                                disabled={retryingEmail === em.id || deletingEmail === em.id}
                                className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                              >
                                {retryingEmail === em.id ? <RefreshCw size={10} className="animate-spin" /> : <Send size={10} />}
                                {retryingEmail === em.id ? "Retrying…" : "Retry now"}
                              </button>
                            )}
                            <button
                              onClick={() => deleteFailedEmail(em.id)}
                              disabled={deletingEmail === em.id || retryingEmail === em.id}
                              title="Permanently remove this email from the queue"
                              className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-medium text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                            >
                              {deletingEmail === em.id ? <RefreshCw size={10} className="animate-spin" /> : <Trash2 size={10} />}
                              {deletingEmail === em.id ? "Removing…" : "Delete"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* System health card */}
            <div className="rounded-2xl border border-white/8 bg-stone-900 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Activity size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-100">System health</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Checks DB connectivity (with query latency), API server uptime, and seed marker status on demand.
                  </p>
                </div>
              </div>

              {healthError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                  {healthError}
                </div>
              )}

              {healthResult && (
                <div className="rounded-xl border border-white/6 bg-stone-800/60 px-4 py-3 space-y-3">
                  {/* DB row */}
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 ${healthResult.db.ok ? "text-emerald-400" : "text-rose-400"}`}>
                      {healthResult.db.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-stone-200">Database</p>
                      {healthResult.db.ok ? (
                        <p className="text-[11px] text-stone-400">
                          Connected · <span className="font-mono">{healthResult.db.latencyMs}ms</span> round-trip
                        </p>
                      ) : (
                        <p className="text-[11px] text-rose-400 font-mono break-all">{healthResult.db.error}</p>
                      )}
                    </div>
                  </div>

                  {/* API uptime row */}
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-emerald-400"><CheckCircle size={13} /></span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-stone-200">API server</p>
                      <p className="text-[11px] text-stone-400">
                        Up for{" "}
                        {healthResult.api.uptimeSeconds < 60
                          ? `${healthResult.api.uptimeSeconds}s`
                          : healthResult.api.uptimeSeconds < 3600
                          ? `${Math.floor(healthResult.api.uptimeSeconds / 60)}m ${healthResult.api.uptimeSeconds % 60}s`
                          : `${Math.floor(healthResult.api.uptimeSeconds / 3600)}h ${Math.floor((healthResult.api.uptimeSeconds % 3600) / 60)}m`}
                      </p>
                    </div>
                  </div>

                  {/* Seed marker row */}
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 ${healthResult.seed.markerPresent ? "text-emerald-400" : "text-amber-400"}`}>
                      {healthResult.seed.markerPresent ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-stone-200">Seed marker</p>
                      <p className="text-[11px] text-stone-400">
                        DB{" "}
                        <span className="font-mono bg-stone-700 px-1 py-0.5 rounded text-stone-300">
                          {healthResult.seed.markerUserId ?? "—"}
                        </span>{" "}
                        <span className={healthResult.seed.markerPresent ? "text-emerald-400" : "text-rose-400"}>
                          {healthResult.seed.markerPresent ? "✓ present" : "✗ missing"}
                        </span>
                        {healthResult.seed.markerUserId !== healthResult.seed.codeMarkerId && (
                          <span className="text-amber-400 ml-1">
                            · differs from code marker{" "}
                            <span className="font-mono bg-stone-700 px-1 py-0.5 rounded">{healthResult.seed.codeMarkerId}</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                    <p className="text-[10px] text-stone-600">
                      Checked at {new Date(healthResult.checkedAt).toLocaleTimeString()}
                    </p>
                    <button
                      onClick={runHealthCheck}
                      disabled={healthLoading}
                      className="text-[11px] text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-40"
                    >
                      Re-check
                    </button>
                  </div>
                </div>
              )}

              {!healthResult && (
                <button
                  onClick={runHealthCheck}
                  disabled={healthLoading}
                  className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                >
                  {healthLoading ? <RefreshCw size={13} className="animate-spin" /> : <Activity size={13} />}
                  {healthLoading ? "Checking…" : "Run health check"}
                </button>
              )}

              {healthHistory.length > 0 && (
                <div className="border-t border-white/5 pt-3">
                  <button
                    onClick={() => setHealthHistoryOpen((o) => !o)}
                    className="flex w-full items-center justify-between text-[11px] text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <History size={12} />
                      Recent checks ({healthHistory.length})
                    </span>
                    <span className="text-stone-600">{healthHistoryOpen ? "Hide" : "Show"}</span>
                  </button>

                  {healthHistoryOpen && (
                    <ul className="mt-2 space-y-1">
                      {healthHistory.map((entry, i) => (
                        <li
                          key={`${entry.checkedAt}-${i}`}
                          className="flex items-center justify-between rounded-lg bg-stone-800/50 px-3 py-1.5 text-[11px]"
                        >
                          <span className="flex items-center gap-2">
                            <span className={entry.passed ? "text-emerald-400" : "text-rose-400"}>
                              {entry.passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            </span>
                            <span className="text-stone-400">
                              {new Date(entry.checkedAt).toLocaleTimeString()}
                            </span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="font-mono text-stone-500">
                              {entry.latencyMs != null ? `${entry.latencyMs}ms` : "—"}
                            </span>
                            <span className={entry.passed ? "text-emerald-400" : "text-rose-400"}>
                              {entry.passed ? "Pass" : "Fail"}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

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

            {/* Re-run seed data card */}
            <div className="rounded-2xl border border-white/8 bg-stone-900 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Database size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-100">Re-run seed data</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Re-applies the canonical seed artists, posts, listings, guilds, and patron tiers. Safe to run after a DB reset — existing records are updated in-place, not duplicated. Preview first to check the current seed state.
                  </p>
                </div>
              </div>

              {seedError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                  {seedError}
                </div>
              )}

              {seedPreview && !seedResult && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-amber-200 font-medium">Current seed state:</p>
                    <p className="text-[11px] text-stone-400">
                      DB marker{" "}
                      <span className="font-mono bg-stone-800 px-1.5 py-0.5 rounded text-stone-300">{seedPreview.markerUserId}</span>{" "}
                      <span className={seedPreview.markerPresent ? "text-emerald-400" : "text-rose-400"}>
                        {seedPreview.markerPresent ? "✓ present" : "✗ missing"}
                      </span>
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Code marker{" "}
                      <span className="font-mono bg-stone-800 px-1.5 py-0.5 rounded text-stone-300">{seedPreview.codeMarkerId}</span>
                    </p>
                    {seedPreview.markerUserId !== seedPreview.codeMarkerId && (
                      <p className="text-[11px] text-amber-400">
                        ⚠ DB marker differs from code — server will re-seed with <span className="font-mono">{seedPreview.codeMarkerId}</span> on next restart
                      </p>
                    )}
                    <p className="text-[11px] text-stone-400">
                      {seedPreview.seedUserCount} seed users · {seedPreview.seedPostCount} seed posts found in DB
                    </p>
                  </div>

                  <div className="border-t border-white/5 pt-3 space-y-2">
                    <p className="text-xs text-stone-400 font-medium">Reseed with same marker</p>
                    <p className="text-[11px] text-stone-500">
                      Deletes the marker and re-runs the full seed (all tables use upsert, so no data is lost).
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => runReseed(false)}
                        disabled={seedLoading}
                        className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                      >
                        <CheckCircle size={11} /> Confirm reseed
                      </button>
                      <button
                        onClick={resetSeed}
                        disabled={seedLoading}
                        className="text-xs text-stone-600 hover:text-stone-400 transition-colors disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 space-y-2">
                    <p className="text-xs text-stone-400 font-medium">Advance to a new marker version</p>
                    <p className="text-[11px] text-stone-500">
                      Enter a new marker ID (e.g. <span className="font-mono text-stone-400">seed-v5-marker</span>) to re-seed and write a different version marker. Use this when updating seed data without changing code.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMarkerInput}
                        onChange={(e) => setNewMarkerInput(e.target.value)}
                        placeholder="seed-v5-marker"
                        disabled={seedLoading}
                        className="flex-1 min-w-0 rounded-lg border border-white/10 bg-stone-800 px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/40 disabled:opacity-40"
                      />
                      <button
                        onClick={runReseedWithMarker}
                        disabled={seedLoading || !newMarkerInput.trim()}
                        className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40 shrink-0"
                      >
                        <RefreshCw size={11} /> Advance marker
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {advanceResult && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 space-y-2">
                  <p className="text-xs text-emerald-300 font-medium">Done — seed data applied with new marker.</p>
                  <p className="text-[11px] text-stone-400">
                    New marker:{" "}
                    <span className="font-mono bg-stone-800 px-1.5 py-0.5 rounded text-stone-300">{advanceResult.newMarkerId}</span>
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {advanceResult.users} artists · {advanceResult.posts} posts · {advanceResult.listings} listings · {advanceResult.guilds} guilds
                  </p>
                  <button onClick={resetSeed} className="text-xs text-stone-600 hover:text-stone-400 transition-colors">
                    Reset
                  </button>
                </div>
              )}

              {seedResult && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 space-y-2">
                  <p className="text-xs text-emerald-300 font-medium">Done — seed data applied.</p>
                  <p className="text-[11px] text-stone-500">
                    {seedResult.users} artists · {seedResult.posts} posts · {seedResult.listings} listings · {seedResult.guilds} guilds
                  </p>
                  <button onClick={resetSeed} className="text-xs text-stone-600 hover:text-stone-400 transition-colors">
                    Reset
                  </button>
                </div>
              )}

              {!seedPreview && !seedResult && !advanceResult && (
                <button
                  onClick={() => runReseed(true)}
                  disabled={seedLoading}
                  className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                >
                  {seedLoading ? <RefreshCw size={13} className="animate-spin" /> : <Database size={13} />}
                  {seedLoading ? "Checking…" : "Preview seed state"}
                </button>
              )}

              {seedLoading && seedPreview && (
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <RefreshCw size={12} className="animate-spin" /> Running seed…
                </div>
              )}
            </div>

            {/* Seed run history card */}
            <div className="rounded-2xl border border-white/8 bg-stone-900 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <History size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-amber-100">Seed run history</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    An audit log of every reseed and marker advance — who ran it, when, and which marker version it transitioned from and to. Use it to spot accidental reseeds.
                  </p>
                </div>
                <button
                  onClick={loadSeedHistory}
                  disabled={seedHistoryLoading}
                  className="shrink-0 text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-40"
                  title="Refresh history"
                >
                  <RefreshCw size={14} className={seedHistoryLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {seedHistoryError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                  {seedHistoryError}
                </div>
              )}

              {!seedHistoryError && seedHistory.length === 0 && !seedHistoryLoading && (
                <p className="text-xs text-stone-600">No seed runs recorded yet. Once you reseed or advance the marker, runs will appear here.</p>
              )}

              {seedHistory.length > 0 && (
                <ul className="space-y-2">
                  {seedHistory.map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-white/5 bg-stone-950/40 px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${entry.operation === "advance-marker" ? "bg-amber-500/15 text-amber-400" : "bg-stone-700/40 text-stone-300"}`}>
                          {entry.operation === "advance-marker" ? "Advanced marker" : "Reseed"}
                        </span>
                        <span className="text-[10px] text-stone-600">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 flex items-center gap-1.5 flex-wrap">
                        {entry.oldMarkerId && entry.oldMarkerId !== entry.newMarkerId ? (
                          <>
                            <span className="font-mono bg-stone-800 px-1.5 py-0.5 rounded text-stone-400">{entry.oldMarkerId}</span>
                            <span className="text-stone-600">→</span>
                            <span className="font-mono bg-stone-800 px-1.5 py-0.5 rounded text-stone-300">{entry.newMarkerId}</span>
                          </>
                        ) : (
                          <span className="font-mono bg-stone-800 px-1.5 py-0.5 rounded text-stone-300">{entry.newMarkerId}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-stone-500">
                        by{" "}
                        <span className="text-stone-400">{entry.actorName ?? "Unknown"}</span>
                        {entry.actorId && (
                          <span className="font-mono text-stone-600"> ({entry.actorId})</span>
                        )}
                        {" · "}
                        {entry.userCount} artists · {entry.postCount} posts · {entry.listingCount} listings · {entry.guildCount} guilds
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Test notification card */}
            <div className="rounded-2xl border border-white/8 bg-stone-900 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Bell size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-100">Send test notification</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Inserts a test notification into your own feed to verify the notification pipeline is working end-to-end. Preview the notification content before sending.
                  </p>
                </div>
              </div>

              {notifError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                  {notifError}
                </div>
              )}

              {notifPreview && !notifSent && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-amber-200 font-medium">Notification preview:</p>
                    <p className="text-[11px] text-stone-300">"{notifPreview.text}"</p>
                    <p className="text-[10px] font-mono text-stone-600">type: {notifPreview.type} · link: {notifPreview.link}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => runTestNotification(false)}
                      disabled={notifLoading}
                      className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                    >
                      <CheckCircle size={11} /> Send notification
                    </button>
                    <button
                      onClick={resetNotif}
                      disabled={notifLoading}
                      className="text-xs text-stone-600 hover:text-stone-400 transition-colors disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {notifSent && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 space-y-2">
                  <p className="text-xs text-emerald-300 font-medium">
                    Sent — check your{" "}
                    <a href="/kiln/notifications" className="underline hover:text-emerald-200 transition-colors">
                      notifications
                    </a>{" "}
                    to confirm it arrived.
                  </p>
                  <button onClick={resetNotif} className="text-xs text-stone-600 hover:text-stone-400 transition-colors">
                    Reset
                  </button>
                </div>
              )}

              {!notifPreview && !notifSent && (
                <button
                  onClick={() => runTestNotification(true)}
                  disabled={notifLoading}
                  className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                >
                  {notifLoading ? <RefreshCw size={13} className="animate-spin" /> : <Bell size={13} />}
                  {notifLoading ? "Preparing…" : "Preview test notification"}
                </button>
              )}

              {notifLoading && notifPreview && (
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <RefreshCw size={12} className="animate-spin" /> Sending…
                </div>
              )}
            </div>

            {/* Email all users card */}
            <div className="rounded-2xl border border-white/8 bg-stone-900 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-100">Email all users</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Send a one-off announcement to every user with a contact email. Preview the recipient count before sending. This goes to everyone — use sparingly.
                  </p>
                </div>
              </div>

              {broadcastError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                  {broadcastError}
                </div>
              )}

              {broadcastResult ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 space-y-2">
                  <p className="text-xs text-emerald-300 font-medium">
                    Sent to {broadcastResult.sent} of {broadcastResult.recipientCount} {broadcastResult.recipientCount === 1 ? "recipient" : "recipients"}.
                    {broadcastResult.failed > 0 && (
                      <span className="text-amber-300"> {broadcastResult.failed} could not be delivered.</span>
                    )}
                  </p>
                  <button onClick={resetBroadcast} className="text-xs text-stone-600 hover:text-stone-400 transition-colors">
                    Write another
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={broadcastSubject}
                      onChange={(e) => { setBroadcastSubject(e.target.value); setBroadcastCount(null); }}
                      placeholder="Subject"
                      maxLength={200}
                      disabled={broadcastLoading}
                      className="w-full rounded-xl border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none disabled:opacity-40"
                    />
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => { setBroadcastMessage(e.target.value); setBroadcastCount(null); }}
                      placeholder="Write your message… (blank lines start a new paragraph)"
                      rows={5}
                      maxLength={10000}
                      disabled={broadcastLoading}
                      className="w-full rounded-xl border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-y disabled:opacity-40"
                    />
                  </div>

                  {broadcastCount !== null ? (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-3">
                      <p className="text-xs text-amber-200">
                        This will email <strong>{broadcastCount}</strong> {broadcastCount === 1 ? "user" : "users"}. Are you sure?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={sendBroadcast}
                          disabled={broadcastLoading || broadcastCount === 0}
                          className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                        >
                          {broadcastLoading ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                          {broadcastLoading ? "Sending…" : `Send to ${broadcastCount}`}
                        </button>
                        <button
                          onClick={() => setBroadcastCount(null)}
                          disabled={broadcastLoading}
                          className="text-xs text-stone-600 hover:text-stone-400 transition-colors disabled:opacity-40"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={previewBroadcast}
                      disabled={broadcastLoading || !broadcastSubject.trim() || !broadcastMessage.trim()}
                      className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                    >
                      {broadcastLoading ? <RefreshCw size={13} className="animate-spin" /> : <Mail size={13} />}
                      {broadcastLoading ? "Checking…" : "Preview recipients"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
