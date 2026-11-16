import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowDownRight, ArrowUpRight, Lightbulb, Target, TrendingUp } from "lucide-react";
import { Bar, BarChart, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CREATORS, ME } from "@/data/feed";
import { fmtCount, peerStats } from "@/lib/feedData";
import { intelColor } from "@/lib/brandIntelligence";
import { categoryLines, comparable, fetchMarketInsights, marketMetrics, strengthsAndGaps } from "@/lib/marketInsights";
import { BrandMark, Chip, EmptyState } from "./FeedVisuals";

const PALETTE = ["#8b5cf6", "#38bdf8", "#f59e0b", "#10b981", "#ec4899", "#94a3b8"];
const TOOLTIP_STYLE = { background: "#15151c", border: "1px solid #2a2a33", borderRadius: 12, fontSize: 12, color: "#fff" };
const TOOLTIP_TEXT = { itemStyle: { color: "#fff" }, labelStyle: { color: "#e4e4e7" } };

// Hardcoded sample text: the recommendations are not generated from your data yet.
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

const card = "rounded-2xl border border-border bg-card p-5";
// The content category chart is the prototype's sample data (yours is the mock profile's, the peers' the average of the mock creators').
const SAMPLE_PEER_MIX = peerStats(CREATORS).mix;

/**
 * Where you stand: you against your five most similar creators with the same audience size, from the real numbers; the brands you are matched with
 * but have not made a pitch for. The content category distribution and the AI recommendations are still hardcoded sample data.
 */
export default function MarketInsightsTab() {
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ["feed", "market-insights"], queryFn: fetchMarketInsights, staleTime: 60_000 });
  if (isPending) return <p role="status" className="py-16 text-center text-sm text-muted-foreground">Comparing you with similar creators…</p>;
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center" role="alert">
        <p className="text-base font-bold text-white">Could not load market insights</p>
        <button type="button" onClick={() => void refetch()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Try again</button>
      </div>
    );
  }
  if (!data.ready) return <EmptyState title="Finish your profile to see market insights" hint="We compare your profile with similar creators. Add your niche and audience description first." />;

  const { you, peers } = data;
  const metrics = marketMetrics(you, peers);
  const { strengths, weaknesses } = strengthsAndGaps(metrics);
  // the content categories lines come from the mixes MAVLIT estimated (yours and the peers'): none while either side has no mix
  const lines = categoryLines(you, peers);
  strengths.push(...lines.strengths); weaknesses.push(...lines.weaknesses);
  // the chart below is still the sample mix
  const categories = [...new Set([...Object.keys(ME.mix), ...Object.entries(SAMPLE_PEER_MIX).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k)])];
  if (strengths.length === 0) strengths.push("You're level with similar creators on every tracked metric.");
  if (weaknesses.length === 0) weaknesses.push("No gaps against similar creators right now.");
  const radarMetrics = metrics.filter(comparable);
  const radar = radarMetrics.map((m) => ({ metric: m.label, You: Math.min(200, Math.round((m.me / m.peer) * 100)), "Similar creators": 100 }));
  const mixRows = [
    { name: "You", ...Object.fromEntries(categories.map((c) => [c, ME.mix[c] ?? 0])) },
    { name: "Similar creators", ...Object.fromEntries(categories.map((c) => [c, Math.round(SAMPLE_PEER_MIX[c] ?? 0)])) },
  ];
  const handle = you.handle ? `@${you.handle.replace(/^@/, "")}` : "You";

  return (
    <div className="flex flex-col gap-6">
      {peers.count === 0 ? (
        <EmptyState title="No creators with a similar audience size yet"
          hint={data.audience_range ? `None of the creators like you has between ${fmtCount(data.audience_range.min)} and ${fmtCount(data.audience_range.max)} followers (a third to twice yours).` : "Add your follower count to your profile so we can find creators with a similar audience size."} />
      ) : <>
      <section aria-label="Your Competitive Position" className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-white">Your Competitive Position</h2>
          <p className="text-sm text-muted-foreground" data-testid="peers-line">
            {handle} against {peers.count} similar creator{peers.count === 1 ? "" : "s"} with a similar audience size{peers.avg_followers !== null ? ` (${fmtCount(peers.avg_followers)} followers on average)` : ""}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground" data-testid="peers-list">{peers.creators.map((c) => `@${c.username}`).join(", ")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.key} className={card} data-testid={`metric-${m.key}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{m.me === null ? "—" : m.show(m.me)}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {comparable(m) && <Delta me={m.me} peer={m.peer} />}{m.peer === null ? "no peer average yet" : `vs ${m.show(m.peer)} avg`}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={card}>
            <h3 className="mb-1 text-sm font-bold text-white">Performance index</h3>
            <p className="mb-2 text-xs text-muted-foreground">Similar creators = 100. Further out is better.</p>
            {radar.length >= 3 ? (
              <div className="h-72" role="img" aria-label="Radar chart comparing you with similar creators">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar} outerRadius="72%">
                    <PolarGrid stroke="#2a2a33" /><PolarAngleAxis dataKey="metric" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 200]} tick={false} axisLine={false} />
                    <Radar name="Similar creators" dataKey="Similar creators" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.12} />
                    <Radar name="You" dataKey="You" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
                    <Legend wrapperStyle={{ fontSize: 12 }} /><Tooltip contentStyle={TOOLTIP_STYLE} {...TOOLTIP_TEXT} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="py-10 text-center text-sm text-muted-foreground" data-testid="radar-empty">Not enough numbers yet to draw the index: it needs at least three that you and your peers both have.</p>}
          </div>
          <div className={card}>
            <h3 className="mb-1 text-sm font-bold text-white">Content category distribution</h3>
            <p className="mb-2 text-xs text-muted-foreground">Share of posts by category.</p>
            <div className="h-72" role="img" aria-label="Stacked bar chart of content categories for you and similar creators">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mixRows} layout="vertical" margin={{ left: 24, right: 12 }}>
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#e4e4e7", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} {...TOOLTIP_TEXT} cursor={{ fill: "rgba(255,255,255,0.08)" }} />
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
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">{strengths.map((line) => <li key={line}>• {line}</li>)}</ul>
        </section>
        <section aria-label="Areas to Improve" className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-white"><Target size={16} className="text-amber-400" aria-hidden="true" />Areas to Improve</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">{weaknesses.map((line) => <li key={line}>• {line}</li>)}</ul>
        </section>
      </div>
      </>}

      <section aria-label="Missed Brand Opportunities" className={card}>
        <h2 className="text-base font-extrabold text-white">Missed Brand Opportunities</h2>
        <p className="mb-4 text-sm text-muted-foreground">Your best matched brands that you have not made a pitch for yet.</p>
        {data.missed_brands.length === 0 ? <p className="text-sm text-muted-foreground">Nothing missing. You have made a pitch for your best matches.</p> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.missed_brands.map((b) => (
              <li key={b.brand_raw_id} data-testid={`missed-${b.brand_raw_id}`} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                <BrandMark brand={{ name: b.brand_name, color: intelColor(b.brand_name) }} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{b.brand_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.confidence}% fit · {b.partnerships} creator partnership{b.partnerships === 1 ? "" : "s"}</p>
                </div>
                <Link href={`/pitch?brand=${encodeURIComponent(b.brand_name)}`} className="shrink-0 text-xs font-semibold text-primary hover:underline">Pitch →</Link>
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
