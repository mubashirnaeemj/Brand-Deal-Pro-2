import { useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";
import { thumbnailPath } from "@/lib/creatorPosts";

/**
 * A square post picture, or a grey "No picture" box when there is none or it cannot be loaded.
 * The picture is fetched with the sign-in cookie (an <img> address would not carry it) once the row
 * scrolls into view, and the object URL is released when the row goes away.
 */
export default function PostThumbnail({ url, size }: { url: string | null | undefined; size: number }) {
  const path = thumbnailPath(url);
  const holder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = holder.current;
    if (!path || !node) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [path]);

  useEffect(() => {
    setSrc(null);
    setFailed(false);
    if (!path || !visible) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    (async () => {
      try {
        const response = await fetch(`${API_BASE}${path}`, { credentials: "include", signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        objectUrl = URL.createObjectURL(await response.blob());
        if (controller.signal.aborted) { URL.revokeObjectURL(objectUrl); return; }
        setSrc(objectUrl);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path, visible]);

  const box = { width: size, height: size };
  if (!path || failed) {
    return (
      <div data-testid="post-thumbnail-empty" style={box}
        className="flex shrink-0 items-center justify-center rounded-lg border border-black/40 bg-muted/40 p-1 text-center text-[10px] leading-tight text-muted-foreground">
        No picture
      </div>
    );
  }
  if (!src) return <div ref={holder} data-testid="post-thumbnail-loading" style={box} className="shrink-0 rounded-lg border border-black/40 bg-black/60" />;
  return (
    <img data-testid="post-thumbnail" src={src} alt="" style={box} onError={() => setFailed(true)}
      className="shrink-0 rounded-lg border border-black/40 bg-black/60 object-cover" />
  );
}
