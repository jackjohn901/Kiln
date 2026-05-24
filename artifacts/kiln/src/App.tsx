import { useEffect } from "react";
import PressPage from "@/pages/PressPage";
import { Switch, Route, Router as WouterRouter, useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import Landing from "@/pages/Landing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { SocialProvider } from "@/contexts/SocialContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { StripeConnectProvider } from "@/contexts/StripeConnectContext";
import MobileNav from "@/components/MobileNav";
import NotFound from "@/pages/not-found";
import Feed from "@/pages/Feed";
import Artists from "@/pages/Artists";
import ArtistProfile from "@/pages/ArtistProfile";
import Shop from "@/pages/Shop";
import Setup from "@/pages/Setup";
import Create from "@/pages/Create";
import Discover from "@/pages/Discover";
import Gallery from "@/pages/Gallery";
import Community from "@/pages/Community";
import Analytics from "@/pages/Analytics";
import Workshops from "@/pages/Workshops";
import Inbox from "@/pages/Inbox";
import Messages from "@/pages/Messages";
import Drops from "@/pages/Drops";
import Techniques from "@/pages/Techniques";
import Subscribe from "@/pages/Subscribe";
import Notifications from "@/pages/Notifications";
import Saved from "@/pages/Saved";
import Earnings from "@/pages/Earnings";
import Collection from "@/pages/Collection";
import ApplyVerified from "@/pages/ApplyVerified";
import EditProfile from "@/pages/EditProfile";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import SaleDetail from "@/pages/SaleDetail";
import Drafts from "@/pages/Drafts";
import FollowerList from "@/pages/FollowerList";
import TagFeed from "@/pages/TagFeed";
import PostDetail from "@/pages/PostDetail";
import Challenges from "@/pages/Challenges";
import Checkout from "@/pages/Checkout";
import WorkshopCheckout from "@/pages/WorkshopCheckout";
import LiveStudio from "@/pages/LiveStudio";
import CommissionFlow from "@/pages/CommissionFlow";
import StudioMap from "@/pages/StudioMap";
import OnboardingQuiz from "@/pages/OnboardingQuiz";
import OpportunityBoard from "@/pages/OpportunityBoard";
import Guilds from "@/pages/Guilds";
import GuildDetail from "@/pages/GuildDetail";
import NotificationsPage from "@/pages/NotificationsPage";
import CraftCalendar from "@/pages/CraftCalendar";
import CritiqueFeed from "@/pages/CritiqueFeed";
import Mentorship from "@/pages/Mentorship";
import PatronTiers from "@/pages/PatronTiers";
import PressKit from "@/pages/PressKit";
import PressPacket from "@/pages/PressPacket";
import Materials from "@/pages/Materials";
import GlazeLibrary from "@/pages/GlazeLibrary";
import SeriesJournal from "@/pages/SeriesJournal";
import SeriesDetail from "@/pages/SeriesDetail";
import Settings from "@/pages/Settings";
import Cart from "@/pages/Cart";
import CartCheckout from "@/pages/CartCheckout";
import CollabBoard from "@/pages/CollabBoard";
import Trending from "@/pages/Trending";
import CraftAssistant from "@/pages/CraftAssistant";
import GrantWriter from "@/pages/GrantWriter";
import CollectorPortal from "@/pages/CollectorPortal";
import PostScheduler from "@/pages/PostScheduler";
import CreatorHome from "@/pages/CreatorHome";
import Newsletter from "@/pages/Newsletter";
import InventoryManager from "@/pages/InventoryManager";
import ListingDetail from "@/pages/ListingDetail";
import CommunityEvents from "@/pages/CommunityEvents";
import CommissionRates from "@/pages/CommissionRates";
import ActivityFeed from "@/pages/ActivityFeed";
import StudioDialogue from "@/pages/StudioDialogue";
import QRProfile from "@/pages/QRProfile";
import Leaderboard from "@/pages/Leaderboard";
import Audience from "@/pages/Audience";
import CertificateOfAuthenticity from "@/pages/CertificateOfAuthenticity";
import Auctions from "@/pages/Auctions";
import EmbedPortfolio from "@/pages/EmbedPortfolio";
import CommissionContract from "@/pages/CommissionContract";
import MaterialExchange from "@/pages/MaterialExchange";
import DigitalDownloads from "@/pages/DigitalDownloads";
import InspirationBoards from "@/pages/InspirationBoards";
import DuetStudio from "@/pages/DuetStudio";
import CollectorProfile from "@/pages/CollectorProfile";
import CommissionTracker from "@/pages/CommissionTracker";
import GiftCards from "@/pages/GiftCards";
import StitchStudio from "@/pages/StitchStudio";
import PriceCalculator from "@/pages/PriceCalculator";
import CollectorJourney from "@/pages/CollectorJourney";
import KilnStatus from "@/pages/KilnStatus";
import DropScheduler from "@/pages/DropScheduler";
import ProvenanceChain from "@/pages/ProvenanceChain";
import CraftDNA from "@/pages/CraftDNA";
import LineageGraph from "@/pages/LineageGraph";
import Parliament from "@/pages/Parliament";
import GlazeOracle from "@/pages/GlazeOracle";
import GhostMode from "@/pages/GhostMode";
import TasteGraph from "@/pages/TasteGraph";
import CraftHours from "@/pages/CraftHours";
import TechniqueGenetics from "@/pages/TechniqueGenetics";
import CreateListing from "@/pages/CreateListing";
import CreateDrop from "@/pages/CreateDrop";
import CreateWorkshop from "@/pages/CreateWorkshop";
import MusicStudio from "@/pages/MusicStudio";
import ReelStudio from "@/pages/ReelStudio";
import VoiceStudio from "@/pages/VoiceStudio";
import SoundMarket from "@/pages/SoundMarket";
import CartSuccess from "@/pages/CartSuccess";
import Campaigns from "@/pages/Campaigns";
import CreateCampaign from "@/pages/CreateCampaign";
import CampaignDetail from "@/pages/CampaignDetail";
import BroadcastChannel from "@/pages/BroadcastChannel";
import ResaleMarket from "@/pages/ResaleMarket";
import BoostPost from "@/pages/BoostPost";
import LinkInBio from "@/pages/LinkInBio";
import LinkInBioPublic from "@/pages/LinkInBioPublic";
import SubscriptionBoxes from "@/pages/SubscriptionBoxes";
import CreateSubscriptionBox from "@/pages/CreateSubscriptionBox";
import Referrals from "@/pages/Referrals";
import Badges from "@/pages/Badges";
import Search from "@/pages/Search";
import AdminReports from "@/pages/AdminReports";
import PlatformAnalytics from "@/pages/PlatformAnalytics";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Help from "@/pages/Help";
import FoundingArtist from "@/pages/FoundingArtist";
import AdminFoundingArtists from "@/pages/AdminFoundingArtists";
import SocialSync from "@/pages/SocialSync";
import KilnOpening from "@/pages/KilnOpening";
import AIMarketing from "@/pages/AIMarketing";
import MaterialSources from "@/pages/MaterialSources";
import ProcessPledge from "@/pages/ProcessPledge";
import ListingCollaborators from "@/pages/ListingCollaborators";
import CreateProject from "@/pages/CreateProject";
import ProjectDetail from "@/pages/ProjectDetail";
import MyProjects from "@/pages/MyProjects";
import ReserveList from "@/pages/ReserveList";
import StudioOpenDays from "@/pages/StudioOpenDays";
import CreateStudioEvent from "@/pages/CreateStudioEvent";
import PushPrompt from "@/components/PushPrompt";
import OnboardingModal from "@/components/OnboardingModal";
import SaleNotificationListener from "@/components/SaleNotificationListener";

const queryClient = new QueryClient();

function applyThemeFromSettings() {
  try {
    const raw = localStorage.getItem("kiln_settings_v1");
    if (raw) {
      const s = JSON.parse(raw);
      document.documentElement.classList.toggle("light", s.display_dark_mode === false);
    }
  } catch {}
}
applyThemeFromSettings();

const QUIZ_PREFS_KEY = "kiln_prefs_v1";

function QuizGate() {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { profile, profileLoaded } = useProfile();
  useEffect(() => {
    // Don't compete with SetupGate — only offer quiz to users who have completed setup
    if (location !== "/" || !isAuthenticated || !profileLoaded || !profile) return;
    try {
      if (!localStorage.getItem(QUIZ_PREFS_KEY) && !sessionStorage.getItem("kiln_quiz_offered")) {
        sessionStorage.setItem("kiln_quiz_offered", "1");
        navigate("/quiz");
      }
    } catch {}
  }, [location, navigate, isAuthenticated, profile, profileLoaded]);
  return null;
}

// Pages that should never trigger the setup redirect
const SETUP_EXEMPT = ["/setup", "/quiz", "/login", "/callback", "/terms", "/privacy", "/help", "/landing"];

function SetupGate() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { profile, profileLoaded } = useProfile();
  useEffect(() => {
    if (isLoading || !isAuthenticated || !profileLoaded) return;
    if (profile) return;
    if (SETUP_EXEMPT.some((p) => location.startsWith(p))) return;
    navigate("/setup");
  }, [isLoading, isAuthenticated, profileLoaded, profile, location, navigate]);
  return null;
}

function RefCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && ref.trim()) {
        localStorage.setItem("kiln_referral_code", ref.trim().toUpperCase());
      }
    } catch {}
  }, []);
  return null;
}

function TitleSetter() {
  const [location] = useLocation();
  useEffect(() => {
    const routes: [string, string, string][] = [
      ["/", "Kiln — Craft Creator Platform", "Watch craft artists share their process. Buy ceramics, glass, weaving, metalwork, and woodwork directly from makers. Book workshops and support artists you love."],
      ["/discover", "Discover Artists — Kiln", "Find craft artists by technique, location, and style. Ceramicists, glassblowers, weavers, metalworkers, woodworkers, and more on Kiln."],
      ["/gallery", "Gallery — Kiln", "Browse works by craft artists. Ceramics, glass, weaving, metalwork, and woodwork in a visual image gallery."],
      ["/community", "Community — Kiln", "Join the Kiln craft community. Share thoughts, ask questions, and connect with other artists and makers."],
      ["/artists", "Browse Craft Artists — Kiln", "Browse all craft artists on Kiln. Filter by technique, location, and commission availability. Find the maker behind the work."],
      ["/shop", "Shop Original Handmade Works — Kiln", "Buy original handmade art directly from craft artists. Ceramics, glass, woven textiles, metalwork, woodwork, and more. No middlemen."],
      ["/workshops", "Book Craft Workshops — Kiln", "Book in-person and online craft workshops. Pottery, glassblowing, weaving, blacksmithing, and more classes taught by working artists."],
      ["/techniques", "Craft Techniques — Kiln", "Explore craft techniques: ceramics, glassblowing, flameworking, raku, kiln forming, weaving, blacksmithing, enamelwork, and more."],
      ["/challenges", "Craft Challenges — Kiln", "Join community craft challenges. Share your process, get feedback, and connect with makers working in the same discipline."],
      ["/guilds", "Craft Guilds — Kiln", "Join technique-based craft guilds. Connect with other ceramicists, glassblowers, weavers, and metalworkers in focused community spaces."],
      ["/opportunities", "Opportunities for Artists — Kiln", "Residencies, grants, fellowships, and exhibition calls for craft artists. Find your next opportunity on Kiln."],
      ["/series", "Process Journals — Kiln", "Artist-written process journals documenting bodies of work. Follow along as makers share the story behind their craft."],
      ["/materials", "Craft Materials Guide — Kiln", "A reference guide to materials used in craft: clay bodies, glass types, natural dyes, metals, fibers, and more."],
      ["/calendar", "Craft Calendar — Kiln", "Upcoming craft fairs, open studios, workshops, and community events. Stay connected to the handmade world."],
      ["/events", "Community Events — Kiln", "Craft events, virtual meetups, and community gatherings for makers and collectors on Kiln."],
      ["/critique", "Critique Circle — Kiln", "Share work in progress and get constructive feedback from other craft artists. A safe space for honest creative dialogue."],
      ["/mentorship", "Craft Mentorship — Kiln", "Connect emerging artists with experienced craft mentors. Find guidance in ceramics, glass, weaving, metalwork, and more."],
      ["/collab", "Collab Board — Kiln", "Find collaborators for craft projects. Connect with makers whose skills complement yours."],
      ["/trending", "Trending on Kiln", "See what's trending in the craft community right now. Popular artists, techniques, and works."],
      ["/assistant", "AI Craft Assistant — Kiln", "Ask the Kiln AI assistant anything about craft techniques, materials, process, and history."],
      ["/grants", "Grant Writer for Artists — Kiln", "AI-powered grant writing tool for craft artists. Describe your work and generate compelling grant applications."],
      ["/collector", "Collector Portal — Kiln", "Track your collection of handmade works. Certificates of authenticity, artist notes, and provenance for every piece."],
      ["/drops", "Limited Edition Drops — Kiln", "Limited-edition handmade works with countdown timers. Join waitlists and get patron early access to new releases."],
      ["/auctions", "Live Auctions — Kiln", "Bid on one-of-a-kind handmade works. Live auctions on ceramics, glass, metalwork, and more from independent craft artists."],
      ["/map", "Studio Map — Kiln", "Find craft studios and open studio events near you. Discover where makers work and visit in person."],
      ["/studio-open-days", "Studio Open Days — Kiln", "Find open studio days near you. Visit artists in their studios, see work in progress, and buy directly from the maker."],
      ["/materials", "Materials — Kiln", "Reference guide to craft materials: clays, glass, fibers, metals, woods, and dyes used by working artists."],
      ["/creator-home", "Creator Home — Kiln", "Your artist dashboard on Kiln. Manage posts, listings, workshops, commissions, earnings, and analytics."],
      ["/earnings", "Earnings — Kiln", "Track your income from sales, tips, patron subscriptions, and workshop bookings on Kiln."],
      ["/analytics", "Analytics — Kiln", "Post performance stats, follower growth, and audience insights for Kiln artists."],
      ["/inbox", "Commission Inbox — Kiln", "Manage custom commission requests. Review quotes, track milestones, and communicate with clients."],
      ["/messages", "Messages — Kiln", "Direct messages between artists and collectors on Kiln."],
      ["/saved", "Saved — Kiln", "Your saved posts, listings, and artists on Kiln."],
      ["/orders", "Orders — Kiln", "Your order history on Kiln. Track status, view receipts, and message artists about your purchases."],
      ["/cart", "Cart — Kiln", "Your shopping cart on Kiln. Review items before checkout."],
      ["/scheduler", "Post Scheduler — Kiln", "Schedule posts in advance on Kiln. Plan your content calendar as a craft artist."],
      ["/newsletter", "Newsletter — Kiln", "Send newsletters to your subscribers on Kiln. Keep your audience updated on new work and upcoming events."],
      ["/inventory", "Inventory — Kiln", "Manage your shop inventory on Kiln. Track listings, stock levels, and pricing."],
      ["/settings", "Settings — Kiln", "Account and notification settings for Kiln."],
      ["/collab", "Collab Board — Kiln", "Find collaborators and creative partners in the craft community."],
      ["/listings", "Listing — Kiln", "Handmade work for sale on Kiln directly from the artist."],
    ];
    const match = routes.find(([p]) =>
      p === location || (p !== "/" && location.startsWith(p + "/"))
    );
    document.title = match ? match[1] : "Kiln — Craft Creator Platform";
    const descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (descEl && match) descEl.content = match[2];
  }, [location]);
  return null;
}

function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const search = useSearch();
  const skip = new URLSearchParams(search).get("skipLanding") === "true";
  if (isLoading) return null;
  if (isAuthenticated || skip) return <Feed />;
  return <Landing />;
}

function Router() {
  return (
    <>
      <TitleSetter />
      <RefCapture />
      <QuizGate />
      <SetupGate />
      <Switch>
        <Route path="/" component={RootPage} />
      <Route path="/discover" component={Discover} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/community" component={Community} />
      <Route path="/artists" component={Artists} />
      <Route path="/artists/:id" component={ArtistProfile} />
      <Route path="/artists/:id/followers" component={FollowerList} />
      <Route path="/artists/:id/following" component={FollowerList} />
      <Route path="/shop" component={Shop} />
      <Route path="/workshops" component={Workshops} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/setup" component={Setup} />
      <Route path="/create" component={Create} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/messages" component={Messages} />
      <Route path="/messages/:participantId" component={Messages} />
      <Route path="/drops" component={Drops} />
      <Route path="/techniques" component={Techniques} />
      <Route path="/techniques/:id" component={Techniques} />
      <Route path="/subscribe/:artistId" component={Subscribe} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/saved" component={Saved} />
      <Route path="/earnings" component={Earnings} />
      <Route path="/collection" component={Collection} />
      <Route path="/apply-verified" component={ApplyVerified} />
      <Route path="/edit-profile" component={EditProfile} />
      <Route path="/orders" component={Orders} />
      <Route path="/orders/cart/:sessionKey" component={OrderDetail} />
      <Route path="/orders/:id" component={OrderDetail} />
      <Route path="/sales/:id" component={SaleDetail} />
      <Route path="/drafts" component={Drafts} />
      <Route path="/tag/:tag" component={TagFeed} />
      <Route path="/posts/:id" component={PostDetail} />
      <Route path="/challenges" component={Challenges} />
      <Route path="/shop/checkout/:listingId" component={Checkout} />
      <Route path="/workshops/book/:workshopId" component={WorkshopCheckout} />
      <Route path="/live/:artistId" component={LiveStudio} />
      <Route path="/commission/:artistId" component={CommissionFlow} />
      <Route path="/map" component={StudioMap} />
      <Route path="/quiz" component={OnboardingQuiz} />
      <Route path="/opportunities" component={OpportunityBoard} />
      <Route path="/guilds" component={Guilds} />
      <Route path="/guilds/:id" component={GuildDetail} />
      <Route path="/notifications-all" component={NotificationsPage} />
      <Route path="/calendar" component={CraftCalendar} />
      <Route path="/critique" component={CritiqueFeed} />
      <Route path="/mentorship" component={Mentorship} />
      <Route path="/artists/:artistId/patron" component={PatronTiers} />
      <Route path="/artists/:artistId/press-kit" component={PressKit} />
      <Route path="/artists/:artistId/press-packet" component={PressPacket} />
      <Route path="/press" component={PressPage} />
      <Route path="/materials" component={Materials} />
      <Route path="/series" component={SeriesJournal} />
      <Route path="/series/:id" component={SeriesDetail} />
      <Route path="/settings" component={Settings} />
      <Route path="/cart" component={Cart} />
      <Route path="/cart/checkout" component={CartCheckout} />
      <Route path="/cart/success" component={CartSuccess} />
      <Route path="/collab" component={CollabBoard} />
      <Route path="/trending" component={Trending} />
      <Route path="/assistant" component={CraftAssistant} />
      <Route path="/grants" component={GrantWriter} />
      <Route path="/collector" component={CollectorPortal} />
      <Route path="/scheduler" component={PostScheduler} />
      <Route path="/creator-home" component={CreatorHome} />
      <Route path="/newsletter" component={Newsletter} />
      <Route path="/inventory" component={InventoryManager} />
      <Route path="/listings/:id" component={ListingDetail} />
      <Route path="/events" component={CommunityEvents} />
      <Route path="/artists/:artistId/rates" component={CommissionRates} />
      <Route path="/activity" component={ActivityFeed} />
      <Route path="/dialogue" component={StudioDialogue} />
      <Route path="/qr-profile" component={QRProfile} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/audience" component={Audience} />
      <Route path="/coa" component={CertificateOfAuthenticity} />
      <Route path="/auctions" component={Auctions} />
      <Route path="/embed/:artistId" component={EmbedPortfolio} />
      <Route path="/commission-contract" component={CommissionContract} />
      <Route path="/commission-contract/:artistId" component={CommissionContract} />
      <Route path="/materials-exchange" component={MaterialExchange} />
      <Route path="/glaze-library" component={GlazeLibrary} />
      <Route path="/downloads" component={DigitalDownloads} />
      <Route path="/boards" component={InspirationBoards} />
      <Route path="/duet" component={DuetStudio} />
      <Route path="/duet/:reelId" component={DuetStudio} />
      <Route path="/collectors/:id" component={CollectorProfile} />
      <Route path="/commission-tracker" component={CommissionTracker} />
      <Route path="/gift-cards" component={GiftCards} />
      <Route path="/stitch" component={StitchStudio} />
      <Route path="/stitch/:reelId" component={StitchStudio} />
      <Route path="/price-calculator" component={PriceCalculator} />
      <Route path="/collector-journey" component={CollectorJourney} />
      <Route path="/kiln-status" component={KilnStatus} />
      <Route path="/drop-scheduler" component={DropScheduler} />
      <Route path="/provenance" component={ProvenanceChain} />
      <Route path="/craft-dna" component={CraftDNA} />
      <Route path="/lineage" component={LineageGraph} />
      <Route path="/parliament" component={Parliament} />
      <Route path="/glaze-oracle" component={GlazeOracle} />
      <Route path="/ghost-mode" component={GhostMode} />
      <Route path="/taste-graph" component={TasteGraph} />
      <Route path="/craft-hours" component={CraftHours} />
      <Route path="/technique-genetics" component={TechniqueGenetics} />
      <Route path="/create-listing" component={CreateListing} />
      <Route path="/create-drop" component={CreateDrop} />
      <Route path="/create-workshop" component={CreateWorkshop} />
      <Route path="/music-studio" component={MusicStudio} />
      <Route path="/reel-studio" component={ReelStudio} />
      <Route path="/voice-studio" component={VoiceStudio} />
      <Route path="/sound-market" component={SoundMarket} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/campaigns/create" component={CreateCampaign} />
      <Route path="/campaigns/:id" component={CampaignDetail} />
      <Route path="/broadcasts/:artistId" component={BroadcastChannel} />
      <Route path="/resale" component={ResaleMarket} />
      <Route path="/boost" component={BoostPost} />
      <Route path="/boost/:postId" component={BoostPost} />
      <Route path="/link-in-bio" component={LinkInBio} />
      <Route path="/link/:slug" component={LinkInBioPublic} />
      <Route path="/subscription-boxes" component={SubscriptionBoxes} />
      <Route path="/subscription-boxes/create" component={CreateSubscriptionBox} />
      <Route path="/referrals" component={Referrals} />
      <Route path="/badges" component={Badges} />
      <Route path="/search" component={Search} />
      <Route path="/admin/platform" component={PlatformAnalytics} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/founding-artists" component={AdminFoundingArtists} />
      <Route path="/founding-artist" component={FoundingArtist} />
      <Route path="/social-sync" component={SocialSync} />
      <Route path="/kiln-opening" component={KilnOpening} />
      <Route path="/ai-marketing" component={AIMarketing} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/help" component={Help} />
      <Route path="/material-sources" component={MaterialSources} />
      <Route path="/process-pledges" component={ProcessPledge} />
      <Route path="/listings/:id/collaborators" component={ListingCollaborators} />
      <Route path="/projects/create" component={CreateProject} />
      <Route path="/projects/mine" component={MyProjects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/artists/:id/reserve" component={ReserveList} />
      <Route path="/studio-open-days" component={StudioOpenDays} />
      <Route path="/create-studio-event" component={CreateStudioEvent} />
      <Route component={NotFound} />
      </Switch>
      <PushPrompt />
      <OnboardingModal />
      <SaleNotificationListener />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ProfileProvider>
            <SocialProvider>
              <CartProvider>
                <StripeConnectProvider>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <Router />
                    <MobileNav />
                  </WouterRouter>
                  <Toaster />
                </StripeConnectProvider>
              </CartProvider>
            </SocialProvider>
          </ProfileProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
