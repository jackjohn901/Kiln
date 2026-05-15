import { useState, useMemo } from "react";
import { Search, MapPin, CheckCircle, Clock, Lock, Users, Hammer, X } from "lucide-react";
import { useLocation } from "wouter";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial, CommissionStatus } from "@/contexts/SocialContext";
import { getWorkshopsByArtist } from "@/data/workshops";
import Nav from "@/components/Nav";

const ALL_ARTISTS = [...artists, ...seedArtists];

const MEDIUMS = ["All", "Glass", "Metal", "Ceramics", "Fiber", "Wood", "Enamel", "Sculpture", "Mixed"];
const STATUS_FILTERS = ["Any", "Open", "Waitlisted"] as const;

const STATUS_UI: Record<CommissionStatus, { label: string; color: string; Icon: typeof CheckCircle }> = {
  open: { label: "Open", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", Icon: CheckCircle },
  waitlisted: { label: "Waitlisted", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", Icon: Clock },
  closed: { label: "Closed", color: "text-rose-400 bg-rose-500/10 border-rose-500/30", Icon: Lock },
};

export default function Discover() {
  const [, navigate] = useLocation();
  const { isFollowing, followArtist, unfollowArtist, getArtistCommissionStatus } = useSocial();

  const [query, setQuery] = useState("");
  const [medium, setMedium] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"Any" | "Open" | "Waitlisted">("Any");

  const filtered = useMemo(() => {
    return ALL_ARTISTS.filter((a) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.medium.toLowerCase().includes(q) ||
        (a.keywords ?? []).some((k: string) => k.toLowerCase().includes(q));

      const matchesMedium =
        medium === "All" || a.medium.toLowerCase().includes(medium.toLowerCase());

      const status = getArtistCommissionStatus(a.id);
      const matchesStatus =
        statusFilter === "Any" ||
        (statusFilter === "Open" && status === "open") ||
        (statusFilter === "Waitlisted" && status === "waitlisted");

      return matchesQuery && matchesMedium && matchesStatus;
    });
  }, [query, medium, statusFilter, getArtistCommissionStatus]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />

      <div className="pt-16 pb-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="py-8">
            <h1 className="text-2xl font-bold text-stone-100 mb-1">Discover Artists</h1>
            <p className="text-sm text-stone-400">Find craft artists by technique, location, or commission availability</p>
          </div>

          <div className="relative mb-4">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, technique, or location…"
              className="w-full bg-stone-900 border border-stone-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500 transition-colors"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {MEDIUMS.map((m) => (
              <button
                key={m}
                onClick={() => setMedium(m)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  medium === m
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-stone-700 text-stone-400 hover:border-stone-500"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <span className="text-xs text-stone-500 self-center mr-1">Commission:</span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-stone-700 text-stone-400 hover:border-stone-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Technique / material search */}
          <div className="mb-6">
            <p className="text-xs text-stone-500 mb-2">Popular techniques:</p>
            <div className="flex flex-wrap gap-1.5">
              {["Glass Blowing","Flameworking","Kiln Forming","Raku","Reduction Firing","Blacksmithing","Bronze Casting","Natural Dyeing","Cloisonné","Pâte de Verre","Welding","Fiber Arts"].map((t) => (
                <button
                  key={t}
                  onClick={() => setQuery((q) => q === t ? "" : t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    query === t
                      ? "border-amber-500 bg-amber-500/20 text-amber-300"
                      : "border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-stone-500 mb-4">{filtered.length} artist{filtered.length !== 1 ? "s" : ""}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((artist) => {
              const status = getArtistCommissionStatus(artist.id);
              const statusInfo = STATUS_UI[status];
              const workshops = getWorkshopsByArtist(artist.id);
              const following = isFollowing(artist.id);
              const avatar = artist.images?.[0]?.url ?? `https://picsum.photos/seed/${artist.id}/200/200`;

              return (
                <div
                  key={artist.id}
                  onClick={() => navigate(`/artists/${artist.id}`)}
                  className="bg-stone-900 rounded-2xl overflow-hidden cursor-pointer hover:ring-1 hover:ring-amber-500/50 transition-all group"
                >
                  <div className="relative aspect-square">
                    <img src={avatar} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                    <div className={`absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs font-medium ${statusInfo.color}`}>
                      <statusInfo.Icon size={9} />
                      <span>{statusInfo.label}</span>
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-sm font-semibold text-stone-100 truncate">{artist.name}</p>
                    <p className="text-xs text-amber-400 truncate mb-1">{artist.medium}</p>
                    <div className="flex items-center gap-1 text-xs text-stone-500 mb-2">
                      <MapPin size={9} />
                      <span className="truncate">{artist.location}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        {workshops.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Hammer size={9} className="text-amber-400" />
                            {workshops.length}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Users size={9} />
                          {(Math.abs(artist.name.charCodeAt(0) * 317 + artist.name.charCodeAt(1) * 131) % 4200 + 800).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (following) {
                            unfollowArtist(artist.id);
                          } else {
                            followArtist(artist.id, artist.name, avatar);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          following
                            ? "border-stone-600 text-stone-400 hover:border-rose-500 hover:text-rose-400"
                            : "border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-stone-950"
                        }`}
                      >
                        {following ? "Following" : "Follow"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-stone-500">
              <Search size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No artists match your search.</p>
              <button onClick={() => { setQuery(""); setMedium("All"); setStatusFilter("Any"); }} className="mt-3 text-xs text-amber-400 hover:text-amber-300">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
