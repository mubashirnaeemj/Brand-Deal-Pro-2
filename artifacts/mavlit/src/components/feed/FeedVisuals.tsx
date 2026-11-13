// Local-only visuals for the Feed prototype: no external images. Avatars, brand marks and post art are drawn from CSS/SVG.
import { Bookmark, Eye, Heart, Layers, MessageCircle, Play, CircleDot } from "lucide-react";
import type { ReactNode } from "react";
import type { ContentType, FeedBrand, FeedCreator, FeedPartnership } from "@/data/feed";
import { fmtCount } from "@/lib/feedData";
import { cn } from "@/lib/utils";

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function CreatorAvatar({ creator, size = 44 }: { creator: Pick<FeedCreator, "name" | "hue">; size?: number }) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-background"
      style={{ width: size, height: size, fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${creator.hue} 75% 58%), hsl(${(creator.hue + 50) % 360} 70% 38%))` }}>
      {initials(creator.name)}
    </span>
  );
}

export function BrandMark({ brand, size = 36 }: { brand: Pick<FeedBrand, "name" | "color">; size?: number }) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 font-extrabold"
      style={{ width: size, height: size, fontSize: size * 0.42, color: brand.color, background: `${brand.color}1f` }}>
      {brand.name.charAt(0)}
    </span>
  );
}

const TYPE_ICON: Record<ContentType, typeof Play> = { Reel: Play, Video: Play, Carousel: Layers, Story: CircleDot };

function hash(text: string) { let h = 0; for (const ch of text) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return Math.abs(h); }

/** Sponsored-post thumbnail, generated from the brand colour and the post id. */
export function PostArt({ post, brand, className, compact = false }: {
  post: FeedPartnership; brand: FeedBrand; className?: string; compact?: boolean;
}) {
  const h = hash(post.id);
  const x1 = 15 + (h % 55); const y1 = 10 + ((h >> 3) % 40); const x2 = 40 + ((h >> 5) % 50); const y2 = 55 + ((h >> 7) % 35);
  const Icon = TYPE_ICON[post.type];
  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)} data-testid={`post-art-${post.id}`}>
      <div className="absolute inset-0" style={{
        background: `radial-gradient(circle at ${x1}% ${y1}%, ${brand.color}cc 0%, transparent 52%), radial-gradient(circle at ${x2}% ${y2}%, hsl(${(h % 60) + 240} 70% 45% / 0.8) 0%, transparent 55%), linear-gradient(160deg, #15151c, #0a0a0e)`,
      }} />
      <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <circle key={i} cx={(h >> i) % 100} cy={(h >> (i + 2)) % 100} r={6 + ((h >> (i + 1)) % 22)} fill="none" stroke="white" strokeWidth="0.4" />
        ))}
      </svg>
      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
        <Icon size={10} aria-hidden="true" />{post.type}
      </span>
      {!compact && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-semibold text-white/90">
          Paid partnership with {brand.name}
        </span>
      )}
      <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
        <Icon size={18} aria-hidden="true" />
      </span>
    </div>
  );
}

export function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-white" title={label}>
      <span className="text-muted-foreground" aria-hidden="true">{icon}</span>
      <span className="font-semibold">{value}</span><span className="sr-only">{label}</span>
    </span>
  );
}

export function PostMetrics({ post }: { post: FeedPartnership }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Metric icon={<Eye size={14} />} value={fmtCount(post.views)} label="views" />
      <Metric icon={<Heart size={14} />} value={fmtCount(post.likes)} label="likes" />
      <Metric icon={<MessageCircle size={14} />} value={fmtCount(post.comments)} label="comments" />
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "primary" | "good" | "warn" }) {
  const tones = {
    neutral: "bg-secondary text-muted-foreground border-border",
    primary: "bg-primary/15 text-primary border-primary/30",
    good: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    warn: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", tones[tone])}>{children}</span>;
}

export function SaveToggle({ saved, onToggle, label }: { saved: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={saved} aria-label={`${saved ? "Unsave" : "Save"} ${label}`}
      className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
        saved ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-white")}>
      <Bookmark size={13} fill={saved ? "currentColor" : "none"} aria-hidden="true" />{saved ? "Saved" : "Save"}
    </button>
  );
}

export function EmptyState({ title, hint, onClear }: { title: string; hint: string; onClear?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center" role="status">
      <p className="text-base font-bold text-white">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>
      {onClear && <button type="button" onClick={onClear} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Clear all filters</button>}
    </div>
  );
}
