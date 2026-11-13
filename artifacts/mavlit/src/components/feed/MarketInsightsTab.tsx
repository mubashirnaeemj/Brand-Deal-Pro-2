import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowDownRight, ArrowUpRight, Lightbulb, Target, TrendingUp } from "lucide-react";
import { Bar, BarChart, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ME } from "@/data/feed";
import { SIMILAR_PEER_THRESHOLD, activeFilterCount, filterCreators, fmtCount, fmtPercent, missedOpportunities, myPartnershipCount, peerStats } from "@/lib/feedData";
import type { FeedFilters } from "@/lib/feedData";
import { BrandMark, Chip, EmptyState } from "./FeedVisuals";

const PALETTE = ["#8b5cf6", "#38bdf8", "#f59e0b", "#10b981", "#ec4899", "#94a3b8"];
const TOOLTIP_STYLE = { background: "#15151c", border: "1px solid #2a2a33", borderRadius: 12, fontSize: 12, color: "#fff" };

const RECOMMENDATIONS = [
  { title: "Lead with Gear Reviews", impact: "High", body: "Peers who publish gear reviews are tagged by hardware brands about twice as often. Ship two Reels a month that review a piece of studio gear end to end." },
  { title: "Raise your posting rhythm to 3 a week", impact: "High", body: "You post 2.4 times a week; similar creators average 2.9. Consistency lifts Reel reach, which is the first number brands check." },
  { title: "Add a 'work with me' line to your bio", impact: "Medium", body: "Three of your closest peers list a partnerships email and a one-line media kit link. It removes friction for brands that find you." },
  { title: "Turn tutorial Reels into series", impact: "Medium", body: "Numbered series like 'Chop it #4' earn repeat viewers and give a sponsor a natural place to slot in." },
  { title: "Pitch the brands your peers already work with", impact: "Quick win", body: "Native Instruments, Arturia and Focusrite each work with at least three creators like you. Use Missed Brand Opportunities below to start." },
];

function Delta({ me, peer, higherIsBetter = true }: { me: number; peer: number; higherIsBetter?: boolean }) {
  const pct = peer ? ((me - peer) / peer) * 100 : 0;
  const good = higherIsBetter ? pct >= 0 : pct <= 0;
  const Icon = pct >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${good ? "text-emerald-400" : "text-amber-400"}`}><Icon size={13} aria-hidden="true" />{Math.abs(Math.round(pct))}%</span>;
}

export default function MarketInsightsTab({ filters, onClear }: { filters: FeedFilters; onClear: () => void }) {
  const peers = useMemo(() => filterCreators(filters).filter((c) => c.similarity >= SIMILAR_PEER_THRESHOLD), [filters]);
  const stats = useMemo(() => peerStats(peers), [peers]);
  const missed = useMemo(() => missedOpportunities(peers), [peers]);
  if (peers.length === 0) {
    return <EmptyState title="No comparable creators for these filters" hint={`Insights compare you with similar creators (${SIMILAR_PEER_THRESHOLD}%+ match). Loosen the filters to see your position.`} onClear={activeFilterCount(filters) ? onClear : undefined} />;
  }

  const metrics = [
    { key: "views", label: "Avg Reel views", me: ME.avgReelViews, peer: stats.avgReelViews, show: fmtCount },
    { key: "eng", label: "Engagement rate", me: ME.engagementRate, peer: stats.avgEngagement, show: fmtPercent },
    { key: "freq", label: "Posts per week", me: ME.postsPerWeek, peer: stats.postsPerWeek, show: (n: number) => n.toFixed(1) },
    { key: "deals", label: "Brand partnerships", me: myPartnershipCount, peer: stats.partnerships, show: (n: number) => n.toFixed(n % 1 ? 1 : 0) },
  ];
  const strengths: string[] = []; const weaknesses: string[] = [];
  for (const m of metrics) {
    const ratio = m.me / m.peer; const pct = Math.abs(Math.round((ratio - 1) * 100));
    if (ratio >= 1.1) strengths.push(`${m.label}: ${m.show(m.me)} vs ${m.show(m.peer)} for similar creators (+${pct}%).`);
    else if (ratio <= 0.9) weaknesses.push(`${m.label}: ${m.show(m.me)} vs ${m.show(m.peer)} for similar creators (−${pct}%).`);
  }
  const categories = [...new Set([...Object.keys(ME.mix), ...Object.entries(stats.mix).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k)])];
  for (const cat of categories) {
    const mine = ME.mix[cat] ?? 0; const theirs = Math.round(stats.mix[cat] ?? 0);
    if (mine - theirs >= 5) strengths.push(`${cat}: ${mine}% of your content vs ${theirs}% for peers. You lean into it.`);
    if (theirs - mine >= 4) weaknesses.push(`${cat}: ${mine}% of your content vs ${theirs}% for peers. Brands in this lane may overlook you.`);
  }
  if (strengths.length === 0) strengths.push("You're level with similar creators on every tracked metric.");
  if (weaknesses.length === 0) weaknesses.push("No gaps against similar creators right now.");

  const radar = metrics.map((m) => ({ metric: m.label, You: Math.min(200, Math.round((m.me / m.peer) * 100)), "Similar creators": 100 }));
  const mixRows = [
    { name: "You", ...Object.fromEntries(categories.map((c) => [c, ME.mix[c] ?? 0])) },
    { name: "Similar creators", ...Object.fromEntries(categories.map((c) => [c, Math.round(stats.mix[c] ?? 0)])) },
  ];
  const card = "rounded-2xl border border-border bg-card p-5";

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Your Competitive Position" className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-white">Your Competitive Position</h2>
          <p className="text-sm text-muted-foreground">@{ME.handle} against {peers.length} similar creator{peers.length === 1 ? "" : "s"} ({fmtCount(stats.avgFollowers)} followers on average).</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.key} className={card} data-testid={`metric-${m.key}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{m.show(m.me)}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Delta me={m.me} peer={m.peer} />vs {m.show(m.peer)} avg</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={card}>
            <h3 className="mb-1 text-sm font-bold text-white">Performance index</h3>
            <p className="mb-2 text-xs text-muted-foreground">Similar creators = 100. Further out is better.</p>
            <div className="h-72" role="img" aria-label="Radar chart comparing you with similar creators">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="72%">
                  <PolarGrid stroke="#2a2a33" /><PolarAngleAxis dataKey="metric" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 200]} tick={false} axisLine={false} />
                  <Radar name="Similar creators" dataKey="Similar creators" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.12} />
                  <Radar name="You" dataKey="You" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
                  <Legend wrapperStyle={{ fontSize: 12 }} /><Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={card}>
            <h3 className="mb-1 text-sm font-bold text-white">Content category distribution</h3>
            <p className="mb-2 text-xs text-muted-foreground">Share of posts by category.</p>
            <div className="h-72" role="img" aria-label="Stacked bar chart of content categories for you and similar creators">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mixRows} layout="vertical" margin={{ left: 24, right: 12 }}>
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#e4e4e7", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {categories.map((cat, i) => <Bar key={cat} dataKey={cat} stackId="mix" fill={PALETTE[i % PALETTE.length]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label="Your Strengths" className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-white"><TrendingUp size={16} className="text-emerald-400" aria-hidden="true" />Your Strengths</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">{strengths.map((s) => <li key={s}>• {s}</li>)}</ul>
        </section>
        <section aria-label="Areas to Improve" className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-white"><Target size={16} className="text-amber-400" aria-hidden="true" />Areas to Improve</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">{weaknesses.map((s) => <li key={s}>• {s}</li>)}</ul>
        </section>
      </div>

      <section aria-label="Missed Brand Opportunities" className={card}>
        <h2 className="text-base font-extrabold text-white">Missed Brand Opportunities</h2>
        <p className="mb-4 text-sm text-muted-foreground">Brands that work with similar creators but not with you yet.</p>
        {missed.length === 0 ? <p className="text-sm text-muted-foreground">Nothing missing. You've worked with every brand your peers have.</p> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {missed.map(({ brand, creators }) => (
              <li key={brand.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                <BrandMark brand={brand} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{brand.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{creators.length} similar creator{creators.length === 1 ? "" : "s"}: {creators.slice(0, 2).map((c) => `@${c.handle}`).join(", ")}{creators.length > 2 ? "…" : ""}</p>
                </div>
                <Link href={`/pitch?brand=${encodeURIComponent(brand.name)}`} className="shrink-0 text-xs font-semibold text-primary hover:underline">Pitch →</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="AI Recommendations" className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-white"><Lightbulb size={16} className="text-primary" aria-hidden="true" />AI Recommendations</h2>
        <ol className="flex flex-col gap-3">
          {RECOMMENDATIONS.map((r, i) => (
            <li key={r.title} className="flex gap-4 rounded-xl border border-border bg-background/50 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-extrabold text-primary">{i + 1}</span>
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">{r.title}<Chip tone={r.impact === "High" ? "good" : r.impact === "Quick win" ? "warn" : "neutral"}>{r.impact} impact</Chip></p>
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
