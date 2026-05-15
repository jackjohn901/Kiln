import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, User, Flame, Bell, Inbox, MessageCircle } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import NotificationPanel from "@/components/NotificationPanel";

export default function Nav() {
  const [location] = useLocation();
  const { profile } = useProfile();
  const { unreadCount, unreadMessageCount, receivedInquiries } = useSocial();
  const [showNotifications, setShowNotifications] = useState(false);

  const pendingInquiries = receivedInquiries.filter((i) => i.status === "pending").length;

  const links = [
    { href: "/", label: "Home" },
    { href: "/discover", label: "Discover" },
    { href: "/drops", label: "Drops" },
    { href: "/workshops", label: "Workshops" },
    { href: "/techniques", label: "Techniques" },
  ];

  return (
    <>
      <nav
        data-testid="nav-header"
        className="sticky top-0 z-50 border-b border-white/10 bg-[#1a1209]/90 backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/" data-testid="nav-logo" className="flex items-center gap-2 select-none">
            <Flame size={18} className="text-amber-400" />
            <span className="font-serif text-xl font-bold tracking-tight text-amber-100">Kiln</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`nav-link-${label.toLowerCase()}`}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-amber-500/20 text-amber-300" : "text-stone-400 hover:text-amber-200"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Messages */}
            <Link
              href="/messages"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 text-stone-400 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
              title="Messages"
            >
              <MessageCircle size={15} />
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
            </Link>

            {/* Inbox */}
            <Link
              href="/inbox"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 text-stone-400 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
              title="Commission Inbox"
            >
              <Inbox size={15} />
              {pendingInquiries > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
                  {pendingInquiries > 9 ? "9+" : pendingInquiries}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 text-stone-400 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-stone-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

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

      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </>
  );
}
