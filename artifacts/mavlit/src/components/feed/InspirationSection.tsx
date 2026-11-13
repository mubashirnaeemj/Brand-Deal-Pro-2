import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Lightbulb, Bookmark, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FeedPartnership } from "@/data/feed";
import { whyPerforming, whyRelevantToMe } from "@/lib/feedCompare";
import type { FeedFilters } from "@/lib/feedData";
import { BRAND_CATEGORIES, CONTENT_CATEGORIES, ago, brandById, creatorById, filterPartnerships, fmtPercent, partnershipDate, postEngagement } from "@/lib/feedData";
import { cn } from "@/lib/utils";
import IdeasDialog from "./IdeasDialog";
import { BrandMark, Chip, CreatorAvatar, EmptyState, PostArt, PostMetrics } from "./FeedVisuals";
import { useOpenOriginalPost } from "./useFeedActions";

type Sort = "recent" | "views" | "engagement";
const SORTS: { id: Sort; label: string }[] = [{ id: "recent", label: "Most recent" }, { id: "views", label: "Most viewed" }, { id: "engagement", label: "Highest engagement" }];
const FORMATS = ["Reel", "Carousel", "Story", "Video"];
const PAGE = 20;                       // posts shown first, and added on each scroll-to-end
const loadDelay = () => 2000 + Math.random() * 1000;   // fake "loading" pause of 2 to 3 seconds

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value || "any"} onValueChange={(v) => onChange(v === "any" ? "" : v)}>
      <SelectTrigger aria-label={label} data-testid={`inspo-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn("h-9 w-auto gap-2 rounded-lg bg-card text-sm", value && "border-primary/50 bg-primary/10")}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="any">{label}: any</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function InspirationCard({ post, saved, onToggle, onIdeas }: { post: FeedPartnership; saved: boolean; onToggle: () => void; onIdeas: () => void }) {
  const creator = creatorById.get(post.creatorId)!; const brand = brandById.get(post.brandId)!;
  const openPost = useOpenOriginalPost();
  const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors";
  return (
    <article data-testid={`inspiration-${post.id}`} className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/20 transition-colors hover:border-primary/30 md:flex-row">
      <PostArt post={post} brand={brand} className="aspect-[16/9] w-full md:aspect-auto md:min-h-[200px] md:w-56 md:shrink-0 lg:w-64" />
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <CreatorAvatar creator={creator} size={40} />
              <div className="min-w-0"><p className="truncate text-sm font-bold text-white">@{creator.handle}</p><p className="truncate text-xs text-muted-foreground">{creator.niche}</p></div>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 py-0.5 pl-0.5 pr-2"><BrandMark brand={brand} size={24} /><span className="text-xs font-bold text-white">{brand.name}</span></span>
            <span className="text-xs text-muted-foreground">{partnershipDate(post.daysAgo)} · {ago(post.daysAgo)}</span>
          </header>
          <p className="text-sm leading-relaxed text-white/90">“{post.description}”</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Chip tone="primary">{post.type}</Chip><Chip>{post.category}</Chip>
            <PostMetrics post={post} />
            <Chip tone="good">{fmtPercent(postEngagement(post))} engagement</Chip>
          </div>
          <dl className="grid gap-2 text-xs xl:grid-cols-2">
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5"><dt className="font-bold text-primary">Why it's relevant to you</dt><dd className="mt-0.5 text-muted-foreground">{whyRelevantToMe(post)}</dd></div>
            <div className="rounded-lg bg-secondary/40 p-2.5"><dt className="font-bold text-white">Why it's performing</dt><dd className="mt-0.5 text-muted-foreground">{whyPerforming(post)}</dd></div>
          </dl>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:w-48 lg:shrink-0 lg:flex-col lg:justify-center">
          <button type="button" onClick={() => openPost(creator.handle, brand.name)} className={cn(btn, "bg-primary text-primary-foreground border-transparent hover:bg-primary/90")}><Eye size={13} aria-hidden="true" />View Post</button>
          <button type="button" onClick={onToggle} aria-pressed={saved} className={cn(btn, saved ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-white")}>
            <Bookmark size={13} fill={saved ? "currentColor" : "none"} aria-hidden="true" />{saved ? "Saved" : "Save"}
          </button>
          <button type="button" onClick={onIdeas} className={cn(btn, "col-span-2 border-border text-muted-foreground hover:border-primary/40 hover:text-white")}><Lightbulb size={13} aria-hidden="true" />Get Content Ideas Like This</button>
        </div>
      </div>
    </article>
  );
}

export default function InspirationSection({ filters, saved, onToggleSaved }: { filters: FeedFilters; saved: Set<string>; onToggleSaved: (id: string) => void }) {
  const [format, setFormat] = useState(""); const [category, setCategory] = useState(""); const [brandCategory, setBrandCategory] = useState("");
  const [sort, setSort] = useState<Sort>("views"); const [savedOnly, setSavedOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE); const [loadingMore, setLoadingMore] = useState(false);
  const endRef = useRef<HTMLDivElement>(null); const [ideasFor, setIdeasFor] = useState<FeedPartnership | null>(null);

  const posts = useMemo(() => filterPartnerships(filters)
    .filter((p) => (!format || p.type === format) && (!category || p.category === category) && (!brandCategory || brandById.get(p.brandId)!.category === brandCategory))
    .sort((a, b) => sort === "views" ? b.views - a.views : sort === "engagement" ? postEngagement(b) - postEngagement(a) : a.daysAgo - b.daysAgo),
  [filters, format, category, brandCategory, sort]);
  const shown = savedOnly ? posts.filter((p) => saved.has(p.id)) : posts;
  const hasMore = shown.length > visible;

  // Start over (and cancel any pending load) whenever the list itself changes.
  useEffect(() => { setVisible(PAGE); setLoadingMore(false); }, [posts, savedOnly]);
  // Scrolling to the end of the list starts a pretend load; when it "finishes" the next 20 appear.
  useEffect(() => {
    const end = endRef.current;
    if (!end || !hasMore || loadingMore || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setLoadingMore(true); }, { rootMargin: "0px 0px 120px 0px" });
    io.observe(end);
    return () => io.disconnect();
  }, [hasMore, loadingMore, visible]);
  useEffect(() => {
    if (!loadingMore) return;
    const t = setTimeout(() => { setVisible((v) => v + PAGE); setLoadingMore(false); }, loadDelay());
    return () => clearTimeout(t);
  }, [loadingMore]);
  const reset = () => { setFormat(""); setCategory(""); setBrandCategory(""); setSavedOnly(false); setSort("views"); };
  const touched = !!(format || category || brandCategory || savedOnly);

  return (
    <section aria-label="Partnerships Picked for You" className="flex flex-col gap-4 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/60 to-card/20 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-white"><Lightbulb size={18} className="text-primary" aria-hidden="true" />Partnerships Picked for You</h2>
        <p className="text-sm text-muted-foreground">Brand partnerships that fit your niche, with the content behind them and why they matter to you.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect label="Content format" value={format} options={FORMATS} onChange={(v) => { setFormat(v); setVisible(PAGE); }} />
        <FilterSelect label="Content category" value={category} options={CONTENT_CATEGORIES} onChange={(v) => { setCategory(v); setVisible(PAGE); }} />
        <FilterSelect label="Brand category" value={brandCategory} options={BRAND_CATEGORIES} onChange={(v) => { setBrandCategory(v); setVisible(PAGE); }} />
        <div role="group" aria-label="Sort inspiration" className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {SORTS.map((s) => (
            <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}
              className={cn("rounded-md px-2.5 py-1.5 text-xs font-semibold", sort === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white")}>{s.label}</button>
          ))}
        </div>
        <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly((v) => !v)}
          className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold", savedOnly ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-white")}>
          <Bookmark size={13} aria-hidden="true" />Saved ({saved.size})
        </button>
        {touched && <button type="button" onClick={reset} className="h-9 px-2 text-xs font-semibold text-primary hover:underline">Reset</button>}
      </div>
      {shown.length === 0
        ? <EmptyState title={savedOnly && posts.length ? "Nothing saved yet" : "No partnerships match these filters"} hint={savedOnly && posts.length ? "Use Save on a partnership and it will show up here." : "Try removing a filter or choosing a different format or category."} />
        : <>
          <div className="flex flex-col gap-4" data-testid="inspiration-list">
            {shown.slice(0, visible).map((p) => <InspirationCard key={p.id} post={p} saved={saved.has(p.id)} onToggle={() => onToggleSaved(p.id)} onIdeas={() => setIdeasFor(p)} />)}
          </div>
          {hasMore && (
            <div ref={endRef} data-testid="inspiration-end" className="flex min-h-12 items-center justify-center py-2">
              {loadingMore && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin text-primary" aria-hidden="true" />Loading more partnerships…</p>}
            </div>
          )}
        </>}
      <IdeasDialog post={ideasFor} onClose={() => setIdeasFor(null)} />
    </section>
  );
}
