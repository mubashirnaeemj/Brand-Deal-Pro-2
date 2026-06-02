import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  CheckCircle2,
  Mail,
  Lightbulb,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AtSign,
  AlignLeft,
} from "lucide-react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Template variants ────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "direct",
    label: "Direct & Confident",
    subject: "Creator Partnership Inquiry — [Your Name] × Fender",
    body: `Hi Fender Partnerships Team,

My name is [Your Name] — I'm a music creator in the guitar and production space with [X]K followers across Instagram, TikTok, YouTube, and Facebook, and an average engagement rate of [X]%.

I've been playing Fender guitars for [X] years and my audience is made up of exactly the people you want to reach: aspiring and working musicians aged 18–34 who actively research gear before buying. Three of my last five videos featured gear reviews, generating a combined [X]K views and dozens of purchase-intent comments.

I'd love to explore a sponsored integration — a natural product demo or playthrough that fits my existing content style. My rates are competitive and I'm open to discussing a longer-term ambassador arrangement if there's mutual fit.

I've attached a MAVLIT-generated pitch deck with my full audience stats, platform breakdown, and a proposed deal structure for your review.

Would you have 20 minutes this week or next to connect?

Best,
[Your Name]
[Your Handle] | [Your Primary Platform Link]`,
  },
  {
    id: "story",
    label: "Story-Led",
    subject: "I've been waiting to pitch this to you — [Your Name] + Fender",
    body: `Hi Fender Team,

I picked up my first Stratocaster at 16. It changed everything. Now I make content about that exact feeling for [X]K people who are chasing the same thing.

My name is [Your Name] and I create guitar and music production content across Instagram, TikTok, YouTube, and Facebook. My audience skews 18–34, heavily male, and concentrated in the US and UK — the same markets where Fender moves product.

What I'm not is a paid promoter who happens to hold up a guitar. My channel exists because I genuinely love this instrument. That's the kind of sponsorship that converts for gear brands — and I have the engagement data to back it up ([X]% average, well above the platform norm).

I'd love to put together something real together. Attached is my full pitch deck with stats, audience breakdown, and a proposed structure.

Open to a quick call whenever works for you.

[Your Name]
[Your Handle]`,
  },
  {
    id: "brief",
    label: "Short & Sharp",
    subject: "Sponsorship Inquiry — [Your Name], Music Creator",
    body: `Hi,

Quick pitch: I'm [Your Name], a music/guitar creator with [X]K combined followers and [X]% avg engagement. My audience is 18–34 musicians — Fender's core buyer.

I'd love to discuss a sponsored integration. Attached is a full pitch deck with platform stats and a proposed deal.

Open to a call this week if you're interested.

[Your Name]
[Your Handle] | [Platform Link]`,
  },
];

const TIPS = [
  {
    heading: "Personalize the brackets",
    body: "Every [Your Name], [X]K, and [Platform Link] needs to be replaced with real data before you hit send. Brands can tell immediately when a template hasn't been customized.",
  },
  {
    heading: "Attach your pitch deck",
    body: "Reference it in the email and actually attach the PDF export. A pitch deck link shows you're serious — it saves the brand from having to ask for your stats.",
  },
  {
    heading: "Send to the right person",
    body: "creators@fender.com routes to their partnerships team. If you can find a specific contact on LinkedIn, address them by name — open rates jump significantly.",
  },
  {
    heading: "Follow up once",
    body: "If you don't hear back in 7–10 days, send one follow-up. Keep it short: two sentences referencing your original email. After that, move on.",
  },
  {
    heading: "Timing matters",
    body: "Tuesday–Thursday mornings (9–11am recipient time) consistently produce the highest open rates for cold outreach. Avoid Mondays and Fridays.",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function useCopy(value: string, timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), timeout);
  };
  return { copied, copy };
}

function CopyBtn({
  value,
  label,
  testId,
  variant = "outline",
}: {
  value: string;
  label: string;
  testId: string;
  variant?: "outline" | "primary";
}) {
  const { copied, copy } = useCopy(value);
  return (
    <button
      data-testid={testId}
      onClick={copy}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        variant === "primary"
          ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/30"
          : "border border-border bg-card hover:border-primary/50 hover:bg-secondary text-white"
      }`}
    >
      {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function OutreachEmail() {
  const [, setLocation] = useLocation();
  const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0]);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [openTip, setOpenTip] = useState<number | null>(0);
  const [switching, setSwitching] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const charCount = body.length;

  const switchTemplate = (t: (typeof TEMPLATES)[0]) => {
    if (t.id === activeTemplate.id) return;
    setSwitching(true);
    setTimeout(() => {
      setActiveTemplate(t);
      setSubject(t.subject);
      setBody(t.body);
      setSwitching(false);
    }, 180);
  };

  const fullEmail = `Subject: ${subject}\n\n${body}`;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Back */}
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setLocation("/brands/fender")}
            data-testid="button-back"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Fender
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Outreach Email Composer
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
              Draft Your Fender Outreach
            </h1>
            <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
              Choose a tone, customize the template with your real stats, then copy it straight into your email client. Replace every{" "}
              <code className="px-1.5 py-0.5 rounded bg-secondary text-primary text-sm font-mono">
                [bracket]
              </code>{" "}
              before sending.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left: composer ── */}
            <div className="lg:col-span-2 flex flex-col gap-5">

              {/* Template selector */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <RefreshCw size={14} className="text-primary" />
                  <span className="text-sm font-bold text-white">Choose a tone</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      data-testid={`button-template-${t.id}`}
                      onClick={() => switchTemplate(t)}
                      className={`px-4 py-3 rounded-xl text-sm font-semibold text-left border transition-all ${
                        activeTemplate.id === t.id
                          ? "bg-primary/15 border-primary/60 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Email editor */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                {/* To row */}
                <div className="flex items-center gap-3 px-6 py-3.5 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground w-12 shrink-0 uppercase tracking-wider">To</span>
                  <div className="flex items-center gap-2 flex-1">
                    <AtSign size={13} className="text-muted-foreground" />
                    <span
                      className="text-sm text-white font-medium"
                      data-testid="text-recipient-email"
                    >
                      creators@fender.com
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block">Fender Partnerships</span>
                </div>

                {/* Subject row */}
                <div className="flex items-center gap-3 px-6 py-3.5 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground w-12 shrink-0 uppercase tracking-wider">Subject</span>
                  <input
                    data-testid="input-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none font-medium"
                    placeholder="Email subject..."
                  />
                </div>

                {/* Body */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTemplate.id}
                    initial={{ opacity: switching ? 0 : 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <textarea
                      ref={bodyRef}
                      data-testid="textarea-body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={20}
                      className="w-full px-6 py-5 bg-transparent text-sm text-muted-foreground leading-relaxed focus:outline-none resize-none font-mono focus:text-white transition-colors"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Footer bar */}
                <div className="flex items-center gap-4 px-6 py-3 border-t border-border bg-secondary/30">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <AlignLeft size={12} />
                    <span>{wordCount} words · {charCount} chars</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <CopyBtn value={subject} label="Copy Subject" testId="button-copy-subject" />
                    <CopyBtn
                      value={fullEmail}
                      label="Copy Full Email"
                      testId="button-copy-full"
                      variant="primary"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Open in client */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.18 }}
              >
                <a
                  data-testid="link-open-gmail"
                  href={`mailto:creators@fender.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-secondary text-sm font-semibold text-muted-foreground hover:text-white transition-all"
                >
                  <Mail size={15} />
                  Open in Email Client
                  <ExternalLink size={12} className="opacity-50 ml-0.5" />
                </a>
              </motion.div>
            </div>

            {/* ── Right: tips ── */}
            <div className="flex flex-col gap-5">

              {/* Sending to card */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <h3 className="text-sm font-bold text-white mb-4">Sending to</h3>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600/80 to-red-800/60 flex items-center justify-center text-white font-black shrink-0">
                    F
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Fender</p>
                    <p className="text-xs text-muted-foreground">creators@fender.com</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-green-400 shrink-0" />
                  Typically responds in 2–5 business days
                </p>
              </motion.div>

              {/* Tips accordion */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.14 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <Lightbulb size={14} className="text-amber-400" />
                  <span className="text-sm font-bold text-white">Outreach Tips</span>
                </div>
                <div className="flex flex-col divide-y divide-border">
                  {TIPS.map((tip, i) => (
                    <div key={i} className="px-5">
                      <button
                        data-testid={`button-tip-${i}`}
                        onClick={() => setOpenTip(openTip === i ? null : i)}
                        className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
                      >
                        <span className="text-sm font-semibold text-white">{tip.heading}</span>
                        {openTip === i
                          ? <ChevronUp size={14} className="text-muted-foreground shrink-0" />
                          : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                      </button>
                      <AnimatePresence>
                        {openTip === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-muted-foreground leading-relaxed pb-4">
                              {tip.body}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Checklist */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.22 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <h3 className="text-sm font-bold text-white mb-4">Before you send</h3>
                <div className="flex flex-col gap-2.5">
                  {[
                    "Replaced all [brackets] with real info",
                    "Attached your pitch deck PDF",
                    "Double-checked follower and engagement numbers",
                    "Confirmed the recipient email address",
                    "Scheduled for Tuesday–Thursday morning",
                  ].map((item, i) => (
                    <ChecklistItem key={i} label={item} />
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ChecklistItem({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <button
      onClick={() => setChecked((c) => !c)}
      className="flex items-start gap-2.5 text-left group"
    >
      <div
        className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-all ${
          checked
            ? "bg-primary border-primary"
            : "border-border group-hover:border-primary/50"
        }`}
      >
        {checked && <CheckCircle2 size={10} className="text-white" />}
      </div>
      <span
        className={`text-sm transition-colors ${
          checked ? "line-through text-muted-foreground/50" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
