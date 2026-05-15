import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { SocialProvider } from "@/contexts/SocialContext";
import { CartProvider } from "@/contexts/CartContext";
import MobileNav from "@/components/MobileNav";
import NotFound from "@/pages/not-found";
import Feed from "@/pages/Feed";
import Artists from "@/pages/Artists";
import ArtistProfile from "@/pages/ArtistProfile";
import Shop from "@/pages/Shop";
import Setup from "@/pages/Setup";
import Create from "@/pages/Create";
import Discover from "@/pages/Discover";
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
import Materials from "@/pages/Materials";
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

function TitleSetter() {
  const [location] = useLocation();
  useEffect(() => {
    const routes: [string, string][] = [
      ["/", "Kiln — Craft Creator Platform"],
      ["/discover", "Discover Artists — Kiln"],
      ["/artists", "Artists — Kiln"],
      ["/shop", "Shop Original Works — Kiln"],
      ["/workshops", "Workshops — Kiln"],
      ["/techniques", "Technique Library — Kiln"],
      ["/challenges", "Challenges — Kiln"],
      ["/guilds", "Guilds — Kiln"],
      ["/opportunities", "Opportunities — Kiln"],
      ["/series", "Process Journals — Kiln"],
      ["/materials", "Materials — Kiln"],
      ["/calendar", "Craft Calendar — Kiln"],
      ["/events", "Community Events — Kiln"],
      ["/critique", "Critique Circle — Kiln"],
      ["/mentorship", "Mentorship — Kiln"],
      ["/collab", "Collab Board — Kiln"],
      ["/trending", "Trending — Kiln"],
      ["/assistant", "AI Craft Assistant — Kiln"],
      ["/grants", "Grant Writer — Kiln"],
      ["/collector", "Collector Portal — Kiln"],
      ["/scheduler", "Post Scheduler — Kiln"],
      ["/creator-home", "Creator Home — Kiln"],
      ["/newsletter", "Newsletter — Kiln"],
      ["/inventory", "Inventory — Kiln"],
      ["/settings", "Settings — Kiln"],
      ["/earnings", "Earnings — Kiln"],
      ["/analytics", "Analytics — Kiln"],
      ["/inbox", "Commission Inbox — Kiln"],
      ["/messages", "Messages — Kiln"],
      ["/saved", "Saved — Kiln"],
      ["/orders", "Orders — Kiln"],
      ["/cart", "Cart — Kiln"],
      ["/map", "Studio Map — Kiln"],
      ["/drops", "Drops — Kiln"],
      ["/listings", "Listing — Kiln"],
    ];
    const match = routes.find(([p]) =>
      p === location || (p !== "/" && location.startsWith(p + "/"))
    );
    document.title = match ? match[1] : "Kiln";
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <TitleSetter />
      <Route path="/" component={Feed} />
      <Route path="/discover" component={Discover} />
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
      <Route path="/materials" component={Materials} />
      <Route path="/series" component={SeriesJournal} />
      <Route path="/series/:id" component={SeriesDetail} />
      <Route path="/settings" component={Settings} />
      <Route path="/cart" component={Cart} />
      <Route path="/cart/checkout" component={CartCheckout} />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProfileProvider>
          <SocialProvider>
            <CartProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
                <MobileNav />
              </WouterRouter>
              <Toaster />
            </CartProvider>
          </SocialProvider>
        </ProfileProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
