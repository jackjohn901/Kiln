import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Flame, CheckCircle, Camera } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { artists } from "@/data/artists";

type AccountType =
  | "artist"
  | "collector"
  | "interior_decorator"
  | "enthusiast"
  | "gallery"
  | "museum";

interface AccountTypeOption {
  id: AccountType;
  emoji: string;
  label: string;
  subtitle: string;
}

const ACCOUNT_TYPES: AccountTypeOption[] = [
  { id: "artist",             emoji: "🔥", label: "Artist",             subtitle: "I make craft — glass, ceramics, metal, wood, fiber…" },
  { id: "collector",          emoji: "🏺", label: "Collector",          subtitle: "I collect original works and follow artists I love" },
  { id: "interior_decorator", emoji: "🛋️", label: "Interior Decorator", subtitle: "I source craft for residential and commercial projects" },
  { id: "enthusiast",         emoji: "✨", label: "Enthusiast",         subtitle: "I love craft and want to explore the community" },
  { id: "gallery",            emoji: "🖼️", label: "Gallery",            subtitle: "We represent artists and organize exhibitions" },
  { id: "museum",             emoji: "🏛️", label: "Museum",             subtitle: "Institutional collector, educator, or curator" },
];

const ARTIST_MEDIUMS = [
  "Blown Glass", "Cast Glass", "Fused Glass", "Flameworked Glass",
  "Metal Forging", "Welding & Fabrication", "Bronze Casting",
  "Stone Sculpture", "Wood Carving",
  "Ceramics & Pottery", "Fiber Arts", "Mixed Media",
];

const COLLECTOR_INTERESTS = [
  "Studio Glass", "Ceramics", "Metal & Jewelry", "Wood & Furniture",
  "Fiber & Textiles", "Sculpture", "Functional Objects", "Wall Art",
];

const DECORATOR_SPECIALTIES = [
  "Residential", "Commercial", "Hospitality", "Retail",
  "Corporate", "Public Installations",
];

const ENTHUSIAST_INTERESTS = [
  "Studio Glass", "Ceramics & Pottery", "Metal Craft", "Wood Turning",
  "Fiber Arts", "Stone Carving", "Mixed Media",
];

const GALLERY_FOCUS = [
  "Contemporary Craft", "Glass Art", "Ceramics", "Metalwork",
  "Fiber Arts", "Sculpture", "Functional Objects",
];

const MUSEUM_FOCUS = [
  "Decorative Arts", "Studio Glass", "Ceramics History", "Indigenous Craft",
  "Contemporary Craft", "Material Culture", "Design & Function",
];

export default function Setup() {
  const [, navigate] = useLocation();
  const { setProfile } = useProfile();
  const [step, setStep] = useState<"choose-type" | "choose-mode" | "form" | "done">("choose-type");
  const [accountType, setAccountType] = useState<AccountType>("artist");
  const [form, setForm] = useState({
    name: "",
    handle: "",
    bio: "",
    location: "",
    website: "",
    mediums: [] as string[],
    collectingInterests: [] as string[],
    budget: "",
    decoratorSpecialties: [] as string[],
    enthusiastInterests: [] as string[],
    galleryName: "",
    galleryFocus: [] as string[],
    institutionName: "",
    museumFocus: [] as string[],
  });
  const [avatarPreview, setAvatarPreview] = useState("");

  function handleDemoAs(artistId: string) {
    const a = artists.find((x) => x.id === artistId)!;
    setProfile({
      id: a.id, name: a.name, handle: a.id, bio: a.bio.slice(0, 180),
      mediums: [a.medium], location: a.location, website: a.website ?? "",
      instagram: a.instagram ?? "", avatarUrl: a.images[0]?.url ?? "",
      coverUrl: a.images[0]?.url ?? "", isCustom: false, accountType: "artist",
    });
    navigate(`/artists/${a.id}`);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function toggleTag(field: keyof typeof form, value: string) {
    setForm((f) => {
      const arr = f[field] as string[];
      return { ...f, [field]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  }

  function deriveMedium() {
    if (accountType === "artist") return form.mediums[0] ?? null;
    if (accountType === "collector") return form.collectingInterests[0] ?? null;
    if (accountType === "interior_decorator") return form.decoratorSpecialties[0] ?? null;
    if (accountType === "gallery") return form.galleryFocus[0] ?? null;
    if (accountType === "museum") return form.museumFocus[0] ?? null;
    return null;
  }

  async function handlePublish() {
    if (!form.name || !form.handle) return;
    const handle = form.handle.replace(/^@/, "");
    const displayName =
      accountType === "gallery" ? (form.galleryName || form.name) :
      accountType === "museum" ? (form.institutionName || form.name) :
      form.name;

    setProfile({
      id: handle, name: displayName, handle, bio: form.bio,
      location: form.location, website: form.website, instagram: "",
      avatarUrl: avatarPreview || "", coverUrl: avatarPreview || "",
      isCustom: true, accountType,
      mediums:
        accountType === "artist" ? form.mediums :
        accountType === "collector" ? form.collectingInterests :
        accountType === "enthusiast" ? form.enthusiastInterests : [],
    });

    fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        handle, displayName, bio: form.bio,
        medium: deriveMedium(),
        location: form.location, website: form.website,
        avatarUrl: avatarPreview || null,
        accountType,
      }),
    }).catch(() => {});

    setStep("done");
  }

  // ── Account type picker ───────────────────────────────────────────────────────
  if (step === "choose-type") {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-xl px-4 py-12">
          <div className="mb-8 text-center">
            <div className="mb-3 flex justify-center">
              <Flame size={32} className="text-amber-400" />
            </div>
            <h1 className="font-serif text-3xl text-amber-100">Join Kiln</h1>
            <p className="mt-2 text-stone-400">Who are you on Kiln?</p>
          </div>

          <div className="grid gap-3">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setAccountType(t.id);
                  setStep(t.id === "artist" ? "choose-mode" : "form");
                }}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-5 text-left transition-all hover:border-amber-500/30 hover:bg-stone-900"
              >
                <span className="text-2xl">{t.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-amber-100">{t.label}</p>
                  <p className="text-sm text-stone-400">{t.subtitle}</p>
                </div>
                <ChevronRight size={18} className="text-stone-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Artist: create or demo ────────────────────────────────────────────────────
  if (step === "choose-mode") {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <button
            onClick={() => setStep("choose-type")}
            className="mb-6 flex items-center gap-1 text-sm text-stone-500 hover:text-amber-300 transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <div className="mb-10 text-center">
            <h1 className="font-serif text-3xl text-amber-100">Artist on Kiln</h1>
            <p className="mt-2 text-stone-400">
              A free platform for craft artists.{" "}
              <span className="text-amber-500">No fees. No commission.</span>
            </p>
          </div>
          <div className="grid gap-4">
            <button
              onClick={() => setStep("form")}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-stone-900/60 p-6 text-left transition-all hover:border-amber-500/30 hover:bg-stone-900"
            >
              <div>
                <p className="font-serif text-lg text-amber-100">Create my artist profile</p>
                <p className="mt-1 text-sm text-stone-400">Set up your page, share your process, and get discovered</p>
              </div>
              <ChevronRight size={20} className="text-stone-500" />
            </button>
            <div className="rounded-2xl border border-white/10 bg-stone-900/40 p-5">
              <p className="mb-3 text-sm font-medium text-stone-400">Or explore as an existing artist</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {artists.slice(0, 6).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleDemoAs(a.id)}
                    className="flex items-center gap-2 rounded-xl border border-white/5 bg-stone-800/60 px-3 py-2 text-left text-sm transition-all hover:border-amber-500/30 hover:bg-stone-800"
                  >
                    <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10 bg-stone-700">
                      {a.images[0] && <img src={a.images[0].url} alt={a.name} className="h-full w-full object-cover" />}
                    </div>
                    <span className="truncate text-stone-300">{a.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Done screen ───────────────────────────────────────────────────────────────
  if (step === "done") {
    const typeLabel = ACCOUNT_TYPES.find((t) => t.id === accountType)?.label ?? "member";
    const isArtist = accountType === "artist";
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <CheckCircle size={48} className="text-amber-400" />
        <h1 className="font-serif text-3xl text-amber-100">You're on Kiln</h1>
        <p className="text-stone-400 max-w-sm">
          {isArtist
            ? "Start sharing your process — show what you're making, how you're making it, and why craft matters to you."
            : `Welcome as a ${typeLabel}. Discover extraordinary craft, follow artists, and explore the community.`}
        </p>
        <div className="flex gap-3">
          {isArtist ? (
            <>
              <button onClick={() => navigate("/create")}
                className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                Share Your Process
              </button>
              <button onClick={() => navigate(`/artists/${form.handle.replace(/^@/, "")}`)}
                className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
                View Profile
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/shop")}
                className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                Browse Shop
              </button>
              <button onClick={() => navigate("/")}
                className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
                Explore Feed
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Profile form (tailored per account type) ──────────────────────────────────
  const selected = ACCOUNT_TYPES.find((t) => t.id === accountType)!;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 py-10 pb-28 md:pb-10">
        <button
          onClick={() => setStep(accountType === "artist" ? "choose-mode" : "choose-type")}
          className="mb-6 flex items-center gap-1 text-sm text-stone-500 hover:text-amber-300 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">{selected.emoji}</span>
          <h2 className="font-serif text-2xl text-amber-100">
            {accountType === "gallery" ? "Your gallery profile"
              : accountType === "museum" ? "Your institution profile"
              : `Your ${selected.label.toLowerCase()} profile`}
          </h2>
        </div>

        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-stone-600 bg-stone-800 transition-all hover:border-amber-400/60">
                {avatarPreview
                  ? <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center"><Camera size={22} className="text-stone-500" /></div>
                }
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            <div>
              <p className="text-sm font-medium text-stone-300">Profile photo</p>
              <p className="text-xs text-stone-600">Click to upload</p>
            </div>
          </div>

          {/* Gallery / Museum name */}
          {(accountType === "gallery" || accountType === "museum") && (
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">
                {accountType === "gallery" ? "Gallery name *" : "Institution name *"}
              </label>
              <input
                type="text"
                placeholder={accountType === "gallery" ? "e.g. Meridian Gallery" : "e.g. Corning Museum of Glass"}
                value={accountType === "gallery" ? form.galleryName : form.institutionName}
                onChange={(e) => setForm((f) =>
                  accountType === "gallery"
                    ? { ...f, galleryName: e.target.value }
                    : { ...f, institutionName: e.target.value }
                )}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          )}

          {/* Name + Handle */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">
                {accountType === "gallery" || accountType === "museum" ? "Contact name" : "Full name *"}
              </label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">@handle *</label>
              <input
                type="text"
                placeholder="@yourname"
                value={form.handle}
                onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value.replace(/\s/g, "") }))}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-400">
              {accountType === "artist" ? "About your practice"
                : accountType === "collector" ? "About your collection"
                : accountType === "interior_decorator" ? "About your design practice"
                : accountType === "gallery" ? "About your gallery"
                : accountType === "museum" ? "About your institution"
                : "About you"}
            </label>
            <textarea
              rows={3}
              placeholder={
                accountType === "artist"
                  ? "I make blown glass vessels that explore the relationship between form and light…"
                  : accountType === "collector"
                  ? "I've been collecting studio glass for 15 years, with a focus on Pacific Northwest artists…"
                  : accountType === "interior_decorator"
                  ? "I specialize in sourcing handmade pieces for high-end residential projects…"
                  : accountType === "gallery"
                  ? "We represent emerging and established craft artists with a focus on studio glass…"
                  : accountType === "museum"
                  ? "Our collection spans five centuries of decorative arts and contemporary craft…"
                  : "I'm passionate about handmade objects and the stories behind them…"
              }
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
            />
          </div>

          {/* Location + Website */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Location</label>
              <input
                type="text"
                placeholder="Portland, OR"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Website</label>
              <input
                type="text"
                placeholder="yoursite.com"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Artist: mediums */}
          {accountType === "artist" && (
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">Your medium(s)</label>
              <div className="flex flex-wrap gap-2">
                {ARTIST_MEDIUMS.map((m) => (
                  <button key={m} type="button" onClick={() => toggleTag("mediums", m)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      form.mediums.includes(m)
                        ? "bg-amber-500 text-stone-950"
                        : "border border-white/10 bg-stone-800 text-stone-400 hover:border-amber-500/40"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Collector: interests + budget */}
          {accountType === "collector" && (
            <>
              <div>
                <label className="mb-2 block text-xs font-medium text-stone-400">What do you collect?</label>
                <div className="flex flex-wrap gap-2">
                  {COLLECTOR_INTERESTS.map((m) => (
                    <button key={m} type="button" onClick={() => toggleTag("collectingInterests", m)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        form.collectingInterests.includes(m)
                          ? "bg-amber-500 text-stone-950"
                          : "border border-white/10 bg-stone-800 text-stone-400 hover:border-amber-500/40"
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-400">Typical piece budget</label>
                <select
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-300 focus:border-amber-500/50 focus:outline-none"
                >
                  <option value="">Prefer not to say</option>
                  <option value="under_500">Under $500</option>
                  <option value="500_2000">$500 – $2,000</option>
                  <option value="2000_10000">$2,000 – $10,000</option>
                  <option value="over_10000">$10,000+</option>
                </select>
              </div>
            </>
          )}

          {/* Interior Decorator: specialties */}
          {accountType === "interior_decorator" && (
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">Project specialties</label>
              <div className="flex flex-wrap gap-2">
                {DECORATOR_SPECIALTIES.map((m) => (
                  <button key={m} type="button" onClick={() => toggleTag("decoratorSpecialties", m)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      form.decoratorSpecialties.includes(m)
                        ? "bg-amber-500 text-stone-950"
                        : "border border-white/10 bg-stone-800 text-stone-400 hover:border-amber-500/40"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enthusiast: interests */}
          {accountType === "enthusiast" && (
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">Craft you love</label>
              <div className="flex flex-wrap gap-2">
                {ENTHUSIAST_INTERESTS.map((m) => (
                  <button key={m} type="button" onClick={() => toggleTag("enthusiastInterests", m)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      form.enthusiastInterests.includes(m)
                        ? "bg-amber-500 text-stone-950"
                        : "border border-white/10 bg-stone-800 text-stone-400 hover:border-amber-500/40"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gallery: focus */}
          {accountType === "gallery" && (
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">Gallery focus</label>
              <div className="flex flex-wrap gap-2">
                {GALLERY_FOCUS.map((m) => (
                  <button key={m} type="button" onClick={() => toggleTag("galleryFocus", m)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      form.galleryFocus.includes(m)
                        ? "bg-amber-500 text-stone-950"
                        : "border border-white/10 bg-stone-800 text-stone-400 hover:border-amber-500/40"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Museum: collection focus */}
          {accountType === "museum" && (
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">Collection focus</label>
              <div className="flex flex-wrap gap-2">
                {MUSEUM_FOCUS.map((m) => (
                  <button key={m} type="button" onClick={() => toggleTag("museumFocus", m)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      form.museumFocus.includes(m)
                        ? "bg-amber-500 text-stone-950"
                        : "border border-white/10 bg-stone-800 text-stone-400 hover:border-amber-500/40"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={!form.name || !form.handle}
            className="w-full rounded-full bg-amber-500 py-3.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create profile
          </button>
        </div>
      </div>
    </div>
  );
}
