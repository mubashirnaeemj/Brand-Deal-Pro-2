import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { LayoutDashboard, Users, Zap, Calculator, UserCircle, Briefcase } from "lucide-react";

const NAV_LINKS = [
  { label: "Dashboard",  href: "/dashboard",      Icon: LayoutDashboard },
  { label: "Matches",    href: "/brand-matches",  Icon: Users           },
  { label: "Pitch",      href: "/pitch-deck",     Icon: Zap             },
  { label: "Deals",      href: "/deals",          Icon: Briefcase       },
  { label: "Negotiator", href: "/rate-calculator",Icon: Calculator      },
  { label: "Profile",    href: "/profile",        Icon: UserCircle      },
];

export default function Navbar() {
  const [location] = useLocation();
  const isApp = location !== "/";

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
          {!isApp && (
            <Button variant="ghost" className="text-muted-foreground hover:text-white hidden md:inline-flex">
              Sign In
            </Button>
          )}
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all text-sm"
            onClick={() => {}}
          >
            {isApp ? "Upgrade to Pro" : "Get Early Access"}
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}
