import { api, apiResponse, ApiRequestError, type ApiPitch } from "./api";

export interface PitchRequest {
  is_custom: boolean;
  brand_id?: number;
  custom_brand_name?: string;
  story: string;
  product_reference?: string | null;
  past_brand_partnership?: string | null;
  content_link?: string | null;
}

export const INCOMPLETE_PITCH = "The connection ended before your pitch was finished. Please try again.";

/** SSE blocks may span byte chunks, including inside a UTF-8 character. */
export async function generatePitch(
  body: PitchRequest,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<ApiPitch> {
  let response: Response;
  try {
    response = await apiResponse("/pitches/stream", {
      method: "POST",
      headers: { Accept: "text/event-stream", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    // Only fall back when the server explicitly does not implement streaming.
    // Never retry a failed/interrupted generation: it may already have saved.
    if (cause instanceof ApiRequestError && [405, 501].includes(cause.status)) {
      if (signal?.aborted) throw signal.reason;
      return api.post<ApiPitch>("/pitches", body);
    }
    throw cause;
  }

  let buffer = "";
  let completed: ApiPitch | null = null;
  const consume = (text: string) => {
    buffer = (buffer + text).replace(/\r\n/g, "\n");
    let boundary: number;
    while (!completed && (boundary = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue;
        let event;
        try { event = JSON.parse(line.slice(5).trim()); }
        catch { throw new Error("MAVLIT returned an invalid pitch stream. Please try again."); }
        if (!event || typeof event !== "object") throw new Error("MAVLIT returned an invalid pitch stream. Please try again.");
        if (event.type === "error") {
          throw new Error(typeof event.detail === "string" && event.detail ? event.detail : "Pitch generation failed. Please try again.");
        }
        if (event.type === "delta") {
          if (typeof event.text !== "string") throw new Error("MAVLIT returned an invalid pitch stream. Please try again.");
          onDelta(event.text);
        }
        if (event.type === "done") {
          const pitch = event.pitch;
          if (!pitch || !Number.isInteger(pitch.id) || typeof pitch.pitch_text !== "string" || !pitch.pitch_text.trim()) {
            throw new Error("MAVLIT completed generation without a valid pitch. Please try again.");
          }
          completed = pitch as ApiPitch;
          break;
        }
      }
    }
  };

  if (!response.body || typeof response.body.getReader !== "function") {
    consume(await response.text());
  } else {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (!completed) {
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try { chunk = await reader.read(); }
        catch (cause) {
          if (signal?.aborted) throw cause;
          throw new Error(INCOMPLETE_PITCH);
        }
        if (chunk.done) {
          consume(decoder.decode());
          break;
        }
        consume(decoder.decode(chunk.value, { stream: true }));
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  if (!completed) throw new Error(INCOMPLETE_PITCH);
  return completed;
}
