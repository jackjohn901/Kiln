import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, Bell, Shield, User, Palette, Globe, Trash2, LogOut, ChevronRight, Moon, Smartphone, Mail, Eye, EyeOff, Volume2, VolumeX } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

const SETTING_KEY = "kiln_settings_v1";

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

type Section = "notifications" | "privacy" | "display" | "account";

export default function Settings() {
  const { profile, logout } = useProfile();
  const [settings, setSettings] = useState<KilnSettings>(readSettings);
  const [section, setSection] = useState<Section | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof KilnSettings) {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveSettings(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      return next;
    });
  }

  const sections: { key: Section; icon: React.ElementType; label: string; desc: string }[] = [
    { key: "notifications", icon: Bell, label: "Notifications", desc: "What alerts you get and how" },
    { key: "privacy", icon: Shield, label: "Privacy & Safety", desc: "Who can see and contact you" },
    { key: "display", icon: Palette, label: "Display & Playback", desc: "Theme, feed, and video settings" },
    { key: "account", icon: User, label: "Account", desc: "Profile, security, and data" },
  ];

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
