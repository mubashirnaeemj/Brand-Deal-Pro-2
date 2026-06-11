import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DemoBar from "@/components/DemoBar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import BrandMatches from "@/pages/BrandMatches";
import BrandDetail from "@/pages/BrandDetail";
import Pitch from "@/pages/Pitch";
import Dashboard from "@/pages/Dashboard";
import ProfileSettings from "@/pages/ProfileSettings";
import Negotiator from "@/pages/Negotiator";
import DealsTracker from "@/pages/DealsTracker";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/brand-matches" component={BrandMatches} />
      <Route path="/brands/:slug" component={BrandDetail} />
      <Route path="/pitch" component={Pitch} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={ProfileSettings} />
      <Route path="/rate-calculator" component={Negotiator} />
      <Route path="/deals" component={DealsTracker} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
          <DemoBar />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
