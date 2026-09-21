import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Globe2, Loader2, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  api,
  type BrandCatalogAd,
  type BrandCatalogDetail,
  type BrandCatalogListResponse,
  type BrandCatalogNichesResponse,
} from "@/lib/api";

const PAGE_SIZE = 30;

function readBrandId() {
  const value = new URLSearchParams(window.location.search).get("id");
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function pushBrandId(id: number | null) {
  const url = new URL(window.location.href);
  if (id === null) url.searchParams.delete("id");
  else url.searchParams.set("id", String(id));
  window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function displayRange(range: { lower_bound: string; upper_bound: string | null }) {
  return range.upper_bound ? `${range.lower_bound}–${range.upper_bound}` : `${range.lower_bound}+`;
}

function formatDate(value: string) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function hostname(website: string | null, domain: string | null) {
  if (domain) return domain;
  if (!website) return "no website";
  try {
    return new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border/70 bg-card/50">
      <Loader2 className="animate-spin text-sky-400" size={22} />
    </div>
  );
}

function AdCard({ ad }: { ad: BrandCatalogAd }) {
  const [expanded, setExpanded] = useState(false);
  const body = ad.ad_creative_bodies[0] || "No creative copy available.";

  return (
    <article className="flex min-h-72 flex-col rounded-2xl border border-border/70 bg-card/70 p-5 transition-colors hover:border-sky-400/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white">{ad.page_name || "Unknown page"}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(ad.start_date)} <span className="px-1 text-slate-500">→</span> {formatDate(ad.end_date)}
          </p>
        </div>
        <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
          Meta Ad
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {ad.publisher_platforms.map((platform) => (
          <span key={platform} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-slate-300">
            {platform}
          </span>
        ))}
      </div>

      <div className="mt-4 flex-1">
        <p className={`text-sm leading-6 text-slate-300 ${expanded ? "" : "line-clamp-6"}`}>{body}</p>
        {body.length > 360 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Impressions</p>
          <p className="mt-1 text-sm font-semibold text-white">{displayRange(ad.impressions)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Spend</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {displayRange(ad.spend)} {ad.currency}
          </p>
        </div>
      </div>
    </article>
  );
}

function BrandDetailView({ brandId, onBack }: { brandId: number; onBack: () => void }) {
  const [brand, setBrand] = useState<BrandCatalogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get<BrandCatalogDetail>(`/api/brand-catalog/${brandId}`)
      .then((result) => {
        if (!cancelled) setBrand(result);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load this brand.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [brandId]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-sky-400 transition-colors hover:text-sky-300"
      >
        <ArrowLeft size={15} /> Back to Brand Catalog
      </button>

      {loading && <LoadingState />}
      {!loading && error && <ErrorMessage message={error} />}
      {!loading && !error && brand && (
        <>
          <section className="mb-10">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Brand Catalog</p>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">{brand.name}</h1>
                {brand.website && (
                  <a
                    href={brand.website.startsWith("http") ? brand.website : `https://${brand.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300"
                  >
                    {hostname(brand.website, brand.domain)} <ExternalLink size={13} />
                  </a>
                )}
              </div>
              {brand.domain && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe2 size={16} className="text-sky-400" /> {brand.domain}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                brand.niche,
                brand.country,
                brand.brand_tier,
                brand.geo_reach_label && `${brand.geo_reach_label}${brand.geo_reach_score !== null ? ` · ${brand.geo_reach_score}` : ""}`,
                brand.instagram_handle && `Instagram: ${brand.instagram_handle}`,
              ].filter(Boolean).map((pill) => (
                <span key={pill} className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-200">
                  {pill}
                </span>
              ))}
            </div>
            {brand.description && <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-300">{brand.description}</p>}
          </section>

          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Meta Ad Examples</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Showing {brand.meta_ads.length} of {brand.meta_ads_total} ads
                </p>
              </div>
            </div>
            {brand.meta_ads.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {brand.meta_ads.map((ad) => <AdCard key={ad.id} ad={ad} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-14 text-center text-sm text-muted-foreground">
                No Meta Ads found for this brand yet
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default function BrandCatalog() {
  const [selectedId, setSelectedId] = useState<number | null>(() => readBrandId());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [niche, setNiche] = useState("");
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<BrandCatalogListResponse | null>(null);
  const [niches, setNiches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, niche]);

  useEffect(() => {
    const onPopState = () => setSelectedId(readBrandId());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    api.get<BrandCatalogNichesResponse>("/api/brand-catalog/niches")
      .then((response) => setNiches(response.niches))
      .catch(() => setNiches([]));
  }, []);

  useEffect(() => {
    if (selectedId !== null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (niche) params.set("niche", niche);
    api.get<BrandCatalogListResponse>(`/api/brand-catalog?${params.toString()}`)
      .then((response) => {
        if (!cancelled) setResult(response);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load the brand catalog.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedId, debouncedSearch, niche, offset]);

  const rangeLabel = useMemo(() => {
    if (!result?.total) return "0 of 0";
    return `${offset + 1}–${Math.min(offset + result.brands.length, result.total)} of ${result.total}`;
  }, [offset, result]);

  const openBrand = (id: number) => {
    pushBrandId(id);
    setSelectedId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToList = () => {
    pushBrandId(null);
    setSelectedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      {selectedId !== null ? (
        <BrandDetailView brandId={selectedId} onBack={backToList} />
      ) : (
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6">
          <section className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Explore partners</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">Brand Catalog</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Browse brands, learn where they operate, and see examples of the Meta ads they are running.
            </p>
          </section>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search brands by name"
                className="w-full rounded-xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sky-400/60"
              />
            </label>
            <select
              value={niche}
              onChange={(event) => setNiche(event.target.value)}
              className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-white outline-none transition-colors focus:border-sky-400/60 sm:min-w-52"
              aria-label="Filter by niche"
            >
              <option value="">All niches</option>
              {niches.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          {error && <ErrorMessage message={error} />}
          {loading && <LoadingState />}
          {!loading && !error && result && (
            <>
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/50">
                {result.brands.length ? result.brands.map((brand) => (
                  <button
                    type="button"
                    key={brand.id}
                    onClick={() => openBrand(brand.id)}
                    className="flex w-full items-center justify-between gap-4 border-b border-border/60 px-5 py-5 text-left transition-colors last:border-0 hover:bg-secondary/70"
                  >
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-white">{brand.name}</h2>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{hostname(brand.website, brand.domain)}</p>
                    </div>
                    {brand.niche && (
                      <span className="shrink-0 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-200">
                        {brand.niche}
                      </span>
                    )}
                  </button>
                )) : (
                  <div className="px-6 py-16 text-center text-sm text-muted-foreground">No brands match your search.</div>
                )}
              </div>
              <div className="mt-5 flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">{rangeLabel}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft size={14} /> Prev
                  </button>
                  <button
                    type="button"
                    disabled={offset + PAGE_SIZE >= result.total}
                    onClick={() => setOffset((value) => value + PAGE_SIZE)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      )}
      <Footer />
    </div>
  );
}