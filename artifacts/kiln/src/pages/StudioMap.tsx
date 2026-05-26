import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { MapPin, List, Map as MapIcon, Users, X, ExternalLink, CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial } from "@/contexts/SocialContext";

const ALL_ARTISTS = [...artists, ...seedArtists];

const CITY_COORDS: Record<string, { x: number; y: number }> = {
  "Seattle": { x: 8.5, y: 22 }, "Stanwood": { x: 8, y: 20 }, "Portland": { x: 8.5, y: 28 },
  "San Francisco": { x: 7, y: 42 }, "Los Angeles": { x: 11, y: 52 },
  "Asheville": { x: 72, y: 50 }, "Atlanta": { x: 69, y: 56 }, "Nashville": { x: 62, y: 52 },
  "Chicago": { x: 59, y: 36 }, "Detroit": { x: 63, y: 34 }, "Minneapolis": { x: 50, y: 28 },
  "Brooklyn": { x: 80, y: 38 }, "Philadelphia": { x: 79, y: 40 }, "Boston": { x: 83, y: 34 },
  "Denver": { x: 32, y: 43 }, "Santa Fe": { x: 28, y: 54 }, "Austin": { x: 42, y: 65 },
  "Houston": { x: 46, y: 68 }, "New Orleans": { x: 55, y: 66 }, "Miami": { x: 75, y: 74 },
  "Pittsburgh": { x: 72, y: 40 }, "Cleveland": { x: 68, y: 37 }, "Kansas City": { x: 50, y: 46 },
  "St. Louis": { x: 55, y: 46 }, "Cincinnati": { x: 66, y: 43 }, "Indianapolis": { x: 62, y: 42 },
  "Phoenix": { x: 20, y: 58 }, "Salt Lake City": { x: 22, y: 38 }, "Boise": { x: 15, y: 30 },
  "Tucson": { x: 22, y: 63 }, "Albuquerque": { x: 28, y: 57 }, "Oklahoma City": { x: 47, y: 57 },
};

function getCoords(location: string): { x: number; y: number } {
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (location.toLowerCase().includes(city.toLowerCase())) return coords;
  }
  const h = Math.abs(location.split("").reduce((a, c) => Math.imul(31, a) + c.charCodeAt(0) | 0, 0));
  return { x: 15 + (h % 65), y: 25 + (h % 50) };
}

const MEDIUM_COLORS: Record<string, string> = {
  "Glass": "bg-cyan-400", "Metal": "bg-slate-400", "Ceramics": "bg-orange-400",
  "Fiber": "bg-purple-400", "Wood": "bg-lime-600", "Enamel": "bg-violet-400", "Other": "bg-amber-400",
};

function getMedium(medium: string): string {
  const m = medium.toLowerCase();
  if (m.includes("glass")) return "Glass";
  if (m.includes("metal") || m.includes("iron") || m.includes("steel") || m.includes("bronze") || m.includes("weld") || m.includes("blacksmith")) return "Metal";
  if (m.includes("ceramic") || m.includes("clay") || m.includes("raku") || m.includes("porcelain") || m.includes("pottery")) return "Ceramics";
  if (m.includes("fiber") || m.includes("textile") || m.includes("weav") || m.includes("embroid") || m.includes("felt")) return "Fiber";
  if (m.includes("wood")) return "Wood";
  if (m.includes("enamel")) return "Enamel";
  return "Other";
}

interface ArtistPin {
  id: string;
  name: string;
  medium: string;
  location: string;
  avatarUrl: string;
  coords: { x: number; y: number };
  mediumCategory: string;
}

const PINS: ArtistPin[] = ALL_ARTISTS.map((a) => ({
  id: a.id,
  name: a.name,
  medium: a.medium.split(",")[0].trim(),
  location: a.location,
  avatarUrl: a.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${a.id}`,
  coords: getCoords(a.location),
  mediumCategory: getMedium(a.medium),
}));

const MEDIUMS = ["All", "Glass", "Metal", "Ceramics", "Fiber", "Wood", "Enamel"];

export default function StudioMap() {
  const [selectedPin, setSelectedPin] = useState<ArtistPin | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [mediumFilter, setMediumFilter] = useState("All");
  const [pins, setPins] = useState<ArtistPin[]>(PINS);
  const { getArtistCommissionStatus } = useSocial();
  const mapRef = useRef<HTMLDivElement>(null);

  // Augment with real profiles from API
  useEffect(() => {
    fetch("/api/studio-map", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ artists: Array<{ userId: string; displayName: string; avatarUrl: string | null; location: string | null; medium: string | null; handle: string | null }> }> : null)
      .then(data => {
        if (!data?.artists?.length) return;
        const existingIds = new Set(PINS.map(p => p.id));
        const newPins: ArtistPin[] = data.artists
          .filter(a => a.location && !existingIds.has(a.userId))
          .map(a => ({
            id: a.userId,
            name: a.displayName,
            medium: (a.medium ?? "Other").split(",")[0].trim(),
            location: a.location!,
            avatarUrl: a.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${a.userId}`,
            coords: getCoords(a.location!),
            mediumCategory: getMedium(a.medium ?? "Other"),
          }));
        if (newPins.length > 0) setPins(prev => [...prev, ...newPins]);
      })
      .catch(() => {});
  }, []);

  const filtered = mediumFilter === "All" ? pins : pins.filter((p) => p.mediumCategory === mediumFilter);

  const cs = selectedPin ? getArtistCommissionStatus(selectedPin.id) : "closed";
  const csColor = cs === "open" ? "text-emerald-400" : cs === "waitlisted" ? "text-amber-400" : "text-stone-500";
  const CsIcon = cs === "open" ? CheckCircle : Clock;

  return (
    <div className="min-h-screen bg-[#12100e] text-stone-100">
      <Nav />
      <div className="pt-14">
        {/* Header */}
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <h1 className="font-serif text-2xl font-bold text-amber-100 flex items-center gap-2">
                <MapPin size={20} className="text-amber-400" /> Studio Map
              </h1>
              <p className="text-sm text-stone-500">{filtered.length} artists across North America</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${viewMode === "map" ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-stone-700 text-stone-500"}`}
              >
                <MapIcon size={13} /> Map
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${viewMode === "list" ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-stone-700 text-stone-500"}`}
              >
                <List size={13} /> List
              </button>
            </div>
          </div>

          {/* Medium filters */}
          <div className="flex gap-2 flex-wrap mb-4">
            {MEDIUMS.map((m) => (
              <button key={m} onClick={() => setMediumFilter(m)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  mediumFilter === m ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-stone-700 text-stone-500 hover:border-stone-500"
                }`}
              >
                {m !== "All" && <span className={`h-2 w-2 rounded-full ${MEDIUM_COLORS[m] ?? "bg-amber-400"}`} />}
                {m}
              </button>
            ))}
          </div>
        </div>

        {viewMode === "map" ? (
          <div className="relative mx-auto max-w-7xl px-4 pb-16">
            {/* Map container */}
            <div
              ref={mapRef}
              className="relative w-full overflow-hidden rounded-2xl border border-white/10"
              style={{ paddingBottom: "55%" }}
            >
              {/* Map background — stylized US topographic */}
              <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900">
                {/* Terrain shapes */}
                <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 55" preserveAspectRatio="none">
                  <path d="M0,20 Q10,15 15,22 Q20,18 25,25 Q30,20 35,28 Q45,22 50,30 Q55,25 60,32 Q65,28 70,35 Q75,30 80,38 Q85,35 90,40 Q95,38 100,42 L100,55 L0,55 Z" fill="#78716c" />
                  <path d="M0,28 Q8,24 12,30 Q18,26 22,32 Q28,27 32,34 Q38,29 45,36 Q52,30 58,38 Q65,33 72,40 Q78,35 85,42 Q92,38 100,44 L100,55 L0,55 Z" fill="#57534e" />
                  <path d="M0,35 Q12,32 18,38 Q25,34 30,40 Q38,35 44,42 Q52,37 58,44 Q65,40 72,46 Q80,42 88,48 L100,45 L100,55 L0,55 Z" fill="#44403c" />
                  {/* Mountain ranges */}
                  <path d="M5,25 L8,18 L11,25 M12,22 L15,16 L18,22 M7,20 L9,15 L11,20" stroke="#78716c" strokeWidth="0.4" fill="none" opacity="0.6" />
                  <path d="M22,35 L24,30 L26,35 M27,33 L29,28 L31,33" stroke="#78716c" strokeWidth="0.4" fill="none" opacity="0.6" />
                  {/* Rivers */}
                  <path d="M45,15 Q50,25 48,35 Q46,42 50,50" stroke="#1e3a5f" strokeWidth="0.5" fill="none" opacity="0.5" />
                  <path d="M80,20 Q82,30 80,40" stroke="#1e3a5f" strokeWidth="0.3" fill="none" opacity="0.4" />
                  {/* Great Lakes */}
                  <ellipse cx="61" cy="31" rx="3" ry="1.5" fill="#1e3a5f" opacity="0.4" />
                  <ellipse cx="65" cy="29" rx="2" ry="1" fill="#1e3a5f" opacity="0.4" />
                  <ellipse cx="58" cy="28" rx="1.5" ry="1" fill="#1e3a5f" opacity="0.4" />
                  {/* Gulf of Mexico hint */}
                  <ellipse cx="55" cy="75" rx="20" ry="8" fill="#1e3a5f" opacity="0.3" />
                </svg>

                {/* Coastal edges */}
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(to right, rgba(15,118,110,0.05) 0%, transparent 12%, transparent 82%, rgba(15,118,110,0.04) 100%)",
                }} />

                {/* Grid lines */}
                <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 100 55" preserveAspectRatio="none">
                  {[10,20,30,40,50,60,70,80,90].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="55" stroke="#fff" strokeWidth="0.2" />)}
                  {[10,20,30,40,50].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#fff" strokeWidth="0.2" />)}
                </svg>
              </div>

              {/* Artist pins */}
              {filtered.map((pin) => {
                const pinColor = MEDIUM_COLORS[pin.mediumCategory] ?? "bg-amber-400";
                const isSelected = selectedPin?.id === pin.id;
                return (
                  <button
                    key={pin.id}
                    onClick={() => setSelectedPin(isSelected ? null : pin)}
                    className="absolute group"
                    style={{ left: `${pin.coords.x}%`, top: `${pin.coords.y}%`, transform: "translate(-50%, -100%)" }}
                  >
                    <div className={`relative transition-transform ${isSelected ? "scale-125" : "group-hover:scale-110"}`}>
                      {/* Pin avatar */}
                      <div className={`h-9 w-9 rounded-full overflow-hidden border-2 shadow-lg shadow-black/50 ${isSelected ? "border-amber-400" : "border-white/60 group-hover:border-amber-300"} transition-colors`}>
                        <img src={pin.avatarUrl} alt={pin.name} className="h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${pin.id}`; }} />
                      </div>
                      {/* Medium dot */}
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${pinColor} border border-stone-950`} />
                      {/* Pin stem */}
                      <div className="absolute left-1/2 top-full -translate-x-1/2 w-0.5 h-2 bg-white/40" />
                      {/* Name tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="rounded-lg bg-stone-900 border border-white/15 px-2 py-1 text-[10px] text-stone-200 whitespace-nowrap shadow-xl">
                          {pin.name}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Legend */}
              <div className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-stone-950/80 backdrop-blur-sm px-3 py-2">
                <p className="text-[9px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">Medium</p>
                <div className="space-y-1">
                  {Object.entries(MEDIUM_COLORS).filter(([m]) => m !== "Other").map(([m, cls]) => (
                    <div key={m} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${cls}`} />
                      <span className="text-[9px] text-stone-400">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected artist card */}
            <AnimatePresence>
              {selectedPin && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-4 rounded-2xl border border-amber-500/30 bg-stone-900/90 backdrop-blur-sm p-5 flex items-center gap-4"
                >
                  <Link href={`/artists/${selectedPin.id}`}>
                    <img src={selectedPin.avatarUrl} alt={selectedPin.name}
                      className="h-16 w-16 rounded-2xl object-cover border border-white/10 hover:border-amber-500/40 transition-colors shrink-0" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/artists/${selectedPin.id}`}>
                      <p className="font-serif text-lg font-bold text-amber-100 hover:text-amber-300 transition-colors">{selectedPin.name}</p>
                    </Link>
                    <p className="text-sm text-stone-400">{selectedPin.medium}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin size={11} className="text-stone-600" />
                      <p className="text-xs text-stone-500">{selectedPin.location}</p>
                    </div>
                    <div className={`mt-1 flex items-center gap-1 text-xs ${csColor}`}>
                      <CsIcon size={10} />
                      Commissions {cs === "open" ? "Open" : cs === "waitlisted" ? "Waitlisted" : "Closed"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link href={`/artists/${selectedPin.id}`}>
                      <button className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                        <ExternalLink size={11} /> Profile
                      </button>
                    </Link>
                    <Link href={`/commission/${selectedPin.id}`}>
                      <button className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-stone-300 hover:border-amber-500/40 hover:text-amber-300 transition-colors">
                        Commission
                      </button>
                    </Link>
                  </div>
                  <button onClick={() => setSelectedPin(null)} className="absolute top-3 right-3 text-stone-600 hover:text-stone-300">
                    <X size={15} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* List view */
          <div className="mx-auto max-w-4xl px-4 pb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((pin) => {
                const pinStatus = getArtistCommissionStatus(pin.id);
                return (
                  <Link key={pin.id} href={`/artists/${pin.id}`}>
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-stone-900/60 p-3 hover:border-amber-500/30 transition-all cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        <img src={pin.avatarUrl} alt={pin.name} className="h-12 w-12 rounded-xl object-cover" />
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${MEDIUM_COLORS[pin.mediumCategory] ?? "bg-amber-400"} border-2 border-stone-900`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-200 truncate">{pin.name}</p>
                        <p className="text-xs text-stone-500 truncate">{pin.medium}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={9} className="text-stone-700" />
                          <p className="text-[10px] text-stone-600 truncate">{pin.location}</p>
                        </div>
                      </div>
                      {pinStatus !== "closed" && (
                        <div className={`shrink-0 h-2 w-2 rounded-full ${pinStatus === "open" ? "bg-emerald-400" : "bg-amber-400"}`} />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
