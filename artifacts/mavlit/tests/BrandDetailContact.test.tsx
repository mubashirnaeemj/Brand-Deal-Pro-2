import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "wouter";
import BrandDetail from "@/pages/BrandDetail";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const brandBody = (topContact: unknown) => ({
  brand_id: 1, name: "Sennheiser", description: "d", sponsorship_activity_score: 80, last_partnership_date: null, meta_ads_active: null,
  platform_signals: null, top_contact: topContact, other_contacts: [],
});
const SAMPLE_EMAILS = ["sarah.chen@edelman.com", "m.williams@spotify.com", "p.sharma@fleishman.com", "j.torres@gopro.com", "d.kim@sweetwater.com", "a.rivera@edelman.com"];

function mount(topContact: unknown) {
  installProfileApi(creatorProfile());
  const base = globalThis.fetch;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), window.location.origin).pathname;
    if (path === "/api/mavlit/brands/1") return json(brandBody(topContact));
    if (path === "/api/mavlit/saved-brands/me") return json([]);
    return base(input, init);
  }));
  window.history.replaceState(null, "", "/brands/sennheiser");
  return renderProfile(<Route path="/brands/:slug" component={BrandDetail} />);
}

beforeEach(() => { window.history.replaceState(null, "", "/brands/sennheiser"); });

describe("Contact Bundle on the brand page", () => {
  it("says 'No contact available' when the API returns no contact: no sample email, no copy button, no 'Verification pending'", async () => {
    mount(null);
    const card = await screen.findByTestId("card-contact");
    await waitFor(() => expect(within(card).getByTestId("text-no-contact")).toHaveTextContent("No contact available"));
    expect(card.querySelector("button")).toBeNull();
    expect(card).not.toHaveTextContent("Verification pending");
    expect(card).not.toHaveTextContent("@");
    for (const email of SAMPLE_EMAILS) expect(document.body).not.toHaveTextContent(email);
  });

  it("shows the API's contact with a copy button when there is one", async () => {
    mount({ name: "Real Person", email: "real.person@brand.example", title: "Partnerships", apollo_verified: true, hunter_verified: false });
    const card = await screen.findByTestId("card-contact");
    await waitFor(() => expect(within(card).getByTestId("text-contact-email")).toHaveTextContent("real.person@brand.example"));
    expect(card).toHaveTextContent("Verified");
    expect(card.querySelectorAll("button")).toHaveLength(1);
    expect(screen.queryByTestId("text-no-contact")).not.toBeInTheDocument();
  });

  it("an unverified contact says so, from the API's flags", async () => {
    mount({ name: null, email: "x@brand.example", title: null });
    const card = await screen.findByTestId("card-contact");
    await waitFor(() => expect(card).toHaveTextContent("Verification pending"));
  });

  it("the sample contacts are gone from the source of the page", async () => {
    const source = await import("node:fs").then((fs) => fs.readFileSync("src/pages/BrandDetail.tsx", "utf8"));
    for (const email of SAMPLE_EMAILS) expect(source).not.toContain(email);
    expect(source).not.toContain("linkedin.com/in/");
  });
});
