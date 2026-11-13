// Small pieces shared by the Trending tab and its modals. Sample data only.
import { ArrowDownRight, ArrowRight, ArrowUpRight, FlaskConical } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FeedCreator, FeedPartnership } from "@/data/feed";
import type { TrendStatus } from "@/data/feed/trends";
import { brandById, creatorById, fmtCount, fmtPercent, partnershipDate } from "@/lib/feedData";
import { signed, type SeriesPoint } from "@/lib/feedTrends";
import { cn } from "@/lib/utils";
import { BrandMark, Chip, CreatorAvatar, PostArt } from "./FeedVisuals";

export function SampleChip() {
  return <span title="Illustrative demo figures, not measured market activity" className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400"><FlaskConical size={10} aria-hidden="true" />Sample data</span>;
}

export function SampleNote() {
  return <p role="note" className="text-xs text-muted-foreground">Sample data: every percentage and statistic here is an illustrative demo figure, not real measured market activity.</p>;
}

export function GrowthBadge({ value, className }: { value: number; className?: string }) {
  const up = value > 0; const flat = value === 0;
  const Icon = flat ? ArrowRight : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-extrabold", up ? "bg-emerald-500/10 text-emerald-400" : flat ? "bg-sky-500/10 text-sky-400" : "bg-amber-500/10 text-amber-400", className)}>
      <Icon size={12} aria-hidden="true" />{signed(value)}
    </span>
  );
}

export function StatusBadge({ status }: { status: TrendStatus }) {
  return <Chip tone={status === "Rising" ? "good" : status === "Declining" ? "warn" : "neutral"}>{status}</Chip>;
}

/** Tiny dependency-free line chart for cards. */
export function Sparkline({ values, positive, width = 96, height = 32 }: { values: number[]; positive: boolean; width?: number; height?: number }) {
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 3 - ((v - min) / span) * (height - 6)}`).join(" ");
  const color = positive ? "#34d399" : "#fbbf24";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={positive ? "Growth trend line, rising" : "Growth trend line, falling"} className="shrink-0">
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={color} opacity="0.12" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GrowthChart({ data, label }: { data: SeriesPoint[]; label: string }) {
  const up = data[data.length - 1].value >= data[0].value;
  const color = up ? "#34d399" : "#fbbf24";
  return (
    <div className="h-48" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
          <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={["dataMin - 5", "dataMax + 5"]} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#15151c", border: "1px solid #2a2a33", borderRadius: 12, fontSize: 12, color: "#fff" }} formatter={(v: number) => [`${v}`, "Interest index"]} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill="url(#trendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section aria-label={title} className="flex flex-col gap-2.5"><h3 className="text-sm font-bold text-white">{title}</h3>{children}</section>;
}

export function ExamplePosts({ posts }: { posts: FeedPartnership[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {posts.map((post) => {
        const brand = brandById.get(post.brandId)!; const creator = creatorById.get(post.creatorId)!;
        return (
          <li key={post.id} className="overflow-hidden rounded-xl border border-border bg-background/40">
            <PostArt post={post} brand={brand} compact className="aspect-[4/3]" />
            <div className="flex flex-col gap-1 p-3">
              <p className="truncate text-xs font-bold text-white">@{creator.handle}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{post.description}</p>
              <p className="text-[11px] text-muted-foreground">{fmtCount(post.views)} views · {partnershipDate(post.daysAgo)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CreatorList({ creators }: { creators: FeedCreator[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {creators.map((c) => (
        <li key={c.id} className="flex items-center gap-2.5 rounded-xl border border-border bg-background/40 p-2.5">
          <CreatorAvatar creator={c} size={34} />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">@{c.handle}</span><span className="block truncate text-[11px] text-muted-foreground">{c.country} · {c.platform}</span></span>
          <span className="text-right text-[11px] text-muted-foreground"><span className="block font-semibold text-white">{fmtCount(c.followers)}</span>{fmtPercent(c.engagementRate)} eng.</span>
        </li>
      ))}
    </ul>
  );
}

export function BrandList({ ids }: { ids: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {ids.map((id) => { const b = brandById.get(id); return b ? (
        <li key={id} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 py-1.5 pl-1.5 pr-3"><BrandMark brand={b} size={26} /><span className="text-xs font-semibold text-white">{b.name}</span></li>
      ) : null; })}
    </ul>
  );
}

export function IdeaList({ ideas }: { ideas: string[] }) {
  return (
    <ol className="flex flex-col gap-2" data-testid="trend-ideas">
      {ideas.map((idea, i) => (
        <li key={idea} className="flex gap-3 rounded-xl border border-border bg-background/40 p-3 text-sm text-white">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-extrabold text-primary">{i + 1}</span>{idea}
        </li>
      ))}
    </ol>
  );
}

export function FormatChips({ formats }: { formats: string[] }) {
  return <div className="flex flex-wrap gap-1.5">{formats.map((f) => <Chip key={f} tone="primary">{f}</Chip>)}</div>;
}
