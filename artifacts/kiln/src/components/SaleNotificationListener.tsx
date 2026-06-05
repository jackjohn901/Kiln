import { useEffect, useCallback, useState, useRef } from "react";
import { useLocation } from "wouter";
import { BellOff } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import SaleBanner, { SNOOZE_OPTIONS, type SaleInfo } from "./SaleBanner";

const SS_SNOOZE_UNTIL = "kiln_snooze_until";
const SS_SNOOZE_QUEUE = "kiln_snooze_queue";
const SS_SALE_QUEUE   = "kiln_sale_queue";
const SS_SNOOZE_MS    = "kiln_snooze_ms";

const LS_SNOOZE_PREF  = "kiln_snooze_pref";

const DEFAULT_SNOOZE_MS = SNOOZE_OPTIONS[0].ms;

function readSnoozePref(): number {
  try {
    const raw = localStorage.getItem(LS_SNOOZE_PREF);
    if (!raw) return DEFAULT_SNOOZE_MS;
    const ms = Number(raw);
    if (SNOOZE_OPTIONS.some((o) => o.ms === ms)) return ms;
  } catch {
    /* ignore */
  }
  return DEFAULT_SNOOZE_MS;
}

function serializeSales(sales: SaleInfo[]): string {
  return JSON.stringify(sales.map((s) => ({ ...s, arrivedAt: s.arrivedAt.toISOString() })));
}

function deserializeSales(raw: string | null): SaleInfo[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed
      .map((s) => {
        if (
          typeof s.text !== "string" ||
          typeof s.link !== "string" ||
          typeof s.fromName !== "string"
        ) return null;
        const arrivedAt = new Date(s.arrivedAt as string);
        if (isNaN(arrivedAt.getTime())) return null;
        return { text: s.text, link: s.link, fromName: s.fromName, arrivedAt } as SaleInfo;
      })
      .filter((s): s is SaleInfo => s !== null);
  } catch {
    return [];
  }
}

function readSnoozeUntil(): Date | null {
  const raw = sessionStorage.getItem(SS_SNOOZE_UNTIL);
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime()) || d <= new Date()) return null;
  return d;
}

function readSnoozeMs(): number {
  const raw = sessionStorage.getItem(SS_SNOOZE_MS);
  const ms = Number(raw);
  if (Number.isFinite(ms) && ms > 0) return ms;
  return DEFAULT_SNOOZE_MS;
}

function computeInitialState() {
  const storedSnoozeUntil  = readSnoozeUntil();
  const storedSnoozeQueue  = deserializeSales(sessionStorage.getItem(SS_SNOOZE_QUEUE));
  const storedVisibleQueue = deserializeSales(sessionStorage.getItem(SS_SALE_QUEUE));

  if (!storedSnoozeUntil) {
    // Snooze has expired or was never active — drain any queued snoozed sales into the visible queue
    const mergedQueue = [...storedVisibleQueue, ...storedSnoozeQueue] as SaleInfo[];
    sessionStorage.removeItem(SS_SNOOZE_UNTIL);
    sessionStorage.removeItem(SS_SNOOZE_QUEUE);
    sessionStorage.removeItem(SS_SNOOZE_MS);
    // Persist the merged queue immediately so further navigations still find it
    sessionStorage.setItem(SS_SALE_QUEUE, serializeSales(mergedQueue));
    return {
      queue:       mergedQueue,
      snoozeUntil: null as Date | null,
      snoozeQueue: [] as SaleInfo[],
      snoozeMs:    DEFAULT_SNOOZE_MS,
    };
  }

  return {
    queue:       storedVisibleQueue,
    snoozeUntil: storedSnoozeUntil,
    snoozeQueue: storedSnoozeQueue,
    snoozeMs:    readSnoozeMs(),
  };
}

export default function SaleNotificationListener() {
  const { subscribe } = useWebSocket();

  // Compute initial state once (lazy initializer runs only on mount)
  const [initialState] = useState(computeInitialState);

  const [queue, setQueue]           = useState<SaleInfo[]>(initialState.queue);
  const queueRef                    = useRef<SaleInfo[]>(initialState.queue);

  const [snoozeUntil, setSnoozeUntil] = useState<Date | null>(initialState.snoozeUntil);
  const snoozeUntilRef                = useRef<Date | null>(initialState.snoozeUntil);
  const snoozeQueueRef                = useRef<SaleInfo[]>(initialState.snoozeQueue);

  const [activeSnoozeMs, setActiveSnoozeMs] = useState<number>(initialState.snoozeMs);

  const [remainingSecs, setRemainingSecs] = useState(0);

  const [preferredSnoozeMs, setPreferredSnoozeMs] = useState(readSnoozePref);

  const persistAll = useCallback(() => {
    if (snoozeUntilRef.current) {
      sessionStorage.setItem(SS_SNOOZE_UNTIL, snoozeUntilRef.current.toISOString());
    } else {
      sessionStorage.removeItem(SS_SNOOZE_UNTIL);
      sessionStorage.removeItem(SS_SNOOZE_MS);
    }
    sessionStorage.setItem(SS_SNOOZE_QUEUE, serializeSales(snoozeQueueRef.current));
    sessionStorage.setItem(SS_SALE_QUEUE,   serializeSales(queueRef.current));
  }, []);

  const handleNotification = useCallback((evt: Record<string, unknown>) => {
    const notifType = evt.notifType as string | undefined;
    if (notifType !== "sale") return;

    const text     = (evt.text     as string | undefined) ?? "You have a new sale!";
    const link     = (evt.link     as string | undefined) ?? "/earnings";
    const fromName = (evt.fromName as string | undefined) ?? "A buyer";

    const sale: SaleInfo = { text, link, fromName, arrivedAt: new Date() };

    if (snoozeUntilRef.current && new Date() < snoozeUntilRef.current) {
      snoozeQueueRef.current = [...snoozeQueueRef.current, sale];
    } else {
      queueRef.current = [...queueRef.current, sale];
      setQueue([...queueRef.current]);
    }
    persistAll();
  }, [persistAll]);

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
        persistAll();
        return;
      }
      setRemainingSecs(Math.ceil((snoozeUntil.getTime() - now.getTime()) / 1000));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [snoozeUntil, persistAll]);

  const dismiss = useCallback(() => {
    queueRef.current = queueRef.current.slice(1);
    setQueue([...queueRef.current]);
    persistAll();
  }, [persistAll]);

  // Auto-dismiss the visible banner when the artist navigates to its linked page.
  const [location] = useLocation();
  const prevLocationRef = useRef(location);
  useEffect(() => {
    if (prevLocationRef.current === location) return;
    prevLocationRef.current = location;
    if (snoozeUntilRef.current) return;
    const current = queueRef.current[0];
    if (!current) return;
    const linkPath = current.link.split(/[?#]/)[0];
    if (location === linkPath) dismiss();
  }, [location, dismiss]);

  const snooze = useCallback((durationMs: number) => {
    setPreferredSnoozeMs(durationMs);
    setActiveSnoozeMs(durationMs);
    try {
      localStorage.setItem(LS_SNOOZE_PREF, String(durationMs));
    } catch {
      /* ignore */
    }
    sessionStorage.setItem(SS_SNOOZE_MS, String(durationMs));
    const until = new Date(Date.now() + durationMs);
    snoozeUntilRef.current = until;
    setSnoozeUntil(until);
    snoozeQueueRef.current = [...queueRef.current, ...snoozeQueueRef.current];
    queueRef.current = [];
    setQueue([]);
    persistAll();
  }, [persistAll]);

  const cancelSnooze = useCallback(() => {
    snoozeUntilRef.current = null;
    setSnoozeUntil(null);
    setRemainingSecs(0);
    if (snoozeQueueRef.current.length > 0) {
      queueRef.current = [...queueRef.current, ...snoozeQueueRef.current];
      snoozeQueueRef.current = [];
      setQueue([...queueRef.current]);
    }
    persistAll();
  }, [persistAll]);

  const snoozedCount = snoozeUntil ? snoozeQueueRef.current.length : 0;

  const mins = Math.floor(remainingSecs / 60);
  const secs = remainingSecs % 60;
  const countdownLabel = mins > 0
    ? `${mins}m ${String(secs).padStart(2, "0")}s`
    : `${remainingSecs}s`;

  const snoozeDurationMins = Math.round(activeSnoozeMs / 60000);
  const snoozeDurationLabel = `${snoozeDurationMins}-min snooze`;

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
                {snoozeDurationLabel} — {countdownLabel} remaining
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
            preferredSnoozeMs={preferredSnoozeMs}
          />
        );
      })()}
    </>
  );
}
