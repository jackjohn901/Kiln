import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { ChevronLeft, Bell, Shield, User, Palette, Globe, Trash2, LogOut, ChevronRight, Moon, Smartphone, Mail, Eye, EyeOff, Volume2, CreditCard, Check, Truck, Copy, Share2, AlertTriangle, Flame, Leaf, BookOpen, Link2, MapPin } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { useSettings, type KilnSettings } from "@/contexts/SettingsContext";
import { readPaymentSettings, savePaymentSettings, formatProcessingWindowLabel, type ArtistPayments } from "@/utils/paymentSettings";
import { useStripeConnect } from "@/contexts/StripeConnectContext";

const SHIPPING_KEY = "kiln_shipping_v1";

const SHIPS_TO_OPTIONS = ["Worldwide", "United States", "Canada", "Europe", "Australia", "United Kingdom"];

interface ShippingSettings {
  domesticRate: number;
  internationalRate: number;
  perItemRate: number;
  freeThreshold: number;
  offerFreeShipping: boolean;
  shipsTo: string[];
}

function defaultShipping(): ShippingSettings {
  return { domesticRate: 18, internationalRate: 45, perItemRate: 0, freeThreshold: 500, offerFreeShipping: false, shipsTo: [] };
}

function readShippingSettings(): ShippingSettings {
  try { return { ...defaultShipping(), ...JSON.parse(localStorage.getItem(SHIPPING_KEY) ?? "{}") }; }
  catch { return defaultShipping(); }
}

function saveShippingSettings(s: ShippingSettings) {
  try { localStorage.setItem(SHIPPING_KEY, JSON.stringify(s)); } catch {}
}


interface DefaultShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

function defaultAddress(): DefaultShippingAddress {
  return { street: "", city: "", state: "", zip: "", country: "" };
}

type Section = "notifications" | "privacy" | "display" | "account" | "payments" | "shipping" | "address";
type MobileTab = "All" | "Profile" | "Selling" | "Preferences";

export default function Settings() {
  const { profile, logout } = useProfile();
  const { settings, settingsLoaded, updateSetting, patchSettings } = useSettings();
  const { bannerDismissed, resetDismissal } = useStripeConnect();
  const search = useSearch();
  const [section, setSection] = useState<Section | null>(() => {
    const params = new URLSearchParams(search);
    const s = params.get("section");
    const valid: Section[] = ["notifications", "privacy", "display", "account", "payments", "shipping", "address"];
    return (s && (valid as string[]).includes(s)) ? (s as Section) : null;
  });
  const [saved, setSaved] = useState(false);
  const [payments, setPayments] = useState<ArtistPayments>(readPaymentSettings);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [shipping, setShipping] = useState<ShippingSettings>(readShippingSettings);
  const [shippingSaved, setShippingSaved] = useState(false);
  const [avgListingPrice, setAvgListingPrice] = useState<number | null>(null);
  const [samplePrice, setSamplePrice] = useState<number>(45);
  const [contactEmail, setContactEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailValidationError, setEmailValidationError] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneValidationError, setPhoneValidationError] = useState(false);
  const [address, setAddress] = useState<DefaultShippingAddress>(defaultAddress);
  const [addressSaved, setAddressSaved] = useState(false);
  const [emailPausedAt, setEmailPausedAt] = useState<string | null>(null);
  const [emailResumeAt, setEmailResumeAt] = useState<string | null>(null);
  const [snoozePickerOpen, setSnoozePickerOpen] = useState(false);
  const [smsResumeAt, setSmsResumeAt] = useState<string | null>(null);
  const [smsSnoozePickerOpen, setSmsSnoozePickerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("All");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  function setTimedError(setter: (v: string | null) => void, msg: string) {
    setter(msg);
    setTimeout(() => setter(null), 4000);
  }

  useEffect(() => {
    fetch("/api/me/listings", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ listings: Array<{ price: number; status?: string }> }> : null)
      .then(data => {
        if (!data?.listings?.length) return;
        const active = data.listings.filter(l => !l.status || l.status === "active" || l.status === "live");
        const source = active.length > 0 ? active : data.listings;
        const avg = Math.round(source.reduce((sum, l) => sum + l.price, 0) / source.length);
        setAvgListingPrice(avg);
        setSamplePrice(avg);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/me/settings", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ shippingSettings?: ShippingSettings; paymentSettings?: ArtistPayments; contactEmail?: string | null; defaultShippingAddress?: DefaultShippingAddress | null; notifEmailPausedAt?: string | null; notifEmailResumeAt?: string | null; notifSmsResumeAt?: string | null }> : null)
      .then(data => {
        if (!data) return;
        if (data.shippingSettings && Object.keys(data.shippingSettings).length > 0) {
          setShipping(s => ({ ...s, ...data.shippingSettings }));
          saveShippingSettings({ ...defaultShipping(), ...data.shippingSettings });
        }
        if (data.paymentSettings && Object.keys(data.paymentSettings).length > 0) {
          setPayments(s => ({ ...s, ...data.paymentSettings }));
          savePaymentSettings({ ...data.paymentSettings } as ArtistPayments);
        }
        setContactEmail(data.contactEmail ?? "");
        setPhoneNumber((data as Record<string, unknown>).phoneNumber as string ?? "");
        if (data.defaultShippingAddress) {
          setAddress({ ...defaultAddress(), ...data.defaultShippingAddress });
        }
        setEmailPausedAt(data.notifEmailPausedAt ?? null);
        setEmailResumeAt(data.notifEmailResumeAt ?? null);
        setSmsResumeAt(data.notifSmsResumeAt ?? null);
      })
      .catch(() => {});
  }, []);

  function toggle(key: keyof KilnSettings) {
    if (key === "notif_email_paused") {
      const turningOn = !settings.notif_email_paused;
      if (turningOn) {
        setEmailPausedAt(new Date().toISOString());
      } else {
        setEmailPausedAt(null);
        setEmailResumeAt(null);
      }
    }
    updateSetting(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  // SNOOZE_OPTIONS: label → duration in milliseconds (null = indefinite)
  const SNOOZE_OPTIONS: { label: string; ms: number | null }[] = [
    { label: "1 day", ms: 24 * 60 * 60 * 1000 },
    { label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
    { label: "1 week", ms: 7 * 24 * 60 * 60 * 1000 },
    { label: "Indefinitely", ms: null },
  ];

  function applySnooze(ms: number | null) {
    const resumeAt = ms !== null ? new Date(Date.now() + ms).toISOString() : null;
    setEmailResumeAt(resumeAt);
    setEmailPausedAt(new Date().toISOString());
    setSnoozePickerOpen(false);
    // Update settings boolean
    patchSettings({ notif_email_paused: true });
    // Persist resume timestamp separately
    fetch("/api/me/settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifEmailResumeAt: resumeAt }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      })
      .catch(() => { setSaveError("Couldn\u2019t snooze notifications."); });
  }

  function clearSnooze() {
    setEmailResumeAt(null);
    setEmailPausedAt(null);
    setSnoozePickerOpen(false);
    patchSettings({ notif_email_paused: false });
    setSaveError(null);
    fetch("/api/me/settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifEmailResumeAt: null }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      })
      .catch(() => { setSaveError("Couldn\u2019t clear snooze."); });
  }

  function snoozeCountdown(): string | null {
    if (!emailResumeAt) return null;
    const ms = new Date(emailResumeAt).getTime() - Date.now();
    if (ms <= 0) return null;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 24) return hours <= 1 ? "less than 1 hour" : `${hours} hours`;
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return days === 1 ? "1 day" : `${days} days`;
  }

  function applySmsSnooze(ms: number | null) {
    const resumeAt = ms !== null ? new Date(Date.now() + ms).toISOString() : null;
    setSmsResumeAt(resumeAt);
    setSmsSnoozePickerOpen(false);
    patchSettings({ notif_sms_paused: true });
    fetch("/api/me/settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifSmsResumeAt: resumeAt }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      })
      .catch(() => { setSaveError("Couldn\u2019t snooze SMS notifications."); });
  }

  function clearSmsSnooze() {
    setSmsResumeAt(null);
    setSmsSnoozePickerOpen(false);
    patchSettings({ notif_sms_paused: false });
    setSaveError(null);
    fetch("/api/me/settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifSmsResumeAt: null }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      })
      .catch(() => { setSaveError("Couldn\u2019t resume SMS notifications."); });
  }

  function smsSnoozeCountdown(): string | null {
    if (!smsResumeAt) return null;
    const ms = new Date(smsResumeAt).getTime() - Date.now();
    if (ms <= 0) return null;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 24) return hours <= 1 ? "less than 1 hour" : `${hours} hours`;
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return days === 1 ? "1 day" : `${days} days`;
  }

  function savePhoneNumber(phone: string) {
    const trimmed = phone.trim();
    if (trimmed && !/^\+?[\d\s\-().]{7,20}$/.test(trimmed)) {
      setPhoneValidationError(true);
      return;
    }
    setPhoneValidationError(false);
    setPhoneError(null);
    fetch("/api/me/settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: trimmed }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        setPhoneSaved(true);
        setPhoneError(null);
        setTimeout(() => setPhoneSaved(false), 2000);
      })
      .catch(() => { setTimedError(setPhoneError, "Couldn\u2019t save phone number. Please try again."); });
  }

  function saveContactEmail(email: string) {
    const trimmed = email.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailValidationError(true);
      return;
    }
    setEmailValidationError(false);
    setEmailError(null);
    fetch("/api/me/settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactEmail: trimmed }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        setEmailSaved(true);
        setEmailError(null);
        setTimeout(() => setEmailSaved(false), 2000);
      })
      .catch(() => { setTimedError(setEmailError, "Couldn\u2019t save email address. Please try again."); });
  }

  function saveShipping(next: ShippingSettings) {
    setShipping(next);
    saveShippingSettings(next);
    setShippingError(null);
    fetch("/api/me/settings", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shippingSettings: next }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        setShippingSaved(true);
        setShippingError(null);
        setTimeout(() => setShippingSaved(false), 1800);
      })
      .catch(() => { setTimedError(setShippingError, "Couldn\u2019t save shipping settings. Please try again."); });
  }

  const EMAIL_KEYS: (keyof KilnSettings)[] = [
    "notif_email_digest",
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
  ];
  const activeEmailCount = EMAIL_KEYS.filter((k) => settings[k]).length;
  const emailPaused = settings.notif_email_paused;
  const notifDesc = !settingsLoaded
    ? "—"
    : !contactEmail.trim()
    ? "No email address set"
    : emailPaused
    ? emailResumeAt
      ? (() => { const ms = new Date(emailResumeAt).getTime() - Date.now(); if (ms <= 0) return `Emails snoozed · resuming soon`; const days = Math.ceil(ms / (1000 * 60 * 60 * 24)); return `Emails snoozed · resuming in ${days === 1 ? "1 day" : `${days} days`}`; })()
      : `Emails paused indefinitely · ${activeEmailCount} type${activeEmailCount === 1 ? "" : "s"} affected`
    : activeEmailCount === 0
    ? "Emails off · push only"
    : `${activeEmailCount} of ${EMAIL_KEYS.length} email types active`;

  const notifDescClass = !settingsLoaded
    ? "text-stone-600"
    : !contactEmail.trim()
    ? "text-amber-400"
    : emailPaused
    ? "text-amber-400"
    : activeEmailCount === 0
    ? "text-amber-400"
    : "text-emerald-400";

  const notifWarn = settingsLoaded && !!contactEmail.trim() && (activeEmailCount === 0 || (emailPaused && activeEmailCount > 0));

  const hasAddress = !!(address.street.trim() || address.city.trim());
  const addressDesc = !settingsLoaded
    ? "—"
    : hasAddress
    ? [address.street.trim(), address.city.trim(), address.state.trim()].filter(Boolean).join(", ")
    : "No default address saved";

  const sections: { key: Section; icon: React.ElementType; label: string; desc: string; descClass?: string; warn?: boolean; group: MobileTab }[] = [
    { key: "notifications", icon: Bell, label: "Notifications", desc: notifDesc, descClass: notifDescClass, warn: notifWarn, group: "Preferences" },
    { key: "privacy", icon: Shield, label: "Privacy & Safety", desc: "Who can see and contact you", group: "Preferences" },
    { key: "display", icon: Palette, label: "Display & Playback", desc: "Theme, feed, and video settings", group: "Preferences" },
    { key: "address", icon: MapPin, label: "Delivery Address", desc: addressDesc, group: "Profile" },
    { key: "payments", icon: CreditCard, label: "Payment Methods", desc: "How buyers pay you directly", group: "Selling" },
    { key: "shipping", icon: Truck, label: "Shipping Rates", desc: "Your domestic and international rates", group: "Selling" },
    { key: "account", icon: User, label: "Account", desc: "Profile, security, and data", group: "Profile" },
  ];

  const filteredSections = mobileTab === "All" ? sections : sections.filter(s => s.group === mobileTab);

  function savePayments(next: ArtistPayments) {
    setPayments(next);
    savePaymentSettings(next);
    setPaymentsError(null);
    fetch("/api/me/settings", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentSettings: next }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        setPaymentSaved(true);
        setPaymentsError(null);
        setTimeout(() => setPaymentSaved(false), 1800);
      })
      .catch(() => { setTimedError(setPaymentsError, "Couldn\u2019t save payment settings. Please try again."); });
  }

  function saveAddress(next: DefaultShippingAddress) {
    const payload = {
      street: next.street.trim(),
      city: next.city.trim(),
      state: next.state.trim(),
      zip: next.zip.trim(),
      country: next.country.trim(),
    };
    setAddress(next);
    setAddressError(null);
    fetch("/api/me/settings", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultShippingAddress: payload }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        setAddressSaved(true);
        setAddressError(null);
        setTimeout(() => setAddressSaved(false), 1800);
      })
      .catch(() => { setTimedError(setAddressError, "Couldn\u2019t save address. Please try again."); });
  }

  function Toggle({ settingKey, label, desc }: { settingKey: keyof KilnSettings; label: string; desc?: string }) {
    const on = settings[settingKey];
    return (
      <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm text-stone-200">{label}</p>
          {desc && <p className="text-xs text-stone-600 mt-0.5">{desc}</p>}
        </div>
        <button
          onClick={() => toggle(settingKey)}
          className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${on ? "bg-amber-500" : "bg-stone-700"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">

        <div className="mb-6 flex items-center gap-3">
          {section ? (
            <button onClick={() => setSection(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
          ) : (
            <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
            </Link>
          )}
          <div>
            <h1 className="font-serif text-2xl text-amber-100">{section ? sections.find(s => s.key === section)?.label : "Settings"}</h1>
            {saved && !saveError && <p className="text-xs text-emerald-400 mt-0.5">Saved</p>}
            {saveError && (
              <p className="text-xs text-red-400 mt-0.5">{saveError}</p>
            )}
          </div>
        </div>

        {!section && (
          <div className="space-y-2">
            {/* Mobile-only tab grouping */}
            <div className="md:hidden mb-4 flex gap-1 rounded-xl bg-stone-900/50 p-1 border border-white/5">
              {(["All", "Profile", "Selling", "Preferences"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setMobileTab(t)}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${mobileTab === t ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {filteredSections.map(({ key, icon: Icon, label, desc, descClass, warn }) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`w-full flex items-center gap-4 rounded-2xl border bg-stone-900/60 px-5 py-4 text-left hover:border-white/15 transition-colors ${warn ? "border-l-2 border-l-amber-500/70 border-white/8" : "border-white/8"}`}
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Icon size={18} className="text-amber-400" />
                  {warn && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-[#12100e]" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-stone-200">{label}</p>
                  <p className={`text-xs mt-0.5 ${descClass ?? "text-stone-600"}`}>{desc}</p>
                </div>
                <ChevronRight size={16} className="text-stone-600" />
              </button>
            ))}

            {/* Quick info */}
            <div className="mt-6 rounded-2xl border border-white/8 bg-stone-900/40 px-5 py-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Signed in as</p>
              {profile ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-stone-800">
                    {profile.avatarUrl && <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-200">{profile.name}</p>
                    <p className="text-xs text-stone-500">@{profile.handle}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                  >
                    <LogOut size={12} />
                    Log out
                  </button>
                </div>
              ) : (
                <p className="text-sm text-stone-500">Not signed in</p>
              )}
            </div>
          </div>
        )}

        {section === "notifications" && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 px-5 divide-y-0">
            <p className="py-3 text-xs font-semibold uppercase tracking-wider text-stone-600">Activity</p>
            <Toggle settingKey="notif_likes" label="Likes" desc="When someone likes your posts" />
            <Toggle settingKey="notif_comments" label="Comments" desc="Replies to your posts" />
            <Toggle settingKey="notif_follows" label="New followers" />
            <Toggle settingKey="notif_commissions" label="Commission requests" desc="New inquiries from collectors" />
            <p className="py-3 text-xs font-semibold uppercase tracking-wider text-stone-600">Events</p>
            <Toggle settingKey="notif_workshops" label="Workshop updates" desc="Bookings and reminders" />
            <Toggle settingKey="notif_drops" label="Drop alerts" desc="New drops from artists you follow" />
            <p className="py-3 text-xs font-semibold uppercase tracking-wider text-stone-600">Email</p>
            {(() => {
              const total = EMAIL_KEYS.length;
              const active = activeEmailCount;
              if (!contactEmail.trim()) {
                return (
                  <div className="flex items-start gap-2 py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-2">
                    <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300">No notification email set — add one below so you don't miss important alerts.</p>
                  </div>
                );
              }
              if (active === 0) {
                return (
                  <div className="flex items-start gap-2 py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-2">
                    <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300">All email types are off — turn on at least one below to receive alerts</p>
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-stone-800/60 border border-white/8 mb-2">
                  <Mail size={13} className="text-amber-400 shrink-0" />
                  <p className="text-xs text-stone-400">
                    Sending to <span className="text-stone-200 font-medium">{contactEmail.trim()}</span>
                    {" — "}
                    <span className="text-emerald-400">{active} of {total} types active</span>
                  </p>
                </div>
              );
            })()}
            {/* Snooze email notifications row */}
            <div className="py-3 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm text-stone-200">Snooze all email notifications</p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {settings.notif_email_paused
                      ? emailResumeAt
                        ? (() => { const cd = snoozeCountdown(); return cd ? `Resuming in ${cd}` : "Resuming soon…"; })()
                        : "Paused indefinitely"
                      : "Auto-resumes after the chosen period"}
                  </p>
                </div>
                {settings.notif_email_paused ? (
                  <button
                    onClick={clearSnooze}
                    className="shrink-0 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Resume now
                  </button>
                ) : (
                  <button
                    onClick={() => contactEmail.trim() && setSnoozePickerOpen(v => !v)}
                    disabled={!contactEmail.trim()}
                    title={!contactEmail.trim() ? "Add a notification email address below before snoozing" : undefined}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      contactEmail.trim()
                        ? "bg-stone-800 border-white/10 text-stone-300 hover:bg-stone-700 cursor-pointer"
                        : "bg-stone-800/40 border-white/5 text-stone-600 cursor-not-allowed opacity-50"
                    }`}
                  >
                    Snooze
                  </button>
                )}
              </div>
              {/* Snooze duration picker */}
              {snoozePickerOpen && !settings.notif_email_paused && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {SNOOZE_OPTIONS.map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => applySnooze(opt.ms)}
                      className="rounded-full bg-stone-800 border border-white/10 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-amber-500/20 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setSnoozePickerOpen(false)}
                    className="rounded-full bg-stone-800/50 border border-white/5 px-3 py-1.5 text-xs text-stone-600 hover:text-stone-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {settings.notif_email_paused && (
              <div className={`flex items-start gap-2 py-2.5 px-3 rounded-xl mb-1 ${contactEmail.trim() ? "bg-amber-500/10 border border-amber-500/20" : "bg-stone-800/50 border border-white/8 opacity-50"}`}>
                <AlertTriangle size={13} className={`mt-0.5 shrink-0 ${contactEmail.trim() ? "text-amber-400" : "text-stone-500"}`} />
                <p className={`text-xs ${contactEmail.trim() ? "text-amber-300" : "text-stone-500"}`}>
                  {contactEmail.trim()
                    ? emailResumeAt
                      ? `Emails snoozed until ${new Date(emailResumeAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: new Date(emailResumeAt).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })} — no notifications will be sent even if individual types are enabled below.`
                      : `Emails are paused indefinitely${emailPausedAt ? ` since ${new Date(emailPausedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: new Date(emailPausedAt).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })}` : ""} — click "Resume now" above to re-enable.`
                    : "No email address saved — add one above before pausing has any effect."}
                </p>
              </div>
            )}
            <div className={settings.notif_email_paused ? "opacity-40 pointer-events-none" : undefined}>
              <Toggle settingKey="notif_email_digest" label="Weekly digest" desc="Top posts, opportunities, and updates" />
              <Toggle settingKey="notif_email_follows" label="New follower alerts" desc="Email when someone follows you" />
              <Toggle settingKey="notif_email_comments" label="Comment alerts" desc="Email when someone comments on your posts" />
              <Toggle settingKey="notif_email_new_sale" label="New sale alerts" desc="Email when a buyer completes a purchase from your shop" />
              <Toggle settingKey="notif_email_new_booking" label="New workshop bookings" desc="Email when a student books a seat in your workshop" />
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm text-stone-200">Workshop reminder emails</p>
                  <p className="text-xs text-stone-600 mt-0.5">Reminders before workshops you've booked as a student</p>
                </div>
                <button
                  onClick={() => toggle("workshopReminderOptOut")}
                  className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${!settings.workshopReminderOptOut ? "bg-amber-500" : "bg-stone-700"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${!settings.workshopReminderOptOut ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              <Toggle settingKey="notif_email_commission_payment" label="Commission payments" desc="Email when a deposit or final payment lands on a commission" />
              <Toggle settingKey="notif_email_new_commission" label="New commission requests" desc="Email when a collector sends you a commission inquiry" />
              <Toggle settingKey="notif_email_new_patron" label="New patron alerts" desc="Email when someone subscribes to one of your tiers" />
              <Toggle settingKey="notif_email_outbid" label="Outbid alerts" desc="Email when someone outbids you in an auction" />
              <Toggle settingKey="notif_email_mentions" label="Mention alerts" desc="Email when someone @mentions you in a comment or post" />
              <Toggle settingKey="notif_email_shipped" label="Order shipped" desc="Email when a seller marks your order as shipped" />
            </div>
            <div className={`py-3${settings.notif_email_paused ? " opacity-40 pointer-events-none" : ""}`}>
              <p className="text-sm text-stone-200 mb-1">Notification email address</p>
              <p className="text-xs text-stone-600 mb-2">Where we send email alerts. Never shown publicly.</p>
              <div className="flex gap-2 items-center">
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => { setContactEmail(e.target.value); if (emailValidationError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value.trim())) setEmailValidationError(false); }}
                  onBlur={(e) => saveContactEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`flex-1 min-w-0 rounded-xl border bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none ${emailValidationError ? "border-red-500/60 focus:border-red-500/80" : "border-white/10 focus:border-amber-500/50"}`}
                />
                <span className="text-xs text-emerald-400 shrink-0 transition-opacity" style={{ opacity: emailSaved ? 1 : 0, transitionDuration: emailSaved ? "180ms" : "200ms" }}>Saved ✓</span>
              </div>
              {emailValidationError && (
                <p className="text-xs text-red-400 mt-1.5">Please enter a valid email address.</p>
              )}
              {emailError && !emailValidationError && (
                <p className="text-xs text-red-400 mt-1.5">{emailError}</p>
              )}
            </div>

            {/* SMS Notifications */}
            <div className="mt-2 rounded-2xl border border-white/8 bg-stone-900/40 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone size={14} className="text-sky-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">SMS Notifications</p>
                <span className="rounded-full bg-sky-500/15 border border-sky-500/25 px-2 py-0.5 text-[9px] font-medium text-sky-400">via Twilio</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">Get text alerts for time-sensitive events — auction bids, drop openings, and shipped orders. Standard messaging rates apply.</p>

              {/* Snooze SMS notifications row */}
              <div className="py-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm text-stone-200">Snooze all SMS notifications</p>
                    <p className="text-xs text-stone-600 mt-0.5">
                      {settings.notif_sms_paused
                        ? smsResumeAt
                          ? (() => { const cd = smsSnoozeCountdown(); return cd ? `Resuming in ${cd}` : "Resuming soon\u2026"; })()
                          : "Paused indefinitely"
                        : "Auto-resumes after the chosen period"}
                    </p>
                  </div>
                  {settings.notif_sms_paused ? (
                    <button
                      onClick={clearSmsSnooze}
                      className="shrink-0 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Resume now
                    </button>
                  ) : (
                    <button
                      onClick={() => phoneNumber.trim() && setSmsSnoozePickerOpen(v => !v)}
                      disabled={!phoneNumber.trim()}
                      title={!phoneNumber.trim() ? "Add a phone number below before snoozing" : undefined}
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        phoneNumber.trim()
                          ? "bg-stone-800 border-white/10 text-stone-300 hover:bg-stone-700 cursor-pointer"
                          : "bg-stone-800/40 border-white/5 text-stone-600 cursor-not-allowed opacity-50"
                      }`}
                    >
                      Snooze
                    </button>
                  )}
                </div>
                {/* SMS snooze duration picker */}
                {smsSnoozePickerOpen && !settings.notif_sms_paused && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SNOOZE_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => applySmsSnooze(opt.ms)}
                        className="rounded-full bg-stone-800 border border-white/10 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-sky-500/20 hover:border-sky-500/40 hover:text-sky-300 transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setSmsSnoozePickerOpen(false)}
                      className="rounded-full bg-stone-800/50 border border-white/5 px-3 py-1.5 text-xs text-stone-600 hover:text-stone-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {settings.notif_sms_paused && (
                <div className={`flex items-start gap-2 py-2.5 px-3 rounded-xl mb-1 ${phoneNumber.trim() ? "bg-sky-500/10 border border-sky-500/20" : "bg-stone-800/50 border border-white/8 opacity-50"}`}>
                  <AlertTriangle size={13} className={`mt-0.5 shrink-0 ${phoneNumber.trim() ? "text-sky-400" : "text-stone-500"}`} />
                  <p className={`text-xs ${phoneNumber.trim() ? "text-sky-300" : "text-stone-500"}`}>
                    {phoneNumber.trim()
                      ? smsResumeAt
                        ? `SMS snoozed until ${new Date(smsResumeAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: new Date(smsResumeAt).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })} \u2014 no texts will be sent even if individual types are enabled below.`
                        : `SMS is paused indefinitely \u2014 tap \u201cResume now\u201d above to re-enable.`
                      : "No phone number saved \u2014 add one below before pausing has any effect."}
                  </p>
                </div>
              )}

              <div className={settings.notif_sms_paused ? "opacity-40 pointer-events-none" : undefined}>
                <Toggle settingKey="notif_sms_outbid" label="Outbid alerts" desc="Text when someone outbids you in an auction" />
                <Toggle settingKey="notif_sms_drops" label="Drop waitlist confirmations" desc="Text when you join a drop waitlist" />
                <Toggle settingKey="notif_sms_shipped" label="Order shipped" desc="Text when a seller marks your order as shipped" />
              </div>

              <div className="pt-1">
                <p className="text-sm text-stone-200 mb-1">Mobile number</p>
                <p className="text-xs text-stone-600 mb-2">Include country code (e.g. +1 555 123 4567). Never shown publicly.</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value); if (phoneValidationError && /^\+?[\d\s\-().]{7,20}$/.test(e.target.value.trim())) setPhoneValidationError(false); }}
                    onBlur={(e) => savePhoneNumber(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className={`flex-1 min-w-0 rounded-xl border bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none ${phoneValidationError ? "border-red-500/60 focus:border-red-500/80" : "border-white/10 focus:border-sky-500/50"}`}
                  />
                  {phoneSaved && <span className="text-xs text-emerald-400 shrink-0">Saved ✓</span>}
                </div>
                {phoneValidationError && (
                  <p className="text-xs text-red-400 mt-1.5">Please enter a valid phone number with country code.</p>
                )}
                {phoneError && !phoneValidationError && (
                  <p className="text-xs text-red-400 mt-1.5">{phoneError}</p>
                )}
                {!phoneNumber.trim() && !settings.notif_sms_paused && (
                  <p className="text-xs text-amber-500/70 mt-1.5">Add a phone number above to receive SMS alerts.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {section === "privacy" && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 px-5">
            <p className="py-3 text-xs font-semibold uppercase tracking-wider text-stone-600">Visibility</p>
            <Toggle settingKey="privacy_profile_public" label="Public profile" desc="Anyone can see your profile and posts" />
            <Toggle settingKey="privacy_show_location" label="Show location" desc="Display your studio city on your profile" />
            <Toggle settingKey="privacy_allow_messages" label="Allow direct messages" desc="From artists you don't follow" />
          </div>
        )}

        {section === "display" && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 px-5">
            <p className="py-3 text-xs font-semibold uppercase tracking-wider text-stone-600">Feed</p>
            <Toggle settingKey="display_compact" label="Compact feed" desc="Smaller cards, more posts visible" />
            <p className="py-3 text-xs font-semibold uppercase tracking-wider text-stone-600">Videos</p>
            <Toggle settingKey="display_autoplay" label="Autoplay videos" desc="Process reels play automatically" />
            <Toggle settingKey="display_sound" label="Sound on by default" desc="Videos play with audio" />
          </div>
        )}

        {section === "address" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">How it works</p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Save a default shipping address so it's automatically attached to your orders when you check out. Artists use this to ship your purchases directly to you.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Street address</label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                    placeholder="123 Main St, Apt 4B"
                    maxLength={200}
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">City</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                      placeholder="Portland"
                      maxLength={100}
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">State / Province</label>
                    <input
                      type="text"
                      value={address.state}
                      onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                      placeholder="OR"
                      maxLength={100}
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">ZIP / Postal code</label>
                    <input
                      type="text"
                      value={address.zip}
                      onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
                      placeholder="97201"
                      maxLength={20}
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Country</label>
                    <input
                      type="text"
                      value={address.country}
                      onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
                      placeholder="United States"
                      maxLength={100}
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {hasAddress && (
                <div className="rounded-xl border border-white/8 bg-stone-800/40 px-4 py-3">
                  <p className="text-xs text-stone-500 mb-1.5">Preview</p>
                  <p className="text-sm text-stone-300 whitespace-pre-line">
                    {[address.street.trim(), [address.city.trim(), address.state.trim(), address.zip.trim()].filter(Boolean).join(", "), address.country.trim()].filter(Boolean).join("\n")}
                  </p>
                </div>
              )}

              <button
                onClick={() => saveAddress(address)}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                {addressSaved ? <><Check size={14} /> Saved!</> : "Save delivery address"}
              </button>
              {addressError && (
                <p className="text-xs text-red-400 text-center mt-2">{addressError}</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-stone-900/40 px-5 py-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                <span className="text-stone-400 font-medium">Privacy: </span>
                Your shipping address is only shared with artists when you make a purchase — never shown publicly on your profile.
              </p>
            </div>
          </div>
        )}

        {section === "payments" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-indigo-400" />
                  <span className="text-sm font-medium text-stone-200">Stripe Payouts</span>
                </div>
                {bannerDismissed && (
                  <button
                    onClick={resetDismissal}
                    className="text-[11px] text-stone-500 hover:text-indigo-400 transition-colors"
                  >
                    Show account status
                  </button>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">How it works</p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Kiln is free — buyers pay you directly using the methods below. Add at least one so buyers can complete purchases from your listings.
                </p>
              </div>

              <div className="space-y-3">
                <PayField
                  label="Stripe payment link"
                  placeholder="https://buy.stripe.com/..."
                  hint="Create a payment link at dashboard.stripe.com → Payment Links"
                  value={payments.stripeLink}
                  onChange={(v) => setPayments((p) => ({ ...p, stripeLink: v }))}
                />
                <PayField
                  label="Venmo"
                  placeholder="@yourhandle"
                  hint="Your Venmo @username"
                  value={payments.venmo}
                  onChange={(v) => setPayments((p) => ({ ...p, venmo: v }))}
                />
                <PayField
                  label="Cash App"
                  placeholder="$yourcashtag"
                  hint="Your Cash App $cashtag"
                  value={payments.cashapp}
                  onChange={(v) => setPayments((p) => ({ ...p, cashapp: v }))}
                />
                <PayField
                  label="PayPal.me"
                  placeholder="paypal.me/yourname"
                  hint="Your PayPal.me link or username"
                  value={payments.paypalMe}
                  onChange={(v) => setPayments((p) => ({ ...p, paypalMe: v }))}
                />
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Processing window (days)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={payments.processingWindow ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setPayments((p) => ({ ...p, processingWindow: undefined }));
                          } else {
                            const n = Math.min(30, Math.max(1, parseInt(raw, 10)));
                            if (Number.isFinite(n)) setPayments((p) => ({ ...p, processingWindow: n }));
                          }
                        }}
                        placeholder="e.g. 7"
                        className="w-28 rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                      />
                      <span className="text-xs text-stone-500">business days (1–30)</span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">Numeric window used for order ETA calculations. Leave blank to use the default (3 days).</p>
                  </div>

                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Delivery estimate label</label>
                    <input
                      type="text"
                      value={payments.processingWindowLabel ?? ""}
                      onChange={(e) => setPayments((p) => ({ ...p, processingWindowLabel: e.target.value || undefined }))}
                      placeholder="e.g. 2–3 weeks after firing"
                      maxLength={80}
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                    />
                    <p className="text-xs text-stone-600 mt-1">Custom label shown to buyers at checkout. Leave blank to auto-generate from the day count above.</p>
                  </div>

                  <div>
                    <p className="text-xs text-stone-500 mb-1.5">Buyer preview</p>
                    <div className="rounded-xl border border-white/10 bg-stone-800/40 px-4 py-3">
                      <p className="text-[11px] text-stone-500 mb-1">How your delivery estimate appears at checkout</p>
                      <p className="text-sm text-stone-200">
                        Ships{" "}
                        {formatProcessingWindowLabel(payments.processingWindow, payments.processingWindowLabel) ?? "within 3 business days"}
                      </p>
                      {!payments.processingWindow && !(payments.processingWindowLabel?.trim()) && (
                        <p className="text-[11px] text-stone-600 mt-1">Using platform default — set a window or label above to customise this.</p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Note to buyers (optional)</label>
                  <textarea
                    value={payments.notes}
                    rows={2}
                    onChange={(e) => setPayments((p) => ({ ...p, notes: e.target.value }))}
                    placeholder='e.g. "Please include artwork title in payment note"'
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <button
                onClick={() => savePayments(payments)}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                {paymentSaved ? <><Check size={14} /> Saved!</> : "Save payment methods"}
              </button>
              {paymentsError && (
                <p className="text-xs text-red-400 text-center mt-2">{paymentsError}</p>
              )}
            </div>
          </div>
        )}

        {section === "shipping" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">How it works</p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Buyers see your shipping rates at checkout. You arrange shipping directly with each buyer after payment.
                </p>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-sm text-stone-200">Offer free shipping</p>
                  <p className="text-xs text-stone-600 mt-0.5">Waive shipping on all orders</p>
                </div>
                <button
                  onClick={() => setShipping((s) => ({ ...s, offerFreeShipping: !s.offerFreeShipping }))}
                  className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${shipping.offerFreeShipping ? "bg-amber-500" : "bg-stone-700"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${shipping.offerFreeShipping ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {!shipping.offerFreeShipping && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Domestic rate (USA)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                      <input
                        type="number"
                        value={shipping.domesticRate}
                        onChange={(e) => setShipping((s) => ({ ...s, domesticRate: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-white/10 bg-stone-800/60 pl-8 pr-4 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-stone-700 mt-1">Per order, not per item</p>
                  </div>

                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Per additional item</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                      <input
                        type="number"
                        value={shipping.perItemRate}
                        onChange={(e) => setShipping((s) => ({ ...s, perItemRate: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-white/10 bg-stone-800/60 pl-8 pr-4 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-stone-700 mt-1">Added for each item beyond the first. Set to 0 to disable.</p>
                  </div>

                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">International rate</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                      <input
                        type="number"
                        value={shipping.internationalRate}
                        onChange={(e) => setShipping((s) => ({ ...s, internationalRate: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-white/10 bg-stone-800/60 pl-8 pr-4 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Free shipping threshold</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                      <input
                        type="number"
                        value={shipping.freeThreshold}
                        onChange={(e) => setShipping((s) => ({ ...s, freeThreshold: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-white/10 bg-stone-800/60 pl-8 pr-4 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-stone-700 mt-1">Orders over this amount ship free. Set to 0 to disable.</p>
                  </div>
                </div>
              )}

              {/* Destination regions */}
              <div className="space-y-2 border-t border-white/5 pt-4">
                <div>
                  <p className="text-sm text-stone-200">Destination regions</p>
                  <p className="text-xs text-stone-600 mt-0.5">Which regions you ship to — shown on your listings</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {SHIPS_TO_OPTIONS.map((opt) => {
                    const selected = shipping.shipsTo.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setShipping((s) => ({
                            ...s,
                            shipsTo: selected
                              ? s.shipsTo.filter((x) => x !== opt)
                              : [...s.shipsTo, opt],
                          }))
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          selected
                            ? "border-amber-400/60 bg-amber-500/20 text-amber-300"
                            : "border-white/10 bg-stone-800/60 text-stone-400 hover:border-amber-500/30"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {shipping.shipsTo.length === 0 && (
                  <p className="text-[10px] text-stone-700">No regions selected — buyers won&apos;t see shipping destinations.</p>
                )}
              </div>

              {/* Buyer preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-stone-500">Buyer preview</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-stone-600">Sample order:</span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-500 text-[10px]">$</span>
                      <input
                        type="number"
                        min={0}
                        max={9999}
                        step={5}
                        value={samplePrice}
                        onChange={(e) => setSamplePrice(Math.max(0, Math.min(9999, Number(e.target.value) || 0)))}
                        className="w-20 rounded-lg border border-white/10 bg-stone-800/80 pl-4 pr-2 py-1 text-[11px] text-stone-200 focus:border-amber-500/50 focus:outline-none text-right"
                      />
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={5}
                  value={Math.min(samplePrice, 500)}
                  onChange={(e) => setSamplePrice(Number(e.target.value))}
                  className="w-full h-1.5 mb-3 rounded-full appearance-none cursor-pointer accent-amber-500 bg-stone-700"
                />
                <div className="rounded-xl border border-white/8 bg-stone-800/40 overflow-hidden divide-y divide-white/5">
                  {(
                    [
                      { label: "Domestic buyer (USA)", flag: "🇺🇸", type: "domestic" as const },
                      { label: "International buyer", flag: "🌍", type: "international" as const },
                    ] as const
                  ).map(({ label, flag, type }) => {
                    const sampleTotal = samplePrice;
                    const sampleLabel = `$${samplePrice} order${avgListingPrice != null ? ` · avg. $${avgListingPrice}` : ""}`;
                    const baseRate = type === "domestic" ? shipping.domesticRate : shipping.internationalRate;
                    let cost: string;
                    let multiItemCost: string | null = null;
                    if (shipping.offerFreeShipping) {
                      cost = "Free shipping";
                    } else if (shipping.freeThreshold > 0 && sampleTotal >= shipping.freeThreshold) {
                      cost = "Free shipping";
                    } else {
                      cost = baseRate === 0 ? "Free shipping" : `$${baseRate.toFixed(2)}`;
                      if (shipping.perItemRate > 0 && cost !== "Free shipping") {
                        multiItemCost = `$${(baseRate + shipping.perItemRate).toFixed(2)}`;
                      }
                    }
                    const isFree = cost === "Free shipping";
                    return (
                      <div key={type} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{flag}</span>
                          <div>
                            <p className="text-xs text-stone-300">{label}</p>
                            <p className="text-[10px] text-stone-600 mt-0.5">{sampleLabel}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {multiItemCost ? (
                            <>
                              <p className="text-[10px] text-stone-500">1 item: <span className="text-stone-300 font-medium">{cost}</span></p>
                              <p className="text-[10px] text-stone-500">2 items: <span className="text-stone-300 font-medium">{multiItemCost}</span></p>
                            </>
                          ) : (
                            <span className={`text-sm font-semibold ${isFree ? "text-emerald-400" : "text-stone-200"}`}>
                              {cost}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!shipping.offerFreeShipping && shipping.freeThreshold > 0 && (
                  <p className="text-[10px] text-stone-600 mt-1.5">
                    Orders over ${shipping.freeThreshold.toFixed(0)} qualify for free shipping
                  </p>
                )}
                {!shipping.offerFreeShipping && shipping.freeThreshold > 0 && avgListingPrice != null && avgListingPrice < shipping.freeThreshold && (
                  <p className="text-[10px] text-amber-600/80 mt-1">
                    Your avg. listing (${avgListingPrice.toFixed(0)}) is below your free-shipping threshold (${shipping.freeThreshold.toFixed(0)})
                  </p>
                )}
              </div>

              <button
                onClick={() => saveShipping(shipping)}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                {shippingSaved ? <><Check size={14} /> Saved!</> : "Save shipping rates"}
              </button>
              {shippingError && (
                <p className="text-xs text-red-400 text-center mt-2">{shippingError}</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-stone-900/40 px-5 py-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                <span className="text-stone-400 font-medium">Tip: </span>
                For large or fragile work, include packaging materials, insurance, and your time in the shipping rate.
                White glove and crated delivery can cost $150–$500+ for large sculptures.
              </p>
            </div>
          </div>
        )}

        {section === "account" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
              <Link href="/edit-profile" className="flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <User size={16} className="text-stone-400" />
                  <span className="text-sm text-stone-200">Edit profile</span>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
              <Link href="/apply-verified" className="flex items-center justify-between px-5 py-4 border-t border-white/5 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-blue-400" />
                  <span className="text-sm text-stone-200">Apply for verification</span>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
              <Link href="/social-sync" className="flex items-center justify-between px-5 py-4 border-t border-white/5 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <Share2 size={16} className="text-amber-400" />
                  <div>
                    <span className="text-sm text-stone-200">Social Sync</span>
                    <p className="text-xs text-stone-600 mt-0.5">Auto-post to Instagram, TikTok & Facebook</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
              <Link href="/kiln-opening" className="flex items-center justify-between px-5 py-4 border-t border-white/5 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <Flame size={16} className="text-orange-400" />
                  <div>
                    <span className="text-sm text-stone-200">Kiln Opening Reveal</span>
                    <p className="text-xs text-stone-600 mt-0.5">Announce a kiln opening across all platforms</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
              <Link href="/kiln-status" className="flex items-center justify-between px-5 py-4 border-t border-white/5 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <Flame size={16} className="text-amber-500" />
                  <div>
                    <span className="text-sm text-stone-200">In the Kiln</span>
                    <p className="text-xs text-stone-600 mt-0.5">Share active firings — kiln as content creator</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
              <Link href="/provenance" className="flex items-center justify-between px-5 py-4 border-t border-white/5 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <Link2 size={16} className="text-emerald-400" />
                  <div>
                    <span className="text-sm text-stone-200">Provenance Chain</span>
                    <p className="text-xs text-stone-600 mt-0.5">Permanent ownership records across all resales</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
              <Link href="/material-sources" className="flex items-center justify-between px-5 py-4 border-t border-white/5 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <Leaf size={16} className="text-emerald-400" />
                  <div>
                    <span className="text-sm text-stone-200">Material Sources</span>
                    <p className="text-xs text-stone-600 mt-0.5">Map your ingredients from earth to finished work</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
              <Link href="/process-pledges" className="flex items-center justify-between px-5 py-4 border-t border-white/5 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <BookOpen size={16} className="text-sky-400" />
                  <div>
                    <span className="text-sm text-stone-200">Process Pledges</span>
                    <p className="text-xs text-stone-600 mt-0.5">Commit to sharing your full making journey</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
            </div>

            {profile?.id && (
              <div className="rounded-2xl border border-white/8 bg-stone-900/60 px-5 py-4">
                <p className="text-xs text-stone-500 mb-1.5">Your account ID</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-xs text-stone-400 font-mono bg-stone-800/60 rounded-lg px-2.5 py-1.5 select-all">
                    {profile.id}
                  </code>
                  <button
                    onClick={() => { void navigator.clipboard.writeText(profile.id); }}
                    className="shrink-0 rounded-lg border border-white/10 bg-stone-800/60 p-1.5 text-stone-500 hover:text-stone-300 transition-colors"
                    title="Copy ID"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
              <Link href="/help" className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <BookOpen size={16} className="text-stone-400" />
                  <span className="text-sm text-stone-300">Help Centre</span>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
              <Link href="/terms" className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/3 transition-colors border-t border-white/5">
                <div className="flex items-center gap-3">
                  <Link2 size={16} className="text-stone-400" />
                  <span className="text-sm text-stone-300">Terms of Service</span>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
              <Link href="/privacy" className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/3 transition-colors border-t border-white/5">
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-stone-400" />
                  <span className="text-sm text-stone-300">Privacy Policy</span>
                </div>
                <ChevronRight size={14} className="text-stone-600" />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition-colors text-left"
              >
                <LogOut size={16} className="text-stone-400" />
                <span className="text-sm text-stone-300">Sign out</span>
              </button>
            </div>

            <div className="rounded-2xl border border-red-500/15 bg-red-500/5 overflow-hidden">
              <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/10 transition-colors text-left">
                <Trash2 size={16} className="text-red-400" />
                <div>
                  <span className="text-sm text-red-400">Delete account</span>
                  <p className="text-xs text-stone-600 mt-0.5">Permanently remove your profile and all data</p>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-stone-700 pt-2">Kiln · Version 1.0 · Made for craft artists</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PayField({ label, placeholder, hint, value, onChange }: {
  label: string; placeholder: string; hint: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-stone-500 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none transition-colors"
      />
      <p className="text-[10px] text-stone-700 mt-1">{hint}</p>
    </div>
  );
}
