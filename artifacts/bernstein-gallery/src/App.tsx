import { Switch, Route, Router as WouterRouter } from "wouter";
import Gallery from "@/pages/Gallery";
import Checkout from "@/pages/Checkout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Gallery} />
      <Route path="/checkout/:id" component={Checkout} />
      <Route>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Page not found.</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
