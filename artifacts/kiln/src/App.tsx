import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfileProvider } from "@/contexts/ProfileContext";
import NotFound from "@/pages/not-found";
import Feed from "@/pages/Feed";
import Artists from "@/pages/Artists";
import ArtistProfile from "@/pages/ArtistProfile";
import Shop from "@/pages/Shop";
import Setup from "@/pages/Setup";
import Create from "@/pages/Create";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Feed} />
      <Route path="/artists" component={Artists} />
      <Route path="/artists/:id" component={ArtistProfile} />
      <Route path="/shop" component={Shop} />
      <Route path="/setup" component={Setup} />
      <Route path="/create" component={Create} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProfileProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </ProfileProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
