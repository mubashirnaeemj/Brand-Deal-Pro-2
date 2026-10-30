import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
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
import OnboardingPage from "@/pages/OnboardingPage";
import Negotiator from "@/pages/Negotiator";
import Pipeline from "@/pages/Pipeline";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Login from "@/pages/Login";
import PasswordChangeRequired from "@/components/PasswordChangeRequired";
import { AuthProvider, isProfileComplete, useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  const { user, isLoading, authError, passwordChangeRequired } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center" aria-label="Checking your session">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (passwordChangeRequired) return <PasswordChangeRequired />;
  if (authError) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-white">
      <p role="alert">{authError}</p>
      <button className="rounded-xl bg-primary px-5 py-2" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
  if (!user) return location === "/signin" ? <Login /> : <Redirect to="/signin" />;
  if (!isProfileComplete(user)) {
    return location === "/creator-profile" ? <OnboardingPage /> : <Redirect to="/creator-profile" />;
  }
  if (location === "/signin" || location === "/login" || location === "/matches") return <Redirect to="/brand-matches" />;
  if (location === "/profile-setup") return <Redirect to="/creator-profile" />;
  if (location === "/") return <Redirect to="/dashboard" />;

  return (
    <Switch>
      <Route path="/home" component={Home} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/creator-profile" component={ProfileSettings} />
      <Route path="/brand-matches" component={BrandMatches} />
      <Route path="/brands/:slug" component={BrandDetail} />
      <Route path="/pitch" component={Pitch} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={ProfileSettings} />
      <Route path="/rate-calculator" component={Negotiator} />
      <Route path="/deals" component={Pipeline} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedApp() {
  const { user, isLoading } = useAuth();
  return (
    <>
      <Router />
      {!isLoading && user && isProfileComplete(user) && <DemoBar />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider><RoutedApp /></AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
