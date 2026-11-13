import type { FeedBrand, FeedCreator } from "@/data/feed";
import type { FeedFilters } from "@/lib/feedData";
import InspirationSection from "./InspirationSection";

interface Props {
  filters: FeedFilters; onClear: () => void; saved: Set<string>; onToggleSave: (id: string) => void;
  savedInspiration: Set<string>; onToggleInspiration: (id: string) => void;
  onViewCreator: (c: FeedCreator) => void; onViewBrand: (b: FeedBrand) => void;
}

// For You = one section, "Partnerships Picked for You": a full-width list with one partnership post per row.
export default function ForYouTab({ filters, savedInspiration, onToggleInspiration }: Props) {
  return <InspirationSection filters={filters} saved={savedInspiration} onToggleSaved={onToggleInspiration} />;
}
