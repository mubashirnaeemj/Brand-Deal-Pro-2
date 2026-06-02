import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BarChart3, Mail } from "lucide-react";

export default function Hero() {
  const startDemo = (href: string) => {
    sessionStorage.setItem("demoMode", "1");
    window.location.assign(href);
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-primary mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>The creator economy's precision toolkit</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6"
          >
            Stop Cold Emailing.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-primary">Start Closing Brands.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            MAVLIT matches you with high-paying sponsors, analyzes your metrics, 
            and generates irresistible pitch decks automatically. Built for creators who mean business.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              data-testid="button-start-trial"
              onClick={() => startDemo("/dashboard")}
              className="w-full sm:w-auto h-14 px-8 text-base bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(124,58,237,0.4)]"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              data-testid="button-how-it-works"
              onClick={() => startDemo("/brand-matches")}
              className="w-full sm:w-auto h-14 px-8 text-base border-white/10 hover:bg-white/5 hover:text-white"
            >
              See How It Works
            </Button>
          </motion.div>
        </div>

        {/* Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-20 relative max-w-5xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-20 pointer-events-none" />
          
          <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl relative">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="mx-auto px-4 py-1 rounded bg-black/40 border border-white/5 text-xs text-muted-foreground font-mono">
                app.mavlit.co/dashboard
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              <div className="col-span-1 md:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Active Matches</h3>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-primary">View All</Button>
                </div>
                
                <div className="space-y-3">
                  {[
                    { brand: "TechFlow Audio", match: 98, status: "Ready to Pitch", amount: "$4,500" },
                    { brand: "Lumina Skincare", match: 92, status: "Pitch Sent", amount: "$2,800" },
                    { brand: "Nomad Backpacks", match: 87, status: "Drafting", amount: "$1,200" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-white font-bold">
                          {item.brand.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{item.brand}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{item.match}% Match</span>
                            <span className="text-xs text-muted-foreground">{item.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{item.amount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="p-5 rounded-lg bg-gradient-to-br from-primary/20 to-transparent border border-primary/20">
                  <Sparkles className="w-6 h-6 text-primary mb-3" />
                  <h4 className="text-sm font-medium text-white mb-1">AI Pitch Generator</h4>
                  <p className="text-xs text-muted-foreground mb-4">Crafting personalized deck for TechFlow Audio based on recent metrics.</p>
                  <div className="w-full bg-black/40 rounded-full h-1.5 mb-2">
                    <div className="bg-primary h-1.5 rounded-full w-[75%]" />
                  </div>
                  <p className="text-xs text-right text-primary font-mono">75%</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <BarChart3 className="w-4 h-4 text-muted-foreground mb-2" />
                    <p className="text-2xl font-bold text-white">42K</p>
                    <p className="text-xs text-muted-foreground">Avg. Views</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <Mail className="w-4 h-4 text-muted-foreground mb-2" />
                    <p className="text-2xl font-bold text-white">12</p>
                    <p className="text-xs text-muted-foreground">Pitches Sent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
