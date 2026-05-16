import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { MapPin, Flame, Loader2, Users } from "lucide-react";
import Nav from "@/components/Nav";
import { artists, Artist } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

const staticArtists = [...artists, ...seedArtists];

interface DbProfile {
  userId: string;
  handle: string | null;
  displayName: string | null;
  medium: string | null;
  location: string | null;
  avatarUrl: string | null;
  followerCount: number;
  craftScore: number | null;
}

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
function getCraftScore(id: string, score?: number | null): number {
  return score ?? (78 + (hash(id) % 20));
}
function formatFollowers(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

export default function Artists() {
  const [dbProfiles, setDbProfiles] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/search?limit=100", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setDbProfiles(data.profiles ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const staticIds = new Set(staticArtists.map(a => a.id));
  const uniqueDbProfiles = dbProfiles.filter(p => !staticIds.has(p.userId));
  const totalCount = staticArtists.length + uniqueDbProfiles.length;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Kiln · Roster</p>
          <h1 className="font-serif text-3xl font-normal text-foreground">Artists</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading..." : `${totalCount} artists working in glass, metal, ceramics, fiber, wood, and more.`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {staticArtists.map((artist, i) => {
            const img = artist.images[0]?.url ?? `https://picsum.photos/seed/${artist.id}-cover/600/800`;
            const score = getCraftScore(artist.id);
            const followers = formatFollowers(3000 + (hash(artist.id) % 47000));
            return (
              <motion.div key={artist.id} data-testid={`artist-card-${artist.id}`}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.6) }}>
                <Link href={`/artists/${artist.id}`}>
                  <div className="group cursor-pointer">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-card mb-3">
                      <img src={img} alt={artist.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${artist.id}/600/800`; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-3 right-3">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "hsl(28 68% 52%)", color: "hsl(20 8% 9%)" }}>
                          <Flame size={9} /> {score}
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-0.5">{artist.medium.split(",")[0]}</p>
                        <p className="font-serif text-sm font-medium text-white leading-tight">{artist.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-0.5 text-[9px] text-white/50">
                            <MapPin size={8} /> {artist.location.split(",")[0]}
                          </span>
                          <span className="flex items-center gap-0.5 text-[9px] text-white/50">
                            <Users size={8} /> {followers}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {uniqueDbProfiles.map((p, i) => {
            const name = p.displayName ?? p.handle ?? "Artist";
            const img = p.avatarUrl ?? `https://picsum.photos/seed/${p.userId}/600/800`;
            const score = getCraftScore(p.userId, p.craftScore);
            const followers = formatFollowers(p.followerCount);
            return (
              <motion.div key={p.userId}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min((staticArtists.length + i) * 0.03, 0.8) }}>
                <Link href={`/artists/${p.userId}`}>
                  <div className="group cursor-pointer">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-card mb-3">
                      <img src={img} alt={name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${p.userId}/600/800`; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-3 right-3">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "hsl(28 68% 52%)", color: "hsl(20 8% 9%)" }}>
                          <Flame size={9} /> {score}
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        {p.medium && <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-0.5">{p.medium.split(",")[0]}</p>}
                        <p className="font-serif text-sm font-medium text-white leading-tight">{name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {p.location && (
                            <span className="flex items-center gap-0.5 text-[9px] text-white/50">
                              <MapPin size={8} /> {p.location.split(",")[0]}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5 text-[9px] text-white/50">
                            <Users size={8} /> {followers}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {loading && uniqueDbProfiles.length === 0 && (
          <div className="mt-8 flex justify-center">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
