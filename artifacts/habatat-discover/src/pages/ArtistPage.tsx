import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useParams } from "wouter";
import { getArtistById, getAllImages, artists } from "@/data/artists";
import { ChevronLeft, ChevronRight, ExternalLink, Play } from "lucide-react";

function ImageRotator({ images }: { images: { url: string; caption: string }[] }) {
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (images.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(t);
  }, [images.length]);

  if (!images.length) {
    return <div className="w-full h-full bg-white/5 flex items-center justify-center"><p className="text-white/20 text-xs">No images available</p></div>;
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={images[idx].url}
          src={images[idx].url}
          alt={images[idx].caption}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          onLoad={() => setLoaded(true)}
        />
      </AnimatePresence>
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${i === idx ? "bg-white/80 w-4" : "bg-white/25"}`}
            />
          ))}
        </div>
      )}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={14} className="text-white/70" />
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % images.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={14} className="text-white/70" />
          </button>
        </>
      )}
      {images[idx] && (
        <div className="absolute bottom-10 left-4">
          <p className="text-[9px] text-white/40 uppercase tracking-[0.1em]">{images[idx].caption}</p>
        </div>
      )}
    </div>
  );
}

function VideoCard({ video }: { video: { id: string; title: string } }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video bg-black/40 overflow-hidden rounded-sm">
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
          className="w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={video.title}
        />
      ) : (
        <button className="group w-full h-full relative" onClick={() => setPlaying(true)}>
          <img
            src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all">
              <Play size={18} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3">
            <p className="text-[10px] text-white/70 leading-snug line-clamp-2">{video.title}</p>
          </div>
        </button>
      )}
    </div>
  );
}

export default function ArtistPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"bio" | "works" | "videos">("bio");

  const artist = getArtistById(params.id);
  const allImages = artist ? getAllImages(artist) : [];

  const currentIndex = artists.findIndex((a) => a.id === params.id);
  const prevArtist = currentIndex > 0 ? artists[currentIndex - 1] : null;
  const nextArtist = currentIndex < artists.length - 1 ? artists[currentIndex + 1] : null;

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <p className="text-white/30 text-sm">Artist not found.</p>
          <button onClick={() => navigate("/artists")} className="text-[10px] text-white/25 hover:text-white/60 underline transition-colors">Back to Artists</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <button
          onClick={() => navigate("/artists")}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-white/30 hover:text-white/60 transition-colors"
        >
          <ChevronLeft size={10} /> Artists
        </button>
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">Habatat Galleries</p>
        </div>
        <div className="flex items-center gap-4">
          {prevArtist && (
            <button onClick={() => navigate(`/artists/${prevArtist.id}`)} className="text-[10px] text-white/20 hover:text-white/50 transition-colors">← Prev</button>
          )}
          {nextArtist && (
            <button onClick={() => navigate(`/artists/${nextArtist.id}`)} className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Next →</button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 min-h-[70vh]">
        <div className="lg:col-span-3 relative bg-black" style={{ minHeight: "55vh" }}>
          <ImageRotator images={allImages} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30 pointer-events-none" />
        </div>

        <div className="lg:col-span-2 border-l border-white/5 flex flex-col">
          <div className="px-8 py-8 border-b border-white/5">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/20 mb-2">{artist.nationality} · Born {artist.born}</p>
            <h1 className="font-serif text-3xl font-normal text-white leading-tight tracking-tight">{artist.name}</h1>
            <p className="text-xs text-white/35 mt-1">{artist.location} · {artist.medium}</p>
            <p className="text-sm text-white/45 font-light mt-3 leading-relaxed">{artist.tagline}</p>

            <div className="flex gap-3 mt-5">
              {artist.website && (
                <a href={artist.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[9px] uppercase tracking-[0.15em] text-white/25 hover:text-white/60 transition-colors border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-full">
                  Website <ExternalLink size={8} />
                </a>
              )}
              <a href={artist.habatat} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.15em] text-white/25 hover:text-white/60 transition-colors border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-full">
                Habatat <ExternalLink size={8} />
              </a>
            </div>
          </div>

          <div className="flex border-b border-white/5">
            {(["bio", "works", "videos"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-[9px] uppercase tracking-[0.15em] transition-colors ${activeTab === tab ? "text-white/70 border-b border-white/40" : "text-white/20 hover:text-white/40"}`}
              >
                {tab === "bio" ? "Biography" : tab === "works" ? "Bodies of Work" : "Videos"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6" style={{ maxHeight: "50vh" }}>
            <AnimatePresence mode="wait">
              {activeTab === "bio" && (
                <motion.div key="bio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <p className="text-[13px] text-white/45 leading-relaxed font-light">{artist.bio}</p>
                  <div className="mt-6">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 mb-3">Concepts &amp; Inspiration</p>
                    <div className="flex flex-wrap gap-2">
                      {artist.concepts.map((c) => (
                        <span key={c} className="text-[9px] uppercase tracking-[0.12em] text-white/30 border border-white/10 rounded-full px-2.5 py-1">{c}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              {activeTab === "works" && (
                <motion.div key="works" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
                  {artist.series.map((s) => (
                    <div key={s.name} className="border-l border-white/10 pl-4">
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <p className="text-xs font-medium text-white/65">{s.name}</p>
                        <p className="text-[9px] text-white/25 uppercase tracking-[0.1em]">{s.years}</p>
                      </div>
                      <p className="text-[12px] text-white/35 leading-relaxed font-light">{s.description}</p>
                    </div>
                  ))}
                </motion.div>
              )}
              {activeTab === "videos" && (
                <motion.div key="videos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
                  {artist.videos.length === 0 && <p className="text-white/25 text-xs">No videos available.</p>}
                  {artist.videos.map((v) => <VideoCard key={v.id} video={v} />)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <section className="px-6 py-12 border-t border-white/5">
        <p className="text-[9px] uppercase tracking-[0.2em] text-white/15 mb-6">More Artists</p>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {artists.filter((a) => a.id !== artist.id).slice(0, 6).map((a) => {
            const img = a.images[0]?.url ?? (a.videos[0] ? `https://img.youtube.com/vi/${a.videos[0].id}/hqdefault.jpg` : null);
            return (
              <button key={a.id} onClick={() => navigate(`/artists/${a.id}`)} className="group flex-shrink-0 text-left w-36">
                <div className="aspect-[4/3] bg-white/5 overflow-hidden rounded-sm mb-2">
                  {img && <img src={img} alt={a.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                </div>
                <p className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors leading-tight">{a.name}</p>
                <p className="text-[9px] text-white/20 mt-0.5">{a.medium}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
