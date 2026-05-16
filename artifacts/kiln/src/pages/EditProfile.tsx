import { useState } from "react";
import { useLocation } from "wouter";
import { Save, User, Camera, Globe, Instagram, MapPin, Layers, AlignLeft } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile, type UserProfile } from "@/contexts/ProfileContext";

const MEDIUM_OPTIONS = [
  "Glass Blowing", "Flameworking", "Kiln Forming", "Raku", "Ceramics", "Porcelain",
  "Blacksmithing", "Metal Forging", "Bronze Casting", "Fiber Arts", "Weaving",
  "Enamel", "Wood Turning", "Stone Carving", "Mosaic", "Leather", "Jewelry",
];

export default function EditProfile() {
  const { profile, setProfile } = useProfile();
  const [, navigate] = useLocation();

  const [form, setForm] = useState<UserProfile>(
    profile ?? {
      id: "",
      name: "",
      handle: "",
      bio: "",
      mediums: [],
      location: "",
      website: "",
      instagram: "",
      avatarUrl: "",
      coverUrl: "",
      isCustom: true,
    }
  );

  const [saved, setSaved] = useState(false);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-stone-400">No profile found. <a href="/setup" className="text-amber-400">Set one up</a>.</p>
        </div>
      </div>
    );
  }

  function toggleMedium(m: string) {
    setForm((prev) => ({
      ...prev,
      mediums: prev.mediums.includes(m)
        ? prev.mediums.filter((x) => x !== m)
        : [...prev.mediums, m],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setProfile({ ...form, isCustom: true });

    try {
      await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.name,
          handle: form.handle,
          bio: form.bio,
          medium: form.mediums.join(", "),
          location: form.location,
          website: form.website,
          avatarUrl: form.avatarUrl,
          bannerUrl: form.coverUrl,
        }),
      });
    } catch {
    }

    setSaved(true);
    const dest = form.id || profile?.id || "";
    setTimeout(() => {
      navigate(`/artists/${dest}`);
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold text-amber-100">Edit Profile</h1>
          <p className="text-sm text-stone-500">Changes are saved to your device</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar / Cover */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-600">Images</p>

            <div className="flex items-center gap-4">
              <div className="relative">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-amber-500/30" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-800 border-2 border-stone-700">
                    <User size={24} className="text-stone-600" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 border-2 border-[#12100e]">
                  <Camera size={11} className="text-stone-950" />
                </div>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-stone-500">Avatar URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.avatarUrl}
                  onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Cover image URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={form.coverUrl}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Basic info */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-600">Basic info</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  <User size={11} /> Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  @ Handle
                </label>
                <input
                  type="text"
                  value={form.handle}
                  onChange={(e) => setForm({ ...form, handle: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                <AlignLeft size={11} /> Bio
              </label>
              <textarea
                rows={4}
                maxLength={500}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell your story — your medium, practice, and what drives your work..."
                className="w-full resize-none rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-stone-700">{form.bio.length}/500</p>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                <MapPin size={11} /> Location
              </label>
              <input
                type="text"
                placeholder="City, State, Country"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Mediums */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-600">
              <Layers size={11} /> Mediums
            </p>
            <p className="mb-3 text-xs text-stone-700">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {MEDIUM_OPTIONS.map((m) => {
                const active = form.mediums.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMedium(m)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                        : "border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Links */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-600">Links</p>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                <Globe size={11} /> Website
              </label>
              <input
                type="url"
                placeholder="https://yoursite.com"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                <Instagram size={11} /> Instagram handle
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 text-sm">@</span>
                <input
                  type="text"
                  placeholder="yourhandle"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 pl-8 pr-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            type="submit"
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all ${
              saved
                ? "bg-emerald-500 text-white"
                : "bg-amber-500 text-stone-950 hover:bg-amber-400"
            }`}
          >
            <Save size={15} />
            {saved ? "Saved!" : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
