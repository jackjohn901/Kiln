import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { SocialProvider } from "@/contexts/SocialContext";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
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
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </SocialProvider>
        </ProfileProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
