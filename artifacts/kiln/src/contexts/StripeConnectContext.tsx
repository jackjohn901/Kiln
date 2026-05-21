import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useProfile } from "@/contexts/ProfileContext";

interface StripeConnectStatus {
  connected: boolean;
  status: string | null;
  chargesEnabled: boolean;
  accountId?: string | null;
  disabledReason?: string | null;
  requirementsCurrentDeadline?: number | null;
  requirementsEventuallyDue?: number;
  requirementsPastDue?: number;
}

interface StripeConnectContextValue {
  status: StripeConnectStatus | null;
  loading: boolean;
  refresh: () => void;
  hasWarning: boolean;
  hasUrgent: boolean;
  bannerDismissed: boolean;
  dismissBanner: () => void;
}

const StripeConnectContext = createContext<StripeConnectContextValue>({
  status: null,
  loading: false,
  refresh: () => undefined,
  hasWarning: false,
  hasUrgent: false,
  bannerDismissed: false,
  dismissBanner: () => undefined,
});

const STORAGE_KEY_WARNING = "stripe-banner-dismissed-warning";
const STORAGE_KEY_URGENT = "stripe-banner-dismissed-urgent";

function readDismissedKeys(): Set<string> {
  const keys = new Set<string>();
  if (localStorage.getItem(STORAGE_KEY_WARNING) === "true") keys.add(STORAGE_KEY_WARNING);
  if (localStorage.getItem(STORAGE_KEY_URGENT) === "true") keys.add(STORAGE_KEY_URGENT);
  return keys;
}

export function StripeConnectProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(readDismissedKeys);

  const fetch_ = useCallback(async () => {
    if (!profile) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/me/stripe/connect/status", { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as StripeConnectStatus;
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void fetch_();
  }, [fetch_]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const eventuallyDue = status?.requirementsEventuallyDue ?? 0;
      const pastDue = status?.requirementsPastDue ?? 0;
      if (eventuallyDue > 0 || pastDue > 0) {
        void fetch_();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetch_, status?.requirementsEventuallyDue, status?.requirementsPastDue]);

  const eventuallyDue = status?.requirementsEventuallyDue ?? 0;
  const pastDue = status?.requirementsPastDue ?? 0;
  const hasUrgent = pastDue > 0 || !!status?.disabledReason;
  const hasWarning = !hasUrgent && eventuallyDue > 0;

  const bannerKey = hasUrgent
    ? STORAGE_KEY_URGENT
    : hasWarning
      ? STORAGE_KEY_WARNING
      : null;

  const bannerDismissed = bannerKey !== null && dismissedKeys.has(bannerKey);

  const dismissBanner = useCallback(() => {
    if (!bannerKey) return;
    localStorage.setItem(bannerKey, "true");
    setDismissedKeys(prev => new Set([...prev, bannerKey]));
  }, [bannerKey]);

  return (
    <StripeConnectContext.Provider
      value={{ status, loading, refresh: () => { void fetch_(); }, hasWarning, hasUrgent, bannerDismissed, dismissBanner }}
    >
      {children}
    </StripeConnectContext.Provider>
  );
}

export function useStripeConnect(): StripeConnectContextValue {
  return useContext(StripeConnectContext);
}
