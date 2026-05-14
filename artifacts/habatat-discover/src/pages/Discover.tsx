import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useGetInstagramFeed } from "@workspace/api-client-react";
import { artists, matchArtistFromCaption, type Artist } from "@/data/artists";
import { minutesUntilNextHour } from "@/lib/utils";
import type { InstagramVideo } from "@workspace/api-client-react";

function ConceptWord({ word, index }: { word: string; index: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 + index * 0.07, duration: 0.5 }}
      className="inline-block text-[10px] uppercase tracking-[0.2em] text-white/30 border border-white/10 rounded-full px-3 py-1 mr-2 mb-2"
    >
      {word}
    </motion.span>
  );
}

function HourlyTimer() {
  const [mins, setMins] = useState(minutesUntilNextHour());
  useEffect(() => {
    const t = setInterval(() => setMins(minutesUntilNextHour()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-white/25 text-[10px] tracking-[0.15em] uppercase">
      Next in {mins}m
    </span>
  );
}

function VideoPlayer({ video }: { video: InstagramVideo | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [video?.id]);

  if (!video) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center mx-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-white/20 animate-pulse" />
          </div>
          <p className="text-white/25 text-xs tracking-widest uppercase">No video available</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      key={video.id}
      className="w-full h-full object-cover"
      loop
      muted
      playsInline
      autoPlay
    >
      {video.media_url && <source src={video.media_url} type="video/mp4" />}
    </video>
  );
}

function ArtistPanel({ artist, video }: { artist: Artist; video: InstagramVideo | null }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={artist.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col justify-between h-full"
      >
        <div>
          <div className="mb-8">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/25 mb-3">
              Featured Artist · <HourlyTimer />
            </p>
            <h1 className="font-serif text-3xl lg:text-4xl font-normal text-white leading-tight tracking-tight">
              {artist.name}
            </h1>
            <p className="text-xs text-white/35 mt-1.5 tracking-wide">
              {artist.location} &middot; {artist.medium}
            </p>
          </div>

          <div className="w-6 h-px bg-white/15 mb-6" />

          <p className="text-sm text-white/55 leading-relaxed font-light max-w-xs">
            {artist.tagline}
          </p>

          <p className="text-[13px] text-white/40 leading-relaxed mt-4 max-w-xs font-light">
            {artist.bio}
          </p>
        </div>

        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 mb-3">
            Concepts &amp; Inspiration
          </p>
          <div className="flex flex-wrap">
            {artist.concepts.map((c, i) => (
              <ConceptWord key={c} word={c} index={i} />
            ))}
          </div>

          {video?.permalink && (
            <a
              href={video.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 text-[10px] uppercase tracking-[0.15em] text-white/30 hover:text-white/70 transition-colors"
            >
              View on Instagram ↗
            </a>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Discover() {
  const { data, isLoading, isError } = useGetInstagramFeed();
  const [, navigate] = useLocation();

  const videos = data?.videos ?? [];
  const hour = Math.floor(Date.now() / 3_600_000);

  const featuredVideo = videos.length > 0 ? videos[hour % videos.length] : null;
  const featuredArtist: Artist = (() => {
    if (featuredVideo) {
      const match = matchArtistFromCaption(featuredVideo.caption ?? null);
      if (match) return match;
    }
    return artists[hour % artists.length];
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">Habatat Galleries</p>
          <p className="text-sm font-light text-white/70 mt-0.5 tracking-wide">Artist Discovery</p>
        </div>
        <nav className="flex items-center gap-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 border-b border-white/30 pb-0.5">
            Featured
          </span>
          <button
            onClick={() => navigate("/browse")}
            className="text-[10px] uppercase tracking-[0.2em] text-white/25 hover:text-white/60 transition-colors"
          >
            Browse All
          </button>
        </nav>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-5 min-h-0">
        <div className="lg:col-span-3 relative bg-black overflow-hidden" style={{ minHeight: "60vh" }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="space-y-2 text-center">
                <div className="w-px h-12 bg-white/10 mx-auto animate-pulse" />
                <p className="text-[10px] uppercase tracking-widest text-white/20">Loading</p>
              </div>
            </div>
          )}
          {isError && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center space-y-2">
                <p className="text-white/30 text-xs tracking-wide">Instagram feed unavailable</p>
                <p className="text-white/15 text-[11px]">Connect Instagram credentials to enable live video</p>
              </div>
            </div>
          )}
          {!isLoading && !isError && (
            <AnimatePresence mode="wait">
              <motion.div
                key={featuredVideo?.id ?? "empty"}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                <VideoPlayer video={featuredVideo ?? null} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent pointer-events-none" />
              </motion.div>
            </AnimatePresence>
          )}

          <div className="absolute bottom-5 left-5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/30">Live Rotation</span>
          </div>
        </div>

        <div className="lg:col-span-2 p-8 lg:p-12 border-l border-white/5 flex flex-col justify-between">
          <ArtistPanel artist={featuredArtist} video={featuredVideo ?? null} />

          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/15 mb-3">Other Artists</p>
            <div className="flex flex-wrap gap-2">
              {artists
                .filter((a) => a.id !== featuredArtist.id)
                .slice(0, 4)
                .map((a) => (
                  <span key={a.id} className="text-[10px] text-white/25 hover:text-white/50 cursor-default transition-colors">
                    {a.name}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
        <p className="text-[9px] text-white/15 tracking-wider uppercase">
          Habatat Galleries · Royal Oak, Michigan
        </p>
        <a
          href="https://www.habatat.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-white/15 hover:text-white/40 transition-colors tracking-wider uppercase"
        >
          habatat.com ↗
        </a>
      </footer>
    </div>
  );
}
