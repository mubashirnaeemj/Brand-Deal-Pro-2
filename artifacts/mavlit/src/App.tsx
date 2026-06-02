import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import BrandMatches from "@/pages/BrandMatches";
import BrandDetail from "@/pages/BrandDetail";
import PitchDeck from "@/pages/PitchDeck";
import OutreachEmail from "@/pages/OutreachEmail";
import Dashboard from "@/pages/Dashboard";
import ProfileSettings from "@/pages/ProfileSettings";
import RateCalculator from "@/pages/RateCalculator";
import DealsTracker from "@/pages/DealsTracker";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/brand-matches" component={BrandMatches} />
      <Route path="/brands/:slug" component={BrandDetail} />
      <Route path="/pitch-deck" component={PitchDeck} />
      <Route path="/outreach-email" component={OutreachEmail} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={ProfileSettings} />
      <Route path="/rate-calculator" component={RateCalculator} />
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
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
