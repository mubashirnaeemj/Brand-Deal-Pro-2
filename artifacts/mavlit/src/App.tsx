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
import BrandCatalog from "@/pages/BrandCatalog";
import { AuthProvider, useAuth, isProfileComplete } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

/** Wraps any app route — redirects to /login if not authed, /profile-setup if identity incomplete */
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!isProfileComplete(user) && location !== "/profile-setup") {
    return <Redirect to="/profile-setup" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/brand-catalog" component={BrandCatalog} />

      {/* Profile setup — authed but not yet complete */}
      <Route path="/profile-setup">
        {() => {
          const { user, isLoading } = useAuth();
          if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
          if (!user) return <Redirect to="/login" />;
          return <OnboardingPage />;
        }}
      </Route>

      {/* Protected app routes */}
      <Route path="/brand-matches"   component={() => <ProtectedRoute component={BrandMatches}    />} />
      <Route path="/brands/:slug"    component={() => <ProtectedRoute component={BrandDetail}      />} />
      <Route path="/pitch"           component={() => <ProtectedRoute component={Pitch}            />} />
      <Route path="/dashboard"       component={() => <ProtectedRoute component={Dashboard}        />} />
      <Route path="/profile"         component={() => <ProtectedRoute component={ProfileSettings}  />} />
      <Route path="/rate-calculator" component={() => <ProtectedRoute component={Negotiator}       />} />
      <Route path="/deals"           component={() => <ProtectedRoute component={Pipeline}         />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
            <DemoBar />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
