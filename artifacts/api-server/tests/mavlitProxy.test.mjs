import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { createRequire } from "node:module";
import { request } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import express from "express";
import cookieParser from "cookie-parser";

// Compile only the router in memory; no server startup, database or real API.
const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../src/routes/mavlitProxy.ts", import.meta.url))],
  bundle: true, platform: "node", format: "cjs", packages: "external", write: false,
});
const mod = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(
  createRequire(import.meta.url), mod, mod.exports,
);
const router = mod.exports.default;
const encode = text => new TextEncoder().encode(text);

async function withProxy(upstream, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = upstream;
  const app = express();
  app.use(express.json(), cookieParser());
  app.use((req, _res, next) => { req.log = { error() {} }; next(); });
  app.use("/api/mavlit", router);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const send = (path = "/api/mavlit/pitches/stream", method = "POST") => new Promise((resolve, reject) => {
    const req = request({
      host: "127.0.0.1", port: server.address().port, path, method,
      headers: { "Content-Type": "application/json", Cookie: "access_token=synthetic-fixture" },
    }, resolve);
    req.on("error", reject);
    req.end(method === "POST" ? JSON.stringify({ is_custom: false, brand_id: 7, story: "Synthetic story" }) : undefined);
  });
  try { await run(send); }
  finally {
    globalThis.fetch = originalFetch;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

test("proxy forwards the first SSE delta before the upstream completes", async () => {
  let controller;
  let upstreamCall;
  const first = 'data: {"type":"delta","text":"Live"}\n\n';
  const final = 'data: {"type":"done","pitch":{"id":43,"pitch_text":"Live final"}}\n\n';
  await withProxy(async (url, options) => {
    upstreamCall = { url: String(url), options };
    return new Response(new ReadableStream({
      start(value) { controller = value; value.enqueue(encode(first)); },
    }), { headers: { "Content-Type": "text/event-stream" } });
  }, async send => {
    const response = await send();
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["x-accel-buffering"], "no");
    assert.equal(response.headers["cache-control"], "no-cache, no-transform");
    const reader = response[Symbol.asyncIterator]();
    const initial = await reader.next();
    assert.equal(initial.value.toString(), first);
    assert.equal(upstreamCall.url, "https://api.mavlit.com/pitches/stream");
    assert.equal(upstreamCall.options.headers.get("Accept"), "text/event-stream");
    assert.equal(upstreamCall.options.headers.get("Cookie"), "access_token=synthetic-fixture");
    assert.equal(JSON.parse(upstreamCall.options.body).brand_id, 7);
    controller.enqueue(encode(final));
    controller.close();
    let remaining = "";
    for await (const chunk of reader) remaining += chunk.toString();
    assert.equal(remaining, final);
  });
});

test("proxy preserves normal HTTP errors before the stream begins", async () => {
  await withProxy(async () => new Response(JSON.stringify({ detail: "Brand not found" }), {
    status: 404, headers: { "Content-Type": "application/json" },
  }), async send => {
    const response = await send();
    let body = "";
    for await (const chunk of response) body += chunk.toString();
    assert.equal(response.statusCode, 404);
    assert.deepEqual(JSON.parse(body), { detail: "Brand not found" });
  });
});

test("browser disconnect aborts the upstream stream", async () => {
  let upstreamSignal;
  await withProxy(async (_url, options) => {
    upstreamSignal = options.signal;
    return new Response(new ReadableStream({
      start(controller) { controller.enqueue(encode('data: {"type":"delta","text":"Hi"}\n\n')); },
    }), { headers: { "Content-Type": "text/event-stream" } });
  }, async send => {
    const response = await send();
    await once(response, "data");
    response.destroy();
    for (let attempt = 0; attempt < 50 && !upstreamSignal.aborted; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(upstreamSignal.aborted, true);
  });
});

test("post thumbnails are requested as images and may be cached privately by the browser", async () => {
  let upstreamCall;
  const image = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);
  await withProxy(async (url, options) => {
    upstreamCall = { url: String(url), options };
    return new Response(image, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" } });
  }, async send => {
    const response = await send("/api/mavlit/creator-profile/me/posts/12/thumbnail", "GET");
    const chunks = [];
    for await (const chunk of response) chunks.push(chunk);
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "image/jpeg");
    assert.equal(response.headers["cache-control"], "private, max-age=86400");
    assert.deepEqual([...Buffer.concat(chunks)], [...image]);
    assert.equal(upstreamCall.url, "https://api.mavlit.com/creator-profile/me/posts/12/thumbnail");
    assert.match(upstreamCall.options.headers.get("Accept"), /^image\//);
  });
});

test("other responses, including thumbnail errors, are never cached", async () => {
  await withProxy(async () => new Response("{}", { status: 404, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" } }), async send => {
    const response = await send("/api/mavlit/creator-profile/me/posts/12/thumbnail", "GET");
    for await (const _ of response); // drain
    assert.equal(response.statusCode, 404);
    assert.equal(response.headers["cache-control"], "no-store");
  });
  await withProxy(async () => new Response("{}", { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" } }), async send => {
    const response = await send("/api/mavlit/creator-profile/me", "GET");
    for await (const _ of response); // drain
    assert.equal(response.headers["cache-control"], "no-store");
  });
});
