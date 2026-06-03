import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface KilnSettings {
  notif_likes: boolean;
  notif_comments: boolean;
  notif_follows: boolean;
  notif_commissions: boolean;
  notif_workshops: boolean;
  notif_drops: boolean;
  notif_email_paused: boolean;
  notif_email_digest: boolean;
  notif_email_likes: boolean;
  notif_email_follows: boolean;
  notif_email_comments: boolean;
  notif_email_new_sale: boolean;
  notif_email_new_booking: boolean;
  notif_email_commission_payment: boolean;
  notif_email_new_commission: boolean;
  notif_email_new_patron: boolean;
  notif_email_outbid: boolean;
  notif_email_mentions: boolean;
  notif_email_shipped: boolean;
  notif_sms_paused: boolean;
  notif_sms_outbid: boolean;
  notif_sms_drops: boolean;
  notif_sms_shipped: boolean;
  workshopReminderOptOut: boolean;
  privacy_profile_public: boolean;
  privacy_show_location: boolean;
  privacy_allow_messages: boolean;
  display_dark_mode: boolean;
  display_compact: boolean;
  display_autoplay: boolean;
  display_sound: boolean;
  creator_mode: boolean;
  earnings_flash_ms: number;
  notif_msg_sound: boolean;
}

export const SETTING_KEY = "kiln_settings_v1";

export const PUSH_KEYS = [
  "notif_likes",
  "notif_comments",
  "notif_follows",
  "notif_commissions",
  "notif_workshops",
  "notif_drops",
] as const satisfies ReadonlyArray<keyof KilnSettings>;

export const EMAIL_KEYS = [
  "notif_email_digest",
  "notif_email_likes",
  "notif_email_follows",
  "notif_email_comments",
  "notif_email_new_sale",
  "notif_email_new_booking",
  "notif_email_commission_payment",
  "notif_email_new_commission",
  "notif_email_new_patron",
  "notif_email_outbid",
  "notif_email_mentions",
  "notif_email_shipped",
] as const satisfies ReadonlyArray<keyof KilnSettings>;

export interface NotifStatus {
  dimmed: boolean;
  warn: boolean;
}

/**
 * Derive the notification bell status from the current settings.
 *
 * dimmed — at least one major delivery channel is fully off:
 *   all push types disabled, OR email paused, OR all email types disabled.
 *
 * warn — email channel is misconfigured (matches Settings-page notifWarn):
 *   all email types disabled, OR email paused while some types are still
 *   configured. Shown as a warning dot on the bell.
 */
export function deriveNotifStatus(s: KilnSettings): NotifStatus {
  const allPushOff = PUSH_KEYS.every((k) => !s[k]);
  const activeEmailCount = EMAIL_KEYS.filter((k) => s[k]).length;
  const allEmailOff = activeEmailCount === 0;
  const emailPaused = s.notif_email_paused;

  const dimmed = allPushOff || emailPaused || allEmailOff;
  const warn = allEmailOff || (emailPaused && activeEmailCount > 0);

  return { dimmed, warn };
}

export function defaultSettings(): KilnSettings {
  return {
    notif_likes: true,
    notif_comments: true,
    notif_follows: true,
    notif_commissions: true,
    notif_workshops: true,
    notif_drops: true,
    notif_email_paused: false,
    notif_email_digest: false,
    notif_email_likes: false,
    notif_email_follows: false,
    notif_email_comments: false,
    notif_email_new_sale: true,
    notif_email_new_booking: true,
    notif_email_commission_payment: true,
    notif_email_new_commission: true,
    notif_email_new_patron: true,
    notif_email_outbid: true,
    notif_email_mentions: true,
    notif_email_shipped: true,
    notif_sms_paused: false,
    notif_sms_outbid: true,
    notif_sms_drops: true,
    notif_sms_shipped: true,
    workshopReminderOptOut: false,
    privacy_profile_public: true,
    privacy_show_location: true,
    privacy_allow_messages: true,
    display_dark_mode: true,
    display_compact: false,
    display_autoplay: true,
    display_sound: true,
    creator_mode: false,
    earnings_flash_ms: 2000,
    notif_msg_sound: true,
  };
}

export function readStoredSettings(): KilnSettings {
  try {
    return { ...defaultSettings(), ...JSON.parse(localStorage.getItem(SETTING_KEY) ?? "{}") };
  } catch {
    return defaultSettings();
  }
}

export function persistSettings(s: KilnSettings) {
  try { localStorage.setItem(SETTING_KEY, JSON.stringify(s)); } catch {}
}

interface SettingsContextType {
  settings: KilnSettings;
  settingsLoaded: boolean;
  updateSetting: (key: keyof KilnSettings) => void;
  patchSettings: (patch: Partial<KilnSettings>) => void;
  syncToServer: (s: KilnSettings) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings(),
  settingsLoaded: false,
  updateSetting: () => undefined,
  patchSettings: () => undefined,
  syncToServer: () => undefined,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<KilnSettings>(readStoredSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    // Wait for auth to resolve before deciding what to do
    if (isLoading) return;

    if (!isAuthenticated) {
      // Signed out — reset fetch flag so a subsequent sign-in re-hydrates from server
      fetched.current = false;
      setSettingsLoaded(true);
      return;
    }

    // Authenticated and haven't fetched yet in this session
    if (fetched.current) return;
    fetched.current = true;
    fetch("/api/me/settings", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ settings?: Partial<KilnSettings> }> : null)
      .then(data => {
        if (data?.settings) {
          const merged = { ...defaultSettings(), ...data.settings };
          setSettings(merged);
          persistSettings(merged);
        }
      })
      .catch(() => {})
      .finally(() => setSettingsLoaded(true));
  }, [isAuthenticated, isLoading]);

  function syncToServer(s: KilnSettings) {
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => {
      fetch("/api/me/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s }),
      }).catch(() => {});
    }, 800);
  }

  function updateSetting(key: keyof KilnSettings) {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      persistSettings(next);
      syncToServer(next);
      if (key === "display_dark_mode") {
        document.documentElement.classList.toggle("light", !next.display_dark_mode);
      }
      return next;
    });
  }

  function patchSettings(patch: Partial<KilnSettings>) {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      persistSettings(next);
      syncToServer(next);
      return next;
    });
  }

  return (
    <SettingsContext.Provider value={{ settings, settingsLoaded, updateSetting, patchSettings, syncToServer }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  return useContext(SettingsContext);
}
