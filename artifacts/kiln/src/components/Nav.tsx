import { Link, useLocation } from "wouter";
import { Plus, User, Flame } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";

export default function Nav() {
  const [location] = useLocation();
  const { profile } = useProfile();

  const links = [
    { href: "/", label: "Discover" },
    { href: "/artists", label: "Artists" },
    { href: "/shop", label: "Shop" },
  ];

  return (
    <nav
      data-testid="nav-header"
      className="sticky top-0 z-50 border-b border-white/10 bg-[#1a1209]/90 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" data-testid="nav-logo" className="flex items-center gap-2 select-none">
          <Flame size={18} className="text-amber-400" />
          <span className="font-serif text-xl font-bold tracking-tight text-amber-100">Kiln</span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {links.map(({ href, label }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-link-${label.toLowerCase()}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-amber-500/20 text-amber-300" : "text-stone-400 hover:text-amber-200"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/create"
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-stone-950 transition-all hover:bg-amber-400 active:scale-95"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Post</span>
          </Link>

          {profile ? (
            <Link
              href={`/artists/${profile.id}`}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-amber-500/40 bg-stone-800 text-xs font-bold text-amber-300 transition-colors hover:border-amber-400"
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                profile.name.charAt(0).toUpperCase()
              )}
            </Link>
          ) : (
            <Link
              href="/setup"
              data-testid="nav-profile"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-600 text-stone-400 transition-colors hover:border-amber-400 hover:text-amber-300"
            >
              <User size={16} />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
