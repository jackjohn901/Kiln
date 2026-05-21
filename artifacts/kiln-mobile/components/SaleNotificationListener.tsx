import { useCallback, useState } from "react";
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

export function SaleNotificationListener() {
  const [currentSale, setCurrentSale] = useState<SaleEvent | null>(null);
  const router = useRouter();

  const handleSale = useCallback((evt: SaleEvent) => {
    setCurrentSale(evt);
  }, []);

  useWebSocket({ onSaleNotification: handleSale });

  const handleDismiss = useCallback(() => {
    setCurrentSale(null);
  }, []);

  const handleView = useCallback(() => {
    if (!currentSale) return;
    const route = webLinkToMobileRoute(currentSale.link);
    setCurrentSale(null);
    router.push(route as Parameters<typeof router.push>[0]);
  }, [currentSale, router]);

  return (
    <SaleBanner
      sale={currentSale}
      onDismiss={handleDismiss}
      onView={handleView}
    />
  );
}
