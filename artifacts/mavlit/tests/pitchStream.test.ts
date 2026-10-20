import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { generatePitch, INCOMPLETE_PITCH } from "@/lib/pitchStream";

const pitch = { id: 43, brand_name: "Fixture Brand", pitch_text: "Hi Lauren,\n\nCafé 🎸", status: "generated", sent_at: null };
const body = { is_custom: false, brand_id: 7, story: "My story" };
const event = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`;
const done = event({ type: "done", pitch });

function mockChunks(chunks: Uint8Array[]) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  const fetch = vi.fn().mockResolvedValue(new Response(stream, { headers: { "Content-Type": "text/event-stream" } }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
const encode = (text: string) => new TextEncoder().encode(text);

describe("pitch SSE transport", () => {
  it("appends deltas in order, tolerating every byte boundary and UTF-8 splits", async () => {
    const text = event({ type: "delta", text: "Hi Lauren,\n\n" }) +
      event({ type: "delta", text: "Café 🎸" }) + done;
    const fetch = mockChunks(Array.from(encode(text), (byte) => new Uint8Array([byte])));
    const delta = vi.fn();
    expect(await generatePitch(body, delta)).toEqual(pitch);
    expect(delta.mock.calls).toEqual([["Hi Lauren,\n\n"], ["Café 🎸"]]);
    expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/mavlit/pitches/stream", expect.objectContaining({
      method: "POST", credentials: "include", body: JSON.stringify(body),
    }));
    const headers = fetch.mock.calls[0][1].headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Accept")).toBe("text/event-stream");
  });

  it("delivers a delta before the final event arrives", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream<Uint8Array>({
      start(value) { controller = value; },
    }))));
    const delta = vi.fn();
    const result = generatePitch(body, delta);
    controller.enqueue(encode(event({ type: "delta", text: "Live text" })));
    await vi.waitFor(() => expect(delta).toHaveBeenCalledWith("Live text"));
    controller.enqueue(encode(done));
    controller.close();
    expect(await result).toEqual(pitch);
  });

  it("handles CRLF blocks and multiple data lines with comments", async () => {
    mockChunks([encode(': heartbeat\r\n\r\ndata: {"type":"delta","text":"Hi"}\r\ndata: {"type":"delta","text":"!"}\r\n\r\n' + done.replace(/\n/g, "\r\n"))]);
    const delta = vi.fn();
    await generatePitch(body, delta);
    expect(delta.mock.calls).toEqual([["Hi"], ["!"]]);
  });

  it.each([null, {}])("reads text once when a reader is unavailable (%j)", async (streamBody) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, body: streamBody, text: async () => event({ type: "delta", text: "Buffered" }) + done,
    }));
    const delta = vi.fn();
    expect(await generatePitch(body, delta)).toEqual(pitch);
    expect(delta).toHaveBeenCalledWith("Buffered");
  });

  it.each([400, 401, 404, 422])("surfaces HTTP %i without attempting another generation", async (status) => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Fixture API error" }), { status }));
    vi.stubGlobal("fetch", fetch);
    const unauthorized = vi.fn();
    window.addEventListener("mavlit:unauthorized", unauthorized);
    await expect(generatePitch(body, vi.fn())).rejects.toThrow("Fixture API error");
    expect(fetch).toHaveBeenCalledOnce();
    expect(unauthorized).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    window.removeEventListener("mavlit:unauthorized", unauthorized);
  });

  it("uses legacy generation only when streaming explicitly is not implemented", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 501 })));
    const fallback = vi.spyOn(api, "post").mockResolvedValue(pitch);
    expect(await generatePitch(body, vi.fn())).toEqual(pitch);
    expect(fallback).toHaveBeenCalledExactlyOnceWith("/pitches", body);
  });

  it("shows streamed errors without falling back or saving a partial pitch", async () => {
    const fetch = mockChunks([encode(event({ type: "delta", text: "Partial" }) +
      event({ type: "error", detail: "Generation failed upstream" }))]);
    await expect(generatePitch(body, vi.fn())).rejects.toThrow("Generation failed upstream");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each([
    event({ type: "delta", text: "Partial" }),
    'data: {"type":"done","pitch":',
    "",
  ])("rejects a stream that ends without a complete done event", async (text) => {
    mockChunks([encode(text)]);
    await expect(generatePitch(body, vi.fn())).rejects.toThrow(INCOMPLETE_PITCH);
  });

  it("reports a dropped connection without retrying generation", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const fetch = vi.fn().mockResolvedValue(new Response(new ReadableStream<Uint8Array>({
      start(value) { controller = value; },
    })));
    vi.stubGlobal("fetch", fetch);
    const delta = vi.fn();
    const result = generatePitch(body, delta);
    const assertion = expect(result).rejects.toThrow(INCOMPLETE_PITCH);
    controller.enqueue(encode(event({ type: "delta", text: "Partial" })));
    await vi.waitFor(() => expect(delta).toHaveBeenCalledOnce());
    controller.error(new Error("Connection reset"));
    await assertion;
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each(['data: {bad json}\n\n', event({ type: "delta", text: 1 }), event({ type: "done", pitch: {} })])(
    "rejects malformed events", async (text) => {
      mockChunks([encode(text)]);
      await expect(generatePitch(body, vi.fn())).rejects.toThrow(/invalid|valid pitch/);
    },
  );
});
