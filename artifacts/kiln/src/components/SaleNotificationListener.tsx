import { useEffect, useCallback, useState, useRef } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import SaleBanner, { type SaleInfo } from "./SaleBanner";

export default function SaleNotificationListener() {
  const { subscribe } = useWebSocket();
  const [queue, setQueue] = useState<SaleInfo[]>([]);
  const queueRef = useRef<SaleInfo[]>([]);

  const handleNotification = useCallback((evt: Record<string, unknown>) => {
    const notifType = evt.notifType as string | undefined;
    if (notifType !== "sale") return;

    const text = (evt.text as string | undefined) ?? "You have a new sale!";
    const link = (evt.link as string | undefined) ?? "/earnings";
    const fromName = (evt.fromName as string | undefined) ?? "A buyer";

    const sale: SaleInfo = { text, link, fromName, arrivedAt: new Date() };

    queueRef.current = [...queueRef.current, sale];
    setQueue([...queueRef.current]);
  }, []);

  useEffect(() => {
    return subscribe("notification", handleNotification);
  }, [subscribe, handleNotification]);

  const dismiss = useCallback(() => {
    queueRef.current = queueRef.current.slice(1);
    setQueue([...queueRef.current]);
  }, []);

  if (queue.length === 0) return null;

  const [current, ...rest] = queue;

  return (
    <SaleBanner
      key={current.arrivedAt.getTime()}
      sale={current}
      queueLength={rest.length}
      onDismiss={dismiss}
    />
  );
}
