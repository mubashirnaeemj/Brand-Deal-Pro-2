import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "wouter";
import BrandDetail from "@/pages/BrandDetail";
import useSavedBrands from "@/hooks/useSavedBrands";
import { SAVED_BRANDS_LIST_PATH } from "@/lib/api";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const saved = (brandId: number) => ({ brand_id: brandId, name: `Brand ${brandId}`, niche: "", short_bio: null, saved_at: "2026-10-26T00:00:00Z" });

/** A server with 150 saved brands that behaves like the real one: `limit` defaults to 100, at most 500; newest first (brand 150 down to 1). */
let listRequests: string[];
function installServer() {
  listRequests = [];
  installProfileApi(creatorProfile());
  const base = globalThis.fetch;
  const all = Array.from({ length: 150 }, (_, index) => saved(150 - index));
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    if (url.pathname === "/api/mavlit/saved-brands/me") {
      listRequests.push(url.search);
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
      return json(all.slice(0, limit));
    }
    if (url.pathname === "/api/mavlit/brands/1") return json({ brand_id: 1, name: "Sennheiser", description: null, top_contact: null, other_contacts: [] });
    return base(input, init);
  }));
}

function Probe({ brandId }: { brandId: number }) {
  const { isSaved } = useSavedBrands();
  return <p data-testid="saved">{isSaved(brandId) ? "yes" : "no"}</p>;
}

beforeEach(installServer);

describe("the saved-brands list is requested in full", () => {
  it("uses limit=500", () => {
    expect(SAVED_BRANDS_LIST_PATH).toBe("/saved-brands/me?limit=500");
  });

  it("useSavedBrands asks for limit=500 and so sees a brand that is beyond the first 100", async () => {
    renderProfile(<><Probe brandId={1} /><Probe brandId={150} /></>);
    await waitFor(() => expect(listRequests.length).toBeGreaterThan(0));
    expect(new Set(listRequests)).toEqual(new Set(["?limit=500"]));
    // brand 1 is the 150th row: with the server's default page of 100 it would be reported as not saved
    await waitFor(() => expect(screen.getAllByTestId("saved").map((node) => node.textContent)).toEqual(["yes", "yes"]));
  });

  it("the brand page asks for limit=500 and shows 'Saved' for a brand beyond the first 100", async () => {
    window.history.replaceState(null, "", "/brands/sennheiser");
    renderProfile(<Route path="/brands/:slug" component={BrandDetail} />);
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(new Set(listRequests)).toEqual(new Set(["?limit=500"]));
  });
});
