import cors from "cors";
import type { ErrorRequestHandler, RequestHandler } from "express";

// Origins allowed to call the proxy with the login cookie. The browser app is served from the same site, so this is normally just
// https://mavlit.com; add a staging origin through ALLOWED_ORIGINS (comma separated, no trailing slash).
export function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "https://mavlit.com").split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
}

export const corsMiddleware: RequestHandler = (req, res, next) =>
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins().includes(origin)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Accept"],
    maxAge: 600,
  })(req, res, next);

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// A browser sends the login cookie with a request another website triggers. For cookie-authenticated unsafe methods the request must come
// from an allowed origin or from this site itself (the Origin's host is the Host of the request). Without an Origin header, a browser that
// says Sec-Fetch-Site: cross-site is refused; requests with neither header (curl, servers) carry no ambient cookie to abuse.
export const originCheck: RequestHandler = (req, res, next) => {
  if (!UNSAFE.has(req.method)) return next();
  const origin = req.headers.origin;
  let allowed: boolean;
  if (typeof origin !== "string") {
    allowed = String(req.headers["sec-fetch-site"] ?? "").toLowerCase() !== "cross-site";
  } else {
    const clean = origin.trim().replace(/\/$/, "");
    let host = "";
    try { host = new URL(clean).host.toLowerCase(); } catch { /* "null" and garbage are refused */ }
    allowed = allowedOrigins().includes(clean) || (host !== "" && host === String(req.headers.host ?? "").toLowerCase());
  }
  if (!allowed) {
    res.status(403).json({ detail: "Cross-site request refused" });
    return;
  }
  next();
};

// body-parser errors as JSON, never an HTML page or a stack trace.
export const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === "entity.too.large") { res.status(413).json({ detail: "The request is too large." }); return; }
  if (err?.type === "entity.parse.failed" || err?.type === "encoding.unsupported" || err?.type === "charset.unsupported") {
    res.status(400).json({ detail: "The request body is not valid JSON." });
    return;
  }
  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({ detail: status === 500 ? "Internal server error" : "Request failed" });
};
