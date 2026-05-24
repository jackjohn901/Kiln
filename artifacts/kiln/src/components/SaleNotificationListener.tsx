import { useEffect, useCallback, useState, useRef } from "react";
import { BellOff } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import SaleBanner, { type SaleInfo } from "./SaleBanner";

const SNOOZE_MS = 5 * 60 * 1000;

export default function SaleNotificationListener() {
  const { subscribe } = useWebSocket();

  const [queue, setQueue] = useState<SaleInfo[]>([]);
  const queueRef = useRef<SaleInfo[]>([]);

  const [snoozeUntil, setSnoozeUntil] = useState<Date | null>(null);
  const snoozeUntilRef = useRef<Date | null>(null);
  const snoozeQueueRef = useRef<SaleInfo[]>([]);

  const [remainingSecs, setRemainingSecs] = useState(0);

  const handleNotification = useCallback((evt: Record<string, unknown>) => {
    const notifType = evt.notifType as string | undefined;
    if (notifType !== "sale") return;

    const text = (evt.text as string | undefined) ?? "You have a new sale!";
    const link = (evt.link as string | undefined) ?? "/earnings";
    const fromName = (evt.fromName as string | undefined) ?? "A buyer";

    const sale: SaleInfo = { text, link, fromName, arrivedAt: new Date() };

    if (snoozeUntilRef.current && new Date() < snoozeUntilRef.current) {
      snoozeQueueRef.current = [...snoozeQueueRef.current, sale];
    } else {
      queueRef.current = [...queueRef.current, sale];
      setQueue([...queueRef.current]);
    }
  }, []);

  useEffect(() => {
    return subscribe("notification", handleNotification);
  }, [subscribe, handleNotification]);

  useEffect(() => {
    if (!snoozeUntil) return;

    const tick = () => {
      const now = new Date();
      if (now >= snoozeUntil) {
        snoozeUntilRef.current = null;
        setSnoozeUntil(null);
        setRemainingSecs(0);
        if (snoozeQueueRef.current.length > 0) {
          queueRef.current = [...queueRef.current, ...snoozeQueueRef.current];
          snoozeQueueRef.current = [];
          setQueue([...queueRef.current]);
        }
        return;
      }
      setRemainingSecs(Math.ceil((snoozeUntil.getTime() - now.getTime()) / 1000));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [snoozeUntil]);

  const dismiss = useCallback(() => {
    queueRef.current = queueRef.current.slice(1);
    setQueue([...queueRef.current]);
  }, []);

  const snooze = useCallback(() => {
    const until = new Date(Date.now() + SNOOZE_MS);
    snoozeUntilRef.current = until;
    setSnoozeUntil(until);
    snoozeQueueRef.current = [...queueRef.current, ...snoozeQueueRef.current];
    queueRef.current = [];
    setQueue([]);
  }, []);

  const cancelSnooze = useCallback(() => {
    snoozeUntilRef.current = null;
    setSnoozeUntil(null);
    setRemainingSecs(0);
    if (snoozeQueueRef.current.length > 0) {
      queueRef.current = [...queueRef.current, ...snoozeQueueRef.current];
      snoozeQueueRef.current = [];
      setQueue([...queueRef.current]);
    }
  }, []);

  const snoozedCount = snoozeUntil ? snoozeQueueRef.current.length : 0;

  const mins = Math.floor(remainingSecs / 60);
  const secs = remainingSecs % 60;
  const countdownLabel = mins > 0
    ? `${mins}m ${String(secs).padStart(2, "0")}s`
    : `${remainingSecs}s`;

  return (
    <>
      {snoozeUntil && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-stone-900/95 backdrop-blur px-4 py-2.5 shadow-xl">
            <BellOff size={15} className="shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-amber-300">
                Banners snoozed — {countdownLabel} remaining
              </span>
              {snoozedCount > 0 && (
                <span className="ml-2 rounded-full bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 leading-none">
                  {snoozedCount} queued
                </span>
              )}
            </div>
            <button
              onClick={cancelSnooze}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-amber-300 border border-amber-500/40 hover:bg-amber-500/10 transition-colors"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {!snoozeUntil && queue.length > 0 && (() => {
        const [current, ...rest] = queue;
        return (
          <SaleBanner
            key={current.arrivedAt.getTime()}
            sale={current}
            queueLength={rest.length}
            onDismiss={dismiss}
            onSnooze={snooze}
          />
        );
      })()}
    </>
  );
}
