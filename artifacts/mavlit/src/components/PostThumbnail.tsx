import { useEffect, useState } from "react";
import { thumbnailSrc } from "@/lib/creatorPosts";

/** A square post picture, or a grey "No picture" box when there is none or it cannot be loaded. */
export default function PostThumbnail({ url, size }: { url: string | null | undefined; size: number }) {
  const src = thumbnailSrc(url);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const box = { width: size, height: size };
  if (!src || failed) {
    return (
      <div data-testid="post-thumbnail-empty" style={box}
        className="flex shrink-0 items-center justify-center rounded-lg border border-black/40 bg-muted/40 p-1 text-center text-[10px] leading-tight text-muted-foreground">
        No picture
      </div>
    );
  }
  return (
    <img data-testid="post-thumbnail" src={src} alt="" loading="lazy" style={box} onError={() => setFailed(true)}
      className="shrink-0 rounded-lg border border-black/40 bg-black/60 object-cover" />
  );
}
