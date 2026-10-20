import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import Pitch from "@/pages/Pitch";
import Pipeline from "@/pages/Pipeline";
import { api, type ApiMatch, type ApiPitch } from "@/lib/api";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 808, content_niche: "Music", follower_count: 12345 } }),
}));
vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

const pitch: ApiPitch = {
  id: 43, brand_id: null, brand_name: "Fixture Brand", is_custom: true,
  story: "My authentic story", product_reference: null, past_brand_partnership: null,
  content_link: null, contact_name: null, contact_email: null,
  pitch_text: "Subject: Hello\n\nGenerated email", status: "generated", source: "generated",
  is_manual: false, sent_at: null, agreed_rate: null, created_at: "2026-10-20T10:00:00Z",
};

describe("Pitch page generation and review", () => {
  const matches: ApiMatch[] = [
    { brand_raw_id: 7, brand_name: "Launch Brand", latest_product: "  Latest Studio Mic  ", niche: "Music",
      total_score: 0.9, dimensions: {}, reasons: [] },
    { brand_raw_id: 8, brand_name: "Another Brand", latest_product: "New Audio Interface", niche: "Music",
      total_score: 0.8, dimensions: {}, reasons: [] },
    { brand_raw_id: 9, brand_name: "No Product Brand", latest_product: null, niche: "Music",
      total_score: 0.7, dimensions: {}, reasons: [] },
  ];
  function mountMatches(search = "") {
    vi.spyOn(api, "get").mockResolvedValue({ top_contact: null });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["pitch-matches"], matches);
    window.history.replaceState(null, "", `/pitch${search}`);
    render(<QueryClientProvider client={queryClient}><Pitch /></QueryClientProvider>);
    return queryClient;
  }

  it("prefills each selected brand's latest product and clears the previous brand's reference", () => {
    const queryClient = mountMatches();
    fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
    const reference = screen.getByPlaceholderText("Enter a product launch, or leave blank to skip");
    expect(reference).toHaveValue("Latest Studio Mic");
    fireEvent.change(reference, { target: { value: "My custom product reference" } });
    expect(reference).toHaveValue("My custom product reference");
    fireEvent.click(screen.getByRole("button", { name: /Another Brand/ }));
    expect(reference).toHaveValue("New Audio Interface");
    fireEvent.click(screen.getByRole("button", { name: /No Product Brand/ }));
    expect(reference).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: /No Product Brand/ }));
    expect(screen.queryByPlaceholderText("Enter a product launch, or leave blank to skip")).not.toBeInTheDocument();
    queryClient.clear();
  });

  it("prefills the latest product when arriving from a brand link", async () => {
    const queryClient = mountMatches("?brand=Launch%20Brand");
    await waitFor(() => expect(screen.getByPlaceholderText("Enter a product launch, or leave blank to skip")).toHaveValue("Latest Studio Mic"));
    queryClient.clear();
  });

  it("sends the creator's edited product reference, not the automatic default", async () => {
    const queryClient = mountMatches();
    const post = vi.spyOn(api, "post").mockResolvedValue({ ...pitch, brand_id: 7, is_custom: false });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
    fireEvent.change(screen.getByPlaceholderText("Enter a product launch, or leave blank to skip"),
      { target: { value: "Creator's preferred launch" } });
    fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
    fireEvent.click(screen.getByRole("button", { name: /Generate pitch email rough draft/ }));
    await screen.findByRole("textbox", { name: "Pitch email draft" });
    expect(post).toHaveBeenCalledWith("/pitches", expect.objectContaining({
      brand_id: 7, is_custom: false, product_reference: "Creator's preferred launch",
    }));
    queryClient.clear();
  });

  it("does not carry a matched brand's product into a custom brand", async () => {
    const queryClient = mountMatches();
    fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
    fireEvent.click(screen.getByRole("button", { name: "A brand I found myself" }));
    fireEvent.change(await screen.findByPlaceholderText("e.g. Focusrite, Rode, Ableton"),
      { target: { value: "Custom Brand" } });
    expect(screen.getByPlaceholderText("Enter a product launch, or leave blank to skip")).toHaveValue("");
    queryClient.clear();
  });

  it("shows the saved final email on its Pipeline card", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const text = "Subject: Final saved draft\n\nMy edited email for this brand.";
    queryClient.setQueryData(["pitches"], [{ ...pitch, pitch_text: text }]);
    render(<QueryClientProvider client={queryClient}><Pipeline /></QueryClientProvider>);
    const summary = screen.getByText("View saved email");
    fireEvent.click(summary);
    expect(summary.closest("details")).toHaveTextContent(text.replace(/\n+/g, " "));
    expect(screen.getByRole("button", { name: /Copy/ })).toBeInTheDocument();
    queryClient.clear();
  });

  it("generates with visible brand/story inputs, edits, and saves the same row before opening Pipeline", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ matches: [], total: 0 });
    const post = vi.spyOn(api, "post").mockResolvedValue(pitch);
    const edited = "Subject: My edits\n\nFinal email";
    const patch = vi.spyOn(api, "patch").mockResolvedValue({ ...pitch, pitch_text: edited });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    window.history.replaceState(null, "", "/pitch");
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    render(<QueryClientProvider client={queryClient}><Pitch /></QueryClientProvider>);

    const generate = screen.getByRole("button", { name: /Generate pitch email rough draft/ });
    expect(generate).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "A brand I found myself" }));
    fireEvent.change(await screen.findByPlaceholderText("e.g. Focusrite, Rode, Ableton"),
      { target: { value: pitch.brand_name } });
    fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);
    const editor = await screen.findByRole("textbox", { name: "Pitch email draft" });
    expect(editor).toHaveValue(pitch.pitch_text);
    expect(window.location.pathname).toBe("/pitch");
    expect(patch).not.toHaveBeenCalled();
    fireEvent.change(editor, { target: { value: edited } });
    fireEvent.click(screen.getByRole("button", { name: "Save to Pipeline" }));
    await waitFor(() => expect(window.location.pathname).toBe("/deals"));
    expect(post).toHaveBeenCalledExactlyOnceWith("/pitches", {
      is_custom: true, custom_brand_name: pitch.brand_name, story: pitch.story,
      product_reference: undefined, past_brand_partnership: undefined, content_link: undefined,
    });
    expect(patch).toHaveBeenCalledExactlyOnceWith("/pitches/43", { pitch_text: edited });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["pitches"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    queryClient.clear();
  });
});
