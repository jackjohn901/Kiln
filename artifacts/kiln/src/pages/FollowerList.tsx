import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Users, UserCheck, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";

interface UserProfile {
  userId: string;
  handle: string | null;
  displayName: string | null;
  medium: string | null;
  avatarUrl: string | null;
  followerCount: number;
  isFollowing: boolean;
}

export default function FollowerList() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const type: "followers" | "following" = location.endsWith("/following") ? "following" : "followers";

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const endpoint = type === "followers" ? `/api/followers/${id}` : `/api/following/${id}`;
    fetch(endpoint, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const list: UserProfile[] = data.followers ?? data.following ?? [];
        setUsers(list);
        setTotalCount(list.length);
        setFollowing(new Set(list.filter(u => u.isFollowing).map(u => u.userId)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, type]);

  const handleFollow = async (userId: string, displayName: string | null, avatarUrl: string | null) => {
    const isNowFollowing = !following.has(userId);
    setFollowing(prev => { const next = new Set(prev); isNowFollowing ? next.add(userId) : next.delete(userId); return next; });
    try {
      await fetch(`/api/users/${userId}/follow`, { method: "POST", credentials: "include" });
    } catch {
      setFollowing(prev => { const next = new Set(prev); isNowFollowing ? next.delete(userId) : next.add(userId); return next; });
    }
  };

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6">
          <Link href={`/artists/${id}`} className="mb-4 flex items-center gap-2 text-sm text-stone-500 hover:text-stone-300 transition-colors">
            <span>←</span> Back to profile
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-800 border border-white/8">
              <Users size={18} className="text-stone-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-amber-100">
                {type === "followers" ? "Followers" : "Following"}
              </h1>
              <p className="text-sm text-stone-500">{totalCount.toLocaleString()} {type}</p>
            </div>
          </div>

          <div className="mt-4 flex gap-1 rounded-xl bg-stone-900/50 p-1 border border-white/5">
            <Link href={`/artists/${id}/followers`}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${type === "followers" ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}>
              Followers
            </Link>
            <Link href={`/artists/${id}/following`}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${type === "following" ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}>
              Following
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="py-16 text-center">
            <Users size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No {type} yet.</p>
          </div>
        )}

        <div className="space-y-1">
          {users.map(user => {
            const isFollowingUser = following.has(user.userId);
            const name = user.displayName ?? user.handle ?? "Artist";
            const handle = user.handle ?? user.userId.slice(0, 8);
            return (
              <div key={user.userId} className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/3 transition-colors">
                <img src={user.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${user.userId}`} alt=""
                  className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <Link href={`/artists/${user.userId}`}>
                    <p className="text-sm font-medium text-stone-200 hover:text-amber-300 transition-colors">{name}</p>
                  </Link>
                  <p className="text-xs text-stone-600">@{handle}{user.medium ? ` · ${user.medium}` : ""}</p>
                </div>
                <button
                  onClick={() => handleFollow(user.userId, user.displayName, user.avatarUrl)}
                  className={`flex flex-shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isFollowingUser
                      ? "border-stone-600 text-stone-400 hover:border-rose-500/50 hover:text-rose-400"
                      : "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  }`}>
                  {isFollowingUser && <UserCheck size={11} />}
                  {isFollowingUser ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
