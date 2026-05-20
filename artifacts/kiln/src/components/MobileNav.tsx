import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Compass, Plus, ShoppingBag, LayoutGrid,
  User, Bell, MessageCircle, Bookmark, Package,
  ShoppingCart, BarChart2, DollarSign, Archive, Clock,
  FileText, Newspaper, Sparkles, Bot, Users, Trophy,
  MessageSquare, GraduationCap, Link2, CalendarDays, Briefcase,
  Award, BookOpen, FlaskConical, Flame, Box, Map, TrendingUp,
  Zap, Gavel, BookMarked, Calendar, Mail, X, ChevronRight,
  Download, Grid3x3, SplitSquareHorizontal, Gift, Scissors,
  CheckSquare, UserCircle2, Calculator, Dna, GitBranch,
  Vote, Ghost, Radar, Timer, Network, Music2, Repeat2, Megaphone, ArrowLeftRight,
  AlertTriangle,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import { useCart } from "@/contexts/CartContext";
import { useStripeConnect } from "@/contexts/StripeConnectContext";
import { motion, AnimatePresence } from "framer-motion";

const PRIMARY_TABS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/create", icon: Plus, label: "Create", accent: true },
];

interface NavItem { href: string; icon: React.ElementType; label: string }

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "You",
    items: [
      { href: "/notifications", icon: Bell, label: "Notifications" },
      { href: "/messages", icon: MessageCircle, label: "Messages" },
      { href: "/shop", icon: ShoppingBag, label: "Shop" },
      { href: "/saved", icon: Bookmark, label: "Saved" },
      { href: "/orders", icon: Package, label: "Orders" },
      { href: "/cart", icon: ShoppingCart, label: "Cart" },
      { href: "/inbox", icon: Mail, label: "Commission Inbox" },
      { href: "/commission-tracker", icon: CheckSquare, label: "Commission Tracker" },
      { href: "/collection", icon: BookMarked, label: "Collection" },
      { href: "/coa", icon: FileText, label: "Certificates of Authenticity" },
      { href: "/gift-cards", icon: Gift, label: "Gift Cards" },
      { href: "/collector-journey", icon: TrendingUp, label: "Collector Journey" },
      { href: "/taste-graph", icon: Radar, label: "Taste Graph" },
      { href: "/resale", icon: Repeat2, label: "Resale Market" },
      { href: "/link-in-bio", icon: Link2, label: "Link in Bio" },
    ],
  },
  {
    title: "Create",
    items: [
      { href: "/create-listing", icon: ShoppingBag, label: "List a Piece" },
      { href: "/create-drop", icon: Zap, label: "Schedule a Drop" },
      { href: "/create-workshop", icon: BookOpen, label: "Create Workshop" },
      { href: "/campaigns", icon: Megaphone, label: "Campaigns" },
      { href: "/subscription-boxes", icon: Gift, label: "Subscription Boxes" },
      { href: "/music-studio", icon: Music2, label: "Music Studio" },
      { href: "/sound-market", icon: Music2, label: "Sound Market" },
      { href: "/analytics", icon: BarChart2, label: "Analytics" },
      { href: "/earnings", icon: DollarSign, label: "Earnings" },
      { href: "/inventory", icon: Archive, label: "Inventory" },
      { href: "/scheduler", icon: Clock, label: "Post Scheduler" },
      { href: "/drafts", icon: FileText, label: "Drafts" },
      { href: "/creator-home", icon: Home, label: "Creator Home" },
      { href: "/newsletter", icon: Newspaper, label: "Newsletter" },
      { href: "/grants", icon: Sparkles, label: "Grant Writer" },
      { href: "/assistant", icon: Bot, label: "AI Assistant" },
      { href: "/price-calculator", icon: Calculator, label: "Price Calculator" },
      { href: "/kiln-status", icon: Flame, label: "In the Kiln" },
      { href: "/drop-scheduler", icon: Zap, label: "Drop Scheduler" },
      { href: "/craft-hours", icon: Timer, label: "Craft Hours" },
      { href: "/ghost-mode", icon: Ghost, label: "Studio Ghost" },
      { href: "/provenance", icon: Link2, label: "Provenance Chain" },
      { href: "/craft-dna", icon: Dna, label: "Craft DNA" },
    ],
  },
  {
    title: "Explore",
    items: [
      { href: "/workshops", icon: BookOpen, label: "Workshops" },
      { href: "/techniques", icon: FlaskConical, label: "Techniques" },
      { href: "/glaze-library", icon: Flame, label: "Glaze Library" },
      { href: "/glaze-oracle", icon: FlaskConical, label: "Glaze Oracle" },
      { href: "/materials", icon: Box, label: "Materials" },
      { href: "/map", icon: Map, label: "Studio Map" },
      { href: "/trending", icon: TrendingUp, label: "Trending" },
      { href: "/drops", icon: Zap, label: "Drops" },
      { href: "/auctions", icon: Gavel, label: "Auctions" },
      { href: "/series", icon: BookMarked, label: "Process Journals" },
      { href: "/calendar", icon: Calendar, label: "Craft Calendar" },
      { href: "/downloads", icon: Download, label: "Digital Downloads" },
      { href: "/boards", icon: Grid3x3, label: "Inspiration Boards" },
      { href: "/duet", icon: SplitSquareHorizontal, label: "Duet Studio" },
      { href: "/stitch", icon: Scissors, label: "Stitch Studio" },
      { href: "/technique-genetics", icon: Network, label: "Technique Genetics" },
      { href: "/materials-exchange", icon: ArrowLeftRight, label: "Material Exchange" },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/guilds", icon: Users, label: "Guilds" },
      { href: "/challenges", icon: Trophy, label: "Challenges" },
      { href: "/critique", icon: MessageSquare, label: "Critique Circle" },
      { href: "/mentorship", icon: GraduationCap, label: "Mentorship" },
      { href: "/collab", icon: Link2, label: "Collab Board" },
      { href: "/events", icon: CalendarDays, label: "Events" },
      { href: "/opportunities", icon: Briefcase, label: "Opportunities" },
      { href: "/leaderboard", icon: Award, label: "Leaderboard" },
      { href: "/badges", icon: Trophy, label: "Badges" },
      { href: "/referrals", icon: UserCircle2, label: "Invite Artists" },
      { href: "/parliament", icon: Vote, label: "Parliament" },
      { href: "/lineage", icon: GitBranch, label: "Craft Lineage" },
    ],
  },
];

export default function MobileNav() {
  const [location] = useLocation();
  const { profile } = useProfile();
  const { unreadCount, unreadMessageCount } = useSocial();
  const { itemCount } = useCart();
  const { hasWarning, hasUrgent, bannerDismissed, dismissBanner } = useStripeConnect();
  const [showMore, setShowMore] = useState(false);

  const totalBadge = unreadCount + unreadMessageCount;
  const profileHref = profile ? `/artists/${profile.id}` : "/setup";
  const createHref = profile ? "/create" : "/setup";
  const isProfileActive = location.startsWith("/artists/") || location === "/setup" || location === "/edit-profile";
  const isMoreActive = showMore || (
    !PRIMARY_TABS.some(t => t.href === "/" ? location === "/" : location.startsWith(t.href)) &&
    !isProfileActive
  );

  return (
    <>
      {/* Stripe verification warning banner — shown above the nav when action is needed */}
      {profile && (hasUrgent || hasWarning) && !bannerDismissed && (
        <Link href="/earnings" onClick={dismissBanner}>
          <div
            className={`fixed bottom-16 left-0 right-0 z-50 md:hidden flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer transition-colors ${
              hasUrgent
                ? "bg-rose-500/90 text-white"
                : "bg-amber-500/90 text-stone-950"
            }`}
          >
            <AlertTriangle size={13} className="flex-shrink-0" />
            <span>
              {hasUrgent
                ? "Stripe account restricted — action required"
                : "Stripe verification needed — tap to complete"}
            </span>
          </div>
        </Link>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-[#12100e]/95 backdrop-blur-md safe-area-pb">
        <div className="flex items-center justify-around h-16 px-1">
          {PRIMARY_TABS.map(({ href: tabHref, icon: Icon, label, accent }) => {
            const href = accent ? createHref : tabHref;
            const isActive = tabHref === "/"
              ? (location === "/" || location === "")
              : location.startsWith(tabHref);

            return (
              <Link key={tabHref} href={href}>
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
                </button>
              </Link>
            );
          })}

          {/* Profile tab */}
          <Link href={profileHref}>
            <button
              className={`relative flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all ${
                isProfileActive ? "text-amber-400" : "text-stone-500"
              }`}
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className={`h-7 w-7 rounded-full object-cover transition-all ${
                    isProfileActive ? "ring-2 ring-amber-400" : "ring-1 ring-white/20"
                  }`}
                />
              ) : (
                <User size={20} strokeWidth={isProfileActive ? 2.5 : 1.8} />
              )}
              <span className={`text-[10px] font-medium ${isProfileActive ? "text-amber-400" : "text-stone-600"}`}>
                Profile
              </span>
            </button>
          </Link>

          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className={`relative flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all ${
              isMoreActive ? "text-amber-400" : "text-stone-500"
            }`}
          >
            <LayoutGrid size={20} strokeWidth={isMoreActive ? 2.5 : 1.8} />
            <span className={`text-[10px] font-medium ${isMoreActive ? "text-amber-400" : "text-stone-600"}`}>
              More
            </span>
            {totalBadge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {totalBadge > 9 ? "9+" : totalBadge}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* More drawer */}
      <AnimatePresence>
        {showMore && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
            />

            {/* Sheet */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[61] md:hidden rounded-t-3xl bg-[#1a1714] border-t border-white/10 overflow-hidden"
              style={{ maxHeight: "88vh" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-stone-600" />
              </div>

              {/* Header row: profile + close */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                <Link href={profileHref} onClick={() => setShowMore(false)}>
                  <div className="flex items-center gap-3">
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover border border-white/15" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 border border-white/10">
                        <User size={16} className="text-stone-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-amber-100 leading-tight">
                        {profile?.name ?? "Set up profile"}
                      </p>
                      <p className="text-[11px] text-stone-500 leading-tight">View profile</p>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => setShowMore(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto pb-24" style={{ maxHeight: "calc(88vh - 120px)" }}>
                {SECTIONS.map((section) => (
                  <div key={section.title} className="px-4 pt-4 pb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600 mb-2 px-1">
                      {section.title}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {section.items.map(({ href, icon: Icon, label }) => {
                        const isActive = href === "/" ? location === "/" : location.startsWith(href);
                        const badge =
                          href === "/notifications" ? unreadCount :
                          href === "/messages" ? unreadMessageCount :
                          href === "/cart" ? itemCount : 0;

                        return (
                          <Link key={href} href={href} onClick={() => setShowMore(false)}>
                            <button
                              className={`relative w-full flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all ${
                                isActive
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                  : "border-white/8 bg-stone-900/60 text-stone-400 hover:border-white/15 hover:text-stone-200"
                              }`}
                            >
                              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                              <span className="text-[10px] font-medium leading-tight text-center">{label}</span>
                              {badge > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                  {badge > 9 ? "9+" : badge}
                                </span>
                              )}
                            </button>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Settings at the bottom */}
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600 mb-2 px-1">Account</p>
                  <div className="space-y-0.5 rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
                    {[
                      { href: "/edit-profile", label: "Edit profile" },
                      { href: "/earnings", label: "Earnings & payments" },
                      { href: "/apply-verified", label: "Apply for verified" },
                      { href: "/qr-profile", label: "QR profile card" },
                      { href: "/settings", label: "Settings" },
                    ].map(({ href, label }) => (
                      <Link key={href} href={href} onClick={() => setShowMore(false)}>
                        <button className="flex w-full items-center justify-between px-4 py-3 text-sm text-stone-400 hover:bg-white/4 hover:text-stone-200 transition-colors border-b border-white/5 last:border-0">
                          {label}
                          <ChevronRight size={13} className="text-stone-600" />
                        </button>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
