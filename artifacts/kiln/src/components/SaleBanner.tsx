import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useLocation } from "wouter";

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
}

function relativeLabel(since: Date): string {
  const diffMs = Date.now() - since.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hr ago";
  return `${diffHr} hr ago`;
}

function RelativeTime({ since }: { since: Date }) {
  const [label, setLabel] = useState(() => relativeLabel(since));
  useEffect(() => {
    const id = setInterval(() => setLabel(relativeLabel(since)), 30_000);
    return () => clearInterval(id);
  }, [since]);
  return <span className="text-xs text-stone-500">{label}</span>;
}

const AUTO_DISMISS_MS = 6_000;

export default function SaleBanner({ sale, queueLength, onDismiss }: Props) {
  const [, navigate] = useLocation();

  useEffect(() => {
    const id = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [sale, onDismiss]);

  const bodyText = sale.text.replace(/^New sale:\s*/i, "");

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
    >
      <div className="relative flex items-start gap-3 rounded-xl border border-green-500/30 bg-stone-900/95 backdrop-blur px-4 py-3 shadow-xl">
        <ShoppingBag size={18} className="mt-0.5 shrink-0 text-green-400" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-green-300 text-sm">New Sale!</span>
            {queueLength > 0 && (
              <span className="rounded-full bg-green-500/20 border border-green-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-green-300 leading-none">
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
