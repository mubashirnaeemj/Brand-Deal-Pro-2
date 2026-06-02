import { motion } from "framer-motion";
import { Link2, Target, Zap } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Link2,
    title: "Connect Your Channels",
    desc: "Securely link YouTube, Instagram, or TikTok. We pull your real-time analytics and audience demographics securely.",
  },
  {
    num: "02",
    icon: Target,
    title: "Discover Matched Brands",
    desc: "Our algorithm scans thousands of active campaigns and matches you with brands looking for your exact audience profile.",
  },
  {
    num: "03",
    icon: Zap,
    title: "Generate Pitch Deck",
    desc: "One click creates a tailored, high-converting pitch deck with your live stats, personalized to the specific brand.",
  }
];

export default function HowItWorks() {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Sponsorships on autopilot.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            Three steps from your first login to your next brand deal.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="relative p-8 rounded-2xl bg-card border border-white/5 hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 mb-6 rounded-full bg-background border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(124,58,237,0.2)] group-hover:scale-110 transition-transform relative z-10">
                <step.icon className="w-5 h-5" />
              </div>
              
              <div className="absolute top-8 right-8 text-6xl font-bold text-white/[0.03] group-hover:text-primary/[0.05] transition-colors pointer-events-none select-none">
                {step.num}
              </div>

              <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
