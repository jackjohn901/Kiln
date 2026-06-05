import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, CheckCircle, Circle, Clock, MessageCircle, DollarSign,
  Image, Truck, Package, Star, Loader2, ChevronRight, Paperclip, X, Send,
  FileText, ArrowLeftRight,
} from "lucide-react";
import Nav from "@/components/Nav";
import RelativeTime from "@/components/RelativeTime";
import { toast } from "@/hooks/use-toast";
import CommissionInlineActions from "@/components/CommissionInlineActions";
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
  referenceUrls: string[] | null;
  counterPrice: number | null;
  counterNote: string | null;
  createdAt: string;
  updatedAt: string;
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
  quoted: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  countered: "text-orange-400 bg-orange-500/10 border-orange-500/30",
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
      <p className="text-[10px] text-stone-600 px-1">
        {update.authorName} · <RelativeTime since={update.createdAt} className="text-[10px] text-stone-600" />
      </p>
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
      if (!r.ok) throw new Error();
      const update = await r.json() as CommissionUpdate;
      setUpdates(prev => [...prev, update]);
      setText("");
      setMilestone("");
      attach.clear();
    } catch {
      toast({ title: "Couldn\u2019t send update", description: "Please try again.", variant: "destructive" });
    }
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

function CommissionCard({ commission, isArtist, currentUserId, onUpdate, highlighted }: {
  commission: Commission;
  isArtist: boolean;
  currentUserId: string;
  onUpdate: (id: string, updates: Partial<Commission>) => void;
  highlighted?: boolean;
}) {
  const [expanded, setExpanded] = useState(highlighted ?? false);
  const [updating, setUpdating] = useState(false);
  const [counterMode, setCounterMode] = useState(false);
  const [counterPriceInput, setCounterPriceInput] = useState("");
  const [counterNoteInput, setCounterNoteInput] = useState("");
  const [counterSending, setCounterSending] = useState(false);
  const [requoteMode, setRequoteMode] = useState(false);
  const [requotePriceInput, setRequotePriceInput] = useState(String(commission.quotedPrice ?? ""));
  const [requoteNotesInput, setRequoteNotesInput] = useState(commission.artistNotes ?? "");
  const progressIndex = getMilestoneIndex(commission);
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleSendCounter() {
    const price = parseFloat(counterPriceInput.replace(/[^0-9.]/g, ""));
    if (!price || price <= 0) {
      toast({ title: "Enter a valid price", description: "Counter price must be a positive number.", variant: "destructive" });
      return;
    }
    setCounterSending(true);
    try {
      const r = await fetch(`/api/commissions/${commission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "countered", counterPrice: price, counterNote: counterNoteInput.trim() || undefined }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json() as Commission;
      onUpdate(commission.id, data);
      setCounterMode(false);
      setCounterPriceInput("");
      setCounterNoteInput("");
      toast({ title: "Counter offer sent", description: "The artist will be notified of your offer." });
    } catch {
      toast({ title: "Couldn\u2019t send counter offer", description: "Please try again.", variant: "destructive" });
    }
    setCounterSending(false);
  }

  async function handleAcceptCounter() {
    if (!commission.counterPrice) return;
    setUpdating(true);
    try {
      const r = await fetch(`/api/commissions/${commission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "accepted", quotedPrice: commission.counterPrice }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json() as Commission;
      onUpdate(commission.id, data);
    } catch {
      toast({ title: "Couldn\u2019t accept counter", description: "Please try again.", variant: "destructive" });
    }
    setUpdating(false);
  }

  async function handleRequote() {
    const price = parseFloat(requotePriceInput.replace(/[^0-9.]/g, ""));
    if (!price || price <= 0) {
      toast({ title: "Enter a valid price", description: "Quote price must be a positive number.", variant: "destructive" });
      return;
    }
    setUpdating(true);
    try {
      const r = await fetch(`/api/commissions/${commission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "quoted", quotedPrice: price, artistNotes: requoteNotesInput.trim() || undefined }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json() as Commission;
      onUpdate(commission.id, data);
      setRequoteMode(false);
    } catch {
      toast({ title: "Couldn\u2019t send re-quote", description: "Please try again.", variant: "destructive" });
    }
    setUpdating(false);
  }

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

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
      if (!r.ok) throw new Error();
      const data = await r.json(); onUpdate(commission.id, data);
    } catch {
      toast({ title: "Couldn\u2019t update commission", description: "Please try again.", variant: "destructive" });
    }
    setUpdating(false);
  };

  return (
    <motion.div ref={cardRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-stone-900/50 overflow-hidden transition-colors ${highlighted ? "border-amber-500/50 ring-1 ring-amber-500/30" : "border-white/8"}`}>
      <div className="p-4">
        <div className="cursor-pointer" onClick={() => setExpanded(v => !v)}>
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
            <RelativeTime since={commission.createdAt} className="text-xs text-stone-600" />
            {new Date(commission.updatedAt).getTime() - new Date(commission.createdAt).getTime() > 1000 && (
              <span>Updated <RelativeTime since={commission.updatedAt} className="text-xs text-stone-600" /></span>
            )}
            {commission.estimatedDelivery && <span>Est. {new Date(commission.estimatedDelivery).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>}
          </div>
        </div>
        {isArtist && commission.status === "pending" && (
          <div onClick={(e) => e.stopPropagation()}>
            <CommissionInlineActions
              commissionId={commission.id}
              initialStatus="pending"
              onStatusChange={(newStatus) => onUpdate(commission.id, { status: newStatus })}
            />
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          <p className="text-xs text-stone-400 leading-relaxed">{commission.description}</p>

          {commission.referenceUrls && commission.referenceUrls.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-600 mb-2">Reference images</p>
              <div className="flex flex-wrap gap-2">
                {commission.referenceUrls.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={url}
                      alt={`Reference ${idx + 1}`}
                      className="h-20 w-20 rounded-xl object-cover border border-white/10 hover:border-amber-500/40 hover:opacity-90 transition-all cursor-pointer"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {!isArtist && commission.status === "quoted" && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/8 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-wider text-violet-400/70">Quote received</p>
                {commission.quotedPrice && (
                  <span className="text-lg font-bold text-violet-300">${commission.quotedPrice.toLocaleString()}</span>
                )}
              </div>
              {commission.artistNotes && (
                <p className="text-xs text-stone-300 leading-relaxed">{commission.artistNotes}</p>
              )}
              {!counterMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateCommission({ status: "accepted" })}
                    disabled={updating}
                    className="flex-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-xs text-violet-300 py-2.5 font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-50"
                  >
                    {updating ? "Accepting…" : "Accept Quote"}
                  </button>
                  <button
                    onClick={() => setCounterMode(true)}
                    disabled={updating}
                    className="flex items-center gap-1 rounded-full border border-orange-500/30 px-3 py-2.5 text-xs text-orange-400 hover:bg-orange-500/10 transition-colors disabled:opacity-50"
                  >
                    <ArrowLeftRight size={11} /> Counter
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-orange-400/70">Your counter offer</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs">$</span>
                    <input
                      type="number"
                      min="1"
                      value={counterPriceInput}
                      onChange={e => setCounterPriceInput(e.target.value)}
                      placeholder="Counter price"
                      className="w-full rounded-lg border border-orange-500/30 bg-stone-800 pl-6 pr-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:border-orange-500/50 focus:outline-none"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={counterNoteInput}
                    onChange={e => setCounterNoteInput(e.target.value)}
                    placeholder="Optional note to the artist…"
                    className="w-full resize-none rounded-lg border border-white/10 bg-stone-800 px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:border-orange-500/30 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendCounter}
                      disabled={counterSending || !counterPriceInput}
                      className="flex-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-xs text-orange-300 py-2 font-medium hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                    >
                      {counterSending ? "Sending…" : "Send Counter Offer"}
                    </button>
                    <button
                      onClick={() => { setCounterMode(false); setCounterPriceInput(""); setCounterNoteInput(""); }}
                      className="rounded-full border border-white/10 px-3 py-2 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isArtist && commission.status === "countered" && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/8 p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-orange-400/70">Counter offer sent</p>
              {commission.counterPrice && (
                <p className="text-lg font-bold text-orange-300">${commission.counterPrice.toLocaleString()}</p>
              )}
              {commission.counterNote && (
                <p className="text-xs text-stone-300 leading-relaxed">{commission.counterNote}</p>
              )}
              <p className="text-[10px] text-stone-600">Waiting for the artist to respond.</p>
            </div>
          )}

          {isArtist && commission.status === "countered" && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/8 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-wider text-orange-400/70">Counter offer received</p>
                {commission.counterPrice && (
                  <span className="text-lg font-bold text-orange-300">${commission.counterPrice.toLocaleString()}</span>
                )}
              </div>
              {commission.counterNote && (
                <p className="text-xs text-stone-300 leading-relaxed">{commission.counterNote}</p>
              )}
              {!requoteMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleAcceptCounter}
                    disabled={updating || !commission.counterPrice}
                    className="flex-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 py-2.5 font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    {updating ? "Accepting…" : `Accept $${commission.counterPrice?.toLocaleString()}`}
                  </button>
                  <button
                    onClick={() => { setRequoteMode(true); setRequotePriceInput(String(commission.quotedPrice ?? "")); setRequoteNotesInput(commission.artistNotes ?? ""); }}
                    disabled={updating}
                    className="flex items-center gap-1 rounded-full border border-violet-500/30 px-3 py-2.5 text-xs text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
                  >
                    Re-quote
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-violet-400/70">New quote</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs">$</span>
                    <input
                      type="number"
                      min="1"
                      value={requotePriceInput}
                      onChange={e => setRequotePriceInput(e.target.value)}
                      placeholder="Revised price"
                      className="w-full rounded-lg border border-violet-500/30 bg-stone-800 pl-6 pr-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:border-violet-500/50 focus:outline-none"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={requoteNotesInput}
                    onChange={e => setRequoteNotesInput(e.target.value)}
                    placeholder="Notes for the buyer…"
                    className="w-full resize-none rounded-lg border border-white/10 bg-stone-800 px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:border-violet-500/30 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRequote}
                      disabled={updating || !requotePriceInput}
                      className="flex-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-xs text-violet-300 py-2 font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-50"
                    >
                      {updating ? "Sending…" : "Send Revised Quote"}
                    </button>
                    <button
                      onClick={() => setRequoteMode(false)}
                      className="rounded-full border border-white/10 px-3 py-2 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {commission.status !== "pending" && commission.status !== "declined" && commission.status !== "quoted" && (
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

          {commission.artistNotes && !(commission.status === "quoted" && !isArtist) && (
            <div className="rounded-xl bg-stone-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-stone-600 mb-1">Artist notes</p>
              <p className="text-xs text-stone-400">{commission.artistNotes}</p>
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

          {commission.status !== "declined" && commission.status !== "cancelled" && (
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

type StatusFilter = "all" | "pending" | "quoted" | "countered" | "accepted" | "in_progress" | "completed" | "declined";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "quoted", label: "Quoted" },
  { key: "countered", label: "Countered" },
  { key: "accepted", label: "Accepted" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "declined", label: "Declined" },
];

const FILTER_ACTIVE_COLORS: Record<StatusFilter, string> = {
  all: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  pending: "bg-stone-700/60 text-stone-300 border-stone-600",
  quoted: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  countered: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  accepted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  in_progress: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  completed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  declined: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

export default function CommissionTracker() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);
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
    }

    const hlId = params.get("highlight");
    if (hlId) {
      setHighlightId(hlId);
    }

    if (depositPaidId || hlId) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleUpdate = (id: string, updates: Partial<Commission>) => {
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const effectiveFilter = highlightId ? "all" : statusFilter;

  const filtered = commissions.filter(c => {
    if (effectiveFilter === "all") return true;
    return c.status === effectiveFilter;
  });

  const countFor = (key: StatusFilter) => {
    if (key === "all") return commissions.length;
    return commissions.filter(c => c.status === key).length;
  };

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

        <div className="mb-6 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 pb-1 min-w-max">
            {STATUS_FILTERS.map(f => {
              const count = countFor(f.key);
              const isActive = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? FILTER_ACTIVE_COLORS[f.key]
                      : "border-white/10 text-stone-500 hover:text-stone-300 hover:border-white/20"
                  }`}
                >
                  {f.label}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isActive ? "bg-white/10" : "bg-stone-800 text-stone-500"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MessageCircle size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">
              {statusFilter === "all"
                ? "No commissions yet."
                : `No ${STATUS_FILTERS.find(f => f.key === statusFilter)?.label.toLowerCase()} commissions.`}
            </p>
            {statusFilter === "all" ? (
              <Link href="/discover" className="mt-3 inline-flex items-center gap-1 rounded-full border border-amber-500/30 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
                Find artists to commission
              </Link>
            ) : (
              <button onClick={() => setStatusFilter("all")} className="mt-3 inline-flex items-center gap-1 rounded-full border border-white/10 px-4 py-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors">
                Show all commissions
              </button>
            )}
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
                highlighted={commission.id === highlightId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
