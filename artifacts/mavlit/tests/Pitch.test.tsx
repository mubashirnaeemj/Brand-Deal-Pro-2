import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import Pitch from "@/pages/Pitch";
import Pipeline from "@/pages/Pipeline";
import { api, type ApiPitch } from "@/lib/api";

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
