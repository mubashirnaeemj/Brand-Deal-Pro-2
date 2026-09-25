import { Router, type IRouter } from "express";

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

  const headers = new Headers({ Accept: "application/json" });
  const accessToken = req.cookies?.access_token;
  if (typeof accessToken === "string") headers.set("Cookie", `access_token=${accessToken}`);
  const hasBody = !["GET", "HEAD", "DELETE"].includes(req.method);
  if (hasBody) headers.set("Content-Type", "application/json");

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });

    res.setHeader("Cache-Control", "no-store");
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", cookies.map(localCookie));
    const body = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(body);
  } catch (err) {
    req.log.error({ err }, "MAVLIT API proxy request failed");
    res.status(502).json({ detail: "MAVLIT API is temporarily unreachable" });
  }
});

export default router;