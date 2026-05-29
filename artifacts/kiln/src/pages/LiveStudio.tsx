import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Share2, DollarSign, ShoppingBag, ArrowLeft, Radio, Bell } from "lucide-react";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import TipModal from "@/components/TipModal";

const ALL_ARTISTS = [...artists, ...seedArtists];

export default function LiveStudio() {
  const { artistId } = useParams<{ artistId: string }>();
  const { profile } = useProfile();
  const { isFollowing, followArtist, unfollowArtist } = useSocial();

  const [showTip, setShowTip] = useState(false);

  const staticArtist = ALL_ARTISTS.find((a) => a.id === artistId);
  // When a real user navigates to their own live studio, fall back to their profile
  const artist = (staticArtist ?? (profile?.id === artistId ? {
    id: profile!.id,
    name: profile!.name ?? artistId,
    medium: "Craft Artist",
    location: "",
    videos: [] as { id: string }[],
    images: profile!.avatarUrl ? [{ url: profile!.avatarUrl }] : [] as { url: string }[],
  } : null)) as typeof staticArtist | null;

  const avatarUrl = artist?.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${artistId}`;

  const following = isFollowing(artistId ?? "");

  // Profile may still be loading — wait briefly before declaring "not found"
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!artist) {
    if (!ready) {
      return (
        <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <div className="text-center">
          <Radio size={32} className="mx-auto mb-3 text-stone-700" />
          <p className="text-stone-400">Artist not found.</p>
          <Link href="/" className="mt-3 block text-amber-400 text-sm">← Back to feed</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Studio background — artist avatar blurred as ambient fill */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${avatarUrl})`,
            filter: "blur(32px) brightness(0.25) saturate(0.6)",
            transform: "scale(1.1)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-stone-950/85 via-stone-900/70 to-amber-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center gap-3 z-20">
          <button
            onClick={() => window.history.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="ml-auto">
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
            >
              <Share2 size={15} />
            </button>
          </div>
        </div>

        {/* Center — honest "not live yet" state */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <Link href={`/artists/${artist.id}`}>
            <div className="mx-auto mb-5 h-24 w-24 overflow-hidden rounded-full border-2 border-amber-500/40 shadow-xl">
              <img src={avatarUrl} alt={artist.name} className="h-full w-full object-cover" />
            </div>
          </Link>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-stone-500" />
            <span className="text-[11px] font-semibold tracking-wide text-stone-300">NOT LIVE RIGHT NOW</span>
          </div>

          <Link href={`/artists/${artist.id}`}>
            <h1 className="font-serif text-2xl font-bold text-white drop-shadow-lg hover:text-amber-200 transition-colors">
              {artist.name}
            </h1>
          </Link>
          {(artist.medium || artist.location) && (
            <p className="mt-1 text-sm text-stone-400">
              {artist.medium ? artist.medium.split(",")[0] : ""}{artist.medium && artist.location ? " · " : ""}{artist.location}
            </p>
          )}

          <p className="mt-4 max-w-sm text-sm leading-relaxed text-stone-400">
            Live studio streaming is coming soon to Kiln. Follow {artist.name.split(" ")[0]} to be notified when they go live.
          </p>

          {/* Follow / notify */}
          <button
            onClick={() => following
              ? unfollowArtist(artist.id)
              : followArtist(artist.id, artist.name, avatarUrl)
            }
            className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
              following
                ? "border border-white/20 text-white/70 hover:border-amber-500/40 hover:text-amber-300"
                : "bg-amber-500 text-stone-950 hover:bg-amber-400"
            }`}
          >
            <Bell size={15} />
            {following ? "Following — you'll be notified" : "Follow to get notified"}
          </button>

          {/* Real, working actions */}
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => setShowTip(true)}
              className="flex items-center gap-2 rounded-full bg-amber-500/90 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              <DollarSign size={16} /> Send a tip
            </button>
            <Link href={`/commission/${artist.id}`}>
              <button className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-semibold text-amber-200 backdrop-blur-sm hover:border-amber-500/40 transition-colors">
                <ShoppingBag size={16} /> Commission
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tip modal */}
      {showTip && (
        <TipModal
          artistId={artist.id}
          artistName={artist.name}
          artistAvatarUrl={avatarUrl}
          onClose={() => setShowTip(false)}
        />
      )}
    </div>
  );
}
