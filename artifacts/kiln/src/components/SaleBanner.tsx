import { useEffect, useRef, useState } from "react";
import { ShoppingBag, X, BellOff } from "lucide-react";
import { useLocation } from "wouter";
import RelativeTime from "./RelativeTime";

export interface SaleInfo {
  text: string;
  link: string;
  fromName: string;
  arrivedAt: Date;
}

interface Props {
  sale: SaleInfo;
  queueLength: number;
  onDismiss: () => void;
  onSnooze: (durationMs: number) => void;
}

const AUTO_DISMISS_MS = 6_000;

const SNOOZE_OPTIONS: { label: string; ms: number }[] = [
  { label: "5 min", ms: 5 * 60 * 1000 },
  { label: "15 min", ms: 15 * 60 * 1000 },
  { label: "30 min", ms: 30 * 60 * 1000 },
];

export default function SaleBanner({ sale, queueLength, onDismiss, onSnooze }: Props) {
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [sale, onDismiss]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const bodyText = sale.text.replace(/^New sale:\s*/i, "");

  return (
    <div
      key={sale.arrivedAt.getTime()}
      role="status"
      aria-live="polite"
      className="animate-banner-slide-in fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
    >
      <div className="relative flex items-start gap-3 rounded-xl border border-green-500/30 bg-stone-900/95 backdrop-blur px-4 py-3 shadow-xl">
        <ShoppingBag size={18} className="mt-0.5 shrink-0 text-green-400" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-green-300 text-sm">New Sale!</span>
            {queueLength > 0 && (
              <span
                key={queueLength}
                className="animate-badge-pop rounded-full bg-green-500/20 border border-green-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-green-300 leading-none"
              >
                +{queueLength} more
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-stone-300 truncate">
            <span className="font-medium text-stone-200">{sale.fromName}</span>{" "}
            {bodyText}
          </p>
          <RelativeTime since={sale.arrivedAt} />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              navigate(sale.link);
              onDismiss();
            }}
            className="rounded-md px-2 py-1 text-xs font-medium text-green-300 border border-green-500/40 hover:bg-green-500/10 transition-colors"
          >
            View
          </button>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Snooze banners"
              title="Snooze"
              className="rounded-md p-1 text-stone-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <BellOff size={14} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-10 flex flex-col rounded-lg border border-amber-500/30 bg-stone-900 shadow-xl overflow-hidden">
                {SNOOZE_OPTIONS.map(({ label, ms }) => (
                  <button
                    key={ms}
                    onClick={() => {
                      setMenuOpen(false);
                      onSnooze(ms);
                    }}
                    className="whitespace-nowrap px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition-colors text-left"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded-md p-1 text-stone-500 hover:text-stone-300 hover:bg-stone-700/60 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
