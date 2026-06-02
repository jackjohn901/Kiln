import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Plus, User, Flame, Bell, Inbox, MessageCircle, Bookmark, ChevronDown, LogOut, BarChart2, Package, ShoppingBag, Clock, Shield, DollarSign, Edit3, Search, MapPin, Trophy, Users, Briefcase, BookOpen, FlaskConical, CalendarDays, MessageSquare, GraduationCap, ShoppingCart, Settings, TrendingUp, Sparkles, UsersRound, PenLine, FileText, Store, Home, Mail, Medal, Share2, Link2, Repeat2, Megaphone, AlertTriangle, Check, UserPlus, Loader2, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import { useCart } from "@/contexts/CartContext";
import { useStripeConnect } from "@/contexts/StripeConnectContext";
import { useSettings, deriveNotifStatus } from "@/contexts/SettingsContext";
import NotificationPanel from "@/components/NotificationPanel";
import GlobalSearch from "@/components/GlobalSearch";
import MessageToast from "@/components/MessageToast";

export default function Nav() {
  const [location] = useLocation();
  const { profile, logout } = useProfile();
  const { unreadCount, unreadMessageCount, unreadWorkshopCount, unreadCommissionPaymentCount, receivedInquiries, isVerified, lastNewMessagePing, clearNewMessagePing } = useSocial();
  const { itemCount } = useCart();
  const { hasWarning, hasUrgent, bannerDismissed, dismissBanner } = useStripeConnect();
  const { settings } = useSettings();
  const { dimmed: notifDimmed, warn: notifWarn } = deriveNotifStatus(settings);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [messagePulse, setMessagePulse] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  interface SwitchAccount {
    id: string;
    displayName: string | null;
    handle: string | null;
    avatarUrl: string | null;
    isOwner: boolean;
    isActive: boolean;
  }
  const [accounts, setAccounts] = useState<SwitchAccount[]>([]);
  const [accountActionId, setAccountActionId] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    if (!showProfileMenu) return;
    let cancelled = false;
    fetch("/api/me/accounts", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { accounts?: SwitchAccount[] } | null) => {
        if (!cancelled && data?.accounts) setAccounts(data.accounts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showProfileMenu]);

  async function switchAccount(id: string) {
    if (accountActionId) return;
    setAccountActionId(id);
    setAccountError(null);
    try {
      const r = await fetch(`/api/me/accounts/${id}/switch`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error(d?.error || "Could not switch account");
      }
      localStorage.removeItem("kiln_profile");
      window.location.reload();
    } catch (e) {
      setAccountError(e instanceof Error ? e.message : "Could not switch account");
      setAccountActionId(null);
    }
  }

  async function createAccount() {
    const name = newAccountName.trim();
    if (!name || creatingAccount) return;
    setCreatingAccount(true);
    setAccountError(null);
    try {
      const r = await fetch("/api/me/accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error(d?.error || "Could not create account");
      }
      localStorage.removeItem("kiln_profile");
      window.location.reload();
    } catch (e) {
      setAccountError(e instanceof Error ? e.message : "Could not create account");
      setCreatingAccount(false);
    }
  }

  useEffect(() => {
    if (!lastNewMessagePing) return;
    setMessagePulse(true);
    const t = setTimeout(() => setMessagePulse(false), 2000);
    return () => clearTimeout(t);
  }, [lastNewMessagePing]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const pendingInquiries = receivedInquiries.filter((i) => i.status === "pending").length;

  const links = [
    { href: "/", label: "Home" },
    { href: "/discover", label: "Discover" },
    { href: "/shop", label: "Shop" },
    { href: "/gallery", label: "Gallery" },
    { href: "/community", label: "Community" },
    { href: "/drops", label: "Drops" },
    { href: "/auctions", label: "Auctions" },
    { href: "/workshops", label: "Workshops" },
    { href: "/techniques", label: "Techniques" },
    { href: "/challenges", label: "Challenges", icon: Trophy },
    { href: "/guilds", label: "Guilds", icon: Users },
    { href: "/opportunities", label: "Opportunities", icon: Briefcase },
    { href: "/series", label: "Journals", icon: BookOpen },
    { href: "/materials", label: "Materials", icon: FlaskConical },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/events", label: "Events", icon: CalendarDays },
    { href: "/critique", label: "Critique", icon: MessageSquare },
    { href: "/mentorship", label: "Mentorship", icon: GraduationCap },
    { href: "/collab", label: "Collab", icon: UsersRound },
    { href: "/trending", label: "Trending", icon: TrendingUp },
    { href: "/assistant", label: "AI Assistant", icon: Sparkles },
    { href: "/grants", label: "Grant Writer", icon: FileText },
    { href: "/collector", label: "Collector", icon: Store },
    { href: "/scheduler", label: "Scheduler", icon: PenLine },
    { href: "/creator-home", label: "Creator Home", icon: Home },
    { href: "/newsletter", label: "Newsletter", icon: Mail },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/map", label: "Map", icon: MapPin },
    { href: "/activity", label: "Activity", icon: TrendingUp },
    { href: "/dialogue", label: "Studio Dialogue", icon: MessageSquare },
    { href: "/qr-profile", label: "QR Profile", icon: UsersRound },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/audience", label: "Audience", icon: Users },
    { href: "/coa", label: "Certificates", icon: FileText },
    { href: "/badges", label: "Badges", icon: Medal },
    { href: "/referrals", label: "Invite Artists", icon: Share2 },
    { href: "/ai-marketing", label: "AI Marketing", icon: Sparkles },
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
        { href: "/campaigns",      icon: Megaphone, label: "Campaigns" },
        { href: "/link-in-bio",    icon: Link2,     label: "Link in Bio" },
        { href: "/resale",         icon: Repeat2,   label: "Resale Market" },
        { href: "/drafts",         icon: Clock,     label: "Drafts" },
        ...(isVerified(profile.id)
          ? []
          : [{ href: "/apply-verified", icon: Shield, label: "Apply for Verified" }]),
        { href: "/analytics",      icon: BarChart2, label: "Analytics" },
        { href: "/badges",         icon: Medal,     label: "My Badges" },
        { href: "/referrals",      icon: Share2,    label: "Invite Artists" },
        { href: "/ai-marketing",   icon: Sparkles,  label: "AI Marketing Hub" },
        { href: "/settings",       icon: Settings,  label: "Settings" },
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
            <Flame size={settings.creator_mode ? 26 : 18} className="text-amber-400 transition-all" />
            <span className={`font-serif font-bold tracking-tight text-amber-100 transition-all ${settings.creator_mode ? "text-3xl" : "text-xl"}`}>Kiln</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              const badge =
                href === "/workshops" && unreadWorkshopCount > 0
                  ? unreadWorkshopCount
                  : null;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`nav-link-${label.toLowerCase()}`}
                  className={`relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-amber-500/20 text-amber-300" : "text-stone-400 hover:text-amber-200"
                  }`}
                >
                  {label}
                  {badge !== null && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-stone-950">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Global Search */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 text-stone-400 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
              title="Search (⌘K)"
              aria-label="Open search"
            >
              <Search size={15} />
            </button>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 text-stone-400 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
              title="Cart"
            >
              <ShoppingCart size={15} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-stone-950">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>

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
              className={`relative flex h-8 w-8 items-center justify-center rounded-full border text-stone-400 hover:border-amber-400/40 hover:text-amber-300 transition-colors ${
                messagePulse ? "border-blue-400/60 text-blue-300" : "border-stone-700"
              }`}
              title="Messages"
            >
              <MessageCircle size={15} className={messagePulse ? "animate-bounce" : ""} />
              {unreadMessageCount > 0 && (
                <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white ${messagePulse ? "animate-ping-once" : ""}`}>
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
              {messagePulse && unreadMessageCount === 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
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
              {(pendingInquiries > 0 || unreadCommissionPaymentCount > 0) && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
                  {(pendingInquiries + unreadCommissionPaymentCount) > 9 ? "9+" : (pendingInquiries + unreadCommissionPaymentCount)}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications((v) => !v)}
              title={
                notifDimmed
                  ? "Notifications silenced or paused — check Settings"
                  : notifWarn
                  ? "Email notifications misconfigured — check Settings"
                  : "Notifications"
              }
              className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                notifDimmed
                  ? "border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-500"
                  : "border-stone-700 text-stone-400 hover:border-amber-400/40 hover:text-amber-300"
              }`}
            >
              <Bell size={15} className={notifDimmed ? "opacity-60" : undefined} />
              {unreadCount > 0 && !notifDimmed && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-stone-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {unreadCount > 0 && notifDimmed && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-stone-600 text-[9px] font-bold text-stone-300">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {notifWarn && !notifDimmed && unreadCount === 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400/80 ring-1 ring-[#1a1209]" />
              )}
              {notifDimmed && unreadCount === 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-stone-500/70 ring-1 ring-[#1a1209]" />
              )}
            </button>

            {/* Stripe verification warning — only shown to logged-in users with outstanding requirements */}
            {profile && (hasUrgent || hasWarning) && !bannerDismissed && (
              <div className={`flex items-center gap-0.5 rounded-full border text-xs font-medium ${
                hasUrgent
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-300"
              }`}>
                <Link
                  href="/earnings"
                  title={hasUrgent ? "Stripe account restricted — action required" : "Stripe verification needed"}
                  className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-l-full transition-colors ${
                    hasUrgent ? "hover:bg-rose-500/20" : "hover:bg-amber-500/20"
                  }`}
                >
                  <AlertTriangle size={13} className="flex-shrink-0" />
                  <span className="hidden sm:inline">
                    {hasUrgent ? "Action required" : "Verify account"}
                  </span>
                </Link>
                <button
                  onClick={dismissBanner}
                  title="Dismiss"
                  aria-label="Dismiss Stripe warning"
                  className={`flex items-center justify-center pr-2 pl-0.5 py-1.5 rounded-r-full transition-colors opacity-70 hover:opacity-100 ${
                    hasUrgent ? "hover:bg-rose-500/20" : "hover:bg-amber-500/20"
                  }`}
                >
                  <X size={12} />
                </button>
              </div>
            )}

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
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 bg-[#1a1209] shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "calc(100dvh - 5rem)" }}>
                    {/* Profile header */}
                    <div className="border-b border-white/8 px-4 py-3 shrink-0">
                      <p className="text-sm font-semibold text-amber-100 truncate">{profile.name}</p>
                      <p className="text-xs text-stone-500">@{profile.handle}</p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1 overflow-y-auto flex-1 overscroll-contain">
                      {/* Account switcher */}
                      {accounts.length > 0 && (
                        <div className="border-b border-white/8 pb-1 mb-1">
                          <p className="px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">Your Accounts</p>
                          {accounts.map((acc) => (
                            <button
                              key={acc.id}
                              disabled={acc.isActive || accountActionId !== null}
                              onClick={() => switchAccount(acc.id)}
                              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-stone-300 transition-colors hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-800 text-xs font-bold text-amber-300">
                                {acc.avatarUrl ? (
                                  <img src={acc.avatarUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  (acc.displayName || acc.handle || "?").charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="truncate text-amber-100">{acc.displayName || (acc.handle ? `@${acc.handle}` : "Untitled")}</p>
                                {acc.handle && <p className="truncate text-[11px] text-stone-500">@{acc.handle}</p>}
                              </div>
                              {accountActionId === acc.id ? (
                                <Loader2 size={14} className="shrink-0 animate-spin text-amber-300" />
                              ) : acc.isActive ? (
                                <Check size={15} className="shrink-0 text-amber-400" />
                              ) : null}
                            </button>
                          ))}
                          {accountError && <p className="px-4 py-1 text-[11px] text-rose-400">{accountError}</p>}
                          {accounts.length < 10 &&
                            (showAddAccount ? (
                              <div className="px-3 py-2">
                                <input
                                  value={newAccountName}
                                  onChange={(e) => setNewAccountName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") createAccount(); }}
                                  placeholder="New account name"
                                  autoFocus
                                  maxLength={80}
                                  className="w-full rounded-lg border border-white/10 bg-stone-900 px-2.5 py-1.5 text-sm text-amber-100 placeholder:text-stone-600 focus:border-amber-400 focus:outline-none"
                                />
                                <div className="mt-1.5 flex gap-1.5">
                                  <button
                                    onClick={createAccount}
                                    disabled={!newAccountName.trim() || creatingAccount}
                                    className="flex-1 rounded-lg bg-amber-500 px-2 py-1.5 text-xs font-semibold text-stone-900 transition-colors hover:bg-amber-400 disabled:opacity-50"
                                  >
                                    {creatingAccount ? "Creating…" : "Create"}
                                  </button>
                                  <button
                                    onClick={() => { setShowAddAccount(false); setNewAccountName(""); setAccountError(null); }}
                                    className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-stone-400 transition-colors hover:bg-white/5"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowAddAccount(true)}
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-amber-300 transition-colors hover:bg-white/5"
                              >
                                <UserPlus size={14} className="text-amber-400" />
                                Add account
                              </button>
                            ))}
                        </div>
                      )}
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
                    <div className="border-t border-white/8 py-1 shrink-0">
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

      <AnimatePresence>
        {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
      </AnimatePresence>

      {lastNewMessagePing && (
        <MessageToast
          senderName={lastNewMessagePing.senderName}
          senderAvatarUrl={lastNewMessagePing.senderAvatarUrl}
          threadId={lastNewMessagePing.threadId}
          onDismiss={clearNewMessagePing}
        />
      )}
    </>
  );
}
