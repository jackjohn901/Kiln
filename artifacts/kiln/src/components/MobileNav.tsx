import { Link, useLocation } from "wouter";
import { Home, Compass, Plus, ShoppingBag, User, Bell, MessageCircle, Flame, BookOpen, FlaskConical } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import { useCart } from "@/contexts/CartContext";

const TABS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/create", icon: Plus, label: "Create", accent: true },
  { href: "/shop", icon: ShoppingBag, label: "Shop" },
  { href: "/profile-me", icon: User, label: "Me" },
];

export default function MobileNav() {
  const [location] = useLocation();
  const { profile } = useProfile();
  const { unreadCount, unreadMessageCount } = useSocial();
  const { itemCount } = useCart();

  const totalBadge = unreadCount + unreadMessageCount;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-[#12100e]/95 backdrop-blur-md safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {TABS.map(({ href, icon: Icon, label, accent }) => {
          const resolvedHref = href === "/profile-me" ? (profile ? `/artists/${profile.id}` : "/setup") : href;
          const isActive = href === "/"
            ? location === "/" || location === ""
            : href === "/profile-me"
              ? location.startsWith("/artists/" + (profile?.id ?? ""))
              : location.startsWith(href);

          return (
            <Link key={href} href={resolvedHref}>
              <button
                className={`relative flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all ${
                  accent
                    ? "bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/30 scale-110"
                    : isActive
                      ? "text-amber-400"
                      : "text-stone-500"
                }`}
              >
                <Icon size={accent ? 22 : 20} strokeWidth={accent ? 2.5 : isActive ? 2.5 : 1.8} />
                {!accent && (
                  <span className={`text-[10px] font-medium ${isActive ? "text-amber-400" : "text-stone-600"}`}>
                    {label}
                  </span>
                )}
                {/* Badges */}
                {href === "/profile-me" && totalBadge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {totalBadge > 9 ? "9+" : totalBadge}
                  </span>
                )}
                {href === "/shop" && itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-stone-950">
                    {itemCount}
                  </span>
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
