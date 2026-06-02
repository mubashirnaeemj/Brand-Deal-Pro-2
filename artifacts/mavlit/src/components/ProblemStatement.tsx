import { motion } from "framer-motion";

export default function ProblemStatement() {
  return (
    <section className="py-24 bg-black relative border-y border-white/5">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight">
              You're a creator. <br className="hidden md:block" />
              <span className="text-muted-foreground">Not a full-time salesperson.</span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12">
              Endless spreadsheets of generic contacts. Hours spent crafting cold DMs that get ignored. 
              PDF media kits that look exactly like everyone else's. The traditional sponsorship process 
              is broken, exhausting, and designed to make you fail.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: "95%", text: "of cold emails to brands go entirely unread." },
              { stat: "12 hrs", text: "spent weekly on outreach by independent creators." },
              { stat: "$0", text: "made when you get ghosted after a manual pitch." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 rounded-xl bg-white/5 border border-white/10 text-left"
              >
                <div className="text-3xl font-bold text-primary mb-2">{item.stat}</div>
                <div className="text-sm text-muted-foreground">{item.text}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
