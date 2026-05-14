import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { artists, getYoutubeThumbnail } from "@/data/artists";

export default function Artists() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">Habatat Galleries</p>
          <p className="text-sm font-light text-white/70 mt-0.5 tracking-wide">Artist Discovery</p>
        </div>
        <nav className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="text-[10px] uppercase tracking-[0.2em] text-white/25 hover:text-white/60 transition-colors">Featured</button>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 border-b border-white/30 pb-0.5">Artists</span>
          <button onClick={() => navigate("/browse")} className="text-[10px] uppercase tracking-[0.2em] text-white/25 hover:text-white/60 transition-colors">Videos</button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="font-serif text-3xl font-normal text-white/85 tracking-tight">Artists</h1>
          <p className="text-xs text-white/30 mt-1.5">{artists.length} artists represented at Habatat Galleries</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artists.map((artist, i) => {
            const heroImg = artist.images[0]?.url ?? (artist.videos[0] ? getYoutubeThumbnail(artist.videos[0].id) : null);
            return (
              <motion.button
                key={artist.id}
                onClick={() => navigate(`/artists/${artist.id}`)}
                className="group text-left"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative aspect-[4/3] bg-white/5 overflow-hidden rounded-sm mb-3">
                  {heroImg && (
                    <img
                      src={heroImg}
                      alt={artist.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <p className="font-serif text-base font-normal text-white leading-tight">{artist.name}</p>
                    <p className="text-[10px] text-white/50 mt-0.5 tracking-wide">{artist.nationality} · {artist.medium}</p>
                  </div>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-white/70 bg-black/50 px-2 py-1 rounded-full">View →</span>
                  </div>
                </div>
                <p className="text-[11px] text-white/30 leading-snug px-1 font-light">{artist.tagline}</p>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-[9px] text-white/15 uppercase tracking-wider">Habatat Galleries · Royal Oak, Michigan · Est. 1971</p>
        </div>
      </main>
    </div>
  );
}
