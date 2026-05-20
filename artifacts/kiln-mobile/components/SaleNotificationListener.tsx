import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useWebSocket, type SaleEvent } from "@/lib/useWebSocket";
import { SaleBanner } from "@/components/SaleBanner";

/**
 * Maps a web-style path from the sale notification payload to the closest
 * available mobile route. The API consistently sends `/earnings` for sale
 * events; there is no dedicated earnings tab yet so we fall back to the
 * profile tab — the best current approximation for artist earnings info.
 */
function webLinkToMobileRoute(link: string): string {
  if (link.startsWith("/earnings")) return "/(tabs)/profile";
  if (link.startsWith("/profile")) return "/(tabs)/profile";
  if (link.startsWith("/notifications")) return "/(tabs)/notifications";
  return "/(tabs)/profile";
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
