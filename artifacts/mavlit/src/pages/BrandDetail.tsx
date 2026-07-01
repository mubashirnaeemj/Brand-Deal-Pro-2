import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Mail, Linkedin, Zap, DollarSign, Star, TrendingUp,
  Activity, CheckCircle2, Copy, ChevronRight, MessageSquare,
  Headphones, Music, Cpu, Camera, ShoppingBag, Building2, Users,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Brand database ─────────────────────────────────────────────────────────────

type ContactType = "agency" | "in-house";

interface Review {
  id: number; author: string; handle: string; avatar: string; avatarColor: string;
  rating: number; date: string; text: string; deal: string;
}

type SignalLevel = "Strong" | "Moderate" | "Limited" | "Unknown";

interface PlatformSignal {
  level: SignalLevel;
  note?: string;
}

interface BrandData {
  name: string; category: string; tagline: string; description: string;
  Icon: React.ElementType; color: string; iconBg: string;
  activityScore: number; matchScore: number;
  dealMin: number; dealMax: number; dealNote: string;
  tags: string[];
  highlights: string[];
  highlightsLabel: string;
  contactType: ContactType;
  contact: { email: string; linkedin: string; responseTime: string; verifiedAt?: string };
  reviews: Review[];
  platformSignals: { instagram: PlatformSignal; tiktok: PlatformSignal; youtube: PlatformSignal };
}

const BRANDS: Record<string, BrandData> = {
  sennheiser: {
    name: "Sennheiser",
    category: "Audio",
    tagline: "The global leader in professional audio, trusted by creators and studios for 75 years.",
    description:
      "Sennheiser is one of the world's most respected names in professional audio — microphones, headphones, and wireless systems used by broadcasters, musicians, and podcast producers globally. Their creator partnership program focuses on authentic voices in the music and production space. They don't want influencers who happen to make music — they want music makers who have built genuine audiences. Campaigns run through agency partner Edelman and are planned on a quarterly basis.",
    Icon: Headphones, color: "#7c3aed", iconBg: "from-violet-600/80 to-violet-900/60",
    activityScore: 87, matchScore: 97,
    dealMin: 600, dealMax: 2500,
    dealNote: "Per sponsored video or integration. Rate scales with deliverables and exclusivity window.",
    tags: ["Studio Gear", "Pro Audio", "Long-term Friendly", "Agency Campaign"],
    highlightsLabel: "What Sennheiser looks for",
    highlights: [
      "Creators whose content naturally features audio gear — reviews, tutorials, or studio workflow videos.",
      "Audiences in the 18–34 producer/engineer demographic with demonstrated purchase intent.",
      "Authentic product stories over scripted ad reads — they want creators who have used the gear.",
    ],
    contactType: "agency",
    contact: {
      email: "sarah.chen@edelman.com",
      linkedin: "linkedin.com/in/sarah-chen-edelman",
      responseTime: "Typically responds in 3–7 business days via Edelman",
      verifiedAt: "Jun 12, 2026",
    },
    platformSignals: {
      youtube:   { level: "Strong" },
      instagram: { level: "Moderate" },
      tiktok:    { level: "Limited", note: "TikTok campaign data is based on limited public sources — Instagram signal is more reliable for this brand." },
    },
    reviews: [
      {
        id: 1, author: "Jordan M.", handle: "@jordanproduces", avatar: "JM", avatarColor: "#7c3aed",
        rating: 5, date: "May 2026",
        text: "Sennheiser's team gave me full creative control. I tested the HD 660S in my studio and the video felt completely natural — no hard sell. Payment came 12 days after posting. Would work with them again immediately.",
        deal: "$1,500 flat fee",
      },
      {
        id: 2, author: "Priya R.", handle: "@priyabeats", avatar: "PR", avatarColor: "#ec4899",
        rating: 4, date: "Feb 2026",
        text: "Solid deal, slight delay on contract approval through Edelman (about 2 weeks). Once that was done, the execution was smooth and the brief was reasonable. Good brand credibility for my media kit.",
        deal: "$800 + gear bundle",
      },
      {
        id: 3, author: "Chris V.", handle: "@chrisaudiolab", avatar: "CV", avatarColor: "#0ea5e9",
        rating: 5, date: "Nov 2025",
        text: "Pitched via MAVLIT, heard back from Sarah at Edelman within 4 days. They were very clear about what they wanted and the exclusivity window was reasonable (60 days, audio category only).",
        deal: "$1,200 + product",
      },
    ],
  },

  spotify: {
    name: "Spotify for Artists",
    category: "Streaming",
    tagline: "The world's largest music streaming platform, empowering creators to connect with fans at scale.",
    description:
      "Spotify for Artists runs in-house creator campaigns designed to grow platform usage and music discovery among younger audiences. They particularly look for music education, production breakdown, and 'what I'm listening to' style content. Their internal partnerships team — not an agency — manages all creator relationships directly, which typically means faster communication, faster payment, and more flexibility in creative briefs.",
    Icon: Music, color: "#1db954", iconBg: "from-green-600/80 to-green-900/60",
    activityScore: 92, matchScore: 94,
    dealMin: 400, dealMax: 1800,
    dealNote: "Per campaign post or video integration. Rates include Spotify premium promotion of the content.",
    tags: ["Streaming", "Music Culture", "Creator Program", "In-house Team"],
    highlightsLabel: "What Spotify for Artists looks for",
    highlights: [
      "Music creators with audiences who stream regularly — ideally 18–34 core demographic.",
      "Educational or discovery-led content formats: production walkthroughs, playlist deep-dives, listening sessions.",
      "Creators who speak authentically to both the creative and business side of the music industry.",
    ],
    contactType: "in-house",
    contact: {
      email: "m.williams@spotify.com",
      linkedin: "linkedin.com/in/marcus-williams-spotify",
      responseTime: "Typically responds in 2–4 business days",
      verifiedAt: "Jun 20, 2026",
    },
    platformSignals: {
      instagram: { level: "Strong" },
      tiktok:    { level: "Strong" },
      youtube:   { level: "Moderate" },
    },
    reviews: [
      {
        id: 1, author: "Layla H.", handle: "@laylamakes", avatar: "LH", avatarColor: "#1db954",
        rating: 5, date: "Apr 2026",
        text: "Super collaborative in-house team. They let me frame the integration as a 'what I'm listening to while producing' segment — felt completely natural. Paid NET 15. Will definitely work with them again.",
        deal: "$950 flat fee",
      },
      {
        id: 2, author: "Omar S.", handle: "@omarsounds", avatar: "OS", avatarColor: "#f59e0b",
        rating: 4, date: "Jan 2026",
        text: "Good experience overall. Marcus's team was responsive and the brief was light — they really wanted creator-led content, not a scripted ad. Payment was prompt. Would do a second campaign.",
        deal: "$600 + Artist account perks",
      },
    ],
  },

  "native-instruments": {
    name: "Native Instruments",
    category: "Software",
    tagline: "The definitive platform for music production software and hardware, powering studios worldwide.",
    description:
      "Native Instruments makes the software and hardware that producers rely on — Komplete, Maschine, Traktor, and more. Their creator campaigns run through agency Fleishman Hillard and target tutorial-style creators who can demonstrate real workflow integration. They are particularly active around product launches and back-to-school season (Aug–Oct). NI values long-form content where the product is central to the workflow, not a brief mention.",
    Icon: Cpu, color: "#f59e0b", iconBg: "from-amber-500/80 to-amber-800/60",
    activityScore: 82, matchScore: 91,
    dealMin: 500, dealMax: 2200,
    dealNote: "Per video integration or dedicated review. Higher rates for longer exclusivity and bundle campaigns.",
    tags: ["Music Software", "Hardware", "Tutorial Friendly", "Agency Campaign"],
    highlightsLabel: "What Native Instruments looks for",
    highlights: [
      "Tutorial and workflow content where NI software or hardware plays a core role — not a side mention.",
      "Producer audiences skewed toward beatmakers, sound designers, and home studio owners.",
      "Creators with average view duration above 7 minutes — their product integrations require time to land.",
    ],
    contactType: "agency",
    contact: {
      email: "p.sharma@fleishman.com",
      linkedin: "linkedin.com/in/priya-sharma-fleishman",
      responseTime: "Typically responds in 4–8 business days via Fleishman Hillard",
      verifiedAt: "Jun 8, 2026",
    },
    platformSignals: {
      youtube:   { level: "Strong" },
      instagram: { level: "Moderate" },
      tiktok:    { level: "Limited", note: "TikTok campaign data is based on limited public sources — Instagram signal is more reliable for this brand." },
    },
    reviews: [
      {
        id: 1, author: "Darius K.", handle: "@dkbeats", avatar: "DK", avatarColor: "#f59e0b",
        rating: 5, date: "Mar 2026",
        text: "Built a full Maschine workflow video and NI loved it. They gave detailed notes upfront so there were no revision surprises. Paid on time, and the product bundle they sent was genuinely useful.",
        deal: "$1,800 + software license",
      },
      {
        id: 2, author: "Tanya B.", handle: "@tanyasynth", avatar: "TB", avatarColor: "#7c3aed",
        rating: 4, date: "Dec 2025",
        text: "Agency process means slightly slower approvals — expect 2–3 weeks from pitch to contract. But the brief was well-written and they understood my content style. Good mid-level deal.",
        deal: "$900 flat fee",
      },
    ],
  },

  gopro: {
    name: "GoPro",
    category: "Lifestyle",
    tagline: "The world's most versatile action camera, built for creators who live and perform beyond the studio.",
    description:
      "GoPro's creator program focuses on authentic documentation of real experiences — performances, studio sessions, live events, and behind-the-scenes content. Their in-house partnerships team is led by influencer marketing and actively recruits from music, dance, and performance niches. GoPro looks for POV-style storytelling rather than traditional product reviews. They have an ambassador tier program for long-term relationships.",
    Icon: Camera, color: "#0ea5e9", iconBg: "from-sky-500/80 to-sky-900/60",
    activityScore: 78, matchScore: 88,
    dealMin: 400, dealMax: 1500,
    dealNote: "Per post/video plus performance bonuses for ambassador tier creators.",
    tags: ["Lifestyle", "Action Camera", "Creator Ambassador", "In-house Team"],
    highlightsLabel: "What GoPro looks for",
    highlights: [
      "Live performance, studio BTS, or on-the-road content where a POV camera narrative fits naturally.",
      "Engagement-heavy creators — their internal benchmark is 4× the platform average engagement rate.",
      "Creators open to longer-term ambassador relationships, not just one-off sponsored posts.",
    ],
    contactType: "in-house",
    contact: {
      email: "j.torres@gopro.com",
      linkedin: "linkedin.com/in/jake-torres-gopro",
      responseTime: "Typically responds in 2–5 business days",
      verifiedAt: "Jun 15, 2026",
    },
    platformSignals: {
      youtube:   { level: "Strong" },
      instagram: { level: "Strong" },
      tiktok:    { level: "Moderate" },
    },
    reviews: [
      {
        id: 1, author: "Nico M.", handle: "@nicoonstage", avatar: "NM", avatarColor: "#0ea5e9",
        rating: 4, date: "Apr 2026",
        text: "Great experience for a performance-heavy creator. Jake's team let me film my live set POV style and it felt completely authentic. They promoted the video on GoPro's channels too, which was a nice bonus.",
        deal: "$750 + camera hardware",
      },
      {
        id: 2, author: "Sam W.", handle: "@samwbeats", avatar: "SW", avatarColor: "#ef4444",
        rating: 4, date: "Feb 2026",
        text: "In-house team means faster decisions than agency deals. Turnaround from pitch to contract was under 10 days. Creative brief was minimal — they trusted me to tell the story.",
        deal: "$600 flat fee",
      },
    ],
  },

  sweetwater: {
    name: "Sweetwater",
    category: "Retail",
    tagline: "America's #1 music technology retailer, trusted by serious musicians and home studio builders.",
    description:
      "Sweetwater is the largest music technology retailer in the United States, built on relationships with musicians, engineers, and producers. Their creator partnership program is in-house and focuses heavily on affiliate-driven content with performance incentives. Gear review and 'what's in my studio' formats perform particularly well with their campaigns. Sweetwater's comment sections are full of purchase-intent buyers — they know which audiences convert.",
    Icon: ShoppingBag, color: "#ec4899", iconBg: "from-pink-500/80 to-pink-900/60",
    activityScore: 84, matchScore: 85,
    dealMin: 300, dealMax: 1200,
    dealNote: "Base flat fee + affiliate commission on driven sales. Top creators earn significantly above base.",
    tags: ["Gear Retail", "Affiliate Friendly", "Audio Gear", "In-house Team"],
    highlightsLabel: "What Sweetwater looks for",
    highlights: [
      "Gear review, studio setup, and 'what I use in my studio' content formats where product links convert.",
      "Audiences with high purchase intent — active musicians and home studio builders, not casual listeners.",
      "Creators with engaged comment sections where followers ask gear questions — Sweetwater tracks this.",
    ],
    contactType: "in-house",
    contact: {
      email: "d.kim@sweetwater.com",
      linkedin: "linkedin.com/in/dana-kim-sweetwater",
      responseTime: "Typically responds in 2–4 business days",
      verifiedAt: "Jun 18, 2026",
    },
    platformSignals: {
      youtube:   { level: "Strong" },
      instagram: { level: "Moderate" },
      tiktok:    { level: "Limited", note: "TikTok campaign data is based on limited public sources — Instagram signal is more reliable for this brand." },
    },
    reviews: [
      {
        id: 1, author: "Maya P.", handle: "@mayaproducesbeats", avatar: "MP", avatarColor: "#ec4899",
        rating: 5, date: "May 2026",
        text: "Sweetwater's affiliate structure is genuinely good for gear reviewers. The flat fee was modest but the affiliate commissions doubled my total earnings. Dana's team is professional and fast.",
        deal: "$500 base + $820 affiliate",
      },
      {
        id: 2, author: "Reza T.", handle: "@rezaaudio", avatar: "RT", avatarColor: "#0ea5e9",
        rating: 4, date: "Jan 2026",
        text: "Easy deal to execute. They sent the gear, I reviewed it honestly, they paid within a week. No drama, no excessive revision requests. Perfect for a straightforward gear review format.",
        deal: "$400 + gear to keep",
      },
    ],
  },

  "red-bull": {
    name: "Red Bull",
    category: "Beverage",
    tagline: "Red Bull gives wings to music artists and the creators who document cultural moments.",
    description:
      "Red Bull's music sponsorship program is one of the most visible in the industry — Red Bull Music Academy, studio sessions, live events, and creator campaigns are all part of a well-funded content strategy. Their campaigns run through agency Edelman and focus on music-lifestyle content at the intersection of creative process and performance culture. Budget-wise, Red Bull plays above the average for this category. They are selective but move quickly once interested.",
    Icon: Zap, color: "#ef4444", iconBg: "from-red-600/80 to-red-900/60",
    activityScore: 76, matchScore: 81,
    dealMin: 700, dealMax: 3500,
    dealNote: "Per campaign asset or event partnership. Higher for multi-deliverable campaigns and exclusivity.",
    tags: ["Beverage", "Music Culture", "High Budget", "Agency Campaign"],
    highlightsLabel: "What Red Bull looks for",
    highlights: [
      "Music-lifestyle content at the intersection of creative process and performance — studio and stage both work.",
      "Creators whose audiences are deeply engaged with music culture, not just casual fans.",
      "A genuine perspective and authentic voice — Red Bull Music's brand is culture-driven, not product-driven.",
    ],
    contactType: "agency",
    contact: {
      email: "a.rivera@edelman.com",
      linkedin: "linkedin.com/in/alex-rivera-edelman",
      responseTime: "Typically responds in 5–10 business days via Edelman",
      verifiedAt: "May 29, 2026",
    },
    platformSignals: {
      instagram: { level: "Strong" },
      youtube:   { level: "Strong" },
      tiktok:    { level: "Moderate" },
    },
    reviews: [
      {
        id: 1, author: "Kenji O.", handle: "@kenjionkeys", avatar: "KO", avatarColor: "#ef4444",
        rating: 5, date: "Mar 2026",
        text: "This was my biggest brand deal to date. Alex at Edelman was professional throughout and the brief gave me real creative latitude. Red Bull promoted the content on their channels to 2M+ followers.",
        deal: "$2,800 flat fee",
      },
      {
        id: 2, author: "Alicia M.", handle: "@aliciabeats", avatar: "AM", avatarColor: "#f59e0b",
        rating: 4, date: "Oct 2025",
        text: "Longer approval chain than in-house deals — budget 3 weeks. But Red Bull's brand association is worth it for your portfolio. They're selective, which means being chosen carries real credibility.",
        deal: "$1,400 + event ticket package",
      },
    ],
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function ActivityGauge({ score }: { score: number }) {
  const label = score >= 85 ? "Very High" : score >= 65 ? "High" : score >= 45 ? "Moderate" : "Low";
  const labelColor = score >= 85 ? "#7c3aed" : score >= 65 ? "#0ea5e9" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sponsorship Activity</span>
        <span className="text-sm font-bold" style={{ color: labelColor }}>{label}</span>
      </div>
      <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: "linear-gradient(90deg, hsl(262 83% 40%), hsl(262 83% 68%))" }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Inactive</span>
        <span className="font-semibold text-white">{score}/100</span>
        <span>Very Active</span>
      </div>
    </div>
  );
}

function PlatformSignalBreakdown({ signals }: { signals: BrandData["platformSignals"] }) {
  const rows: { label: string; key: keyof typeof signals }[] = [
    { label: "Instagram", key: "instagram" },
    { label: "TikTok",    key: "tiktok"    },
    { label: "YouTube",   key: "youtube"   },
  ];

  const badge: Record<SignalLevel, { text: string; cls: string }> = {
    Strong:   { text: "Strong",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
    Moderate: { text: "Moderate", cls: "bg-amber-500/15 text-amber-400 border-amber-500/25"       },
    Limited:  { text: "Limited",  cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"          },
    Unknown:  { text: "Unknown",  cls: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"          },
  };

  const limitedRows = rows.filter(r => signals[r.key].level === "Limited" && signals[r.key].note);

  return (
    <div className="mt-5 pt-4 border-t border-border">
      <p className="text-xs font-bold text-white mb-3">Platform Signal</p>
      <div className="flex flex-col gap-2">
        {rows.map(({ label, key }) => {
          const { level } = signals[key];
          const b = badge[level];
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${b.cls}`}>
                {b.text}
              </span>
            </div>
          );
        })}
      </div>
      {limitedRows.map(({ key, label }) => (
        <p key={key} className="mt-3 text-xs text-muted-foreground/70 leading-relaxed">
          <span className="font-semibold text-muted-foreground">{label}:</span>{" "}
          {signals[key].note}
        </p>
      ))}
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} className={i < rating ? "fill-amber-400 text-amber-400" : "text-border"} />
      ))}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="p-1.5 rounded-md text-muted-foreground hover:text-white hover:bg-secondary transition-all" title="Copy">
      {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BrandDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ slug: string }>();
  const brand = BRANDS[params.slug ?? ""];

  if (!brand) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-28 px-4">
          <div className="text-center space-y-4">
            <p className="text-2xl font-bold text-white">Brand not found</p>
            <p className="text-muted-foreground text-sm">That brand page doesn't exist.</p>
            <button onClick={() => setLocation("/brand-matches")}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 mx-auto transition-colors">
              <ArrowLeft size={14} /> Back to Brand Matches
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = brand.Icon;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Back */}
          <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            onClick={() => setLocation("/brand-matches")} data-testid="button-back"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white mb-8 transition-colors group">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Brand Matches
          </motion.button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left column ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Hero card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
                className="bg-card border border-border rounded-2xl p-7">
                <div className="flex items-start gap-5 mb-6">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${brand.iconBg} flex items-center justify-center shadow-lg shrink-0`}>
                    <Icon size={28} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-3xl font-extrabold text-white tracking-tight" data-testid="text-brand-name">
                        {brand.name}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                        {brand.category}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">{brand.tagline}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {brand.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-xs font-medium rounded-md bg-secondary text-muted-foreground border border-border">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-brand-description">
                  {brand.description}
                </p>

                <div className="h-px bg-border my-5" />

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {brand.highlightsLabel}
                  </p>
                  {brand.highlights.map((h, i) => (
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

              {/* Action button */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex">
                <button data-testid="button-generate-pitch"
                  onClick={() => setLocation(`/pitch?brand=${encodeURIComponent(brand.name)}`)}
                  className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 hover:-translate-y-0.5 active:translate-y-0">
                  <Zap size={16} />
                  Create Pitch Email
                  <ChevronRight size={14} className="ml-1 opacity-60" />
                </button>
              </motion.div>

              {/* Reviews */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-card border border-border rounded-2xl p-7">
                <div className="flex items-center gap-2 mb-6">
                  <MessageSquare size={16} className="text-primary" />
                  <h2 className="text-lg font-bold text-white">Creator Reviews</h2>
                  <span className="ml-auto text-xs text-muted-foreground">{brand.reviews.length} verified deals</span>
                </div>
                <div className="flex flex-col gap-5">
                  {brand.reviews.map((review, i) => (
                    <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.25 + i * 0.08 }} data-testid={`card-review-${review.id}`} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${review.avatarColor}cc, ${review.avatarColor}66)` }}>
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
                          <DollarSign size={11} />{review.deal}
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
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.05 }}
                className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Activity size={15} className="text-primary" />
                  <h3 className="text-sm font-bold text-white">Sponsorship Score</h3>
                </div>
                <ActivityGauge score={brand.activityScore} />
                <PlatformSignalBreakdown signals={brand.platformSignals} />
              </motion.div>

              {/* Deal range */}
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.12 }}
                className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={15} className="text-primary" />
                  <h3 className="text-sm font-bold text-white">Deal Range</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-extrabold text-white">${brand.dealMin.toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm">–</span>
                  <span className="text-2xl font-extrabold text-white">${brand.dealMax.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{brand.dealNote}</p>
                <p className="text-xs text-muted-foreground/50 leading-relaxed mt-2">
                  Observed range based on reported deals — not a guaranteed rate. Varies significantly by deliverables, exclusivity terms, and negotiation.
                </p>
              </motion.div>

              {/* Contact bundle */}
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.19 }}
                className="bg-card border border-border rounded-2xl p-6" data-testid="card-contact">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Contact Bundle</h3>
                  {brand.contactType === "agency"
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30"><Building2 size={10} />Agency-side</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><Users size={10} />In-house</span>
                  }
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
                    <Mail size={15} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                      <p className="text-sm font-semibold text-white truncate" data-testid="text-contact-email">{brand.contact.email}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {brand.contact.verifiedAt ? `Last verified: ${brand.contact.verifiedAt}` : "Verification pending"}
                      </p>
                    </div>
                    <CopyButton value={brand.contact.email} />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
                    <Linkedin size={15} className="text-[#0a66c2] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">LinkedIn</p>
                      <p className="text-sm font-semibold text-white truncate" data-testid="text-contact-linkedin">{brand.contact.linkedin}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {brand.contact.verifiedAt ? `Last verified: ${brand.contact.verifiedAt}` : "Verification pending"}
                      </p>
                    </div>
                    <CopyButton value={brand.contact.linkedin} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-green-400 shrink-0" />
                  {brand.contact.responseTime}
                </p>
              </motion.div>

              {/* Pitch CTA */}
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.24 }}>
                <button
                  data-testid="button-pitch-sidebar"
                  onClick={() => setLocation(`/pitch?brand=${encodeURIComponent(brand.name)}`)}
                  className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 flex items-center justify-center gap-2"
                >
                  <Zap size={15} />
                  Pitch this brand →
                </button>
              </motion.div>

              {/* MAVLIT score */}
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.26 }}
                className="rounded-2xl p-5 border border-primary/30"
                style={{ background: "linear-gradient(135deg, hsl(262 83% 10%), hsl(262 83% 6%))" }}>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">MAVLIT Score</p>
                <p className="text-4xl font-black text-white mb-1">{brand.matchScore}%</p>
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
