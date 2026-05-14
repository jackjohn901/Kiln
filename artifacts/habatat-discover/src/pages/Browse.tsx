import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useGetInstagramFeed } from "@workspace/api-client-react";
import { matchArtistFromCaption, artists } from "@/data/artists";
import { formatTimeAgo } from "@/lib/utils";
import type { InstagramVideo } from "@workspace/api-client-react";

function VideoCard({ video, index }: { video: InstagramVideo; index: number }) {
  const artist = matchArtistFromCaption(video.caption ?? null);

  return (
    <motion.a
      href={video.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative aspect-square bg-white/5 overflow-hidden rounded-sm mb-3">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={artist?.name ?? "Glass artwork"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border border-white/15 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-white/30 ml-0.5" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/10 transition-all duration-300 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-white/0 group-hover:border-l-white/80 ml-0.5 transition-colors duration-300" />
          </div>
        </div>
      </div>
      <div>
        {artist && (
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-0.5">{artist.name}</p>
        )}
        {video.caption && (
          <p className="text-xs text-white/25 leading-snug line-clamp-2 font-light">
            {video.caption.slice(0, 80)}{video.caption.length > 80 ? "…" : ""}
          </p>
        )}
        <p className="text-[10px] text-white/15 mt-1">{formatTimeAgo(video.timestamp)}</p>
      </div>
    </motion.a>
  );
}

export default function Browse() {
  const { data, isLoading, isError } = useGetInstagramFeed();
  const [, navigate] = useLocation();
  const videos = data?.videos ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/25">Habatat Galleries</p>
          <p className="text-sm font-light text-white/70 mt-0.5 tracking-wide">Artist Discovery</p>
        </div>
        <nav className="flex items-center gap-6">
          <button
            onClick={() => navigate("/")}
            className="text-[10px] uppercase tracking-[0.2em] text-white/25 hover:text-white/60 transition-colors"
          >
            Featured
          </button>
          <button
            onClick={() => navigate("/artists")}
            className="text-[10px] uppercase tracking-[0.2em] text-white/25 hover:text-white/60 transition-colors"
          >
            Artists
          </button>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 border-b border-white/30 pb-0.5">
            Videos
          </span>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h2 className="font-serif text-2xl font-normal text-white/80 tracking-tight">All Videos</h2>
          <p className="text-xs text-white/30 mt-1">
            {videos.length > 0 ? `${videos.length} works` : "From Habatat Galleries on Instagram"}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <div className="w-px h-10 bg-white/10 mx-auto animate-pulse" />
              <p className="text-[10px] uppercase tracking-widest text-white/20">Loading</p>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-2">
              <p className="text-white/30 text-sm">Instagram feed unavailable</p>
              <p className="text-white/15 text-xs">Add your Instagram credentials to enable live video browsing</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && videos.length === 0 && (
          <div className="flex items-center justify-center py-24">
            <p className="text-white/25 text-sm">No videos found in the Instagram feed.</p>
          </div>
        )}

        {videos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video, i) => (
              <VideoCard key={video.id} video={video} index={i} />
            ))}
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-white/5">
          <p className="text-[9px] text-white/15 uppercase tracking-wider text-center">
            Videos from Habatat Galleries Instagram · Updated hourly
          </p>
        </div>
      </main>
    </div>
  );
}
