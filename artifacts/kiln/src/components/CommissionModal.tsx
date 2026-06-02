import { useState, useRef } from "react";
import { X, CheckCircle, Lock, Clock, Upload, Loader2 } from "lucide-react";
import { useSocial, CommissionStatus } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useUpload } from "@/hooks/useUpload";

const BUDGETS = ["Under $500", "$500–$2,000", "$2,000–$5,000", "$5,000–$15,000", "$15,000+", "Open to discussion"];
const TIMELINES = ["ASAP", "1–3 months", "3–6 months", "6–12 months", "No rush — whenever you're ready"];
const TYPES = [
  { value: "custom", label: "Custom piece", desc: "A one-of-a-kind work made to your brief" },
  { value: "series", label: "Series commission", desc: "Multiple related works in sequence" },
  { value: "workshop", label: "Private workshop", desc: "Learn a technique in a dedicated session" },
  { value: "reproduction", label: "Reproduction rights", desc: "License an existing work for production" },
];

const STATUS_UI: Record<CommissionStatus, { icon: typeof CheckCircle; label: string; color: string }> = {
  open: { icon: CheckCircle, label: "Open for commissions", color: "text-emerald-400" },
  waitlisted: { icon: Clock, label: "Currently waitlisted", color: "text-amber-400" },
  closed: { icon: Lock, label: "Not accepting commissions", color: "text-rose-400" },
};

interface Props {
  artistId: string;
  artistName: string;
  artistAvatarUrl: string;
  commissionStatus: CommissionStatus;
  onClose: () => void;
}

export default function CommissionModal({ artistId, artistName, artistAvatarUrl, commissionStatus, onClose }: Props) {
  const { addNotification } = useSocial();
  const { profile } = useProfile();

  const [step, setStep] = useState<"form" | "success">("form");
  const [type, setType] = useState<"custom" | "series" | "workshop" | "reproduction">("custom");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [fromName, setFromName] = useState(profile?.name ?? "");
  const [fromEmail, setFromEmail] = useState("");

  const { upload, uploading: imageUploading } = useUpload();
  const [refImages, setRefImages] = useState<Array<{ previewUrl: string; servingUrl: string }>>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleRefImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (refImages.length >= 5) { setUploadError("You can attach up to 5 images."); return; }
    if (!file.type.startsWith("image/")) { setUploadError("Only image files can be attached."); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("Image must be 10 MB or smaller."); return; }
    setUploadError(null);
    const previewUrl = URL.createObjectURL(file);
    try {
      const result = await upload(file);
      setRefImages(prev => [...prev, { previewUrl, servingUrl: result.servingUrl }]);
    } catch {
      URL.revokeObjectURL(previewUrl);
      setUploadError("Image upload failed. Please try again.");
    }
  }

  function removeRefImage(idx: number) {
    setRefImages(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].previewUrl);
      next.splice(idx, 1);
      return next;
    });
  }

  const statusUI = STATUS_UI[commissionStatus];

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!description || !budget || !timeline || !fromName || !fromEmail) return;
    if (imageUploading) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch("/api/commissions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          artistName,
          workType: type,
          description,
          budgetRange: budget,
          timeline,
          dimensions: dimensions || undefined,
          referenceUrls: refImages.map(img => img.servingUrl),
        }),
      });
      if (!r.ok) {
        setSubmitError("Couldn\u2019t send your inquiry. Please check your connection and try again.");
        setSubmitting(false);
        return;
      }
      addNotification({
        type: "commission",
        fromId: "system",
        fromName: artistName,
        fromAvatarUrl: artistAvatarUrl,
        text: `Your commission inquiry to ${artistName} has been sent.`,
        link: `/artists/${artistId}`,
      });
      setStep("success");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  const canSubmit = description.trim() && budget && timeline && fromName.trim() && fromEmail.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full sm:max-w-lg bg-stone-900 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <img src={artistAvatarUrl} alt={artistName} className="w-9 h-9 rounded-full object-cover" />
            <div>
              <p className="text-sm font-semibold text-stone-100">Commission {artistName}</p>
              <p className={`text-xs flex items-center gap-1 ${statusUI.color}`}>
                <statusUI.icon size={11} />
                {statusUI.label}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X size={20} />
          </button>
        </div>

        {step === "success" ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-stone-100 mb-2">Inquiry sent</h3>
            <p className="text-sm text-stone-400 max-w-xs">
              {artistName} will typically respond within a few days. You'll receive an email at {fromEmail}.
            </p>
            <button onClick={onClose} className="mt-8 px-6 py-2.5 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-5">
            {commissionStatus === "closed" && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-sm text-rose-300">
                {artistName} is not currently accepting new commissions. You can still submit an inquiry and they may reach out when they reopen.
              </div>
            )}
            {commissionStatus === "waitlisted" && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
                {artistName} is waitlisted — submitting now will add you to their queue for when they reopen.
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Commission type</p>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value as typeof type)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      type === t.value
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-stone-700 hover:border-stone-500"
                    }`}
                  >
                    <p className="text-xs font-semibold text-stone-100">{t.label}</p>
                    <p className="text-xs text-stone-500 mt-0.5 leading-snug">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                Describe what you have in mind
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dimensions, colours, technique, where it will live, any reference images you can share…"
                rows={4}
                className="w-full bg-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Budget</label>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      budget === b ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-stone-700 text-stone-400 hover:border-stone-500"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Timeline</label>
              <div className="flex flex-wrap gap-2">
                {TIMELINES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeline(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      timeline === t ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-stone-700 text-stone-400 hover:border-stone-500"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                Dimensions / Scale <span className="text-stone-600 normal-case font-normal">(optional)</span>
              </label>
              <input
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder='e.g. 18" × 24", or "table-top sized"'
                className="w-full bg-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                Reference images <span className="text-stone-600 normal-case font-normal">(optional, up to 5)</span>
              </label>
              {refImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {refImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={img.previewUrl}
                        alt={`Reference ${idx + 1}`}
                        className="h-14 w-14 rounded-lg object-cover border border-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => removeRefImage(idx)}
                        className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-stone-700 border border-white/20 text-stone-400 hover:text-rose-400 transition-colors"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {refImages.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs text-stone-400 hover:border-amber-500/40 hover:text-amber-400 transition-colors disabled:opacity-50"
                >
                  {imageUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {imageUploading ? "Uploading…" : "Upload photo"}
                </button>
              )}
              {uploadError && <p className="mt-1 text-xs text-rose-400">{uploadError}</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleRefImageSelect}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Your name</label>
                <input
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Email</label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-rose-400 text-center">{submitError}</p>
            )}

            <button
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || submitting || imageUploading}
              className="w-full py-3 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors"
            >
              {submitting ? "Sending…" : "Send inquiry"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
