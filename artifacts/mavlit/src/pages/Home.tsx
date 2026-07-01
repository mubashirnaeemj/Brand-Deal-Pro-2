import { useState, useRef } from "react";

const ACCENT = "#7c3aed";
const BG = "#0a0a0f";
const SUBTEXT = "#8080a0";

function scrollToSignup() {
  document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth" });
}

// ── Navbar ─────────────────────────────────────────────────────────────────────

function HomeNav() {
  return (
    <nav
      style={{ background: BG, borderBottom: "1px solid #ffffff10" }}
      className="sticky top-0 z-50 w-full"
    >
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            style={{ background: ACCENT }}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 12L7 2L12 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 8.5H10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-white font-extrabold text-lg tracking-tight">MAVLIT</span>
        </div>
        <button
          onClick={scrollToSignup}
          style={{ background: ACCENT }}
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Get early access →
        </button>
      </div>
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      style={{ background: BG }}
      className="pt-24 pb-20 px-6 text-center"
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-white font-extrabold text-5xl sm:text-6xl leading-tight tracking-tight mb-6">
          Find the brand deals you deserve —<br className="hidden sm:block" /> without the guesswork.
        </h1>
        <p style={{ color: SUBTEXT }} className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
          MAVLIT matches you with brands that actually pay, shows you the verified contact to reach, and helps you write a pitch that gets read. Quality over volume. Built for creators who mean business.
        </p>
        <button
          onClick={scrollToSignup}
          style={{ background: ACCENT }}
          className="px-8 py-4 rounded-xl text-white text-base font-bold hover:opacity-90 transition-opacity mb-4"
        >
          Get early access →
        </button>
        <p style={{ color: SUBTEXT }} className="text-sm">
          For creators in the US and Canada. Free to join the early access list.
        </p>
      </div>
    </section>
  );
}

// ── The Problem ────────────────────────────────────────────────────────────────

function Problem() {
  const cols = [
    {
      title: "You can't find the right contact.",
      body: "Brands hide behind info@ inboxes and agency partners. You waste hours guessing who to email — and usually guess wrong.",
    },
    {
      title: "You don't know who's actually spending.",
      body: "Some brands run active creator campaigns. Most don't. There's no way to tell from the outside — until now.",
    },
    {
      title: "You're guessing at everything else.",
      body: "What to charge. What to say. What to watch for in the contract. Most creators fly blind and leave money on the table.",
    },
  ];

  return (
    <section style={{ background: "#0d0d14" }} className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <p style={{ color: ACCENT }} className="text-sm font-bold uppercase tracking-widest mb-4 text-center">
          The Problem
        </p>
        <h2 className="text-white font-extrabold text-3xl sm:text-4xl text-center mb-4 leading-tight">
          You're a creator.<br />Not a full-time salesperson.
        </h2>
        <p style={{ color: SUBTEXT }} className="text-center text-lg max-w-2xl mx-auto mb-14 leading-relaxed">
          Endless spreadsheets of generic contacts. Hours crafting cold DMs that get ignored. No idea which brands are actually spending or who to even email. The sponsorship process is broken — and built to make independent creators give up.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {cols.map((c) => (
            <div
              key={c.title}
              style={{ background: "#13131e", border: "1px solid #ffffff10" }}
              className="rounded-2xl p-6"
            >
              <h3 className="text-white font-bold text-base mb-3 leading-snug">{c.title}</h3>
              <p style={{ color: SUBTEXT }} className="text-sm leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ───────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Get matched with brands that pay.",
      body: "MAVLIT shows you brands actively running creator campaigns in your niche — with the signal data to prove it and the verified contact to reach.",
    },
    {
      n: "2",
      title: "Build a pitch that gets read.",
      body: "Create a personalized, story-driven pitch email in minutes. No templates. No spray-and-pray. The kind of pitch that actually gets a reply.",
    },
    {
      n: "3",
      title: "Manage the whole deal.",
      body: "Track every pitch, get help with follow-ups, see real rate ranges, and know what to check before you sign — all in one place.",
    },
  ];

  return (
    <section style={{ background: BG }} className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <p style={{ color: ACCENT }} className="text-sm font-bold uppercase tracking-widest mb-4 text-center">
          How It Works
        </p>
        <h2 className="text-white font-extrabold text-3xl sm:text-4xl text-center mb-14 leading-tight">
          From "I want a brand deal"<br />to "I got a reply."
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.n} className="flex flex-col gap-4">
              <div
                style={{ background: "#7c3aed18", border: "1px solid #7c3aed30" }}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
              >
                <span style={{ color: ACCENT }} className="font-extrabold text-base">{s.n}</span>
              </div>
              <h3 className="text-white font-bold text-base leading-snug">{s.title}</h3>
              <p style={{ color: SUBTEXT }} className="text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── What Makes MAVLIT Different ────────────────────────────────────────────────

function Differentiator() {
  const rows = [
    { them: "Thousands of scraped brands", us: "Verified brands that actually spend" },
    { them: "Generic automated emails", us: "Personalized, story-driven pitches" },
    { them: "No idea who to contact", us: "The real contact — in-house or agency" },
    { them: "You look like spam", us: "You stand out" },
  ];

  return (
    <section style={{ background: "#0d0d14" }} className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <p style={{ color: ACCENT }} className="text-sm font-bold uppercase tracking-widest mb-4 text-center">
          What Makes MAVLIT Different
        </p>
        <h2 className="text-white font-extrabold text-3xl sm:text-4xl text-center mb-4 leading-tight">
          Quality over volume. Always.
        </h2>
        <p style={{ color: SUBTEXT }} className="text-center text-lg max-w-2xl mx-auto mb-14 leading-relaxed">
          Other tools tell you to blast hundreds of automated emails a month. That's how you burn every contact you have. MAVLIT is built the opposite way: fewer, better-targeted pitches to brands we've verified are actually spending, sent to the real person who makes the decision. One great pitch beats a hundred generic ones.
        </p>
        <div
          style={{ border: "1px solid #ffffff10" }}
          className="rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-2">
            <div
              style={{ background: "#13131e", borderRight: "1px solid #ffffff10", borderBottom: "1px solid #ffffff10" }}
              className="px-6 py-4"
            >
              <p style={{ color: SUBTEXT }} className="text-sm font-bold">Volume tools</p>
            </div>
            <div
              style={{ background: "#13131e", borderBottom: "1px solid #ffffff10" }}
              className="px-6 py-4"
            >
              <p style={{ color: ACCENT }} className="text-sm font-bold">MAVLIT</p>
            </div>
          </div>
          {/* Rows */}
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2" style={{ borderTop: i === 0 ? "none" : "1px solid #ffffff08" }}>
              <div
                style={{ background: "#0f0f18", borderRight: "1px solid #ffffff10" }}
                className="px-6 py-4 flex items-center gap-2"
              >
                <span style={{ color: "#ef444460" }} className="text-sm">✕</span>
                <span style={{ color: SUBTEXT }} className="text-sm">{r.them}</span>
              </div>
              <div
                style={{ background: "#0f1018" }}
                className="px-6 py-4 flex items-center gap-2"
              >
                <span style={{ color: "#22c55e" }} className="text-sm">✓</span>
                <span className="text-white text-sm font-medium">{r.us}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Honesty / Trust ────────────────────────────────────────────────────────────

function Honesty() {
  const cols = [
    {
      title: "Rates aren't formulaic.",
      body: "We show you real observed deal ranges from reported data — not a made-up number. What you charge depends on your audience, the brand, and the terms. We give you the context and let you decide.",
    },
    {
      title: "We show you our confidence.",
      body: "Every contact shows when it was last verified. Every brand shows what signals we found. If we're not sure, we say so.",
    },
    {
      title: "We're on your side.",
      body: "Other platforms are built for brands. MAVLIT is built for creators — to help you pitch smarter and not get ripped off. That's the whole point.",
    },
  ];

  return (
    <section style={{ background: BG }} className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <p style={{ color: ACCENT }} className="text-sm font-bold uppercase tracking-widest mb-4 text-center">
          Honesty
        </p>
        <h2 className="text-white font-extrabold text-3xl sm:text-4xl text-center mb-14 leading-tight">
          We tell you the truth,<br />even when it's inconvenient.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {cols.map((c) => (
            <div
              key={c.title}
              style={{ background: "#13131e", border: "1px solid #ffffff10" }}
              className="rounded-2xl p-6"
            >
              <h3 className="text-white font-bold text-base mb-3 leading-snug">{c.title}</h3>
              <p style={{ color: SUBTEXT }} className="text-sm leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Early Access Form ──────────────────────────────────────────────────────────

function EarlyAccess() {
  const [form, setForm] = useState({
    email: "",
    handle: "",
    platform: "",
    niche: "",
    followers: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "A valid email is required.";
    if (!form.handle.trim()) e.handle = "Your creator handle is required.";
    if (!form.platform) e.platform = "Please select a platform.";
    if (!form.niche) e.niche = "Please select a niche.";
    if (!form.followers) e.followers = "Please select your follower count.";
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitted(true);
  }

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#8080a0] outline-none focus:ring-2 focus:ring-[#7c3aed] transition";
  const inputStyle = { background: "#13131e", border: "1px solid #ffffff15" };

  return (
    <section
      id="early-access"
      style={{ background: "#0d0d14" }}
      className="py-20 px-6"
    >
      <div className="max-w-lg mx-auto">
        <p style={{ color: ACCENT }} className="text-sm font-bold uppercase tracking-widest mb-4 text-center">
          Early Access
        </p>
        <h2 className="text-white font-extrabold text-3xl sm:text-4xl text-center mb-4 leading-tight">
          Join the founding creators.
        </h2>
        <p style={{ color: SUBTEXT }} className="text-center text-base leading-relaxed mb-10">
          MAVLIT is opening to a small group of creators first. Founding creators get free early access, help shape the product, and lock in a lifetime discount when we launch.
        </p>

        {submitted ? (
          <div
            style={{ background: "#13131e", border: "1px solid #7c3aed40" }}
            className="rounded-2xl p-8 text-center"
          >
            <div className="text-3xl mb-4">🎉</div>
            <h3 className="text-white font-extrabold text-2xl mb-3">You're on the list.</h3>
            <p style={{ color: SUBTEXT }} className="text-sm leading-relaxed mb-4">
              Thanks — you're in. We're onboarding founding creators in small groups and we'll email you when it's your turn. If your niche isn't live yet, we'll tell you the moment it is.
            </p>
            <p style={{ color: "#8080a060" }} className="text-xs">
              We'll only email you about MAVLIT. No spam, ever.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ background: "#13131e", border: "1px solid #ffffff10" }}
            className="rounded-2xl p-8 flex flex-col gap-4"
            noValidate
          >
            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
              {errors.email && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>{errors.email}</p>}
            </div>

            {/* Handle */}
            <div>
              <input
                type="text"
                placeholder="@yourhandle"
                value={form.handle}
                onChange={e => setForm(f => ({ ...f, handle: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
              {errors.handle && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>{errors.handle}</p>}
            </div>

            {/* Platform */}
            <div>
              <select
                value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                className={inputClass}
                style={{ ...inputStyle, appearance: "none", color: form.platform ? "white" : SUBTEXT }}
              >
                <option value="" disabled>Primary platform</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="substack">Substack</option>
                <option value="other">Other</option>
              </select>
              {errors.platform && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>{errors.platform}</p>}
            </div>

            {/* Niche */}
            <div>
              <select
                value={form.niche}
                onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
                className={inputClass}
                style={{ ...inputStyle, appearance: "none", color: form.niche ? "white" : SUBTEXT }}
              >
                <option value="" disabled>Niche</option>
                <option value="music">Music</option>
                <option value="health">Health &amp; Wellness</option>
                <option value="food">Food &amp; Beverage</option>
                <option value="beauty">Beauty</option>
                <option value="fitness">Fitness</option>
                <option value="other">Other</option>
              </select>
              {errors.niche && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>{errors.niche}</p>}
            </div>

            {/* Followers */}
            <div>
              <select
                value={form.followers}
                onChange={e => setForm(f => ({ ...f, followers: e.target.value }))}
                className={inputClass}
                style={{ ...inputStyle, appearance: "none", color: form.followers ? "white" : SUBTEXT }}
              >
                <option value="" disabled>Follower count</option>
                <option value="under10k">Under 10k</option>
                <option value="10k-50k">10k–50k</option>
                <option value="50k-200k">50k–200k</option>
                <option value="200k-500k">200k–500k</option>
                <option value="500k+">500k+</option>
              </select>
              {errors.followers && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>{errors.followers}</p>}
            </div>

            <button
              type="submit"
              style={{ background: ACCENT }}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity mt-2"
            >
              Join the early access list →
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

// ── Final CTA + Footer ─────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section style={{ background: BG }} className="pt-20 pb-8 px-6">
      <div className="max-w-5xl mx-auto text-center mb-16">
        <h2 className="text-white font-extrabold text-3xl sm:text-4xl leading-tight mb-8">
          Stop waiting for brands to find you.<br />Go get them.
        </h2>
        <button
          onClick={scrollToSignup}
          style={{ background: ACCENT }}
          className="px-8 py-4 rounded-xl text-white font-bold text-base hover:opacity-90 transition-opacity"
        >
          Get early access →
        </button>
      </div>

      <div style={{ borderTop: "1px solid #ffffff10" }} className="pt-8">
        <p style={{ color: "#8080a060" }} className="text-center text-sm flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>MAVLIT</span>
          <span>·</span>
          <span>A BWB Media Inc. company</span>
          <span>·</span>
          <span>Newport Beach, CA</span>
          <span>·</span>
          <a href="#" style={{ color: "#8080a080" }} className="hover:text-white transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="#" style={{ color: "#8080a080" }} className="hover:text-white transition-colors">Terms of Service</a>
        </p>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div style={{ background: BG }} className="min-h-screen text-white overflow-x-hidden">
      <HomeNav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Differentiator />
        <Honesty />
        <EarlyAccess />
        <FinalCTA />
      </main>
    </div>
  );
}
