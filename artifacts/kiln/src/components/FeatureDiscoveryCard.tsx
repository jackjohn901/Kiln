import { motion } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import type { DiscoveryFeature } from "@/lib/featureDiscovery";

interface Props {
  feature: DiscoveryFeature;
  onDismiss: () => void;
}

export default function FeatureDiscoveryCard({ feature, onDismiss }: Props) {
  const [, navigate] = useLocation();

  function handleExplore() {
    onDismiss();
    navigate(feature.path);
  }

  return (
    <motion.div
      className="pointer-events-auto fixed bottom-20 left-4 right-4 z-30"
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    >
      <div className="rounded-2xl border border-stone-700/60 bg-stone-950/96 shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25 text-2xl">
            {feature.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Try on Kiln
              </span>
            </div>
            <p className="text-sm font-semibold text-stone-100 leading-snug">
              {feature.tagline}
            </p>
            <p className="text-[11px] text-stone-400 leading-snug mt-0.5">
              {feature.description}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 mt-0.5 text-stone-600 hover:text-stone-400 transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-4 pb-4">
          <button
            onClick={handleExplore}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 active:scale-[0.98] transition-all"
          >
            Explore {feature.label}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
