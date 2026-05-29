import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "expo-router";
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
 * Brief pause (ms) between the slide-out animation completing and the next
 * queued banner sliding in. Keeps the transition from feeling too instant.
 */
const POST_ANIMATION_GAP_MS = 80;

export function SaleNotificationListener() {
  const [currentSale, setCurrentSale] = useState<SaleEvent | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Keep a ref in sync with state so callbacks always read the latest value
  // without needing to be re-created on every render.
  const currentSaleRef = useRef<SaleEvent | null>(null);

  // Queue of sales that arrived while a banner was already visible.
  const queueRef = useRef<SaleEvent[]>([]);

  // Prevents concurrent dismiss→show transitions from racing each other.
  const isTransitioningRef = useRef(false);

  const postAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  /**
   * Called by SaleBanner once the slide-out animation has fully completed.
   * Shows the next queued sale (with a tiny gap) or marks the transition done.
   */
  const handleAnimatedOut = useCallback(() => {
    if (postAnimationTimerRef.current)
      clearTimeout(postAnimationTimerRef.current);
    postAnimationTimerRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      const next = queueRef.current.shift();
      if (next) {
        currentSaleRef.current = next;
        setCurrentSale(next);
      }
    }, POST_ANIMATION_GAP_MS);
  }, []);

  /**
   * Dismiss the current banner. The slide-out animation runs inside SaleBanner,
   * and onAnimatedOut fires once it finishes to trigger the next queued item.
   */
  const dismiss = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    currentSaleRef.current = null;
    setCurrentSale(null);
  }, []);

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

  // Auto-dismiss when the artist is already on the sales list, a sale detail,
  // or the Earnings tab — all show sale-related financial data.
  useEffect(() => {
    const onSalesRoute =
      pathname === "/sales" ||
      pathname.startsWith("/sales/") ||
      pathname === "/earnings" ||
      pathname === "/(tabs)/earnings";
    if (onSalesRoute && currentSaleRef.current !== null) {
      dismiss();
    }
  }, [pathname, dismiss]);

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
      onAnimatedOut={handleAnimatedOut}
    />
  );
}
