import { Router, type IRouter } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const router: IRouter = Router();
const UPSTREAM = "https://api.mavlit.com";

// Keep the upstream session cookie scoped to this same-origin proxy. The
// partitioned attribute lets it work when the app is shown in an iframe.
function localCookie(cookie: string): string {
  const parts = cookie.split(";").filter((part) => !/^\s*(domain|path|samesite|secure|partitioned|httponly)(?:\s*=|$)/i.test(part));
  return [...parts, "Path=/api/mavlit", "SameSite=None", "Secure", "Partitioned", "HttpOnly"].join("; ");
}

router.use(async (req, res): Promise<void> => {
  if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.sendStatus(405);
    return;
  }

  const target = new URL(UPSTREAM);
  target.pathname = req.path;
  target.search = new URL(req.originalUrl, "http://localhost").search;

  const streaming = req.method === "POST" && req.path === "/pitches/stream";
  // A pitch or a new profile post can take ~2 minutes when MAVLIT first scrapes an Instagram post.
  const slowPitch = streaming || (req.method === "POST" && ["/pitches", "/creator-profile/me/posts"].includes(req.path));
  // Post thumbnails are images that MAVLIT caches; let the browser keep them too.
  const thumbnail = req.method === "GET" && /^\/creator-profile\/me\/posts\/[^/]+\/thumbnail$/.test(req.path);
  const headers = new Headers({ Accept: streaming ? "text/event-stream" : thumbnail ? "image/*,*/*;q=0.8" : "application/json" });
  const accessToken = req.cookies?.access_token;
  if (typeof accessToken === "string") headers.set("Cookie", `access_token=${accessToken}`);
  const hasBody = !["GET", "HEAD", "DELETE"].includes(req.method);
  if (hasBody) headers.set("Content-Type", "application/json");

  const disconnected = new AbortController();
  const onClose = () => { if (!res.writableEnded) disconnected.abort(); };
  if (streaming) res.on("close", onClose);
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      redirect: "manual",
      signal: AbortSignal.any([disconnected.signal, AbortSignal.timeout(slowPitch ? 180_000 : 20_000)]),
    });

    const upstreamCache = upstream.headers.get("cache-control");
    // Cookie-authenticated pictures stay private to this browser.
    res.setHeader("Cache-Control", thumbnail && upstream.ok && upstreamCache ? upstreamCache.replace(/\bpublic\b/i, "private") : "no-store");
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", cookies.map(localCookie));
    if (streaming && upstream.ok && contentType?.includes("text/event-stream") && upstream.body) {
      res.status(upstream.status);
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      await pipeline(Readable.fromWeb(upstream.body), res);
      return;
    }
    const body = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(body);
  } catch (err) {
    if (disconnected.signal.aborted) return;
    req.log.error({ err }, "MAVLIT API proxy request failed");
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.status(502).json({ detail: "MAVLIT API is temporarily unreachable" });
  } finally {
    if (streaming) res.off("close", onClose);
  }
});

export default router;