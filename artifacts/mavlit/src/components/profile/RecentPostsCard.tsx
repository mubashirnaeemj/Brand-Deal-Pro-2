import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { INPUT_CLASS } from "@/components/onboarding/types";
import {
  addCreatorPost, deleteCreatorPost, isPostsList, listCreatorPosts, setPostPartnership,
  formatCount, postedAtLabel, type CreatorPost, type CreatorPostsList,
} from "@/lib/creatorPosts";

type Message = { kind: "error" | "success"; text: string };
type Props = { posts: CreatorPostsList | null; onPostsChange: Dispatch<SetStateAction<CreatorPostsList | null>> };

const MAX_QUERY = 100;
const errorText = (cause: unknown, fallback: string) => cause instanceof Error && cause.message ? cause.message : fallback;
const btnGhost = "rounded-xl border border-border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** The creator's scraped Instagram posts; shown only when MAVLIT has read some. */
export default function RecentPostsCard({ posts, onPostsChange }: Props) {
  const [open, setOpen] = useState(false);
  if (!posts || posts.total <= 0) return null;
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="recent-posts-title" data-testid="recent-posts-card">
      <h2 id="recent-posts-title" className="text-lg font-bold text-white">Your recent Instagram posts</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        The posts MAVLIT has read from your Instagram. Mark the ones that were paid partnerships, remove posts you don't want to use, or add a post by its link.
      </p>
      <button type="button" className={`${btnGhost} mt-4`} onClick={() => setOpen(true)}>View your recent Instagram posts</button>
      <PostsDialog open={open} onOpenChange={setOpen} posts={posts} onPostsChange={onPostsChange} />
    </section>
  );
}

function PostsDialog({ open, onOpenChange, posts, onPostsChange }: {
  open: boolean; onOpenChange: (open: boolean) => void; posts: CreatorPostsList; onPostsChange: Props["onPostsChange"];
}) {
  const [message, setMessage] = useState<Message | null>(null);
  const [toggling, setToggling] = useState<ReadonlySet<CreatorPost["id"]>>(new Set());
  const [deleting, setDeleting] = useState<CreatorPost["id"] | null>(null);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const listRequest = useRef(0);
  useEffect(() => { if (!open) setMessage(null); }, [open]);

  // Always asks the API: the server matches the whole caption, the list only carries its start.
  const reload = async (q: string) => {
    const request = ++listRequest.current;
    const updated = await listCreatorPosts(q);
    if (!isPostsList(updated)) throw new Error("MAVLIT returned an unexpected response. Please reload.");
    if (request === listRequest.current) onPostsChange(updated);
  };

  const search = async (text: string) => {
    const q = text.trim().slice(0, MAX_QUERY);
    if (searching) return;
    setMessage(null);
    setSearching(true);
    try {
      await reload(q);
      setActiveQuery(q);
      setQuery(q);
    } catch (cause) {
      setMessage({ kind: "error", text: errorText(cause, "Could not search your posts.") });
    } finally {
      setSearching(false);
    }
  };

  // Reopening starts with an empty search and the full list.
  const handleOpenChange = (next: boolean) => {
    if (!next && activeQuery) {
      setQuery("");
      setActiveQuery("");
      void reload("").catch(() => {});
    }
    onOpenChange(next);
  };

  const patchPost = (id: CreatorPost["id"], changes: Partial<CreatorPost>) =>
    onPostsChange(list => list && { ...list, posts: list.posts.map(post => post.id === id ? { ...post, ...changes } : post) });

  const toggle = async (post: CreatorPost, next: boolean) => {
    setMessage(null);
    setToggling(ids => new Set(ids).add(post.id));
    patchPost(post.id, { is_partnership_post: next });
    try {
      patchPost(post.id, { is_partnership_post: (await setPostPartnership(post.id, next)).is_partnership_post ?? next });
    } catch (cause) {
      patchPost(post.id, { is_partnership_post: !next });
      setMessage({ kind: "error", text: errorText(cause, "Could not update this post.") });
    } finally {
      setToggling(ids => { const rest = new Set(ids); rest.delete(post.id); return rest; });
    }
  };

  const remove = async (post: CreatorPost) => {
    if (!posts.can_delete || !window.confirm("Delete this post from your profile?")) return;
    setMessage(null);
    setDeleting(post.id);
    try {
      const updated = await deleteCreatorPost(post.id);
      if (!isPostsList(updated)) throw new Error("MAVLIT returned an unexpected response. Please reload.");
      if (activeQuery) {
        // The DELETE response lists every post; show the matches again.
        try { await reload(activeQuery); }
        catch (cause) { setMessage({ kind: "error", text: `Post deleted, but the list could not be refreshed: ${errorText(cause, "please reload.")}` }); }
      } else onPostsChange(updated);
    } catch (cause) {
      setMessage({ kind: "error", text: errorText(cause, "Could not delete this post.") });
    } finally {
      setDeleting(null);
    }
  };

  const add = async () => {
    const postUrl = url.trim();
    if (adding) return;
    if (!postUrl) { setMessage({ kind: "error", text: "Paste the link of an Instagram post." }); return; }
    setMessage(null);
    setAdding(true);
    try {
      await addCreatorPost(postUrl);
    } catch (cause) {
      setMessage({ kind: "error", text: errorText(cause, "Could not add this post.") });
      setAdding(false);
      return;
    }
    setUrl("");
    try {
      await reload(activeQuery);
      setMessage({ kind: "success", text: "Post added." });
    } catch (cause) {
      setMessage({ kind: "error", text: `Post added, but the list could not be refreshed: ${errorText(cause, "please reload.")}` });
    } finally {
      setAdding(false);
    }
  };

  const usualNote = posts.can_delete
    ? `You have ${posts.total} posts. A post can be deleted while more than ${posts.min_keep} remain.`
    : `You have ${posts.total} posts. At least ${posts.min_keep} posts stay on your profile, so nothing can be deleted until you add more.`;
  const note = activeQuery ? `${posts.shown ?? posts.posts.length} of your posts match your search. ${usualNote}` : usualNote;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay data-testid="posts-overlay" className="fixed inset-0 z-50 bg-black/60"
          style={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }} />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <DialogPrimitive.Title className="text-lg font-bold text-white">Your recent Instagram posts</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{note}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <X size={18} aria-hidden />
            </DialogPrimitive.Close>
          </div>

          <form role="search" className="flex gap-2 border-b border-border px-5 py-3"
            onSubmit={e => { e.preventDefault(); void search(query); }}>
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} maxLength={MAX_QUERY}
              aria-label="Search your posts by caption" placeholder="Search your posts by caption…" className={INPUT_CLASS} />
            <button type="submit" className={`${btnGhost} shrink-0`} disabled={searching}>Search</button>
            {activeQuery && (
              <button type="button" className={`${btnGhost} shrink-0`} disabled={searching} onClick={() => void search("")}>Clear</button>
            )}
          </form>

          {posts.posts.length === 0 && activeQuery && (
            <p className="p-5 text-sm text-muted-foreground" data-testid="posts-no-match">No post caption contains "{activeQuery}".</p>
          )}
          <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto" data-testid="posts-list">
            {posts.posts.map(post => (
              <li key={post.id} className="space-y-2 p-4" data-testid="post-row">
                <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-primary hover:underline">{post.post_url}</a>
                <p className="line-clamp-2 text-sm text-white/80">{post.caption_preview?.trim() || "(no caption)"}</p>
                <p className="text-xs text-muted-foreground/70" data-testid="post-posted-at">{postedAtLabel(post.timestamp)}</p>
                <p className="text-xs text-muted-foreground">
                  Likes {formatCount(post.likes_count)} · Comments {formatCount(post.comments_count)} · Views {formatCount(post.views_count)}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-white">
                    <Switch checked={post.is_partnership_post} disabled={toggling.has(post.id)}
                      aria-label={`Paid partnership: ${post.post_url}`}
                      onCheckedChange={next => void toggle(post, next)} />
                    Paid partnership
                  </label>
                  <span title={posts.can_delete ? undefined : `At least ${posts.min_keep} posts have to stay`}>
                    <button type="button" className={btnGhost} aria-label={`Delete ${post.post_url}`}
                      disabled={!posts.can_delete || deleting !== null}
                      title={posts.can_delete ? undefined : `At least ${posts.min_keep} posts have to stay`}
                      onClick={() => void remove(post)}>
                      Delete
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-3 border-t border-border p-5">
            {message && <p role={message.kind === "error" ? "alert" : "status"}
              className={`text-sm ${message.kind === "error" ? "text-red-400" : "text-emerald-400"}`}>{message.text}</p>}
            <h3 className="text-sm font-semibold text-white">Add a post</h3>
            <div className="flex gap-2">
              <input value={url} onChange={e => setUrl(e.target.value)} disabled={adding} aria-label="Instagram post link"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
                placeholder="https://www.instagram.com/p/…" className={INPUT_CLASS} />
              <button type="button" className={`${btnGhost} inline-flex shrink-0 items-center gap-2`} disabled={adding} onClick={() => void add()}>
                {adding && <Loader2 size={14} className="animate-spin" aria-hidden />}
                {adding ? "Reading the post…" : "Add post"}
              </button>
            </div>
            {adding && <p role="status" className="text-xs text-muted-foreground">MAVLIT is reading this post. This can take up to a minute.</p>}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
