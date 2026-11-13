import { useEffect, useState } from "react";
import { Lightbulb, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FeedPartnership } from "@/data/feed";
import { contentIdeas } from "@/lib/feedCompare";
import { brandById, creatorById } from "@/lib/feedData";
import { Chip } from "./FeedVisuals";

/** Pretend-AI: shows ideas hard-coded per content category. A short "thinking" state makes regenerate feel real. */
export default function IdeasDialog({ post, onClose }: { post: FeedPartnership | null; onClose: () => void }) {
  const [round, setRound] = useState(0);
  const [thinking, setThinking] = useState(false);
  useEffect(() => { setRound(0); setThinking(false); }, [post?.id]);
  useEffect(() => {
    if (!thinking) return;
    const timer = window.setTimeout(() => setThinking(false), 600);
    return () => window.clearTimeout(timer);
  }, [thinking]);
  const ideas = post ? contentIdeas(post, round) : [];
  const brand = post ? brandById.get(post.brandId) : undefined;
  const creator = post ? creatorById.get(post.creatorId) : undefined;
  return (
    <Dialog open={!!post} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-border bg-card sm:rounded-2xl">
        {post && brand && creator && (
          <div className="flex flex-col gap-4">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2 text-lg font-extrabold text-white"><Lightbulb size={18} className="text-primary" aria-hidden="true" />Content ideas like this</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">Inspired by @{creator.handle}'s {brand.name} post. Prototype suggestions, not generated live.</DialogDescription>
            </DialogHeader>
            <blockquote className="rounded-xl border border-border bg-background/50 p-3 text-sm italic text-muted-foreground">“{post.description}”</blockquote>
            {thinking ? (
              <p role="status" className="py-10 text-center text-sm text-muted-foreground">Thinking up fresh angles…</p>
            ) : (
              <ol className="flex flex-col gap-3" data-testid="content-ideas">
                {ideas.map((idea, i) => (
                  <li key={idea.title} className="flex gap-3 rounded-xl border border-border bg-background/40 p-3.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-extrabold text-primary">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{idea.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{idea.hook}</p>
                      <span className="mt-2 inline-block"><Chip tone="primary">{idea.format}</Chip></span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <button type="button" disabled={thinking} onClick={() => { setRound((r) => r + 1); setThinking(true); }}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-primary/40 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-50">
              <RefreshCw size={14} aria-hidden="true" />Show different ideas
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
