import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import Pitch from "@/pages/Pitch";
import Pipeline from "@/pages/Pipeline";
import { api, ApiRequestError, type ApiMatch, type ApiPitch } from "@/lib/api";
import type { OwnBrand, OwnBrandJob } from "@/hooks/useOwnBrandLookup";
import * as pitchStreaming from "@/lib/pitchStream";

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

const ownBrand: OwnBrand = {
  brand_id: 99, name: "Fresh Brand", instagram_handle: "freshbrand", niche: "Beauty",
  description: "Skincare for sensitive skin.", target_audience_gender: "female",
  target_audience_min_age: 18, target_audience_max_age: 24, latest_product: "Glow Serum",
};
const job = (extra: Partial<OwnBrandJob> = {}): OwnBrandJob =>
  ({ job_id: "job-1", status: "running", stage: null, error: null, brand: null, ...extra });
const OWN_PLACEHOLDER = "https://www.instagram.com/brandname or @brandname";
afterEach(() => { vi.useRealTimers(); });
// The tab swap is animated, so wait for it with real timers; lookup polling then runs on fake ones.
const findBrand = async (text = "@freshbrand", fakeTimers = false) => {
  fireEvent.click(screen.getByRole("button", { name: "A brand I found myself" }));
  const input = await screen.findByPlaceholderText(OWN_PLACEHOLDER);
  if (fakeTimers) vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Find this brand" }));
};
const LINK_PLACEHOLDER = "https://instagram.com/p/your-best-post";
const fillLink = (value = "https://example.com/post") =>
  fireEvent.change(screen.getByPlaceholderText(LINK_PLACEHOLDER), { target: { value } });

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
    const post = vi.spyOn(pitchStreaming, "generatePitch").mockResolvedValue({ ...pitch, brand_id: 7, is_custom: false });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
    fireEvent.change(screen.getByPlaceholderText("Enter a product launch, or leave blank to skip"),
      { target: { value: "Creator's preferred launch" } });
    fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
    fillLink();
    fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
    await screen.findByRole("textbox", { name: "Pitch email draft" });
    expect(post).toHaveBeenCalledWith(expect.objectContaining({
      brand_id: 7, is_custom: false, product_reference: "Creator's preferred launch",
    }), expect.any(Function), expect.any(AbortSignal), expect.any(Function));
    queryClient.clear();
  });

  it("does not carry a matched brand's product into the own-brand tab", () => {
    const queryClient = mountMatches();
    fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
    expect(screen.getByPlaceholderText("Enter a product launch, or leave blank to skip")).toHaveValue("Latest Studio Mic");
    fireEvent.click(screen.getByRole("button", { name: "A brand I found myself" }));
    expect(screen.queryByPlaceholderText("Enter a product launch, or leave blank to skip")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate pitch email draft" })).toBeDisabled();
    queryClient.clear();
  });

  describe("own brand lookup from Instagram", () => {
    const generateButton = () => screen.getByRole("button", { name: "Generate pitch email draft" });
    async function setup(start: OwnBrandJob, poll: OwnBrandJob[] = []) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData(["pitch-matches"], matches);
      const polls = [...poll];
      const get = vi.spyOn(api, "get").mockImplementation(async (path: string) =>
        path.startsWith("/own-brands/jobs/") ? polls.shift() ?? polls.at(-1) : { top_contact: null });
      const post = vi.spyOn(api, "post").mockResolvedValue(start);
      window.history.replaceState(null, "", "/pitch");
      render(<QueryClientProvider client={queryClient}><Pitch /></QueryClientProvider>);
      return { queryClient, get, post };
    }
    const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
    const pollCalls = (get: ReturnType<typeof vi.spyOn>) => get.mock.calls.filter(([path]: unknown[]) => String(path).startsWith("/own-brands/jobs/"));

    it("shows the server's message for text that is not an Instagram profile and starts nothing", async () => {
      const { queryClient, get, post } = await setup(job());
      post.mockRejectedValue(new ApiRequestError("That doesn't look like an Instagram profile.", 400));
      await findBrand("hello world!", true);
      await tick(0);
      expect(post).toHaveBeenCalledExactlyOnceWith("/own-brands", { instagram: "hello world!" });
      expect(screen.getByRole("alert")).toHaveTextContent("That doesn't look like an Instagram profile.");
      await tick(5000);
      expect(pollCalls(get)).toHaveLength(0);
      expect(generateButton()).toBeDisabled();
      queryClient.clear();
    });

    it("polls every 2 seconds with changing stage text, shows the card, then writes the pitch for that brand_id", async () => {
      const { queryClient, get } = await setup(
        job({ stage: "Reading the brand's Instagram posts (this can take a minute)" }),
        [job({ stage: "Writing the brand profile" }), job({ status: "ready", brand: ownBrand })],
      );
      const generate = vi.spyOn(pitchStreaming, "generatePitch").mockResolvedValue({ ...pitch, brand_id: 99, is_custom: false });
      fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
      await findBrand("@freshbrand", true);
      await tick(0);
      expect(screen.getByRole("status")).toHaveTextContent("MAVLIT is gathering info for this brand… Reading the brand's Instagram posts (this can take a minute)");
      expect(screen.getByRole("button", { name: "Find this brand" })).toBeDisabled();
      expect(generateButton()).toBeDisabled();
      await tick(1999);
      expect(pollCalls(get)).toHaveLength(0);
      await tick(1);
      expect(get).toHaveBeenCalledWith("/own-brands/jobs/job-1");
      expect(screen.getByRole("status")).toHaveTextContent("Writing the brand profile");
      expect(generateButton()).toBeDisabled();
      await tick(2000);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      const card = screen.getByTestId("own-brand-card");
      expect(card).toHaveTextContent("Fresh Brand");
      expect(card).toHaveTextContent("Beauty");
      expect(card).toHaveTextContent("mostly women about 18 to 24 (estimate)");
      expect(card).toHaveTextContent("Glow Serum");
      expect(card).toHaveTextContent("The audience age is an estimate, not confirmed.");
      expect(screen.getByText(/Your authentic connection to Fresh Brand/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter a product launch, or leave blank to skip")).toHaveValue("Glow Serum");
      await tick(6000);
      expect(pollCalls(get)).toHaveLength(2);
      fillLink();
      expect(generateButton()).toBeEnabled();
      fireEvent.click(generateButton());
      await tick(0);
      expect(generate).toHaveBeenCalledExactlyOnceWith({
        is_custom: false, brand_id: 99, story: pitch.story,
        product_reference: "Glow Serum", past_brand_partnership: null, content_link: "https://example.com/post",
      }, expect.any(Function), expect.any(AbortSignal), expect.any(Function));
      queryClient.clear();
    });

    it("shows the card at once for a brand MAVLIT already knows, with @handle and fallbacks", async () => {
      const { queryClient, get } = await setup(job({
        status: "ready", brand: { ...ownBrand, name: "", latest_product: null, target_audience_gender: "both", target_audience_min_age: null },
      }));
      await findBrand("https://www.instagram.com/freshbrand", true);
      await tick(0);
      const card = screen.getByTestId("own-brand-card");
      expect(card).toHaveTextContent("@freshbrand");
      expect(card).toHaveTextContent("men and women");
      expect(card).not.toHaveTextContent("estimate)");
      expect(card).toHaveTextContent("None found");
      expect(pollCalls(get)).toHaveLength(0);
      expect(screen.getByPlaceholderText("Enter a product launch, or leave blank to skip")).toHaveValue("");
      queryClient.clear();
    });

    it("forgets the result when the input changes, and Find starts a new lookup on Enter", async () => {
      const { queryClient, post } = await setup(job({ status: "ready", brand: ownBrand }));
      await findBrand("@freshbrand", true);
      await tick(0);
      expect(screen.getByTestId("own-brand-card")).toBeInTheDocument();
      fireEvent.change(screen.getByPlaceholderText(OWN_PLACEHOLDER), { target: { value: "@other" } });
      expect(screen.queryByTestId("own-brand-card")).not.toBeInTheDocument();
      expect(generateButton()).toBeDisabled();
      fireEvent.keyDown(screen.getByPlaceholderText(OWN_PLACEHOLDER), { key: "Enter" });
      await tick(0);
      expect(post).toHaveBeenLastCalledWith("/own-brands", { instagram: "@other" });
      expect(screen.getByTestId("own-brand-card")).toBeInTheDocument();
      queryClient.clear();
    });

    it("stops polling when the input is edited mid-lookup", async () => {
      const { queryClient, get } = await setup(job({ stage: "Reading" }), [job({ stage: "Writing" })]);
      await findBrand("@freshbrand", true);
      await tick(0);
      fireEvent.change(screen.getByPlaceholderText(OWN_PLACEHOLDER), { target: { value: "@other" } });
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      await tick(10000);
      expect(pollCalls(get)).toHaveLength(0);
      queryClient.clear();
    });

    it("shows a failed job's error in red and allows another try", async () => {
      const { queryClient } = await setup(job(), [job({ status: "failed", error: "Instagram profile is private." })]);
      await findBrand("@freshbrand", true);
      await tick(0);
      await tick(2000);
      expect(screen.getByRole("alert")).toHaveTextContent("Instagram profile is private.");
      expect(screen.getByRole("button", { name: "Find this brand" })).toBeEnabled();
      expect(generateButton()).toBeDisabled();
      queryClient.clear();
    });
  });

  describe("multiple product launches, partnerships and links", () => {
    const productInputs = () => screen.getAllByPlaceholderText("Enter a product launch, or leave blank to skip");
    const linkInputs = () => screen.getAllByPlaceholderText(LINK_PLACEHOLDER);
    const addLink = () => screen.queryByRole("button", { name: "+ Add another link" });
    function setup() {
      const queryClient = mountMatches();
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
      const post = vi.spyOn(pitchStreaming, "generatePitch").mockResolvedValue({ ...pitch, brand_id: 7, is_custom: false });
      fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
      fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
      return { queryClient, post };
    }

    it("caps each field at three inputs, focuses the new input, and restores the add button after a removal", () => {
      const { queryClient } = setup();
      for (let i = 0; i < 2; i++) fireEvent.click(addLink()!);
      expect(linkInputs()).toHaveLength(3);
      expect(linkInputs()[2]).toHaveFocus();
      expect(addLink()).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Remove content link 1" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Remove content link 2" }));
      expect(linkInputs()).toHaveLength(2);
      expect(addLink()).toBeInTheDocument();
      queryClient.clear();
    });

    it("sends each field as one comma-separated string of the trimmed, non-empty values", async () => {
      const { queryClient, post } = setup();
      fireEvent.click(screen.getByRole("button", { name: "+ Add another product launch" }));
      fireEvent.change(productInputs()[0], { target: { value: " A " } });
      fireEvent.change(productInputs()[1], { target: { value: "B" } });
      fireEvent.change(screen.getByPlaceholderText(/Focusrite — or leave blank/), { target: { value: "C" } });
      fireEvent.click(addLink()!);
      fireEvent.click(addLink()!);
      fireEvent.change(linkInputs()[0], { target: { value: "https://x.com/1" } });
      fireEvent.change(linkInputs()[2], { target: { value: " http://x.com/3 " } });
      fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
      await screen.findByRole("textbox", { name: "Pitch email draft" });
      expect(post).toHaveBeenCalledExactlyOnceWith({
        is_custom: false, brand_id: 7, story: pitch.story,
        product_reference: "A, B", past_brand_partnership: "C", content_link: "https://x.com/1, http://x.com/3",
      }, expect.any(Function), expect.any(AbortSignal), expect.any(Function));
      queryClient.clear();
    });

    it("sends empty optional fields as null", async () => {
      const { queryClient, post } = setup();
      fireEvent.change(productInputs()[0], { target: { value: "  " } });
      fillLink("https://x.com/1");
      fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
      await screen.findByRole("textbox", { name: "Pitch email draft" });
      expect(post).toHaveBeenCalledWith(expect.objectContaining({
        product_reference: null, past_brand_partnership: null, content_link: "https://x.com/1",
      }), expect.any(Function), expect.any(AbortSignal), expect.any(Function));
      queryClient.clear();
    });

    it("blocks the request when no link is given or a link lacks http(s)://", () => {
      const { queryClient, post } = setup();
      fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
      expect(screen.getByRole("alert")).toHaveTextContent("Add a link to your most relevant content.");
      fillLink("x.com/1");
      fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
      expect(screen.getByRole("alert")).toHaveTextContent("Every content link must start with http:// or https://");
      expect(post).not.toHaveBeenCalled();
      queryClient.clear();
    });

    it("prefills only the first product launch and keeps additional entries when the brand changes", () => {
      const { queryClient } = setup();
      fireEvent.click(screen.getByRole("button", { name: "+ Add another product launch" }));
      fireEvent.change(productInputs()[1], { target: { value: "Second launch" } });
      fireEvent.click(screen.getByRole("button", { name: /Another Brand/ }));
      expect(productInputs()[0]).toHaveValue("New Audio Interface");
      expect(productInputs()[1]).toHaveValue("Second launch");
      queryClient.clear();
    });
  });

  it("shows server status events in the status line until the draft starts, then keeps the draft", async () => {
    const queryClient = mountMatches();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    let status!: (text: string) => void;
    let publish!: (text: string) => void;
    vi.spyOn(pitchStreaming, "generatePitch").mockImplementation((_body, delta, _signal, onStatus) => {
      publish = delta;
      status = onStatus!;
      return new Promise<ApiPitch>(() => {});
    });
    fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
    fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
    fillLink();
    fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
    expect(screen.getByRole("status")).toHaveTextContent("Writing your pitch…");
    act(() => status("Reading the Instagram posts you linked…"));
    expect(screen.getByRole("status")).toHaveTextContent("Reading the Instagram posts you linked…");
    act(() => status("Writing your pitch…"));
    act(() => publish("Hi"));
    expect(screen.getByRole("status")).toHaveTextContent("Writing your pitch…");
    expect(screen.getByPlaceholderText("MAVLIT is writing your pitch…")).toHaveValue("Hi");
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

  it("generates with visible brand/story inputs, edits, and confirms same-row saving without leaving the page", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ matches: [], total: 0 });
    vi.spyOn(api, "post").mockResolvedValue(job({ status: "ready", brand: { ...ownBrand, name: pitch.brand_name, latest_product: null } }));
    const post = vi.spyOn(pitchStreaming, "generatePitch").mockResolvedValue(pitch);
    const edited = "Subject: My edits\n\nFinal email";
    const patch = vi.spyOn(api, "patch").mockResolvedValue({ ...pitch, pitch_text: edited });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    window.history.replaceState(null, "", "/pitch");
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    render(<QueryClientProvider client={queryClient}><Pitch /></QueryClientProvider>);

    const generate = screen.getByRole("button", { name: "Generate pitch email draft" });
    expect(generate).toBeDisabled();
    await findBrand("@freshbrand");
    await screen.findByTestId("own-brand-card");
    fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
    fillLink();
    expect(generate).toBeEnabled();
    fireEvent.click(generate);
    await screen.findByRole("button", { name: "Save changes" });
    const editor = screen.getByRole("textbox", { name: "Pitch email draft" });
    expect(editor).toHaveValue(pitch.pitch_text);
    expect(window.location.pathname).toBe("/pitch");
    expect(patch).not.toHaveBeenCalled();
    fireEvent.change(editor, { target: { value: edited } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Your changes were saved.")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/pitch");
    expect(screen.getByRole("link", { name: "View in Pipeline" })).toHaveAttribute("href", "/deals");
    expect(post).toHaveBeenCalledExactlyOnceWith({
      is_custom: false, brand_id: 99, story: pitch.story,
      product_reference: null, past_brand_partnership: null, content_link: "https://example.com/post",
    }, expect.any(Function), expect.any(AbortSignal), expect.any(Function));
    expect(patch).toHaveBeenCalledExactlyOnceWith("/pitches/43", { pitch_text: edited });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["pitches"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    queryClient.clear();
  });

  it("immediately shows a read-only draft, displays live deltas, then enables editing with the final saved text", async () => {
    const queryClient = mountMatches();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    let publish!: (text: string) => void;
    let finish!: (value: ApiPitch) => void;
    const pending = new Promise<ApiPitch>((resolve) => { finish = resolve; });
    const generate = vi.spyOn(pitchStreaming, "generatePitch").mockImplementation((_body, delta) => {
      publish = delta;
      return pending;
    });
    fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
    fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
    fillLink();
    fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
    const live = screen.getByPlaceholderText("MAVLIT is writing your pitch…");
    expect(live).toHaveValue("");
    expect(live).toHaveAttribute("readonly");
    expect(screen.getByRole("status")).toHaveTextContent("Writing your pitch…");
    expect(screen.getByRole("button", { name: "Writing your pitch…" })).toBeDisabled();
    act(() => publish("Hi "));
    expect(live).toHaveValue("Hi ");
    act(() => publish("Lauren"));
    expect(live).toHaveValue("Hi Lauren");
    await act(async () => finish({ ...pitch, contact_name: "Lauren", pitch_text: "Hi Lauren,\n\nFinal trimmed email." }));
    const editor = screen.getByRole("textbox", { name: "Pitch email draft" });
    expect(editor).toHaveValue("Hi Lauren,\n\nFinal trimmed email.");
    expect(editor).not.toHaveAttribute("readonly");
    expect(screen.getByText("Suggested contact: Lauren")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.queryByText("Writing your pitch…")).not.toBeInTheDocument();
    fireEvent.change(editor, { target: { value: "Unsaved corrections" } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Generate again" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(editor).toHaveValue("Unsaved corrections");
    expect(generate).toHaveBeenCalledOnce();
    queryClient.clear();
  });

  it.each(["Brand not found", pitchStreaming.INCOMPLETE_PITCH, "Generation failed upstream"])(
    "clears the partial draft and restores generation controls on failure: %s", async (message) => {
      const queryClient = mountMatches();
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
      let publish!: (text: string) => void;
      let fail!: (cause: Error) => void;
      const pending = new Promise<ApiPitch>((_resolve, reject) => { fail = reject; });
      vi.spyOn(pitchStreaming, "generatePitch").mockImplementation((_body, delta) => {
        publish = delta;
        return pending;
      });
      fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
      fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
      fillLink();
      fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
      act(() => publish("Never leave this partial email behind"));
      expect(screen.getByRole("textbox", { name: "Pitch email draft" })).toHaveValue("Never leave this partial email behind");
      await act(async () => fail(new Error(message)));
      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(screen.queryByRole("textbox", { name: "Pitch email draft" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Generate pitch email draft" })).toBeEnabled();
      expect(screen.queryByText("Your changes were saved.")).not.toBeInTheDocument();
      queryClient.clear();
    },
  );
});
