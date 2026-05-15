import { Link } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle, Circle, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";

interface Step {
  key: string;
  label: string;
  href: string;
  check: (p: ReturnType<typeof useProfile>["profile"]) => boolean;
}

const STEPS: Step[] = [
  { key: "name", label: "Add your name", href: "/edit-profile", check: p => !!(p?.name && p.name.trim().length > 0) },
  { key: "bio", label: "Write a bio", href: "/edit-profile", check: p => !!(p?.bio && p.bio.trim().length > 20) },
  { key: "avatar", label: "Add a profile photo", href: "/edit-profile", check: p => !!(p?.avatarUrl && p.avatarUrl.trim().length > 0) },
  { key: "medium", label: "Set your medium", href: "/edit-profile", check: p => !!(p?.mediums && p.mediums.length > 0) },
  { key: "location", label: "Add your location", href: "/edit-profile", check: p => !!(p?.location && p.location.trim().length > 0) },
  { key: "website", label: "Add a website or Instagram", href: "/edit-profile", check: p => !!(p?.website || p?.instagram) },
  { key: "post", label: "Share your first post", href: "/create", check: () => false },
];

const DISMISS_KEY = "kiln_profile_completion_dismissed";

export default function ProfileCompletion() {
  const { profile } = useProfile();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  if (!profile || dismissed) return null;

  const completed = STEPS.filter(s => s.check(profile));
  const percent = Math.round((completed.length / STEPS.length) * 100);

  if (percent === 100) return null;

  const nextStep = STEPS.find(s => !s.check(profile));

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 to-stone-900/60 p-4 mb-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-amber-100">Complete your profile</p>
          <p className="text-xs text-stone-500 mt-0.5">{completed.length} of {STEPS.length} steps done</p>
        </div>
        <button onClick={dismiss} className="text-stone-600 hover:text-stone-400 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 w-full rounded-full bg-stone-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-amber-500"
        />
      </div>
      <p className="text-[11px] text-amber-400 font-bold mb-3">{percent}% complete</p>

      {/* Steps */}
      <div className="space-y-1.5 mb-3">
        {STEPS.map(step => {
          const done = step.check(profile);
          return (
            <div key={step.key} className="flex items-center gap-2">
              {done
                ? <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                : <Circle size={13} className="text-stone-600 shrink-0" />}
              <span className={`text-xs ${done ? "line-through text-stone-600" : "text-stone-400"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {nextStep && (
        <Link href={nextStep.href}>
          <button className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors">
            {nextStep.label} <ChevronRight size={11} />
          </button>
        </Link>
      )}
    </motion.div>
  );
}
