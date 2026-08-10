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
import ProfileSetup from "@/pages/ProfileSetup";
import Negotiator from "@/pages/Negotiator";
import Pipeline from "@/pages/Pipeline";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Login from "@/pages/Login";
import { AuthProvider, useAuth, isProfileComplete } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

/** Wraps any app route — auth redirects temporarily disabled for testing */
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
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

      {/* Profile setup — authed but not yet complete */}
      <Route path="/profile-setup">
        {() => {
          const { user, isLoading } = useAuth();
          if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
          if (!user) return <Redirect to="/login" />;
          return <ProfileSetup />;
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
