import { motion } from "framer-motion";
import { Radar, Layers, LineChart, MessageSquare, Shield, FileText } from "lucide-react";

const features = [
  {
    icon: Radar,
    title: "Precision Brand Matching",
    desc: "Stop guessing. See exactly which brands are actively spending and match your audience demographics."
  },
  {
    icon: Layers,
    title: "Dynamic Media Kits",
    desc: "Live-updating stats. Never send an outdated PDF again. Share your secure link with real-time metrics."
  },
  {
    icon: FileText,
    title: "AI Pitch Generation",
    desc: "Context-aware AI writes your pitch emails and customizes decks based on the brand's recent campaigns."
  },
  {
    icon: LineChart,
    title: "Deal Analytics",
    desc: "Track open rates, click-throughs, and time spent on your media kit to know exactly when to follow up."
  },
  {
    icon: MessageSquare,
    title: "Smart Follow-ups",
    desc: "Automated but human-sounding follow-up sequences ensure you never drop the ball on a warm lead."
  },
  {
    icon: Shield,
    title: "Contract & Invoice Management",
    desc: "Keep all your brand deals organized in one place. Generate invoices and track payments effortlessly."
  }
];

export default function Features() {
  return (
    <section className="py-32 bg-black/50 relative border-y border-white/5">
      <div className="container mx-auto px-6">
        <div className="mb-16">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-6 max-w-2xl"
          >
            Everything you need to close six-figure deals.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8 rounded-xl bg-card/50 border border-white/5 hover:bg-white/[0.02] hover:border-primary/40 transition-all group"
            >
              <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:text-primary transition-colors text-muted-foreground">
                <feat.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
