import { useMemo, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Users, UserCheck } from "lucide-react";
import Nav from "@/components/Nav";
import { getArtistById } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial } from "@/contexts/SocialContext";

function findArtist(id: string) {
  return getArtistById(id) ?? seedArtists.find((a) => a.id === id);
}

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function getStats(id: string) {
  const h = hash(id);
  return { followers: 3000 + (h % 47000), following: 80 + (h % 400) };
}

const SEED_NAMES = [
  "Clara Hoffman", "Erik Larsson", "Mia Torres", "Yuki Tanaka", "Rachel Kim",
  "James White", "Priya Nair", "Felix Mueller", "Ana Souza", "Tomás García",
  "Ingrid Svensson", "Kwame Asante", "Leila Nouri", "Riku Sato", "Hana Park",
  "David Chen", "Maya Lin", "Samuel Obi", "Freya Berg", "Carlos Mendez",
  "Sophie Dupont", "Kenji Yamamoto", "Amara Diallo", "Mateo Lopez", "Nina Koval",
  "Ben Foster", "Celia Park", "Tomas Novak", "Ines Costa", "Petra Vance",
  "Stefan Müller", "Zara Ahmed", "Luca Ferri", "Fatima Hassan", "Owen Murphy",
  "Nadia Rousseau", "Kai Nakamura", "Valentina Cruz", "Dmitri Volkov", "Sara Lindqvist",
  "Marco Bianchi", "Aiko Sato", "Emanuel Santos", "Hira Khan", "Elias Braun",
  "Rosa Martínez", "Sven Eriksson", "Laila Ibrahim", "Nico Papadopoulos", "Min-Ji Lee",
];

interface FakeUser {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  medium: string;
}

const MEDIUMS = [
  "Glass Blowing", "Ceramics", "Blacksmithing", "Fiber Arts", "Enamel",
  "Flameworking", "Raku", "Metal Forging", "Porcelain", "Bronze Casting",
  "Wood Turning", "Kiln Forming", "Stone Carving", "Weaving", "Mosaic",
];

function generateUsers(seed: string, count: number): FakeUser[] {
  const users: FakeUser[] = [];
  for (let i = 0; i < count; i++) {
    const h = hash(`${seed}-user-${i}`);
    const name = SEED_NAMES[h % SEED_NAMES.length];
    const handle = name.toLowerCase().replace(/\s+/g, "-") + (h % 100 > 0 ? String(h % 100) : "");
    users.push({
      id: handle,
      name,
      handle,
      avatarUrl: `https://picsum.photos/seed/${seed}-u${i}/80/80`,
      medium: MEDIUMS[hash(`${seed}-med-${i}`) % MEDIUMS.length],
    });
  }
  return users;
}

export default function FollowerList() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const type: "followers" | "following" = location.endsWith("/following") ? "following" : "followers";
  const { isFollowing, followArtist, unfollowArtist } = useSocial();

  const [visibleCount, setVisibleCount] = useState(48);

  const artist = findArtist(id ?? "");
  const stats = getStats(id ?? "");
  const count = type === "followers" ? stats.followers : stats.following;

  const users = useMemo<FakeUser[]>(() => {
    if (!id) return [];
    return generateUsers(`${id}-${type}`, Math.min(visibleCount, count));
  }, [id, type, count, visibleCount]);

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-stone-400">Artist not found.</p>
        </div>
      </div>
    );
  }

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/artists/${id}`} className="mb-4 flex items-center gap-2 text-sm text-stone-500 hover:text-stone-300 transition-colors">
            <span>←</span>
            <img
              src={artist.images[0]?.url ?? `https://picsum.photos/seed/${id}/40/40`}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
            {artist.name}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-800 border border-white/8">
              <Users size={18} className="text-stone-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-amber-100">{title}</h1>
              <p className="text-sm text-stone-500">{count.toLocaleString()} {title.toLowerCase()}</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="mt-4 flex gap-1 rounded-xl bg-stone-900/50 p-1 border border-white/5">
            <Link
              href={`/artists/${id}/followers`}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${
                type === "followers" ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              Followers ({stats.followers.toLocaleString()})
            </Link>
            <Link
              href={`/artists/${id}/following`}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${
                type === "following" ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              Following ({stats.following.toLocaleString()})
            </Link>
          </div>
        </div>

        {/* User list */}
        <div className="space-y-1">
          {users.map((user) => {
            const following = isFollowing(user.id);
            return (
              <div key={user.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/3 transition-colors">
                <img src={user.avatarUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-200">{user.name}</p>
                  <p className="text-xs text-stone-600">@{user.handle} · {user.medium}</p>
                </div>
                <button
                  onClick={() =>
                    following
                      ? unfollowArtist(user.id)
                      : followArtist(user.id, user.name, user.avatarUrl)
                  }
                  className={`flex flex-shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    following
                      ? "border-stone-600 text-stone-400 hover:border-rose-500/50 hover:text-rose-400"
                      : "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  }`}
                >
                  {following && <UserCheck size={11} />}
                  {following ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}
        </div>

        {visibleCount < count && (
          <div className="mt-6 flex flex-col items-center gap-1">
            <button
              onClick={() => setVisibleCount(v => Math.min(v + 48, count))}
              className="rounded-full border border-stone-700 px-6 py-2 text-xs font-medium text-stone-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
            >
              Load more · {count - visibleCount} remaining
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
