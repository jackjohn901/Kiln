import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation, Link } from "wouter";
import {
  ChevronLeft, ExternalLink, Heart, Share2, Play, Flame, MapPin, Building2
} from "lucide-react";
import Nav from "@/components/Nav";
import { artists, getArtistById, getAllImages, Artist } from "@/data/artists";
import { getListingsByArtist, formatPrice } from "@/data/listings";

type Tab = "bio" | "works" | "videos" | "shop";

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function getCraftScore(artist: Artist): number {
  return 78 + (hash(artist.id) % 20);
}

function getStats(artist: Artist) {
  const h = hash(artist.id);
  const views = 12000 + (h % 88000);
  const followers = 3000 + (h % 47000);
  return { views, followers };
}

function VideoCard({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div
      data-testid={`video-card-${videoId}`}
      className="relative aspect-video bg-card rounded-lg overflow-hidden border border-card-border"
    >
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          className="w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={title}
        />
      ) : (
        <button className="group w-full h-full relative" onClick={() => setPlaying(true)}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all">
              <Play size={18} fill="white" className="text-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3">
            <p className="text-[10px] text-white/70 leading-snug line-clamp-2">{title}</p>
          </div>
        </button>
      )}
    </div>
  );
}

export default function ArtistProfile() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("bio");
  const [followed, setFollowed] = useState(false);

  const artist = getArtistById(params.id);
  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground text-sm">Artist not found.</p>
          <button onClick={() => navigate("/artists")} className="text-xs text-primary underline">
            Back to Artists
          </button>
        </div>
      </div>
    );
  }

  const allImages = getAllImages(artist);
  const heroImage = allImages[0];
  const score = getCraftScore(artist);
  const stats = getStats(artist);
  const artistListings = getListingsByArtist(artist.id);
  const currentIndex = artists.findIndex((a) => a.id === artist.id);
  const prevArtist = currentIndex > 0 ? artists[currentIndex - 1] : null;
  const nextArtist = currentIndex < artists.length - 1 ? artists[currentIndex + 1] : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "bio", label: "Biography" },
    { id: "works", label: "Bodies of Work" },
    { id: "videos", label: "Videos" },
    { id: "shop", label: `Shop (${artistListings.length})` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <div
        className="relative h-[50vh] overflow-hidden"
        data-testid="artist-hero"
      >
        {heroImage && (
          <img src={heroImage.url} alt={artist.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

        <div className="absolute top-4 left-6 flex items-center gap-4">
          <button
            data-testid="back-btn"
            onClick={() => navigate("/artists")}
            className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft size={12} /> Artists
          </button>
        </div>

        <div className="absolute top-4 right-6 flex items-center gap-3">
          {prevArtist && (
            <Link href={`/artists/${prevArtist.id}`}>
              <span className="text-[10px] text-white/40 hover:text-white/70 transition-colors cursor-pointer">← Prev</span>
            </Link>
          )}
          {nextArtist && (
            <Link href={`/artists/${nextArtist.id}`}>
              <span className="text-[10px] text-white/40 hover:text-white/70 transition-colors cursor-pointer">Next →</span>
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        <div className="relative -mt-16 mb-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
                {artist.nationality}{artist.born ? ` · Born ${artist.born}` : ""}
              </p>
              <h1 className="font-serif text-4xl font-normal text-foreground mb-1" data-testid="artist-name">
                {artist.name}
              </h1>
              <p className="text-sm text-muted-foreground">{artist.medium}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                data-testid="craft-score-badge"
                style={{ background: "hsl(28 68% 52% / 0.15)", border: "1px solid hsl(28 68% 52% / 0.4)", color: "hsl(28 68% 65%)" }}
              >
                <Flame size={12} />
                Craft Score {score}
              </div>
              <button
                data-testid="follow-btn"
                onClick={() => setFollowed((v) => !v)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  followed
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "border border-border text-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                <Heart size={12} fill={followed ? "currentColor" : "none"} />
                {followed ? "Following" : "Follow"}
              </button>
              {artist.website && (
                <a
                  href={artist.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="website-link"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-white/20 transition-all"
                >
                  Website <ExternalLink size={10} />
                </a>
              )}
              <a
                href={artist.habatat}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="habatat-link"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-white/20 transition-all"
              >
                Habatat <ExternalLink size={10} />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin size={11} />
              {artist.location}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {(stats.followers / 1000).toFixed(1).replace(/\.0$/, "")}k followers
            </div>
            <div className="text-[11px] text-muted-foreground">
              {artist.series.length} series
            </div>
          </div>
        </div>

        {artist.quote && (
          <blockquote className="border-l-2 pl-5 mb-8" style={{ borderColor: "hsl(28 68% 52%)" }}>
            <p className="font-serif text-lg italic text-foreground/80 leading-relaxed">"{artist.quote}"</p>
          </blockquote>
        )}

        <div className="flex border-b border-border/50 mb-8" data-testid="profile-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              data-testid={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-[11px] uppercase tracking-[0.12em] font-medium transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:border-white/20"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "bio" && (
            <motion.div
              key="bio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="pb-16"
              data-testid="tab-content-bio"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                  <p className="text-sm text-foreground/70 leading-relaxed font-light">{artist.bio}</p>

                  {artist.artistStatement && (
                    <div className="pt-5 border-t border-border/40">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Artist Statement</p>
                      <p className="text-sm text-foreground/60 leading-relaxed italic font-light">{artist.artistStatement}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {artist.collections.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Building2 size={10} /> Public Collections
                      </p>
                      <ul className="space-y-2">
                        {artist.collections.map((c) => (
                          <li key={c} className="text-[11px] text-foreground/50 font-light flex items-start gap-2">
                            <span className="text-primary/40 mt-0.5">—</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Concepts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {artist.concepts.map((c) => (
                        <span
                          key={c}
                          className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground border border-border/60 rounded-full px-2.5 py-1"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {artist.tagline && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Tagline</p>
                      <p className="text-xs text-foreground/60 italic">{artist.tagline}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {tab === "works" && (
            <motion.div
              key="works"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 pb-16"
              data-testid="tab-content-works"
            >
              {artist.series.map((s, i) => (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="border-l-2 border-border pl-5 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-baseline gap-3 mb-2">
                    <h3 className="text-sm font-medium text-foreground">{s.name}</h3>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{s.years}</span>
                  </div>
                  <p className="text-[13px] text-foreground/55 leading-relaxed font-light">{s.description}</p>
                </motion.div>
              ))}
            </motion.div>
          )}

          {tab === "videos" && (
            <motion.div
              key="videos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="pb-16"
              data-testid="tab-content-videos"
            >
              {artist.videos.length === 0 ? (
                <p className="text-muted-foreground text-sm">No videos available.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {artist.videos.map((v) => (
                    <VideoCard key={v.id} videoId={v.id} title={v.title} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "shop" && (
            <motion.div
              key="shop"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="pb-16"
              data-testid="tab-content-shop"
            >
              {artistListings.length === 0 ? (
                <p className="text-muted-foreground text-sm">No works currently listed.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {artistListings.map((listing, i) => (
                    <motion.div
                      key={listing.id}
                      data-testid={`shop-listing-${listing.id}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`bg-card rounded-lg overflow-hidden border border-card-border hover:border-primary/30 transition-all ${
                        !listing.available ? "opacity-60" : ""
                      }`}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {listing.imageUrl && (
                          <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                        )}
                        {!listing.available && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="px-3 py-1 rounded-full bg-black/60 text-white/70 text-[10px] uppercase tracking-wider">Sold</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-medium text-foreground mb-1">{listing.title}</p>
                        <p className="text-[11px] text-muted-foreground mb-0.5">{listing.year} · {listing.medium.split(",")[0]}</p>
                        <p className="text-[10px] text-muted-foreground mb-3">{listing.dimensions}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold text-foreground">{formatPrice(listing.price)}</span>
                          {listing.available && (
                            <a
                              href={artist.habatat}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`inquire-${listing.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all"
                              style={{ background: "hsl(28 68% 52%)", color: "hsl(20 8% 9%)" }}
                            >
                              Inquire <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-border/40">
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-lg">
                  Inquiries are handled directly with the artist or their gallery representative.
                  All works come with certificates of authenticity. Payment plans available for works over $25,000.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="border-t border-border/40 py-12 mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-6">More Artists</p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {artists.filter((a) => a.id !== artist.id).slice(0, 6).map((a) => {
              const img = getAllImages(a)[0]?.url ?? null;
              return (
                <Link key={a.id} href={`/artists/${a.id}`}>
                  <div
                    data-testid={`related-artist-${a.id}`}
                    className="group flex-shrink-0 text-left w-32 cursor-pointer"
                  >
                    <div className="aspect-[4/3] bg-card overflow-hidden rounded-md mb-2">
                      {img && (
                        <img
                          src={img}
                          alt={a.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <p className="text-[10px] text-foreground/60 group-hover:text-foreground transition-colors leading-tight">{a.name}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{a.medium.split(" &")[0].split(",")[0]}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
