import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router as WouterRouter } from "wouter";
import Discover from "@/pages/Discover";
import Browse from "@/pages/Browse";
import Artists from "@/pages/Artists";
import ArtistPage from "@/pages/ArtistPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Discover} />
      <Route path="/browse" component={Browse} />
      <Route path="/artists" component={Artists} />
      <Route path="/artists/:id" component={ArtistPage} />
      <Route>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Page not found.</p>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}
