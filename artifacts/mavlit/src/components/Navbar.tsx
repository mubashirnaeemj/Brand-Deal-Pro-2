import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-muted-foreground hover:text-white hidden md:inline-flex">
            Sign In
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all">
            Get Early Access
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}
