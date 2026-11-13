// Feed (prototype): every number on this page comes from src/data/feed. No API calls, no storage, no backend.
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Building2, Flame, Sparkles, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import BrandDialog from "@/components/feed/BrandDialog";
import BrandIntelligenceTab from "@/components/feed/BrandIntelligenceTab";
import CreatorDialog from "@/components/feed/CreatorDialog";
import FeedFilterBar from "@/components/feed/FeedFilterBar";
import ForYouTab from "@/components/feed/ForYouTab";
import MarketInsightsTab from "@/components/feed/MarketInsightsTab";
import SimilarCreatorsTab from "@/components/feed/SimilarCreatorsTab";
import TrendingTab from "@/components/feed/TrendingTab";
import type { FeedBrand, FeedCreator } from "@/data/feed";
import { EMPTY_FILTERS, type FeedFilters } from "@/lib/feedData";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "for-you", label: "For You", Icon: Sparkles, hint: "Partnerships picked for your niche, content and profile." },
  { id: "similar", label: "Similar Creators", Icon: Users, hint: "Creators with similar content, audiences and follower counts, and who they partner with." },
  { id: "brands", label: "Brand Intelligence", Icon: Building2, hint: "Which brands work with creators like you, and what they look for." },
  { id: "insights", label: "Market Insights", Icon: BarChart3, hint: "Where you stand against similar creators, and what to do next." },
  { id: "trending", label: "Trending", Icon: Flame, hint: "Creator market trends: what is growing in your niche and where brands are investing." },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function Feed() {
  const [tab, setTab] = useState<TabId>("for-you");
  const [filters, setFilters] = useState<FeedFilters>(EMPTY_FILTERS);
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [savedInspiration, setSavedInspiration] = useState<Set<string>>(() => new Set());
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [creator, setCreator] = useState<FeedCreator | null>(null);
  const [brand, setBrand] = useState<FeedBrand | null>(null);
  const clear = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const toggleSave = useCallback((id: string) => setSaved((prev) => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next; }), []);
  const toggleInspiration = useCallback((id: string) => setSavedInspiration((prev) => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next; }), []);
  const viewCreator = useCallback((c: FeedCreator) => { setBrand(null); setCreator(c); }, []);
  const viewBrand = useCallback((b: FeedBrand) => { setCreator(null); setBrand(b); }, []);
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Navbar />
      <main className="px-4 pb-24 pt-28">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <header>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Feed</h1>
            <p className="mt-1 text-sm text-muted-foreground">Discover creator partnerships, explore brands, and understand what's working in your niche.</p>
          </header>

          <div role="tablist" aria-label="Feed sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
            {TABS.map(({ id, label, Icon }) => {
              const on = id === tab;
              return (
                <button key={id} type="button" role="tab" id={`feed-tab-${id}`} aria-selected={on} aria-controls={`feed-panel-${id}`}
                  onClick={() => setTab(id)} data-testid={`feed-tab-${id}`}
                  className={cn("relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors", on ? "text-white" : "text-muted-foreground hover:text-white")}>
                  <Icon size={15} aria-hidden="true" />{label}
                  {on && <motion.span layoutId="feed-tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
          <p className="-mt-3 text-xs text-muted-foreground">{active.hint}</p>

          {/* Trending has its own period / niche / platform / country filters. */}
          {tab !== "trending" && <FeedFilterBar filters={filters} onChange={setFilters} />}

          <motion.div key={tab} role="tabpanel" id={`feed-panel-${tab}`} aria-labelledby={`feed-tab-${tab}`}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
            {tab === "for-you" && <ForYouTab filters={filters} onClear={clear} saved={saved} onToggleSave={toggleSave} savedInspiration={savedInspiration} onToggleInspiration={toggleInspiration} onViewCreator={viewCreator} onViewBrand={viewBrand} />}
            {tab === "similar" && <SimilarCreatorsTab filters={filters} onClear={clear} onViewCreator={viewCreator} compareIds={compareIds} onCompareChange={setCompareIds} />}
            {tab === "brands" && <BrandIntelligenceTab filters={filters} onClear={clear} onViewBrand={viewBrand} />}
            {tab === "insights" && <MarketInsightsTab filters={filters} onClear={clear} />}
            {tab === "trending" && <TrendingTab />}
          </motion.div>
        </div>
      </main>
      <CreatorDialog creator={creator} onClose={() => setCreator(null)} />
      <BrandDialog brand={brand} onClose={() => setBrand(null)} onViewCreator={viewCreator} />
    </div>
  );
}
