// One text colour per brand niche, so a niche is recognisable at a glance on the Matches tab.
// Class names are written out in full so Tailwind sees them.
const NICHE_TEXT_CLASS: Record<string, string> = {
  music: "text-violet-400",
  tech: "text-sky-400",
  beauty: "text-pink-400",
  fitness: "text-orange-400",
  health: "text-emerald-400",
  fashion: "text-fuchsia-400",
  "food beverage": "text-amber-400",
  finance: "text-lime-400",
  "home goods": "text-yellow-400",
  entertainment: "text-red-400",
  media: "text-cyan-400",
  travel: "text-teal-400",
  outdoor: "text-green-400",
  automotive: "text-slate-300",
  retail: "text-indigo-400",
  education: "text-blue-400",
  ecommerce: "text-purple-400",
  sports: "text-orange-300",
};

// Niches not listed above still get a colour, always the same one for the same niche.
const FALLBACK_TEXT_CLASSES = [
  "text-rose-300", "text-sky-300", "text-lime-300", "text-violet-300",
  "text-amber-300", "text-teal-300", "text-pink-300", "text-indigo-300",
];

const normalize = (niche: string) => niche.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

export function nicheTextClass(niche?: string | null): string {
  const key = niche ? normalize(niche) : "";
  if (!key || key === "uncategorized" || key === "unknown") return "text-muted-foreground";
  const known = NICHE_TEXT_CLASS[key];
  if (known) return known;
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FALLBACK_TEXT_CLASSES[hash % FALLBACK_TEXT_CLASSES.length];
}
