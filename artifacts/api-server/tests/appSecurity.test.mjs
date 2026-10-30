import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { createRequire } from "node:module";
import { request } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// The real app (app.ts: logging, CORS, origin check, body parsers, proxy, error handler); only the outgoing fetch is replaced. No server
// startup, database or real API.
process.env.NODE_ENV = "production";
process.env.LOG_LEVEL = "silent";
const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../src/app.ts", import.meta.url))],
  bundle: true, platform: "node", format: "cjs", packages: "external", write: false,
});
const mod = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const app = mod.exports.default;

const timeouts = [];
const realTimeout = AbortSignal.timeout.bind(AbortSignal);
AbortSignal.timeout = ms => { timeouts.push(ms); return realTimeout(ms); };

async function withApp(upstream, run) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), options }); return upstream(url, options); };
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const send = (path, { method = "GET", headers = {}, body } = {}) => new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port: server.address().port, path, method, headers, agent: false }, async res => {
      const chunks = [];
      for await (const chunk of res) chunks.push(chunk);
      resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString() });
    });
    req.on("error", reject);
    req.end(body);
  });
  try { await run(send, calls, server.address().port); }
  finally {
    globalThis.fetch = originalFetch;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
const ok = async () => new Response("{}", { headers: { "Content-Type": "application/json" } });
const json = { "Content-Type": "application/json" };

test("only the MAVLIT API paths the app uses are proxied; everything else is 404 without calling the API", async () => {
  await withApp(ok, async (send, calls) => {
    for (const path of ["/docs", "/redoc", "/openapi.json", "/admin/", "/admin/login", "/health/db", "/health", "/static/x.js", "/seed",
                        "/enrich/signals", "/score/brands", "/posthog-init.js", "/signin", "/", "/authx", "/matches-evil",
                        "/auth/../docs", "/auth/%2e%2e/openapi.json", "/pitches/../admin/", "//docs"]) {
      const response = await send("/api/mavlit" + path);
      assert.equal(response.status, 404, path);
      assert.deepEqual(JSON.parse(response.text), { detail: "Not found" }, path);
    }
    assert.equal(calls.length, 0, "the API was never called");
  });
});

test("every path the app calls is allowed", async () => {
  const paths = ["/auth/me", "/auth/login", "/auth/logout", "/auth/logout-all", "/creator-profile/me", "/creator-profile/me/posts",
                 "/creator-profile/me/posts/3/thumbnail", "/creator-profile/me/generate-description", "/matches/me", "/matches/me/v3/refresh",
                 "/matches/me/brands/4/posts", "/brands/12", "/dashboard/me", "/pitches", "/pitches/stream", "/pitches/me?limit=100&offset=0",
                 "/pitches/manual", "/pitches/9", "/rate-intelligence", "/rate-intelligence/latest?brand_id=1", "/contract-advice", "/own-brands",
                 "/own-brands/jobs/abc", "/saved-brands", "/saved-brands/me", "/saved-brands/5", "/brand-category-tags?niche=Music",
                 "/brand-niches", "/brand-niche-tags", "/brand-category-niches", "/creator-sub-niches"];
  await withApp(ok, async (send, calls) => {
    for (const path of paths) {
      const response = await send("/api/mavlit" + path);
      assert.notEqual(response.status, 404, path);
    }
    assert.equal(calls.length, paths.length);
  });
});

test("a cross-site write is refused with 403 before it reaches the API; allowed and same-site origins pass", async () => {
  await withApp(ok, async (send, calls, port) => {
    const post = (headers) => send("/api/mavlit/auth/logout", { method: "POST", headers: { ...json, ...headers }, body: "{}" });
    for (const headers of [{ Origin: "https://evil.example" }, { Origin: "null" }, { "Sec-Fetch-Site": "cross-site" }]) {
      const response = await post(headers);
      assert.equal(response.status, 403, JSON.stringify(headers));
      assert.deepEqual(JSON.parse(response.text), { detail: "Cross-site request refused" });
    }
    assert.equal(calls.length, 0);
    for (const headers of [{ Origin: "https://mavlit.com" }, { Origin: `http://127.0.0.1:${port}` }, {}, { "Sec-Fetch-Site": "same-origin" }]) {
      assert.equal((await post(headers)).status, 200, JSON.stringify(headers));
    }
    assert.equal(calls.length, 4);
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      assert.equal((await send("/api/mavlit/pitches/1", { method, headers: { ...json, Origin: "https://evil.example" }, body: "{}" })).status, 403, method);
    }
    assert.equal((await send("/api/mavlit/auth/me", { headers: { Origin: "https://evil.example" } })).status, 200, "a read is not blocked");
  });
});

test("ALLOWED_ORIGINS adds a staging origin", async () => {
  process.env.ALLOWED_ORIGINS = "https://mavlit.com, https://staging.mavlit.example/";
  try {
    await withApp(ok, async send => {
      const post = Origin => send("/api/mavlit/auth/logout", { method: "POST", headers: { ...json, Origin }, body: "{}" });
      assert.equal((await post("https://staging.mavlit.example")).status, 200);
      assert.equal((await post("https://mavlit.com")).status, 200);
      assert.equal((await post("https://evil.example")).status, 403);
    });
    process.env.ALLOWED_ORIGINS = "https://staging.mavlit.example";
    await withApp(ok, async send => {
      assert.equal((await send("/api/mavlit/auth/logout", { method: "POST", headers: { ...json, Origin: "https://mavlit.com" }, body: "{}" })).status, 403,
        "the default is replaced, not extended");
    });
  } finally { delete process.env.ALLOWED_ORIGINS; }
});

test("CORS: only the allowed origin, credentials, the five methods and two headers", async () => {
  await withApp(ok, async send => {
    const preflight = Origin => send("/api/mavlit/pitches", {
      method: "OPTIONS", headers: { Origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
    });
    const good = await preflight("https://mavlit.com");
    assert.equal(good.headers["access-control-allow-origin"], "https://mavlit.com");
    assert.equal(good.headers["access-control-allow-credentials"], "true");
    assert.equal(good.headers["access-control-allow-methods"], "GET,POST,PUT,PATCH,DELETE");
    assert.equal(good.headers["access-control-allow-headers"], "Content-Type,Accept");
    const bad = await preflight("https://evil.example");
    assert.equal(bad.headers["access-control-allow-origin"], undefined);
    assert.equal(bad.headers["access-control-allow-credentials"], undefined);
    const read = await send("/api/mavlit/auth/me", { headers: { Origin: "https://evil.example" } });
    assert.equal(read.headers["access-control-allow-origin"], undefined);
  });
});

test("body-parser errors are JSON; /contract-advice allows 64 KB, other routes 32 KB; urlencoded bodies are not parsed", async () => {
  await withApp(ok, async (send, calls) => {
    const bad = await send("/api/mavlit/pitches", { method: "POST", headers: json, body: "{not json" });
    assert.equal(bad.status, 400);
    assert.deepEqual(JSON.parse(bad.text), { detail: "The request body is not valid JSON." });
    const big = JSON.stringify({ contract_text: "x".repeat(40_000) });
    const refused = await send("/api/mavlit/pitches", { method: "POST", headers: json, body: big });
    assert.equal(refused.status, 413);
    assert.deepEqual(JSON.parse(refused.text), { detail: "The request is too large." });
    assert.equal(refused.headers["content-type"].startsWith("application/json"), true);
    assert.equal(calls.length, 0);
    assert.equal((await send("/api/mavlit/contract-advice", { method: "POST", headers: json, body: big })).status, 200);
    const tooBig = JSON.stringify({ contract_text: "x".repeat(70_000) });
    assert.equal((await send("/api/mavlit/contract-advice", { method: "POST", headers: json, body: tooBig })).status, 413);
    await send("/api/mavlit/pitches", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "a=1&b=2" });
    assert.equal(calls.at(-1).options.body, "{}", "form fields are not turned into JSON");
  });
});

test("timeouts: 90 s for contract advice and rate estimates, 180 s for pitches, 20 s for the rest", async () => {
  const expected = [["POST", "/contract-advice", 90_000], ["POST", "/rate-intelligence", 90_000], ["POST", "/pitches", 180_000],
                    ["POST", "/pitches/stream", 180_000], ["POST", "/creator-profile/me/posts", 180_000], ["GET", "/rate-intelligence/latest", 20_000],
                    ["POST", "/saved-brands", 20_000], ["GET", "/auth/me", 20_000]];
  await withApp(ok, async send => {
    for (const [method, path, ms] of expected) {
      timeouts.length = 0;
      await send("/api/mavlit" + path, { method, headers: json, body: method === "POST" ? "{}" : undefined });
      assert.deepEqual(timeouts, [ms], `${method} ${path}`);
    }
  });
});

test("a response over 5 MB is refused with 502 and sets no cookie; smaller ones pass", async () => {
  const mb = n => new Uint8Array(n * 1024 * 1024);
  await withApp(async () => new Response(mb(6), { headers: { "Set-Cookie": "access_token=x; Path=/" } }), async send => {
    const response = await send("/api/mavlit/auth/me");
    assert.equal(response.status, 502);
    assert.deepEqual(JSON.parse(response.text), { detail: "MAVLIT API response was too large" });
    assert.equal(response.headers["set-cookie"], undefined);
  });
  await withApp(async () => new Response(new ReadableStream({ start(c) { for (let i = 0; i < 6; i++) c.enqueue(mb(1)); c.close(); } })), async send => {
    assert.equal((await send("/api/mavlit/auth/me")).status, 502, "no Content-Length: counted while reading");
  });
  await withApp(async () => new Response(mb(2)), async send => {
    const response = await send("/api/mavlit/auth/me");
    assert.equal(response.status, 200);
    assert.equal(response.text.length, 2 * 1024 * 1024);
  });
});
