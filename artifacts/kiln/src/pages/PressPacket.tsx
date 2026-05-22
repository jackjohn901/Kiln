import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import {
  Flame, MapPin, Globe, Copy, Check, Printer, ExternalLink,
  Users, ImageIcon, ShoppingBag, CalendarDays, Star,
  Share2, ChevronLeft,
} from "lucide-react";
import Nav from "@/components/Nav";
import SharePacketModal from "@/components/SharePacketModal";
import { getArtistById, getAllImages } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

interface PressPacketData {
  profile: {
    userId: string;
    displayName: string | null;
    handle: string | null;
    bio: string | null;
    medium: string | null;
    location: string | null;
    website: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    isVerified: boolean;
    kilnStatus: string | null;
    contactEmail: string | null;
    createdAt: string;
  };
  stats: {
    followerCount: number;
    postCount: number;
    listingCount: number;
    workshopCount: number;
  };
  recentPosts: Array<{
    id: string;
    thumbnailUrl: string | null;
    videoUrl: string | null;
    caption: string | null;
    likeCount: number;
    viewCount: number;
    createdAt: string;
  }>;
  patronTiers: Array<{
    id: string;
    name: string;
    price: number;
    description: string | null;
    perks: string[];
  }>;
}

export default function PressPacket() {
  const { artistId } = useParams<{ artistId: string }>();
  const [data, setData] = useState<PressPacketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!artistId) return;
    setLoading(true);
    fetch(`/api/users/${artistId}/press-packet`)
      .then((r) => {
        if (r.ok) return r.json();
        // Fall back to static data for seed/demo artists
        const staticArtist = getArtistById(artistId) ?? seedArtists.find(a => a.id === artistId);
        if (!staticArtist) throw new Error("not found");
        const images = getAllImages(staticArtist);
        const fallback: PressPacketData = {
          profile: {
            userId: staticArtist.id,
            displayName: staticArtist.name,
            handle: staticArtist.id,
            bio: staticArtist.bio,
            medium: staticArtist.medium,
            location: staticArtist.location,
            website: staticArtist.website ?? null,
            avatarUrl: staticArtist.images[0]?.url ?? null,
            bannerUrl: null,
            isVerified: true,
            kilnStatus: null,
            contactEmail: null,
            createdAt: new Date().toISOString(),
          },
          stats: { followerCount: 0, postCount: images.length, listingCount: 0, workshopCount: 0 },
          recentPosts: images.slice(0, 9).map((img, i) => ({
            id: `static-${i}`,
            thumbnailUrl: img.url,
            videoUrl: null,
            caption: img.caption ?? null,
            likeCount: 0,
            viewCount: 0,
            createdAt: new Date().toISOString(),
          })),
          patronTiers: [],
        };
        return fallback;
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [artistId]);

  function handlePrint() { window.print(); }

  function handleCopyBio() {
    if (!data?.profile.bio) return;
    navigator.clipboard.writeText(data.profile.bio).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => {});
  }

  const currentYear = new Date().getFullYear();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <div className="print:hidden"><Nav /></div>
        <div className="flex items-center justify-center p-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <div className="print:hidden"><Nav /></div>
        <div className="flex flex-col items-center justify-center gap-3 p-24 text-stone-500">
          <p>Press packet not found for this artist.</p>
          <Link href="/discover" className="text-sm text-amber-400 hover:underline">Browse artists</Link>
        </div>
      </div>
    );
  }

  const { profile, stats, recentPosts, patronTiers } = data;
  const name = profile.displayName ?? profile.handle ?? "Artist";
  const profileUrl = `${window.location.origin}/kiln/artists/${profile.userId}`;

  return (
    <div className="min-h-screen bg-[#12100e]">
      {/* Screen UI */}
      <div className="print:hidden">
        <Nav />
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
          {/* Header row */}
          <div className="mb-6 flex items-center gap-3">
            <Link
              href={`/artists/${artistId}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors"
            >
              <ChevronLeft size={16} />
            </Link>
            <div className="flex-1">
              <h1 className="font-serif text-2xl text-amber-100">Press Packet</h1>
              <p className="text-xs text-stone-500 mt-0.5">{name} · auto-updated from Kiln</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyBio}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors"
              >
                {copied ? <><Check size={12} className="text-emerald-400" /> Copied bio</> : <><Copy size={12} /> Copy bio</>}
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:border-amber-400/60 hover:text-amber-200 transition-colors"
              >
                <Share2 size={14} /> Share
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                <Printer size={14} /> Print / PDF
              </button>
            </div>
          </div>

          {/* Info note */}
          <div className="mb-6 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-xs text-stone-400">
            This press packet updates automatically as {name} posts new work on Kiln. Share the link below with press, galleries, or curators — it always reflects their latest activity.
            <span className="ml-2 select-all font-mono text-stone-300">{window.location.href}</span>
          </div>

          {/* Document preview */}
          <div className="rounded-2xl border border-white/10 bg-stone-950 overflow-hidden">
            <PressPacketDocument data={data} profileUrl={profileUrl} currentYear={currentYear} />
          </div>
        </div>
      </div>

      {/* Print view */}
      <div className="hidden print:block">
        <PressPacketDocument data={data} profileUrl={profileUrl} currentYear={currentYear} />
      </div>

      {showShareModal && (
        <SharePacketModal
          artistId={profile.userId}
          artistName={name}
          bio={profile.bio}
          packetUrl={profileUrl.replace("/artists/", "/artists/").replace(/\/?$/, "") + "/press-packet"}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

function StatBadge({ icon: Icon, value, label }: { icon: React.ElementType; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4">
      <Icon size={14} className="text-stone-400 mb-1" />
      <span className="font-bold text-stone-100 text-lg leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-stone-500">{label}</span>
    </div>
  );
}

function PressPacketDocument({ data, profileUrl, currentYear }: {
  data: PressPacketData;
  profileUrl: string;
  currentYear: number;
}) {
  const { profile, stats, recentPosts, patronTiers } = data;
  const name = profile.displayName ?? profile.handle ?? "Artist";

  return (
    <div className="press-packet bg-white text-stone-900 print:text-black" style={{ fontFamily: "Georgia, serif" }}>

      {/* Dark header */}
      <div className="bg-stone-900 print:bg-black px-8 py-7 flex items-start gap-5">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={name}
            className="h-20 w-20 rounded-full object-cover border-2 border-stone-700 shrink-0"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-amber-700 text-2xl font-bold text-white border-2 border-stone-700">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-stone-500 text-[10px] tracking-widest uppercase mb-1">Press Packet · {currentYear}</p>
          <h1 className="text-2xl font-bold text-white mb-0.5 leading-tight">{name}</h1>
          {profile.medium && <p className="text-amber-400 text-sm font-semibold mb-2">{profile.medium}</p>}
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
            {profile.location && (
              <span className="flex items-center gap-1"><MapPin size={10} /> {profile.location}</span>
            )}
            {profile.website && (
              <span className="flex items-center gap-1"><Globe size={10} /> {profile.website}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1.5 mb-1">
            <Flame size={12} className="text-amber-400" />
            <span className="text-amber-400 text-sm font-bold">Kiln</span>
          </div>
          <p className="text-stone-400 text-xs break-all">{profileUrl}</p>
          <p className="text-stone-600 text-[10px] mt-1">For press &amp; curatorial inquiries</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-stone-800 print:bg-stone-900 px-8 py-4 flex items-center justify-center gap-0 divide-x divide-stone-700">
        <StatBadge icon={Users} value={stats.followerCount.toLocaleString()} label="Followers" />
        <StatBadge icon={ImageIcon} value={stats.postCount.toLocaleString()} label="Posts" />
        <StatBadge icon={ShoppingBag} value={stats.listingCount.toLocaleString()} label="Works for sale" />
        {stats.workshopCount > 0 && (
          <StatBadge icon={CalendarDays} value={stats.workshopCount} label="Workshops" />
        )}
      </div>

      <div className="px-8 py-7 space-y-7">

        {/* Bio */}
        {profile.bio && (
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2 print:text-stone-700">Artist Biography</h2>
            <p className="text-sm leading-relaxed text-stone-700 print:text-stone-800">{profile.bio}</p>
          </section>
        )}

        {/* Recent work grid */}
        {recentPosts.length > 0 && (
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3 print:text-stone-700">
              Recent Work <span className="normal-case font-normal text-stone-600">— updated from Kiln</span>
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {recentPosts.slice(0, 9).map((post, i) => {
                const imgSrc = post.thumbnailUrl ?? post.videoUrl ?? null;
                return (
                  <div key={post.id} className="aspect-square overflow-hidden rounded bg-stone-100 relative">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={post.caption ?? `Work ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-stone-200">
                        <ImageIcon size={20} className="text-stone-400" />
                      </div>
                    )}
                    {post.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-1 text-[9px] text-white truncate">
                        {post.caption}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-stone-400">
              High-resolution images available on request. All images © {name} {currentYear}.
              View full portfolio: <span className="text-stone-600">{profileUrl}</span>
            </p>
          </section>
        )}

        {/* Patron tiers */}
        {patronTiers.length > 0 && (
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2 print:text-stone-700">Support the Artist</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {patronTiers.map((tier) => (
                <div key={tier.id} className="rounded border border-stone-200 p-3 print:border-stone-300">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-stone-800">{tier.name}</span>
                    <span className="text-xs font-bold text-amber-700">${tier.price}/mo</span>
                  </div>
                  {tier.description && <p className="text-xs text-stone-500 mb-1.5">{tier.description}</p>}
                  {tier.perks.length > 0 && (
                    <ul className="space-y-0.5">
                      {tier.perks.slice(0, 3).map((perk, i) => (
                        <li key={i} className="flex items-start gap-1 text-[11px] text-stone-600">
                          <Star size={9} className="mt-0.5 shrink-0 text-amber-500" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Kiln profile CTA */}
        <section className="rounded-lg bg-stone-900 print:bg-stone-100 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white print:text-stone-900">View on Kiln</p>
              <p className="text-xs text-stone-400 print:text-stone-600">Process videos · Shop · Workshops · Commissions</p>
            </div>
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors print:text-stone-900"
          >
            {profileUrl.replace("https://", "")}
            <ExternalLink size={10} />
          </a>
        </section>

        {/* Contact */}
        <section className="border-t border-stone-200 pt-5 print:border-stone-300">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3 print:text-stone-700">Contact</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">For press &amp; editorial</p>
              <p className="text-stone-700 print:text-stone-800 text-xs">{profile.contactEmail ?? `${profile.handle ?? "artist"}@kiln.art`}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">Full profile &amp; portfolio</p>
              <p className="text-stone-700 print:text-stone-800 text-xs">{profileUrl}</p>
            </div>
            {profile.website && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">Website</p>
                <p className="text-stone-700 print:text-stone-800 text-xs">{profile.website}</p>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-stone-200 pt-3 flex items-center justify-between print:border-stone-300">
          <div className="flex items-center gap-1.5">
            <Flame size={10} className="text-amber-500" />
            <p className="text-[10px] text-stone-400">Generated via Kiln · kilnfire.replit.app · {currentYear}</p>
          </div>
          <p className="text-[10px] text-stone-400">© {name} {currentYear}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
