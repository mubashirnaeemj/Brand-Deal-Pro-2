import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import {
  addCreatorPost, formatCount, isPostsList, listCreatorPosts, openPost, postedAtLabel, type CreatorPost, type CreatorPostsList,
} from "@/lib/creatorPosts";

export const MAX_PICKS = 3;

/** One chosen entry: a saved Instagram post, or (partnerships only) a short description. */
export type PickedEntry =
  | { kind: "post"; url: string; caption: string | null }
  | { kind: "described"; text: string };

export const pickedPost = (post: CreatorPost): PickedEntry =>
  ({ kind: "post", url: post.post_url, caption: post.caption_preview?.trim() || null });
export const pickedValue = (entry: PickedEntry) => entry.kind === "post" ? entry.url : entry.text;
export const joinPicked = (entries: PickedEntry[]) => entries.map(pickedValue).join(", ") || null;

export type PickerKind = "link" | "partnership";

const COPY = {
  link: {
    button: "+ Choose your posts",
    title: "Choose the posts that show your connection to the brand",
    note: "Showing all your saved posts.",
    hint: "Up to 3 posts that show your connection to this brand. Pick from your posts or add a new post link.",
    empty: "No saved posts yet. Add a post link below.",
    noMatch: "No post caption contains",
  },
  partnership: {
    button: "+ Choose from your partnership posts",
    title: "Choose your past brand partnership posts",
    note: "Showing the posts you marked as paid partnerships.",
    hint: "Up to 3. Pick the posts you marked as paid partnerships, add a post link, or describe a partnership in a few words.",
    empty: "No post is marked as a paid partnership yet. Add a post link below, describe a partnership, or switch the toggle on in \"Your recent Instagram posts\" on your profile page.",
    noMatch: "No partnership post caption contains",
  },
} as const;

const btnGhost = "rounded-xl border border-border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const inputCls = "w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";
const MAX_QUERY = 100;
const SEARCH_DELAY_MS = 300;
const errorText = (cause: unknown, fallback: string) => cause instanceof Error && cause.message ? cause.message : fallback;

/** The chosen entries as chips, the "choose" button and the hint for one field. */
export function PickedField({ kind, entries, onRemove, onOpen }: {
  kind: PickerKind; entries: PickedEntry[]; onRemove: (index: number) => void; onOpen: () => void;
}) {
  const copy = COPY[kind];
  const label = !entries.length ? copy.button : entries.length >= MAX_PICKS ? "Change my choice" : "+ Choose more";
  return (
    <div className="space-y-2">
      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry, index) => (
            <li key={`${pickedValue(entry)}-${index}`} data-testid={`${kind}-chip`}
              className="flex items-center gap-2 rounded-xl border border-border bg-black/40 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-white" title={pickedValue(entry)}>
                {entry.kind === "post" ? entry.caption || entry.url : entry.text}
              </span>
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {entry.kind === "post" ? "post" : "described"}
              </span>
              <button type="button" aria-label={`Remove ${pickedValue(entry)}`} onClick={() => onRemove(index)}
                className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:text-white">
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onOpen} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">{label}</button>
      <p className="text-xs text-muted-foreground/70 leading-relaxed">{copy.hint}</p>
    </div>
  );
}

type Message = { kind: "error" | "success"; text: string };

export function PostPickerDialog({ kind, open, onOpenChange, entries, onChoose, onUnchoose, onDescribe }: {
  kind: PickerKind; open: boolean; onOpenChange: (open: boolean) => void; entries: PickedEntry[];
  onChoose: (post: CreatorPost) => void; onUnchoose: (url: string) => void; onDescribe?: (text: string) => void;
}) {
  const copy = COPY[kind];
  const partnership = kind === "partnership";
  const [list, setList] = useState<CreatorPostsList | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const request = useRef(0);
  const searchRequest = useRef(0);
  const full = entries.length >= MAX_PICKS;
  const chosenUrls = new Set(entries.flatMap(entry => entry.kind === "post" ? [entry.url] : []));

  // The server matches the whole caption (any case), so the search always goes through the API.
  const load = async (q = activeQuery) => {
    const mine = ++request.current;
    const result = await listCreatorPosts(q, partnership);
    if (!isPostsList(result)) throw new Error("MAVLIT returned an unexpected response. Please try again.");
    // A newer request owns the list; report whether this one did.
    if (mine !== request.current) return false;
    setList(result);
    return true;
  };

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setList(null);
    setQuery("");
    setActiveQuery("");
    setLoading(true);
    let active = true;
    load("").catch(cause => { if (active) setMessage({ kind: "error", text: errorText(cause, "Could not load your posts.") }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; request.current++; };
  }, [open, partnership]);

  const add = async () => {
    const postUrl = url.trim();
    if (adding) return;
    if (!postUrl) { setMessage({ kind: "error", text: "Paste the link of an Instagram post." }); return; }
    setMessage(null);
    setAdding(true);
    try {
      const post = await addCreatorPost(postUrl, partnership);
      setUrl("");
      if (entries.length < MAX_PICKS && post?.post_url && !chosenUrls.has(post.post_url)) onChoose(post);
      await load();
      setMessage({ kind: "success", text: "Post added." });
    } catch (cause) {
      setMessage({ kind: "error", text: errorText(cause, "Could not add this post.") });
    } finally {
      setAdding(false);
    }
  };

  const search = async (text: string) => {
    const q = text.trim().slice(0, MAX_QUERY);
    const mine = ++searchRequest.current;
    setMessage(null);
    try {
      if (await load(q) && mine === searchRequest.current) setActiveQuery(q);
    } catch (cause) {
      if (mine === searchRequest.current) setMessage({ kind: "error", text: errorText(cause, "Could not search your posts.") });
    }
  };

  // Results follow the typing: wait for a short pause, then search.
  useEffect(() => {
    const q = query.trim().slice(0, MAX_QUERY);
    if (!open || q === activeQuery) return;
    const timer = setTimeout(() => void search(q), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open, query, activeQuery]);

  // A click anywhere on a post box ticks or unticks it; a full selection only explains why.
  const toggle = (post: CreatorPost) => {
    if (chosenUrls.has(post.post_url)) { setMessage(null); onUnchoose(post.post_url); }
    else if (full) setMessage({ kind: "error", text: "You can choose up to 3. Remove one first." });
    else { setMessage(null); onChoose(post); }
  };

  const describe = () => {
    const text = description.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    if (!text || full) return;
    setDescription("");
    onDescribe?.(text);
  };

  const shownPosts = list?.posts ?? [];
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay data-testid="picker-overlay" className="fixed inset-0 z-50 bg-black/60"
          style={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }} />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <DialogPrimitive.Title className="text-lg font-bold text-white">{copy.title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                {copy.note} {entries.length} of {MAX_PICKS} chosen.{full && " You can choose up to 3."}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <X size={18} aria-hidden />
            </DialogPrimitive.Close>
          </div>

          <form role="search" className="flex gap-2 border-b border-border px-5 py-3"
            onSubmit={e => { e.preventDefault(); void search(query); }}>
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} maxLength={MAX_QUERY}
              aria-label="Search your posts by caption" placeholder="Search your posts by caption…" className={inputCls} />
            <button type="submit" className={`${btnGhost} shrink-0`}>Search</button>
            {activeQuery && (
              <button type="button" className={`${btnGhost} shrink-0`} onClick={() => { setQuery(""); void search(""); }}>Clear</button>
            )}
          </form>

          <div className="min-h-0 flex-1 overflow-y-auto" data-testid="picker-list">
            {loading && <p role="status" className="p-5 text-sm text-muted-foreground">Loading your posts…</p>}
            {!loading && list && shownPosts.length === 0 && (activeQuery
              ? <p className="p-5 text-sm text-muted-foreground" data-testid="picker-no-match">{copy.noMatch} "{activeQuery}".</p>
              : <p className="p-5 text-sm text-muted-foreground" data-testid="picker-empty">{copy.empty}</p>)}
            <ul className="divide-y divide-border">
              {shownPosts.map(post => {
                const checked = chosenUrls.has(post.post_url);
                const blocked = !checked && full;
                return (
                  <li key={post.id} data-testid="picker-row" onClick={() => toggle(post)}
                    className={`flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-white/5 ${checked ? "bg-primary/5" : ""} ${blocked ? "opacity-50" : ""}`}>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="truncate text-xs text-muted-foreground/70" data-testid="picker-post-url">{post.post_url}</p>
                      <p className="line-clamp-2 text-sm text-white/80">{post.caption_preview?.trim() || "(no caption)"}</p>
                      <p className="text-xs text-muted-foreground/70" data-testid="picker-posted-at">{postedAtLabel(post.timestamp)}</p>
                      <p className="text-xs text-muted-foreground">
                        Likes {formatCount(post.likes_count)} · Comments {formatCount(post.comments_count)} · Views {formatCount(post.views_count)}
                      </p>
                      <button type="button" disabled={!post.post_url} className="rounded-lg border border-primary/50 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-40"
                        onClick={e => { e.stopPropagation(); openPost(post.post_url); }}>
                        View post
                      </button>
                    </div>
                    <input type="checkbox" className="h-6 w-6 shrink-0 cursor-pointer accent-primary" checked={checked}
                      aria-disabled={blocked} aria-label={`Choose ${post.post_url}`}
                      onClick={e => e.stopPropagation()} onChange={() => toggle(post)} />
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-3 border-t border-border p-5">
            {message && <p role={message.kind === "error" ? "alert" : "status"}
              className={`text-sm ${message.kind === "error" ? "text-red-400" : "text-emerald-400"}`}>{message.text}</p>}
            <h3 className="text-sm font-semibold text-white">Add a post</h3>
            <div className="flex gap-2">
              <input value={url} onChange={e => setUrl(e.target.value)} disabled={adding} aria-label="Instagram post link"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
                placeholder="https://www.instagram.com/p/…" className={inputCls} />
              <button type="button" className={`${btnGhost} inline-flex shrink-0 items-center gap-2`} disabled={adding} onClick={() => void add()}>
                {adding && <Loader2 size={14} className="animate-spin" aria-hidden />}
                {adding ? "Reading the post…" : "Add post"}
              </button>
            </div>
            {adding && <p role="status" className="text-xs text-muted-foreground">MAVLIT is reading this post. This can take up to a minute.</p>}
            {partnership && onDescribe && <h3 className="text-sm font-semibold text-white">Or describe a partnership</h3>}
            {partnership && onDescribe && (
              <div className="flex gap-2">
                <input value={description} onChange={e => setDescription(e.target.value)} maxLength={500} aria-label="Or describe a partnership"
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); describe(); } }}
                  placeholder="e.g. Falscara lashes, 2025 campaign" className={inputCls} />
                <button type="button" className={`${btnGhost} shrink-0`} disabled={full || !description.trim()} onClick={describe}>Add</button>
              </div>
            )}
            <div className="flex justify-end pt-1">
              <button type="button" className={btnGhost} onClick={() => onOpenChange(false)}>Done</button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
