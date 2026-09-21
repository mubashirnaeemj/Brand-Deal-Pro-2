import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { LayoutDashboard, Users, Zap, UserCircle, Briefcase, LogOut, Library } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard",     Icon: LayoutDashboard },
  { label: "Matches",   href: "/brand-matches", Icon: Users           },
  { label: "Pitch",     href: "/pitch",         Icon: Zap             },
  { label: "Pipeline",  href: "/deals",         Icon: Briefcase       },
  { label: "Profile",   href: "/profile",       Icon: UserCircle      },
  { label: "Catalog",   href: "/brand-catalog",  Icon: Library         },
];

export default function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isApp = location !== "/" && location !== "/login";

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link href={isApp ? "/dashboard" : "/"} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5 text-primary-foreground"
            >
              <path d="M4 14l8-10 8 10M4 20h16" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">MAVLIT</span>
        </Link>

        {isApp && (
          <div className="hidden md:flex items-center gap-1 flex-1">
            {NAV_LINKS.map(({ label, href, Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`nav-link-${label.toLowerCase().replace(" ", "-")}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-white hover:bg-secondary"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 shrink-0">
          {(!isApp || location === "/brand-catalog") && !user && (
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-white hidden md:inline-flex">
                Sign In
              </Button>
            </Link>
          )}
          {isApp && user ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 select-none">
                Founding Creator
              </span>
              <button
                onClick={logout}
                title="Sign out"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
              >
                <LogOut size={13} />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          ) : !isApp ? (
            <Link href="/login">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all text-sm"
              >
                Get Early Access
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </motion.nav>
  );
}
