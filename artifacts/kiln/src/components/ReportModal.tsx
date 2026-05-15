import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag, CheckCircle } from "lucide-react";

const REASONS = [
  "Spam or misleading",
  "Inappropriate content",
  "Harassment or hate speech",
  "Copyright infringement",
  "Dangerous or harmful",
  "Other",
];

const STORAGE_KEY = "kiln_reports_v1";

function hasReported(postId: string): boolean {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return ids.includes(postId);
  } catch {
    return false;
  }
}

function saveReport(postId: string) {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!ids.includes(postId)) ids.push(postId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

interface Props {
  postId: string;
  artistName: string;
  onClose: () => void;
}

export default function ReportModal({ postId, artistName, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [submitted, setSubmitted] = useState(hasReported(postId));

  function handleSubmit() {
    if (!selected) return;
    saveReport(postId);
    setSubmitted(true);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-stone-950 p-6 shadow-2xl"
        >
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-stone-100">Report submitted</p>
                <p className="mt-1 text-sm text-stone-500">
                  Thank you for keeping Kiln safe. We review all reports within 24 hours.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 rounded-full bg-stone-800 px-6 py-2 text-sm font-medium text-stone-300 hover:bg-stone-700 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-stone-100">Report post</h3>
                  <p className="text-xs text-stone-500 mt-0.5">by {artistName}</p>
                </div>
                <button onClick={onClose} className="text-stone-600 hover:text-stone-300 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelected(r)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm text-left transition-all ${
                      selected === r
                        ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                        : "border-white/8 bg-white/3 text-stone-400 hover:border-white/15 hover:text-stone-200"
                    }`}
                  >
                    <div className={`h-3.5 w-3.5 rounded-full border-2 shrink-0 transition-all ${selected === r ? "border-rose-400 bg-rose-400" : "border-stone-600"}`} />
                    {r}
                  </button>
                ))}
              </div>

              {selected === "Other" && (
                <textarea
                  rows={2}
                  placeholder="Tell us more…"
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
              )}

              <button
                onClick={handleSubmit}
                disabled={!selected || (selected === "Other" && !other.trim())}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-400 disabled:opacity-40"
              >
                <Flag size={14} />
                Submit Report
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
