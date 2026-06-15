import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Linkedin,
  Zap,
  DollarSign,
  Star,
  TrendingUp,
  Activity,
  CheckCircle2,
  Copy,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BRAND = {
  name: "Fender",
  category: "Musical Instruments",
  tagline: "The world's leading guitar manufacturer, shaping music culture since 1946.",
  description:
    "Fender Musical Instruments Corporation is the maker of iconic electric guitars, bass guitars, and amplifiers — Stratocaster, Telecaster, Jazz Bass, and more. With over 75 years at the heart of rock, blues, country, and indie music, Fender's brand resonates deeply with both aspiring and professional musicians. Their creator sponsorship program prioritizes authentic voices in the music community over follower count — they want real players who can demonstrate culture, not just product.",
  activityScore: 87,
  dealMin: 500,
  dealMax: 2000,
  dealNote: "Per sponsored post/video. Higher for long-term ambassador deals.",
  tags: ["Guitar", "Music Gear", "Artist Program", "Long-term Friendly"],
  contact: {
    email: "creators@fender.com",
    linkedin: "linkedin.com/company/fender",
    responseTime: "Typically responds in 2–5 business days",
  },
  highlights: [
    "Active Q3 creator campaign targeting music educators and performers",
    "Prefers 60-90 second organic demos over hard-sell formats",
    "Has partnered with 340+ independent creators in the last 12 months",
  ],
};

const REVIEWS = [
  {
    id: 1,
    author: "Jordan M.",
    handle: "@jordanplays",
    avatar: "JM",
    avatarColor: "#7c3aed",
    rating: 5,
    date: "May 2026",
    text: "Fender's team was incredibly collaborative. They gave me full creative control over the integration and paid within 10 days of posting. The deal was exactly in the quoted range — no surprises. Would work with them again without hesitation.",
    deal: "$1,400 flat fee",
  },
  {
    id: 2,
    author: "Priya R.",
    handle: "@priyabeats",
    avatar: "PR",
    avatarColor: "#ec4899",
    rating: 4,
    date: "March 2026",
    text: "Solid experience overall. The onboarding was a little slow — expect 2–3 weeks from first contact to signed contract. But once rolling, they're responsive and the brief is well-written. Good brand to have on your media kit.",
    deal: "$750 + product",
  },
  {
    id: 3,
    author: "Darius K.",
    handle: "@dkguitarist",
    avatar: "DK",
    avatarColor: "#0ea5e9",
    rating: 5,
    date: "January 2026",
    text: "Reached out via MAVLIT's outreach tool and heard back in 3 days. Fender is genuinely interested in micro-creators with engaged audiences — don't be intimidated by the brand name. The pitch deck I generated here got me the meeting.",
    deal: "$500 + ambassador kit",
  },
];

function ActivityGauge({ score }: { score: number }) {
  const label = score >= 85 ? "Very High" : score >= 65 ? "High" : score >= 45 ? "Moderate" : "Low";
  const labelColor = score >= 85 ? "#7c3aed" : score >= 65 ? "#0ea5e9" : score >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sponsorship Activity</span>
        <span className="text-sm font-bold" style={{ color: labelColor }}>
          {label}
        </span>
      </div>
      <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, hsl(262 83% 40%), hsl(262 83% 68%))` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Inactive</span>
        <span className="font-semibold text-white">{score}/100</span>
        <span>Very Active</span>
      </div>
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < rating ? "fill-amber-400 text-amber-400" : "text-border"}
        />
      ))}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={handleCopy}
      data-testid={`button-copy-${value}`}
      className="p-1.5 rounded-md text-muted-foreground hover:text-white hover:bg-secondary transition-all"
      title="Copy"
    >
      {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

export default function BrandDetail() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Back */}
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setLocation("/brand-matches")}
            data-testid="button-back"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Brand Matches
          </motion.button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left column ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Hero card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="bg-card border border-border rounded-2xl p-7"
              >
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-600/80 to-red-800/60 flex items-center justify-center shadow-lg shrink-0">
                    <span className="text-white font-black text-xl tracking-tight">F</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1
                        className="text-3xl font-extrabold text-white tracking-tight"
                        data-testid="text-brand-name"
                      >
                        {BRAND.name}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                        {BRAND.category}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">{BRAND.tagline}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {BRAND.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-xs font-medium rounded-md bg-secondary text-muted-foreground border border-border">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <p
                  className="text-sm text-muted-foreground leading-relaxed"
                  data-testid="text-brand-description"
                >
                  {BRAND.description}
                </p>

                <div className="h-px bg-border my-5" />

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    What Fender looks for
                  </p>
                  {BRAND.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{h}</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
                    These are general guidelines and campaign signals — not every point applies to every deal. Use them as context when crafting your pitch, not as requirements.
                  </p>
                </div>
              </motion.div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex"
              >
                <button
                  data-testid="button-generate-pitch"
                  onClick={() => setLocation("/pitch")}
                  className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Zap size={16} />
                  Create Pitch Email
                  <ChevronRight size={14} className="ml-1 opacity-60" />
                </button>
              </motion.div>

              {/* Reviews */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-card border border-border rounded-2xl p-7"
              >
                <div className="flex items-center gap-2 mb-6">
                  <MessageSquare size={16} className="text-primary" />
                  <h2 className="text-lg font-bold text-white">Creator Reviews</h2>
                  <span className="ml-auto text-xs text-muted-foreground">3 verified deals</span>
                </div>

                <div className="flex flex-col gap-5">
                  {REVIEWS.map((review, i) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.25 + i * 0.08 }}
                      data-testid={`card-review-${review.id}`}
                      className="flex gap-4"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${review.avatarColor}cc, ${review.avatarColor}66)` }}
                      >
                        {review.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold text-white">{review.author}</span>
                          <span className="text-xs text-muted-foreground">{review.handle}</span>
                          <StarRow rating={review.rating} />
                          <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{review.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{review.text}</p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                          <DollarSign size={11} />
                          {review.deal}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* ── Right sidebar ── */}
            <div className="flex flex-col gap-5">

              {/* Activity score */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Activity size={15} className="text-primary" />
                  <h3 className="text-sm font-bold text-white">Sponsorship Score</h3>
                </div>
                <ActivityGauge score={BRAND.activityScore} />
              </motion.div>

              {/* Contact bundle */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.19 }}
                className="bg-card border border-border rounded-2xl p-6"
                data-testid="card-contact"
              >
                <h3 className="text-sm font-bold text-white mb-4">Contact Bundle</h3>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
                    <Mail size={15} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                      <p
                        className="text-sm font-semibold text-white truncate"
                        data-testid="text-contact-email"
                      >
                        {BRAND.contact.email}
                      </p>
                    </div>
                    <CopyButton value={BRAND.contact.email} />
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
                    <Linkedin size={15} className="text-[#0a66c2] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">LinkedIn</p>
                      <p
                        className="text-sm font-semibold text-white truncate"
                        data-testid="text-contact-linkedin"
                      >
                        {BRAND.contact.linkedin}
                      </p>
                    </div>
                    <CopyButton value={BRAND.contact.linkedin} />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-green-400 shrink-0" />
                  {BRAND.contact.responseTime}
                </p>
              </motion.div>

              {/* Match quality */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.26 }}
                className="rounded-2xl p-5 border border-primary/30"
                style={{ background: "linear-gradient(135deg, hsl(262 83% 10%), hsl(262 83% 6%))" }}
              >
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">MAVLIT Score</p>
                <p className="text-4xl font-black text-white mb-1">93%</p>
                <p className="text-xs text-muted-foreground">Match confidence for your profile</p>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
