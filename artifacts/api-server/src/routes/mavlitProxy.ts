import { Router, type IRouter, type Request } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const router: IRouter = Router();
const UPSTREAM = "https://api.mavlit.com";

// Only the MAVLIT API routes the app uses are proxied. Everything else (/docs, /redoc, /openapi.json, /admin, /static, /health*, the operator
// routes, the API's own HTML pages) answers 404 here without calling the API.
export const ALLOWED_PATH = /^\/(auth|creator-profile|matches|brands|dashboard|pitches|rate-intelligence|contract-advice|own-brands|saved-brands|brand-niches|brand-niche-tags|brand-category-niches|brand-category-tags|creator-sub-niches)(\/|$)/;

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;   // a proxied (non-stream) response is held in memory: refuse anything larger
const NORMAL_TIMEOUT_MS = 20_000;
const ADVISORY_TIMEOUT_MS = 90_000;           // one LLM call: rate estimate, contract review
const PITCH_TIMEOUT_MS = 180_000;             // a pitch (or a new profile post) can take ~2 minutes when MAVLIT first scrapes an Instagram post

async function readCapped(body: ReadableStream<Uint8Array> | null): Promise<Buffer | null> {
  if (!body) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  let size = 0;
  const reader = body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); return null; }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size);
}

// Re-issue the upstream session cookie for the browser. Domain stays unset (host-only). Path is limited to this proxy because the app only
// sends credentials to /api/mavlit. SameSite=Lax: the app and the proxy are the same site, so no cross-site request needs the cookie.
// Max-Age/Expires come from the API untouched (the API sets them, 30 days by default). A delete from the API (Max-Age=0) goes through the
// same function, so it always carries exactly the attributes the cookie was set with.
const COOKIE_ATTRIBUTES = ["Path=/api/mavlit", "SameSite=Lax", "Secure", "HttpOnly"];

function localCookie(cookie: string): string {
  const parts = cookie.split(";").filter((part) => !/^\s*(domain|path|samesite|secure|partitioned|httponly)(?:\s*=|$)/i.test(part));
  return [...parts, ...COOKIE_ATTRIBUTES].join("; ");
}

// Earlier versions set the cookie as SameSite=None; Partitioned. That is a different cookie to the browser, so it would linger next to the
// new one and could be sent first. Every time the API sets or clears access_token, also delete that old one. Safe to remove after ~7 days.
const LEGACY_ACCESS_TOKEN_DELETE =
  "access_token=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/api/mavlit; SameSite=None; Secure; Partitioned; HttpOnly";

export function localCookies(upstreamCookies: string[]): string[] {
  const rewritten = upstreamCookies.map(localCookie);
  return upstreamCookies.some((cookie) => /^\s*access_token=/i.test(cookie)) ? [...rewritten, LEGACY_ACCESS_TOKEN_DELETE] : rewritten;
}

// The API's CSRF check looks at Origin / Sec-Fetch-Site, its login lockout at the client address; pass what the browser sent.
// Never send Cloudflare's own headers (cf-*, true-client-ip, x-forwarded-host...): api.mavlit.com sits behind Cloudflare, which answers 403
// to a request that carries them. Only the allow-list below is ever copied from the browser request.
function forwardedHeaders(req: Request, headers: Headers): void {
  for (const name of ["origin", "sec-fetch-site"]) {
    const value = req.headers[name];
    if (typeof value === "string" && value) headers.set(name, value);
  }
  const peer = req.socket.remoteAddress;
  const chain = [req.headers["x-forwarded-for"], peer].flat().filter((value): value is string => typeof value === "string" && value !== "");
  if (chain.length) headers.set("X-Forwarded-For", chain.join(", "));
}

router.use(async (req, res): Promise<void> => {
  if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.sendStatus(405);
    return;
  }

  const target = new URL(UPSTREAM);
  target.pathname = req.path;
  // Test the path AFTER the URL parser has resolved "..", "%2e%2e" and backslashes: "/auth/../docs" must not get past the allow-list.
  if (!ALLOWED_PATH.test(target.pathname)) {
    res.status(404).json({ detail: "Not found" });
    return;
  }
  target.search = new URL(req.originalUrl, "http://localhost").search;

  const streaming = req.method === "POST" && req.path === "/pitches/stream";
  const slowPitch = streaming || (req.method === "POST" && ["/pitches", "/creator-profile/me/posts"].includes(req.path));
  const advisory = req.method === "POST" && ["/contract-advice", "/rate-intelligence"].includes(req.path);
  const timeoutMs = slowPitch ? PITCH_TIMEOUT_MS : advisory ? ADVISORY_TIMEOUT_MS : NORMAL_TIMEOUT_MS;
  // Post thumbnails are images that MAVLIT caches; let the browser keep them too.
  const thumbnail = req.method === "GET" && /^\/creator-profile\/me\/posts\/[^/]+\/thumbnail$/.test(req.path);
  const headers = new Headers({ Accept: streaming ? "text/event-stream" : thumbnail ? "image/*,*/*;q=0.8" : "application/json" });
  const accessToken = req.cookies?.access_token;
  if (typeof accessToken === "string") headers.set("Cookie", `access_token=${accessToken}`);
  const hasBody = !["GET", "HEAD", "DELETE"].includes(req.method);
  if (hasBody) headers.set("Content-Type", "application/json");
  forwardedHeaders(req, headers);

  const disconnected = new AbortController();
  const onClose = () => { if (!res.writableEnded) disconnected.abort(); };
  if (streaming) res.on("close", onClose);
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      redirect: "manual",
      signal: AbortSignal.any([disconnected.signal, AbortSignal.timeout(timeoutMs)]),
    });

    const upstreamCache = upstream.headers.get("cache-control");
    // Cookie-authenticated pictures stay private to this browser.
    res.setHeader("Cache-Control", thumbnail && upstream.ok && upstreamCache ? upstreamCache.replace(/\bpublic\b/i, "private") : "no-store");
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", localCookies(cookies));
    if (streaming && upstream.ok && contentType?.includes("text/event-stream") && upstream.body) {
      res.status(upstream.status);
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      await pipeline(Readable.fromWeb(upstream.body), res);
      return;
    }
    const declared = Number(upstream.headers.get("content-length") ?? 0);
    const body = declared > MAX_RESPONSE_BYTES ? null : await readCapped(upstream.body);
    if (body === null) {
      res.removeHeader("Set-Cookie");
      res.status(502).json({ detail: "MAVLIT API response was too large" });
      return;
    }
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