import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, CheckCircle, Circle, Clock, MessageCircle, DollarSign,
  Image, Truck, Package, Star, Loader2, ChevronRight, Paperclip, X, Send,
  FileText,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { useAuth } from "@/contexts/AuthContext";

interface Commission {
  id: string;
  artistId: string;
  artistName: string;
  clientId: string;
  clientName: string;
  workType: string | null;
  description: string;
  budgetRange: string | null;
  timeline: string | null;
  status: string;
  quotedPrice: number | null;
  depositPaid: boolean;
  depositAmount: number | null;
  finalPaid: boolean;
  artistNotes: string | null;
  milestone: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
}

interface CommissionUpdate {
  id: string;
  commissionId: string;
  authorId: string;
  authorName: string;
  text: string | null;
  attachmentUrl: string | null;
  milestone: string | null;
  createdAt: string;
}

const MILESTONE_TEMPLATES = [
  { id: "deposit", label: "Deposit paid", icon: DollarSign },
  { id: "design", label: "Design approved", icon: Image },
  { id: "production", label: "In production", icon: Clock },
  { id: "progress", label: "Progress photos shared", icon: Image },
  { id: "complete", label: "Piece completed", icon: CheckCircle },
  { id: "shipped", label: "Shipped", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Package },
  { id: "balance", label: "Final payment", icon: DollarSign },
  { id: "review", label: "Review left", icon: Star },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "text-stone-400 bg-stone-800 border-stone-700",
  accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  in_progress: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  completed: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  declined: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  cancelled: "text-stone-500 bg-stone-800 border-stone-700",
};

const STORAGE_PATH_RE = /^\/api\/storage\/objects\/[a-zA-Z0-9_\-/.]+$/;

function AttachmentImage({ url }: { url: string }) {
  const [errored, setErrored] = useState(false);
  if (!STORAGE_PATH_RE.test(url)) return null;
  if (errored) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
      <img
        src={url}
        alt="Attachment"
        className="max-w-[220px] max-h-[180px] rounded-xl object-cover border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
        onError={() => setErrored(true)}
      />
    </a>
  );
}

function getMilestoneIndex(commission: Commission): number {
  if (commission.status === "completed" || commission.finalPaid) return 8;
  if (commission.milestone === "delivered") return 7;
  if (commission.milestone === "shipped") return 6;
  if (commission.milestone === "complete") return 5;
  if (commission.milestone === "progress") return 4;
  if (commission.milestone === "production" || commission.status === "in_progress") return 3;
  if (commission.milestone === "design") return 2;
  if (commission.depositPaid) return 1;
  return 0;
}

interface PendingAttachment {
  file: File;
  previewUrl: string;
  objectPath: string | null;
}

function useImageUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!file.type.startsWith("image/")) {
      setError("Only image files can be attached.");
      return;
    }
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setError("Image must be 10 MB or smaller.");
      return;
    }
    setError(null);

    const previewUrl = URL.createObjectURL(file);
    setPending({ file, previewUrl, objectPath: null });
    setUploading(true);

    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "image/jpeg" }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });
      if (!putRes.ok) throw new Error("Upload failed");

      const pubRes = await fetch("/api/storage/uploads/make-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ objectPath }),
      });
      if (!pubRes.ok) throw new Error("Failed to publish image");

      setPending({ file, previewUrl, objectPath });
    } catch {
      setPending(null);
      URL.revokeObjectURL(previewUrl);
      setError("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    setError(null);
  }

  function getServingUrl(objectPath: string): string {
    return `/api/storage${objectPath}`;
  }

  return { fileInputRef, pending, uploading, error, handleFileSelect, clear, getServingUrl };
}

function UpdateBubble({ update, isSelf }: { update: CommissionUpdate; isSelf: boolean }) {
  const time = new Date(update.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const date = new Date(update.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className={`flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}>
      {update.milestone && (
        <p className="text-[10px] text-amber-400/70 px-1">
          Milestone: {MILESTONE_TEMPLATES.find(m => m.id === update.milestone)?.label ?? update.milestone}
        </p>
      )}
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${isSelf ? "bg-amber-500/20 border border-amber-500/20" : "bg-stone-800/70 border border-white/8"}`}>
        {update.text && (
          <p className={`text-sm leading-relaxed ${isSelf ? "text-amber-100" : "text-stone-200"}`}>{update.text}</p>
        )}
        {update.attachmentUrl && <AttachmentImage url={update.attachmentUrl} />}
      </div>
      <p className="text-[10px] text-stone-600 px-1">{update.authorName} · {date} {time}</p>
    </div>
  );
}

function UpdateThread({ commissionId, artistId, isArtist, currentUserId }: {
  commissionId: string;
  artistId: string;
  isArtist: boolean;
  currentUserId: string;
}) {
  const [updates, setUpdates] = useState<CommissionUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [milestone, setMilestone] = useState("");
  const attach = useImageUpload();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/commissions/${commissionId}/updates`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setUpdates(d.updates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [commissionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [updates]);

  async function handleSend() {
    const trimmed = text.trim();
    const attachmentUrl = attach.pending?.objectPath ? attach.getServingUrl(attach.pending.objectPath) : undefined;
    if (!trimmed && !attachmentUrl) return;
    if (attach.uploading) return;

    setSending(true);
    try {
      const r = await fetch(`/api/commissions/${commissionId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          text: trimmed || undefined,
          attachmentUrl: attachmentUrl ?? undefined,
          milestone: isArtist && milestone ? milestone : undefined,
        }),
      });
      if (r.ok) {
        const update = await r.json() as CommissionUpdate;
        setUpdates(prev => [...prev, update]);
        setText("");
        setMilestone("");
        attach.clear();
      }
    } catch {}
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-stone-600">Updates</p>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={16} className="animate-spin text-stone-600" />
        </div>
      ) : updates.length === 0 ? (
        <p className="text-xs text-stone-600 text-center py-3">No updates yet. Start the conversation below.</p>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {updates.map(u => (
            <UpdateBubble key={u.id} update={u} isSelf={u.authorId === currentUserId} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="rounded-xl border border-white/8 bg-stone-900/80 p-3 space-y-2">
        {isArtist && (
          <select
            value={milestone}
            onChange={e => setMilestone(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-stone-800 px-2 py-1.5 text-xs text-stone-300 focus:border-amber-500/40 focus:outline-none"
          >
            <option value="">No milestone tag</option>
            {MILESTONE_TEMPLATES.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        )}

        {attach.pending && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <img
                src={attach.pending.previewUrl}
                alt="Preview"
                className="h-12 w-12 rounded-lg object-cover border border-white/10"
              />
              {attach.uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-stone-900/60">
                  <Loader2 size={12} className="animate-spin text-amber-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-stone-400 truncate">{attach.pending.file.name}</p>
              <p className="text-[10px] text-stone-600">
                {attach.uploading ? "Uploading…" : attach.pending.objectPath ? "Ready" : "Failed"}
              </p>
            </div>
            <button onClick={attach.clear} className="text-stone-600 hover:text-rose-400 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        {attach.error && <p className="text-[10px] text-rose-400">{attach.error}</p>}

        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note or update…"
            className="flex-1 resize-none rounded-lg border border-white/10 bg-stone-800 px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => attach.fileInputRef.current?.click()}
            disabled={attach.uploading}
            className="flex-shrink-0 rounded-lg border border-white/10 p-2 text-stone-500 hover:text-amber-400 transition-colors disabled:opacity-40"
            title="Attach image"
          >
            <Paperclip size={14} />
          </button>
          <button
            onClick={handleSend}
            disabled={sending || attach.uploading || (!text.trim() && !attach.pending?.objectPath)}
            className="flex-shrink-0 rounded-lg bg-amber-500/20 border border-amber-500/30 p-2 text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-40"
            title="Send"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>

        <input
          ref={attach.fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={attach.handleFileSelect}
        />
      </div>
    </div>
  );
}

function CommissionCard({ commission, isArtist, currentUserId, onUpdate }: {
  commission: Commission;
  isArtist: boolean;
  currentUserId: string;
  onUpdate: (id: string, updates: Partial<Commission>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quotePrice, setQuotePrice] = useState(commission.quotedPrice?.toString() ?? "");
  const [quoteNotes, setQuoteNotes] = useState(commission.artistNotes ?? "");
  const progressIndex = getMilestoneIndex(commission);

  async function handleSubmitQuote() {
    const price = parseFloat(quotePrice);
    if (!price || price <= 0) return;
    setUpdating(true);
    try {
      const r = await fetch(`/api/commissions/${commission.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotedPrice: price, artistNotes: quoteNotes || undefined }),
      });
      if (r.ok) { const data = await r.json(); onUpdate(commission.id, data); setShowQuoteForm(false); }
    } catch {}
    setUpdating(false);
  }

  async function handlePayDeposit() {
    if (!commission.quotedPrice) return;
    setUpdating(true);
    try {
      const depositAmount = Math.round(commission.quotedPrice * 0.3);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: [{
            name: `Deposit — ${commission.workType ?? "Custom Commission"}`,
            price: depositAmount,
            quantity: 1,
            artistName: commission.artistName,
          }],
          successPath: `/commission-tracker?deposit_paid=${commission.id}`,
          cancelPath: "/commission-tracker",
          metadata: { type: "commission", commissionId: commission.id, milestone: "deposit" },
        }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; } else { setUpdating(false); }
    } catch { setUpdating(false); }
  }

  const updateCommission = async (updates: Partial<Commission>) => {
    setUpdating(true);
    try {
      const r = await fetch(`/api/commissions/${commission.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (r.ok) { const data = await r.json(); onUpdate(commission.id, data); }
    } catch {}
    setUpdating(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-stone-900/50 overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-100 truncate mb-1">
              {commission.workType ?? "Commission"} — {isArtist ? commission.clientName : commission.artistName}
            </p>
            <p className="text-xs text-stone-500 line-clamp-1">{commission.description}</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[commission.status] ?? STATUS_COLORS.pending}`}>
              {commission.status.replace(/_/g, " ")}
            </span>
            <ChevronRight size={14} className={`text-stone-600 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-stone-600">
          {commission.quotedPrice && <span className="text-amber-400 font-semibold">${commission.quotedPrice.toLocaleString()}</span>}
          {commission.budgetRange && !commission.quotedPrice && <span>{commission.budgetRange}</span>}
          <span>{new Date(commission.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          {commission.estimatedDelivery && <span>Est. {new Date(commission.estimatedDelivery).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          <p className="text-xs text-stone-400 leading-relaxed">{commission.description}</p>

          {commission.status !== "pending" && commission.status !== "declined" && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-600 mb-2">Progress</p>
              <div className="space-y-2">
                {MILESTONE_TEMPLATES.map((m, i) => {
                  const status = i < progressIndex ? "completed" : i === progressIndex ? "active" : "pending";
                  return (
                    <div key={m.id} className={`flex items-center gap-3 text-xs ${status === "pending" ? "opacity-40" : ""}`}>
                      {status === "completed" ? <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" /> :
                        status === "active" ? <Circle size={14} className="text-amber-400 flex-shrink-0 animate-pulse" /> :
                          <Circle size={14} className="text-stone-700 flex-shrink-0" />}
                      <span className={status === "active" ? "text-amber-300 font-medium" : status === "completed" ? "text-stone-400 line-through" : "text-stone-600"}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {commission.artistNotes && (
            <div className="rounded-xl bg-stone-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-stone-600 mb-1">Artist notes</p>
              <p className="text-xs text-stone-400">{commission.artistNotes}</p>
            </div>
          )}

          {isArtist && commission.status === "pending" && (
            <div className="space-y-3">
              {!showQuoteForm ? (
                <div className="rounded-xl bg-stone-800/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-stone-600 mb-2">Respond to request</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowQuoteForm(true)} disabled={updating}
                      className="flex-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 py-2 hover:bg-amber-500/30 transition-colors">
                      Quote & Accept
                    </button>
                    <button onClick={() => updateCommission({ status: "accepted" })} disabled={updating}
                      className="flex-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 py-2 hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                      {updating ? "..." : "Accept as-is"}
                    </button>
                    <button onClick={() => updateCommission({ status: "declined" })} disabled={updating}
                      className="flex-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 py-2 hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                      Decline
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-stone-800/50 p-3 space-y-3">
                  <p className="text-[10px] uppercase tracking-wider text-stone-600">Send a Quote</p>
                  <div>
                    <label className="text-[10px] text-stone-500 mb-1 block">Your price (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                      <input type="number" min="1" placeholder="0.00" value={quotePrice} onChange={e => setQuotePrice(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-stone-900 py-2 pl-7 pr-3 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 mb-1 block">Notes for collector (optional)</label>
                    <textarea rows={2} placeholder="Describe your process, timeline, or any questions…" value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-stone-900 px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSubmitQuote} disabled={updating || !quotePrice}
                      className="flex-1 rounded-full bg-amber-500 py-2 text-xs font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-40 transition-colors">
                      {updating ? "Sending…" : "Send Quote & Accept"}
                    </button>
                    <button onClick={() => setShowQuoteForm(false)}
                      className="rounded-full border border-white/10 px-3 py-2 text-xs text-stone-500 hover:text-stone-300 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isArtist && commission.status === "accepted" && (
            <div className="flex gap-2">
              <button onClick={() => updateCommission({ status: "in_progress", milestone: "production" })} disabled={updating}
                className="flex-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 py-2 hover:bg-amber-500/30 transition-colors disabled:opacity-50">
                {updating ? "..." : "Mark as In Progress"}
              </button>
              <Link
                href={`/commission-contract?artistName=${encodeURIComponent(commission.artistName)}&clientName=${encodeURIComponent(commission.clientName)}&projectDescription=${encodeURIComponent(commission.description)}&totalPrice=${encodeURIComponent(String(commission.quotedPrice ?? ""))}&medium=${encodeURIComponent(commission.workType ?? "")}`}
                className="rounded-full border border-white/10 px-3 py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors inline-flex items-center gap-1"
              >
                <FileText size={12} /> Contract
              </Link>
            </div>
          )}

          {isArtist && commission.status === "in_progress" && !commission.depositPaid && (
            <button onClick={() => updateCommission({ depositPaid: true, depositAmount: commission.quotedPrice ? Math.round(commission.quotedPrice * 0.3) : undefined })} disabled={updating}
              className="w-full rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 py-2 hover:bg-blue-500/20 transition-colors">
              {updating ? "..." : "Mark Deposit Received"}
            </button>
          )}

          {!isArtist && commission.status === "accepted" && !commission.depositPaid && !!commission.quotedPrice && (
            <button onClick={handlePayDeposit} disabled={updating}
              className="w-full rounded-full bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 py-2 hover:bg-amber-500/30 transition-colors disabled:opacity-50">
              {updating ? "Redirecting…" : `Pay Deposit (30% · $${Math.round(commission.quotedPrice * 0.3).toLocaleString()})`}
            </button>
          )}

          {(commission.status === "accepted" || commission.status === "in_progress" || commission.status === "completed") && (
            <UpdateThread
              commissionId={commission.id}
              artistId={commission.artistId}
              isArtist={isArtist}
              currentUserId={currentUserId}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function CommissionTracker() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "active">("all");
  const { markTypeRead } = useSocial();
  const { user } = useAuth();

  useEffect(() => { markTypeRead("commission_payment"); }, [markTypeRead]);

  useEffect(() => {
    fetch("/api/me/commissions", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setCommissions(data.commissions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

    const params = new URLSearchParams(window.location.search);
    const depositPaidId = params.get("deposit_paid");
    if (depositPaidId) {
      setCommissions(prev => prev.map(c => c.id === depositPaidId ? { ...c, depositPaid: true } : c));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleUpdate = (id: string, updates: Partial<Commission>) => {
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const filtered = commissions.filter(c => {
    if (tab === "active") return !["completed", "declined", "cancelled"].includes(c.status);
    return true;
  });

  const currentUserId = user?.id ?? "";

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/discover" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Commission Tracker</h1>
            <p className="mt-0.5 text-sm text-stone-500">Track all your commissions and projects.</p>
          </div>
        </div>

        <div className="mb-6 flex gap-1 rounded-xl bg-stone-900/50 p-1 border border-white/5">
          {([{ key: "all", label: "All" }, { key: "active", label: "Active" }] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${tab === t.key ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MessageCircle size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No commissions yet.</p>
            <Link href="/discover" className="mt-3 inline-flex items-center gap-1 rounded-full border border-amber-500/30 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
              Find artists to commission
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(commission => (
              <CommissionCard
                key={commission.id}
                commission={commission}
                isArtist={commission.artistId === currentUserId}
                currentUserId={currentUserId}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
