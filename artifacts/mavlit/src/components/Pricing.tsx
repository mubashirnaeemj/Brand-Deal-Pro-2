import { motion } from "framer-motion";
import { Check, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  return (
    <section className="py-32 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            Simple, transparent pricing.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            One deal pays for a lifetime of MAVLIT.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-lg mx-auto"
        >
          <div className="relative rounded-2xl bg-card border border-primary/30 p-8 shadow-[0_0_50px_rgba(124,58,237,0.15)] overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">
              Most Popular
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Pro Creator</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-white">$29</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Everything you need to automate your brand outreach and close more deals.
              </p>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "Unlimited AI Pitch Decks",
                "100+ Premium Brand Matches / mo",
                "Live-updating Media Kit (Custom URL)",
                "Advanced Open & Click Analytics",
                "Automated Follow-up Sequences",
                "Remove MAVLIT Branding"
              ].map((feat, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-white/90">{feat}</span>
                </li>
              ))}
            </ul>

            <Button className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground">
              Get Started Now
            </Button>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="w-3 h-3" />
              <span>14-day money-back guarantee. Cancel anytime.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
