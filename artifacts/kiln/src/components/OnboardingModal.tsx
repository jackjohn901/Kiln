import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, X, ChevronRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { Link } from "wouter";

const DISMISSED_KEY = "kiln_onboarded_v1";

const CRAFTS = [
  { id: "ceramics", emoji: "🏺", label: "Ceramics" },
  { id: "glasswork", emoji: "🔥", label: "Glasswork" },
  { id: "weaving", emoji: "🧵", label: "Weaving" },
  { id: "woodwork", emoji: "🪵", label: "Woodwork" },
  { id: "metalwork", emoji: "⚒️", label: "Metalwork" },
  { id: "pottery", emoji: "🫙", label: "Pottery" },
  { id: "jewelry", emoji: "💍", label: "Jewelry" },
  { id: "printmaking", emoji: "🖨️", label: "Printmaking" },
  { id: "fiber-arts", emoji: "🎨", label: "Fiber Arts" },
  { id: "other", emoji: "✦", label: "Other" },
];

export default function OnboardingModal() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [craft, setCraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (profile === undefined) return;
    if (profile?.bio || profile?.handle) return;

    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, [user, profile]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  async function saveCraftAndContinue() {
    if (!craft) { setStep(2); return; }
    setSaving(true);
    try {
      await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medium: craft }),
      });
    } catch {}
    setSaving(false);
    setStep(2);
  }

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={step === 2 ? dismiss : undefined}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-stone-900 shadow-2xl overflow-hidden"
        >
          <button
            onClick={dismiss}
            className="absolute right-4 top-4 text-stone-600 hover:text-stone-400 transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>

          {step === 0 && (
            <div className="p-7">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Flame size={18} className="text-amber-400" />
                </div>
                <span className="text-lg font-bold text-amber-100">Welcome to Kiln</span>
              </div>
              <p className="text-sm text-stone-400 leading-relaxed mb-6">
                Kiln is a creator platform built exclusively for craft artists — ceramicists, glassblowers, weavers, woodworkers, and more.
              </p>
              <ul className="space-y-2 mb-7">
                {[
                  "Share your process in short-form video",
                  "Sell work directly, no middlemen",
                  "Build a patron community",
                  "Connect with fellow makers",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-stone-300">
                    <span className="mt-0.5 text-amber-500">✦</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                Get started <ChevronRight size={15} />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="p-7">
              <h2 className="text-base font-bold text-stone-100 mb-1">What do you make?</h2>
              <p className="text-xs text-stone-500 mb-5">Choose your primary craft so we can personalise your feed.</p>
              <div className="grid grid-cols-2 gap-2 mb-6 max-h-64 overflow-y-auto">
                {CRAFTS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCraft(c.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all text-left ${
                      craft === c.id
                        ? "border-amber-500 bg-amber-500/10 text-amber-300"
                        : "border-white/8 bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:border-white/15"
                    }`}
                  >
                    <span className="text-base">{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
              <button
                onClick={saveCraftAndContinue}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving…" : "Continue"} <ChevronRight size={15} />
              </button>
              <button onClick={dismiss} className="w-full mt-2 py-2 text-xs text-stone-600 hover:text-stone-400 transition-colors">
                Skip for now
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="p-7 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle size={22} className="text-emerald-400" />
                </div>
              </div>
              <h2 className="text-base font-bold text-stone-100 mb-1">You're all set!</h2>
              <p className="text-xs text-stone-500 mb-6">
                Complete your profile to help collectors and fellow artists find you.
              </p>
              <Link
                href="/edit-profile"
                onClick={dismiss}
                className="block w-full rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors text-center"
              >
                Complete my profile
              </Link>
              <button onClick={dismiss} className="w-full mt-2 py-2 text-xs text-stone-600 hover:text-stone-400 transition-colors">
                I'll do it later
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
