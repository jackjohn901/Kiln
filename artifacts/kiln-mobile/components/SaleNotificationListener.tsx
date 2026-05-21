import { useCallback, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useWebSocket, type SaleEvent } from "@/lib/useWebSocket";
import { SaleBanner } from "@/components/SaleBanner";

/**
 * Maps a web-style path from the sale notification payload to the correct
 * mobile route.
 *
 * Pattern matching:
 *   /earnings/orders/:id  → /sales/:id  (deep-link to a specific sale)
 *   /earnings             → /sales       (seller sales list)
 *   /profile              → /(tabs)/profile
 *   /notifications        → /(tabs)/notifications
 */
function webLinkToMobileRoute(link: string): string {
  const earningsOrderMatch = link.match(/^\/earnings\/orders\/([^/?#]+)/);
  if (earningsOrderMatch) return `/sales/${earningsOrderMatch[1]}`;
  if (link.startsWith("/earnings")) return "/sales";
  if (link.startsWith("/profile")) return "/(tabs)/profile";
  if (link.startsWith("/notifications")) return "/(tabs)/notifications";
  return "/sales";
}

/**
 * How long to wait (ms) after dismissing a banner before showing the next
 * queued sale. This gives the slide-out spring animation time to complete
 * so the user sees a clear dismiss → reappear transition instead of an
 * in-place text swap.
 */
const BETWEEN_BANNERS_MS = 400;

export function SaleNotificationListener() {
  const [currentSale, setCurrentSale] = useState<SaleEvent | null>(null);
  const router = useRouter();

  // Keep a ref in sync with state so callbacks always read the latest value
  // without needing to be re-created on every render.
  const currentSaleRef = useRef<SaleEvent | null>(null);

  // Queue of sales that arrived while a banner was already visible.
  const queueRef = useRef<SaleEvent[]>([]);

  // Prevents concurrent dismiss→show transitions from racing each other.
  const isTransitioningRef = useRef(false);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Show the next queued sale, or mark the transition as finished. */
  const showNext = useCallback(() => {
    isTransitioningRef.current = false;
    const next = queueRef.current.shift();
    if (next) {
      currentSaleRef.current = next;
      setCurrentSale(next);
    }
  }, []);

  /**
   * Dismiss the current banner.  If sales are queued, a new one slides in
   * after BETWEEN_BANNERS_MS to give a visible dismiss → reappear cycle.
   */
  const dismiss = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    currentSaleRef.current = null;
    setCurrentSale(null);

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(showNext, BETWEEN_BANNERS_MS);
  }, [showNext]);

  const handleSale = useCallback(
    (evt: SaleEvent) => {
      if (currentSaleRef.current === null && !isTransitioningRef.current) {
        // Nothing showing — display immediately.
        currentSaleRef.current = evt;
        setCurrentSale(evt);
      } else {
        // Banner already visible (or mid-transition) — queue and dismiss the
        // current one so the user sees the old sale slide away and the new one
        // slide in.
        queueRef.current.push(evt);
        dismiss();
      }
    },
    [dismiss],
  );

  useWebSocket({ onSaleNotification: handleSale });

  const handleDismiss = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleView = useCallback(() => {
    const sale = currentSaleRef.current;
    if (!sale) return;
    const route = webLinkToMobileRoute(sale.link);
    dismiss();
    router.push(route as Parameters<typeof router.push>[0]);
  }, [dismiss, router]);

  return (
    <SaleBanner
      sale={currentSale}
      onDismiss={handleDismiss}
      onView={handleView}
    />
  );
}
