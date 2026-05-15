import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, Bell, Shield, User, Palette, Globe, Trash2, LogOut, ChevronRight, Moon, Smartphone, Mail, Eye, EyeOff, Volume2, VolumeX, CreditCard, Check, Truck } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { readPaymentSettings, savePaymentSettings, type ArtistPayments } from "@/utils/paymentSettings";

const SETTING_KEY = "kiln_settings_v1";
const SHIPPING_KEY = "kiln_shipping_v1";

interface ShippingSettings {
  domesticRate: number;
  internationalRate: number;
  freeThreshold: number;
  offerFreeShipping: boolean;
}

function defaultShipping(): ShippingSettings {
  return { domesticRate: 18, internationalRate: 45, freeThreshold: 500, offerFreeShipping: false };
}

function readShippingSettings(): ShippingSettings {
  try { return { ...defaultShipping(), ...JSON.parse(localStorage.getItem(SHIPPING_KEY) ?? "{}") }; }
  catch { return defaultShipping(); }
}

function saveShippingSettings(s: ShippingSettings) {
  try { localStorage.setItem(SHIPPING_KEY, JSON.stringify(s)); } catch {}
}

interface KilnSettings {
  notif_likes: boolean;
  notif_comments: boolean;
  notif_follows: boolean;
  notif_commissions: boolean;
  notif_workshops: boolean;
  notif_drops: boolean;
  notif_email_digest: boolean;
  privacy_profile_public: boolean;
  privacy_show_location: boolean;
  privacy_allow_messages: boolean;
  display_dark_mode: boolean;
  display_compact: boolean;
  display_autoplay: boolean;
  display_sound: boolean;
}

function readSettings(): KilnSettings {
  try {
    return { ...defaultSettings(), ...JSON.parse(localStorage.getItem(SETTING_KEY) ?? "{}") };
  } catch {
    return defaultSettings();
  }
}

function defaultSettings(): KilnSettings {
  return {
    notif_likes: true,
    notif_comments: true,
    notif_follows: true,
    notif_commissions: true,
    notif_workshops: true,
    notif_drops: true,
    notif_email_digest: false,
    privacy_profile_public: true,
    privacy_show_location: true,
    privacy_allow_messages: true,
    display_dark_mode: true,
    display_compact: false,
    display_autoplay: true,
    display_sound: false,
  };
}

function saveSettings(s: KilnSettings) {
  try { localStorage.setItem(SETTING_KEY, JSON.stringify(s)); } catch {}
}

type Section = "notifications" | "privacy" | "display" | "account" | "payments" | "shipping";

export default function Settings() {
  const { profile, logout } = useProfile();
  const [settings, setSettings] = useState<KilnSettings>(readSettings);
  const [section, setSection] = useState<Section | null>(null);
  const [saved, setSaved] = useState(false);
  const [payments, setPayments] = useState<ArtistPayments>(readPaymentSettings);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [shipping, setShipping] = useState<ShippingSettings>(readShippingSettings);
  const [shippingSaved, setShippingSaved] = useState(false);

  function toggle(key: keyof KilnSettings) {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveSettings(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      if (key === "display_dark_mode") {
        document.documentElement.classList.toggle("light", !next.display_dark_mode);
      }
      return next;
    });
  }

  function saveShipping(next: ShippingSettings) {
    setShipping(next);
    saveShippingSettings(next);
    setShippingSaved(true);
    setTimeout(() => setShippingSaved(false), 1800);
  }

  const sections: { key: Section; icon: React.ElementType; label: string; desc: string }[] = [
    { key: "notifications", icon: Bell, label: "Notifications", desc: "What alerts you get and how" },
    { key: "privacy", icon: Shield, label: "Privacy & Safety", desc: "Who can see and contact you" },
    { key: "display", icon: Palette, label: "Display & Playback", desc: "Theme, feed, and video settings" },
    { key: "payments", icon: CreditCard, label: "Payment Methods", desc: "How buyers pay you directly" },
    { key: "shipping", icon: Truck, label: "Shipping Rates", desc: "Your domestic and international rates" },
    { key: "account", icon: User, label: "Account", desc: "Profile, security, and data" },
  ];

  function savePayments(next: ArtistPayments) {
    setPayments(next);
    savePaymentSettings(next);
    setPaymentSaved(true);
    setTimeout(() => setPaymentSaved(false), 1800);
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
            {saved && <p className="text-xs text-emerald-400 mt-0.5">Saved</p>}
          </div>
        </div>

        {!section && (
          <div className="space-y-2">
            {sections.map(({ key, icon: Icon, label, desc }) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className="w-full flex items-center gap-4 rounded-2xl border border-white/8 bg-stone-900/60 px-5 py-4 text-left hover:border-white/15 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Icon size={18} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-stone-200">{label}</p>
                  <p className="text-xs text-stone-600 mt-0.5">{desc}</p>
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
                  <div>
                    <p className="text-sm font-medium text-stone-200">{profile.name}</p>
                    <p className="text-xs text-stone-500">@{profile.handle}</p>
                  </div>
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
            <Toggle settingKey="notif_email_digest" label="Weekly digest" desc="Top posts, opportunities, and updates" />
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

        {section === "payments" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
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

              <button
                onClick={() => saveShipping(shipping)}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                {shippingSaved ? <><Check size={14} /> Saved!</> : "Save shipping rates"}
              </button>
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
