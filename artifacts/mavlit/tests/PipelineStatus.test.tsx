import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Pipeline from "@/pages/Pipeline";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

const pitch = (id: number, status: string) => ({
  id, brand_id: id, brand_name: "Alpha Audio", is_custom: false, story: "", product_reference: null, past_brand_partnership: null,
  content_link: null, contact_name: null, contact_email: null, pitch_text: "Hi", status, source: "generated", is_manual: false,
  sent_at: "2026-10-20", agreed_rate: null, created_at: "2026-10-20T10:00:00Z",
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let pitches: ReturnType<typeof pitch>[];
let patches: { id: string; body: Record<string, unknown> }[];

beforeEach(() => {
  pitches = [pitch(1, "sent")];
  patches = [];
  installProfileApi(creatorProfile());
  const base = globalThis.fetch;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    if (url.pathname === "/api/mavlit/pitches/me") return json({ pitches, total: pitches.length, limit: 100, offset: 0 });
    if (url.pathname === "/api/mavlit/rate-intelligence/latest") return json(null);
    if (url.pathname === "/api/mavlit/pitches/manual" && init?.method === "POST") return json(pitch(77, "sent"));
    const target = /^\/api\/mavlit\/pitches\/(\d+)$/.exec(url.pathname);
    if (target && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      patches.push({ id: target[1], body });
      return json({ ...pitches.find((p) => String(p.id) === target[1]) ?? pitch(Number(target[1]), "sent"), ...body });
    }
    return base(input, init);
  }));
});

describe("pitch status menu", () => {
  it("offers Negotiating and no 'In conversation' (the server has no such status), and sends negotiating", async () => {
    renderProfile(<Pipeline />);
    await screen.findByText("Alpha Audio");
    fireEvent.click(screen.getByText("Waiting for reply"));
    expect(screen.queryByText("In conversation")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByText("Negotiating"));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0].id).toBe("1");
    expect(patches[0].body.status).toBe("negotiating");
  });
});

describe("importing older browser-only pitches", () => {
  it("sends negotiating for an old 'conversation' entry", async () => {
    localStorage.setItem("mavlit_pitches", JSON.stringify([{ id: "pitch-1", brand: "Old Brand", date: "Oct 1, 2026", status: "conversation" }]));
    pitches = [];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderProfile(<Pipeline />);
    fireEvent.click(await screen.findByText("Import these pitches"));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toEqual({ id: "77", body: { status: "negotiating" } });
    expect(JSON.stringify(patches)).not.toContain("conversation");
  });
});
