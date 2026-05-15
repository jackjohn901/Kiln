import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Plus, User, Flame, Bell, Inbox, MessageCircle, Bookmark, ChevronDown, LogOut, BarChart2, Package, ShoppingBag, Clock, Shield, DollarSign, Edit3 } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import NotificationPanel from "@/components/NotificationPanel";

export default function Nav() {
  const [location] = useLocation();
  const { profile, logout } = useProfile();
  const { unreadCount, unreadMessageCount, receivedInquiries, isVerified } = useSocial();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const pendingInquiries = receivedInquiries.filter((i) => i.status === "pending").length;

  const links = [
    { href: "/", label: "Home" },
    { href: "/discover", label: "Discover" },
    { href: "/drops", label: "Drops" },
    { href: "/workshops", label: "Workshops" },
    { href: "/techniques", label: "Techniques" },
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  const profileMenuItems = profile
    ? [
        { href: "/edit-profile",   icon: Edit3,     label: "Edit Profile" },
        { href: "/saved",          icon: Bookmark,  label: "Saved" },
        { href: "/collection",     icon: Package,   label: "My Collection" },
        { href: "/orders",         icon: ShoppingBag, label: "Orders" },
        { href: "/earnings",       icon: DollarSign, label: "Earnings" },
        { href: "/drafts",         icon: Clock,     label: "Drafts" },
        ...(isVerified(profile.id)
          ? []
          : [{ href: "/apply-verified", icon: Shield, label: "Apply for Verified" }]),
        { href: "/analytics",      icon: BarChart2, label: "Analytics" },
      ]
    : [];

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
            {/* Saved */}
            <Link
              href="/saved"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 text-stone-400 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
              title="Saved"
            >
              <Bookmark size={15} />
            </Link>

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

            {/* Profile / avatar with dropdown */}
            {profile ? (
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setShowProfileMenu((v) => !v)}
                  className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-stone-800 transition-colors hover:border-amber-400"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-amber-300">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                    ) : (
                      profile.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <ChevronDown size={12} className={`mr-1.5 text-stone-500 transition-transform ${showProfileMenu ? "rotate-180" : ""}`} />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1209] shadow-2xl">
                    {/* Profile header */}
                    <div className="border-b border-white/8 px-4 py-3">
                      <p className="text-sm font-semibold text-amber-100 truncate">{profile.name}</p>
                      <p className="text-xs text-stone-500">@{profile.handle}</p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        href={`/artists/${profile.id}`}
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-300 hover:bg-white/5 hover:text-amber-200 transition-colors"
                      >
                        <User size={14} className="text-stone-500" />
                        View Profile
                      </Link>
                      {profileMenuItems.map(({ href, icon: Icon, label }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-300 hover:bg-white/5 hover:text-amber-200 transition-colors"
                        >
                          <Icon size={14} className="text-stone-500" />
                          {label}
                        </Link>
                      ))}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-white/8 py-1">
                      <button
                        onClick={() => { logout(); setShowProfileMenu(false); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
