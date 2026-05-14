import { motion } from "framer-motion";
import { Link } from "wouter";
import { MapPin, Flame } from "lucide-react";
import Nav from "@/components/Nav";
import { artists, Artist, getAllImages } from "@/data/artists";

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function getCraftScore(artist: Artist): number {
  return 78 + (hash(artist.id) % 20);
}

function getFollowers(artist: Artist): string {
  const h = hash(artist.id);
  const n = 3000 + (h % 47000);
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

export default function Artists() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Kiln · Roster
          </p>
          <h1 className="font-serif text-3xl font-normal text-foreground">Artists</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {artists.length} world-class artists working in glass, metal, and sculpture.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artists.map((artist, i) => {
            const images = getAllImages(artist);
            const img = images[0]?.url ?? null;
            const score = getCraftScore(artist);
            const followers = getFollowers(artist);

            return (
              <motion.div
                key={artist.id}
                data-testid={`artist-card-${artist.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
              >
                <Link href={`/artists/${artist.id}`}>
                  <div className="group cursor-pointer">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-card mb-3">
                      {img && (
                        <img
                          src={img}
                          alt={artist.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-3 right-3">
                        <div
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: "hsl(28 68% 52%)", color: "hsl(20 8% 9%)" }}
                        >
                          <Flame size={9} />
                          {score}
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-0.5">{artist.nationality}</p>
                        <p className="text-sm font-medium text-white leading-tight group-hover:text-primary transition-colors">
                          {artist.name}
                        </p>
                      </div>
                    </div>

                    <div className="px-0.5">
                      <p className="text-[11px] text-muted-foreground mb-1 line-clamp-1">{artist.medium}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin size={9} />
                          {artist.location.split(",")[0]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{followers} followers</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
