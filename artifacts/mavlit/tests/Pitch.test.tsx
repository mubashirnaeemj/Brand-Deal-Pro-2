import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Pitch from "@/pages/Pitch";
import Pipeline from "@/pages/Pipeline";
import { api, ApiRequestError, type ApiMatch, type ApiPitch } from "@/lib/api";
import type { OwnBrand, OwnBrandJob } from "@/hooks/useOwnBrandLookup";

const auth = vi.hoisted(() => ({ user: null as Record<string, unknown> | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));
const incompleteUser = { id: 808, content_niche: "Music", follower_count: 12345 };
const completeUser = {
  ...incompleteUser, instagram_audience_description: "Young musicians.", instagram_highest_views: 120000,
  instagram_description: "Guitar tutorials and gear reviews.",
};
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
// api.post is routed by path so each test states which endpoints it expects; anything else fails loudly.
const postHandlers: Record<string, (body: unknown) => unknown> = {};
const onPost = (path: string, impl: (body: any) => unknown) => {
  const handler = vi.fn(async (body: unknown) => impl(body));
  postHandlers[path] = handler;
  return handler;
};
beforeEach(() => {
  for (const path of Object.keys(postHandlers)) delete postHandlers[path];
  vi.spyOn(api, "post").mockImplementation((async (path: string, body: unknown) => {
    const handler = postHandlers[path];
    if (!handler) throw new Error(`Unexpected POST ${path}`);
    return handler(body);
  }) as typeof api.post);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
// The tab swap is animated, so wait for it with real timers; lookup polling then runs on fake ones.
const findBrand = async (text = "@freshbrand", fakeTimers = false) => {
  fireEvent.click(screen.getByRole("button", { name: "A brand I found myself" }));
  const input = await screen.findByPlaceholderText(OWN_PLACEHOLDER);
  if (fakeTimers) vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Find this brand" }));
};

// The creator's saved Instagram posts, as the API returns them.
const savedPost = (id: number, extra: { full_caption?: string } & Record<string, unknown> = {}) => ({
  full_caption: undefined as string | undefined,
  id, post_url: `https://www.instagram.com/p/P${id}/`, thumbnail_url: `/creator-profile/me/posts/${id}/thumbnail`, caption_preview: `Caption ${id}`, likes_count: 1234,
  comments_count: 56, views_count: 78000, is_partnership_post: false, ...extra,
});
let savedPosts: ReturnType<typeof savedPost>[] = [];
beforeEach(() => {
  auth.user = incompleteUser;
  savedPosts = [savedPost(1), savedPost(2), savedPost(3), savedPost(4, { is_partnership_post: true }), savedPost(5, { is_partnership_post: true })];
});
// `full_caption` stays on the "server": clients only receive the start of it, and search matches all of it.
const postsResponse = (path: string) => {
  const params = new URL(path, "http://localhost").searchParams;
  const needle = (params.get("q") ?? "").toLowerCase();
  const posts = savedPosts
    .filter(post => params.get("partnership_only") !== "true" || post.is_partnership_post)
    .filter(post => !needle || String(post.full_caption ?? post.caption_preview).toLowerCase().includes(needle))
    .map(({ full_caption: _full, ...post }) => post);
  return { total: savedPosts.length, shown: posts.length, min_keep: 10, can_delete: false, posts };
};
/** api.get for the Pitch page: saved posts come from `savedPosts`, everything else from `fallback`. */
const routeGet = (fallback: (path: string) => unknown) => async (path: string) =>
  path.startsWith("/creator-profile/me/posts") ? postsResponse(path) : fallback(path);
const pickerButton = (kind: "link" | "partnership") => screen.getByRole("button", {
  name: kind === "link" ? /^(\+ Choose your posts|\+ Choose more|Change my choice)$/ : /^(\+ Choose from your partnership posts|\+ Choose more|Change my choice)$/,
});
const openPicker = async (kind: "link" | "partnership") => {
  const buttons = screen.getAllByRole("button", { name: /^(\+ Choose your posts|\+ Choose from your partnership posts|\+ Choose more|Change my choice)$/ });
  fireEvent.click(buttons[kind === "partnership" ? 0 : 1]);
  const dialog = await screen.findByRole("dialog");
  await waitFor(() => expect(within(dialog).queryByText("Loading your posts…")).not.toBeInTheDocument());
  return dialog;
};
const closePicker = async (dialog: HTMLElement) => {
  fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
};
const chooseContentPosts = async (count = 1) => {
  const dialog = await openPicker("link");
  const boxes = within(dialog).getAllByRole("checkbox");
  for (let i = 0; i < count; i++) fireEvent.click(boxes[i]);
  await closePicker(dialog);
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
    vi.spyOn(api, "get").mockImplementation(routeGet(() => ({ top_contact: null })));
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
    const post = onPost("/pitches", async () => ({ ...pitch, brand_id: 7, is_custom: false }));
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
    fireEvent.change(screen.getByPlaceholderText("Enter a product launch, or leave blank to skip"),
      { target: { value: "Creator's preferred launch" } });
    fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
    await chooseContentPosts();
    fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
    await screen.findByRole("textbox", { name: "Pitch email draft" });
    expect(post).toHaveBeenCalledWith(expect.objectContaining({
      brand_id: 7, is_custom: false, product_reference: "Creator's preferred launch",
    }));
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
      const get = vi.spyOn(api, "get").mockImplementation(routeGet(path =>
        path.startsWith("/own-brands/jobs/") ? polls.shift() ?? polls.at(-1) : { top_contact: null }));
      const post = onPost("/own-brands", async () => start);
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
      expect(post).toHaveBeenCalledExactlyOnceWith({ instagram: "hello world!" });
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
      const generate = onPost("/pitches", async () => ({ ...pitch, brand_id: 99, is_custom: false }));
      fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
      await chooseContentPosts();
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
      expect(generateButton()).toBeEnabled();
      fireEvent.click(generateButton());
      await tick(0);
      expect(generate).toHaveBeenCalledExactlyOnceWith({
        is_custom: false, brand_id: 99, story: pitch.story,
        product_reference: "Glow Serum", past_brand_partnership: null, content_link: "https://www.instagram.com/p/P1/",
      });
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
      expect(post).toHaveBeenLastCalledWith({ instagram: "@other" });
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

  describe("product launches, partnership posts and content posts", () => {
    const productInputs = () => screen.getAllByPlaceholderText("Enter a product launch, or leave blank to skip");
    const chips = (kind: "link" | "partnership") => screen.queryAllByTestId(`${kind}-chip`);
    function setup() {
      const queryClient = mountMatches();
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
      const post = onPost("/pitches", async () => ({ ...pitch, brand_id: 7, is_custom: false }));
      fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
      fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
      return { queryClient, post };
    }
    const generateNow = () => fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));

    it("shows no typed link or partnership inputs, only the choose buttons and hints", () => {
      const { queryClient } = setup();
      expect(screen.queryByPlaceholderText("https://instagram.com/p/your-best-post")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "+ Add another link" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "+ Choose your posts" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "+ Choose from your partnership posts" })).toBeInTheDocument();
      expect(screen.getByText("Up to 3 posts that show your connection to this brand. Pick from your posts or add a new post link.")).toBeInTheDocument();
      expect(screen.getByText("Up to 3. Pick the posts you marked as paid partnerships, add a post link, or describe a partnership in a few words.")).toBeInTheDocument();
      queryClient.clear();
    });

    it("lists all saved posts in a blurred picker, caps the choice at three and frees a slot after removing a chip", async () => {
      savedPosts = [1, 2, 3, 4, 5].map(id => savedPost(id));
      const { queryClient } = setup();
      const dialog = await openPicker("link");
      expect(screen.getByTestId("picker-overlay").style.backdropFilter).toBe("blur(6px)");
      expect(document.body).toHaveAttribute("data-scroll-locked");
      expect(dialog).toHaveTextContent("Choose the posts that show your connection to the brand");
      expect(dialog).toHaveTextContent("Showing all your saved posts. 0 of 3 chosen.");
      expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(5);
      expect(within(dialog).getAllByTestId("picker-row")[0]).toHaveTextContent("Likes 1,234 · Comments 56 · Views 78,000");
      const boxes = within(dialog).getAllByRole("checkbox");
      for (const box of boxes.slice(0, 3)) fireEvent.click(box);
      expect(dialog).toHaveTextContent("3 of 3 chosen. You can choose up to 3.");
      expect(boxes[3]).toHaveAttribute("aria-disabled", "true");
      expect(boxes[4]).toHaveAttribute("aria-disabled", "true");
      expect(boxes[0]).toHaveAttribute("aria-disabled", "false");
      await closePicker(dialog);
      expect(chips("link")).toHaveLength(3);
      expect(chips("link")[0]).toHaveTextContent("Caption 1");
      expect(chips("link")[0]).toHaveTextContent("post");
      expect(screen.getByRole("button", { name: "Change my choice" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Remove https://www.instagram.com/p/P2/" }));
      expect(chips("link")).toHaveLength(2);
      const again = await openPicker("link");
      expect(within(again).getAllByRole("checkbox")[3]).toHaveAttribute("aria-disabled", "false");
      fireEvent.click(within(again).getAllByRole("checkbox")[3]);
      await closePicker(again);
      expect(chips("link")).toHaveLength(3);
      queryClient.clear();
    });

    it("shows when each post was published between the caption and the numbers, or a dash when unknown", async () => {
      savedPosts = [savedPost(1, { timestamp: "2026-10-20T15:04:00.000Z" }), savedPost(2, { timestamp: null }), savedPost(3, { timestamp: "garbage" })];
      const { queryClient } = setup();
      const dialog = await openPicker("link");
      const expected = new Date("2026-10-20T15:04:00.000Z").toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
      const [first, second, third] = within(dialog).getAllByTestId("picker-row");
      expect(within(first).getByTestId("picker-posted-at")).toHaveTextContent(`Posted ${expected}`);
      expect(first.textContent).toMatch(/Caption 1Posted .+Likes 1,234/);
      expect(within(second).getByTestId("picker-posted-at")).toHaveTextContent("Posted –");
      expect(within(third).getByTestId("picker-posted-at")).toHaveTextContent("Posted –");
      expect(dialog).not.toHaveTextContent("Invalid Date");
      queryClient.clear();
    });

    describe("caption search", () => {
      const longCaption = `${"Studio tour and setup notes. ".repeat(4)}Finally unboxing the Zephyr pedal`;
      beforeEach(() => {
        savedPosts = [
          savedPost(1, { caption_preview: longCaption.slice(0, 30), full_caption: longCaption }),
          savedPost(2), savedPost(3),
          savedPost(4, { is_partnership_post: true, caption_preview: "Lash collab", full_caption: "Lash collab with Falscara" }),
          savedPost(5, { is_partnership_post: true }),
        ];
      });
      const searchInput = (dialog: HTMLElement) => within(dialog).getByRole("searchbox");
      const getCalls = () => vi.mocked(api.get).mock.calls.map(([path]) => String(path)).filter(path => path.startsWith("/creator-profile/me/posts"));
      const searchFor = async (dialog: HTMLElement, text: string) => {
        fireEvent.change(searchInput(dialog), { target: { value: text } });
        fireEvent.keyDown(searchInput(dialog), { key: "Enter" });
        fireEvent.submit(searchInput(dialog).closest("form")!);
      };

      it("finds a word at the end of a long caption through the API, and Clear brings everything back", async () => {
        const { queryClient } = setup();
        const dialog = await openPicker("link");
        expect(within(dialog).queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
        expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(5);
        await searchFor(dialog, "ZEPHYR pedal");
        await waitFor(() => expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(1));
        expect(getCalls().at(-1)).toBe("/creator-profile/me/posts?q=ZEPHYR%20pedal");
        expect(within(dialog).queryByText(/Zephyr/)).not.toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("button", { name: "Clear" }));
        await waitFor(() => expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(5));
        expect(searchInput(dialog)).toHaveValue("");
        expect(within(dialog).queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
        expect(getCalls().at(-1)).toBe("/creator-profile/me/posts");
        queryClient.clear();
      });

      it("searches while typing, after a short pause and without pressing Search", async () => {
        const { queryClient } = setup();
        const dialog = await openPicker("link");
        for (const text of ["z", "ze", "zeph", "zephyr"]) fireEvent.change(searchInput(dialog), { target: { value: text } });
        await waitFor(() => expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(1));
        expect(getCalls().filter(path => path.includes("q="))).toEqual(["/creator-profile/me/posts?q=zephyr"]);
        fireEvent.change(searchInput(dialog), { target: { value: "" } });
        await waitFor(() => expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(5));
        expect(within(dialog).queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
        queryClient.clear();
      });

      it("searches only partnership posts in the partnerships picker, with its own no-match text", async () => {
        const { queryClient } = setup();
        const dialog = await openPicker("partnership");
        await searchFor(dialog, "falscara");
        await waitFor(() => expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(1));
        expect(getCalls().at(-1)).toBe("/creator-profile/me/posts?partnership_only=true&q=falscara");
        await searchFor(dialog, "zephyr");
        expect(await within(dialog).findByTestId("picker-no-match")).toHaveTextContent('No partnership post caption contains "zephyr".');
        await closePicker(dialog);
        const again = await openPicker("link");
        await searchFor(again, "nothing at all");
        expect(await within(again).findByTestId("picker-no-match")).toHaveTextContent('No post caption contains "nothing at all".');
        queryClient.clear();
      });

      it("keeps the search while ticking and adding a post, treats blank as everything, and resets on reopen", async () => {
        const { queryClient } = setup();
        const dialog = await openPicker("link");
        await searchFor(dialog, "caption");
        await waitFor(() => expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(3));
        fireEvent.click(within(dialog).getAllByRole("checkbox")[0]);
        expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(3);
        expect(searchInput(dialog)).toHaveValue("caption");
        const added = savedPost(9, { caption_preview: "Caption nine" });
        onPost("/creator-profile/me/posts", async () => { savedPosts = [added, ...savedPosts]; return added; });
        fireEvent.change(within(dialog).getByPlaceholderText("https://www.instagram.com/p/…"), { target: { value: "https://www.instagram.com/p/P9/" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Add post" }));
        await within(dialog).findByText("Post added.");
        expect(getCalls().at(-1)).toBe("/creator-profile/me/posts?q=caption");
        expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(4);
        await searchFor(dialog, "   ");
        await waitFor(() => expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(6));
        await searchFor(dialog, "caption 2");
        await waitFor(() => expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(1));
        await closePicker(dialog);
        const again = await openPicker("link");
        expect(searchInput(again)).toHaveValue("");
        expect(within(again).queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
        expect(within(again).getAllByTestId("picker-row")).toHaveLength(6);
        queryClient.clear();
      });
    });

    it("ticks a post from a click anywhere in its box, shows its URL as plain text and opens it with View post", async () => {
      const { queryClient } = setup();
      const open = vi.spyOn(window, "open").mockReturnValue(null);
      const dialog = await openPicker("link");
      const [row] = within(dialog).getAllByTestId("picker-row");
      const box = within(row).getByRole("checkbox");
      expect(within(row).queryByRole("link")).not.toBeInTheDocument();
      expect(within(row).getByTestId("picker-post-url")).toHaveTextContent("https://www.instagram.com/p/P1/");
      expect(box).toHaveClass("h-6", "w-6");
      expect(box.previousElementSibling).not.toBeNull(); // the checkbox sits after the post details
      fireEvent.click(within(row).getByText("Caption 1"));
      expect(box).toBeChecked();
      fireEvent.click(row);
      expect(box).not.toBeChecked();
      // A click on the checkbox itself toggles once, not twice.
      fireEvent.click(box);
      expect(box).toBeChecked();
      expect(dialog).toHaveTextContent("1 of 3 chosen.");
      // View post opens the post and leaves the choice alone.
      fireEvent.click(within(row).getByRole("button", { name: "View post" }));
      expect(open).toHaveBeenCalledExactlyOnceWith("https://www.instagram.com/p/P1/", "_blank", "noopener,noreferrer");
      expect(box).toBeChecked();
      queryClient.clear();
    });

    it("dims the other posts at three chosen and explains why a click chooses nothing", async () => {
      savedPosts = [1, 2, 3, 4].map(id => savedPost(id));
      const { queryClient } = setup();
      const dialog = await openPicker("link");
      const rowsNow = () => within(dialog).getAllByTestId("picker-row");
      for (const row of rowsNow().slice(0, 3)) fireEvent.click(row);
      expect(dialog).toHaveTextContent("3 of 3 chosen.");
      expect(rowsNow()[3]).toHaveClass("opacity-50");
      expect(rowsNow()[0]).not.toHaveClass("opacity-50");
      fireEvent.click(rowsNow()[3]);
      expect(within(dialog).getByRole("alert")).toHaveTextContent("You can choose up to 3. Remove one first.");
      expect(within(rowsNow()[3]).getByRole("checkbox")).not.toBeChecked();
      expect(dialog).toHaveTextContent("3 of 3 chosen.");
      fireEvent.click(rowsNow()[0]);
      expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
      queryClient.clear();
    });

    it.each(["link", "partnership"] as const)("shows each post's picture left of its details in the %s picker, with a grey fallback", async (kind) => {
      savedPosts = [savedPost(4, { is_partnership_post: true }), savedPost(5, { is_partnership_post: true, thumbnail_url: null }), savedPost(6, { is_partnership_post: true })];
      const { queryClient } = setup();
      const dialog = await openPicker(kind);
      const [first, second, third] = within(dialog).getAllByTestId("picker-row");
      const img = first.querySelector("img")!;
      expect(img).toHaveAttribute("src", "/api/mavlit/creator-profile/me/posts/4/thumbnail");
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveStyle({ width: "72px", height: "72px" });
      // picture, details, then the checkbox
      const details = within(first).getByTestId("picker-post-url");
      const box = within(first).getByRole("checkbox");
      expect(img.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(details.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(within(second).getByTestId("post-thumbnail-empty")).toHaveTextContent("No picture");
      fireEvent.error(third.querySelector("img")!);
      expect(within(third).getByTestId("post-thumbnail-empty")).toBeInTheDocument();
      // Clicking the picture is part of the box: it ticks the post.
      fireEvent.click(img);
      expect(box).toBeChecked();
      queryClient.clear();
    });

    it("closes the picker with ×, Escape and a click outside", async () => {
      const { queryClient } = setup();
      for (const close of [
        () => fireEvent.click(screen.getByRole("button", { name: "Close" })),
        () => fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }),
        () => fireEvent.pointerDown(screen.getByTestId("picker-overlay")),
      ]) {
        await openPicker("link");
        close();
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      }
      queryClient.clear();
    });

    it("adds a post from the link picker as not a partnership, shows progress, then lists and chooses it", async () => {
      const { queryClient } = setup();
      const added = savedPost(9, { caption_preview: "Brand new post" });
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const create = onPost("/creator-profile/me/posts", async () => { await gate; savedPosts = [added, ...savedPosts]; return added; });
      const dialog = await openPicker("link");
      fireEvent.click(within(dialog).getByRole("button", { name: "Add post" }));
      expect(within(dialog).getByRole("alert")).toHaveTextContent("Paste the link of an Instagram post.");
      expect(create).not.toHaveBeenCalled();
      const input = within(dialog).getByPlaceholderText("https://www.instagram.com/p/…");
      fireEvent.change(input, { target: { value: "https://www.instagram.com/p/P9/" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(within(dialog).getByRole("button", { name: "Reading the post…" })).toBeDisabled();
      expect(dialog).toHaveTextContent("MAVLIT is reading this post. This can take up to a minute.");
      await act(async () => { release(); });
      expect(await within(dialog).findByText("Post added.")).toBeInTheDocument();
      expect(create).toHaveBeenCalledExactlyOnceWith({ post_url: "https://www.instagram.com/p/P9/", is_partnership_post: false });
      expect(input).toHaveValue("");
      expect(within(dialog).getAllByTestId("picker-row")[0]).toHaveTextContent("Brand new post");
      expect(within(dialog).getAllByRole("checkbox")[0]).toBeChecked();
      expect(dialog).toHaveTextContent("1 of 3 chosen.");
      await closePicker(dialog);
      expect(chips("link")[0]).toHaveTextContent("Brand new post");
      queryClient.clear();
    });

    it("shows the server's error when a post cannot be added", async () => {
      const { queryClient } = setup();
      onPost("/creator-profile/me/posts", async () => { throw new ApiRequestError("The post could not be read: it is private.", 422); });
      const dialog = await openPicker("link");
      fireEvent.change(within(dialog).getByPlaceholderText("https://www.instagram.com/p/…"), { target: { value: "https://www.instagram.com/p/PRIV/" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Add post" }));
      expect(await within(dialog).findByRole("alert")).toHaveTextContent("The post could not be read: it is private.");
      expect(within(dialog).getByRole("button", { name: "Add post" })).toBeEnabled();
      queryClient.clear();
    });

    it("shows empty-list texts for both pickers", async () => {
      savedPosts = [];
      const { queryClient } = setup();
      let dialog = await openPicker("link");
      expect(within(dialog).getByTestId("picker-empty")).toHaveTextContent("No saved posts yet. Add a post link below.");
      await closePicker(dialog);
      dialog = await openPicker("partnership");
      expect(within(dialog).getByTestId("picker-empty")).toHaveTextContent(
        'No post is marked as a paid partnership yet. Add a post link below, describe a partnership, or switch the toggle on in "Your recent Instagram posts" on your profile page.');
      queryClient.clear();
    });

    it("lists only paid partnership posts, adds a post as a partnership, and turns a description into a chip", async () => {
      const { queryClient } = setup();
      const get = vi.mocked(api.get);
      const dialog = await openPicker("partnership");
      expect(get).toHaveBeenCalledWith("/creator-profile/me/posts?partnership_only=true");
      expect(dialog).toHaveTextContent("Choose your past brand partnership posts");
      expect(dialog).toHaveTextContent("Showing the posts you marked as paid partnerships. 0 of 3 chosen.");
      expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(2);
      const added = savedPost(9, { caption_preview: "Lashes collab", is_partnership_post: true });
      const create = onPost("/creator-profile/me/posts", async () => { savedPosts = [added, ...savedPosts]; return added; });
      fireEvent.change(within(dialog).getByPlaceholderText("https://www.instagram.com/p/…"), { target: { value: "https://www.instagram.com/p/P9/" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Add post" }));
      await within(dialog).findByText("Post added.");
      expect(create).toHaveBeenCalledWith({ post_url: "https://www.instagram.com/p/P9/", is_partnership_post: true });
      expect(within(dialog).getAllByTestId("picker-row")).toHaveLength(3);
      fireEvent.change(within(dialog).getByPlaceholderText("e.g. Falscara lashes, 2025 campaign"), { target: { value: "Falscara lashes,  2025 campaign" } });
      fireEvent.keyDown(within(dialog).getByPlaceholderText("e.g. Falscara lashes, 2025 campaign"), { key: "Enter" });
      expect(dialog).toHaveTextContent("2 of 3 chosen.");
      await closePicker(dialog);
      expect(chips("partnership")).toHaveLength(2);
      expect(chips("partnership")[1]).toHaveTextContent("Falscara lashes 2025 campaign");
      expect(chips("partnership")[1]).toHaveTextContent("described");
      queryClient.clear();
    });

    it("counts described partnerships toward the limit of three", async () => {
      const { queryClient } = setup();
      const dialog = await openPicker("partnership");
      const field = within(dialog).getByPlaceholderText("e.g. Falscara lashes, 2025 campaign");
      for (const text of ["One", "Two", "Three"]) {
        fireEvent.change(field, { target: { value: text } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
      }
      expect(dialog).toHaveTextContent("3 of 3 chosen. You can choose up to 3.");
      for (const box of within(dialog).getAllByRole("checkbox")) expect(box).toHaveAttribute("aria-disabled", "true");
      fireEvent.change(field, { target: { value: "Four" } });
      expect(within(dialog).getByRole("button", { name: "Add" })).toBeDisabled();
      await closePicker(dialog);
      expect(chips("partnership")).toHaveLength(3);
      queryClient.clear();
    });

    it("sends the chosen post URLs and described text, comma-separated", async () => {
      const { queryClient, post } = setup();
      fireEvent.click(screen.getByRole("button", { name: "+ Add another product launch" }));
      fireEvent.change(productInputs()[0], { target: { value: " A " } });
      fireEvent.change(productInputs()[1], { target: { value: "B" } });
      await chooseContentPosts(2);
      let dialog = await openPicker("partnership");
      fireEvent.click(within(dialog).getAllByRole("checkbox")[0]);
      fireEvent.change(within(dialog).getByPlaceholderText("e.g. Falscara lashes, 2025 campaign"), { target: { value: "Lash brand 2025" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
      await closePicker(dialog);
      generateNow();
      await screen.findByRole("textbox", { name: "Pitch email draft" });
      expect(post).toHaveBeenCalledExactlyOnceWith({
        is_custom: false, brand_id: 7, story: pitch.story, product_reference: "A, B",
        past_brand_partnership: "https://www.instagram.com/p/P4/, Lash brand 2025",
        content_link: "https://www.instagram.com/p/P1/, https://www.instagram.com/p/P2/",
      });
      queryClient.clear();
    });

    it("sends no partnership as null and blocks the request until a content post is chosen", async () => {
      const { queryClient, post } = setup();
      generateNow();
      expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one post that shows your connection to this brand.");
      expect(post).not.toHaveBeenCalled();
      await chooseContentPosts();
      generateNow();
      await screen.findByRole("textbox", { name: "Pitch email draft" });
      expect(post).toHaveBeenCalledWith(expect.objectContaining({
        product_reference: "Latest Studio Mic", past_brand_partnership: null, content_link: "https://www.instagram.com/p/P1/",
      }));
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

  it("generates without a story and sends an empty one", async () => {
    const queryClient = mountMatches();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    const post = onPost("/pitches", async () => ({ ...pitch, brand_id: 7, is_custom: false }));
    expect(screen.getByText("(optional)")).toBeInTheDocument();
    expect(screen.getByText("Optional. If you leave it empty, MAVLIT opens the email with what you make and why the brand fits your audience.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate pitch email draft" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
    await chooseContentPosts();
    fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Generate pitch email draft" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
    await screen.findByRole("textbox", { name: "Pitch email draft" });
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ brand_id: 7, story: "" }));
    queryClient.clear();
  });

  describe("profile reminder", () => {
    const reminder = () => screen.queryByText(/Keep your profile complete/);
    it("is shown while the audience description, highest views or content description is missing", () => {
      for (const [field, value] of [
        ["instagram_audience_description", null], ["instagram_audience_description", "  "],
        ["instagram_highest_views", null], ["instagram_description", ""],
      ] as const) {
        auth.user = { ...completeUser, [field]: value };
        const queryClient = mountMatches();
        expect(reminder()).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Update profile/ })).toHaveAttribute("href", "/profile");
        cleanup();
        queryClient.clear();
      }
    });

    it("is hidden once all three are filled in, including zero highest views", () => {
      for (const views of [120000, 0]) {
        auth.user = { ...completeUser, instagram_highest_views: views };
        const queryClient = mountMatches();
        expect(reminder()).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /Update profile/ })).not.toBeInTheDocument();
        cleanup();
        queryClient.clear();
      }
    });
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
    vi.spyOn(api, "get").mockImplementation(routeGet(() => ({ matches: [], total: 0 })));
    onPost("/own-brands", async () => job({ status: "ready", brand: { ...ownBrand, name: pitch.brand_name, latest_product: null } }));
    const post = onPost("/pitches", async () => pitch);
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
    await chooseContentPosts();
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
      product_reference: null, past_brand_partnership: null, content_link: "https://www.instagram.com/p/P1/",
    });
    expect(patch).toHaveBeenCalledExactlyOnceWith("/pitches/43", { pitch_text: edited });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["pitches"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    queryClient.clear();
  });

  describe("pitch typing effect", () => {
    const words = (count: number) => Array.from({ length: count }, (_, index) => `w${index + 1}`).join(" ");
    const live = () => screen.getByPlaceholderText("MAVLIT is writing your pitch…");
    async function start(text: string, extra: Partial<ApiPitch> = {}) {
      const queryClient = mountMatches();
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
      let finish!: (value: ApiPitch) => void;
      const pending = new Promise<ApiPitch>(resolve => { finish = resolve; });
      const post = onPost("/pitches", () => pending);
      fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
      fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
      await chooseContentPosts();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
      const settle = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
      const resolve = async () => { finish({ ...pitch, brand_id: 7, pitch_text: text, ...extra }); await settle(); };
      return { queryClient, post, settle, resolve };
    }

    it("waits with an empty read-only box and disabled Generate, then types the pitch word by word and unlocks it", async () => {
      const text = `Hi Lauren,\n\n${words(18)}`;
      const { queryClient, post, settle, resolve } = await start(text, { id: 77, contact_name: "Lauren", contact_email: "lauren@brand.test" });
      expect(post).toHaveBeenCalledOnce();
      expect(live()).toHaveValue("");
      expect(live()).toHaveAttribute("readonly");
      expect(screen.getByRole("status")).toHaveTextContent("Writing your pitch…");
      expect(screen.getByRole("button", { name: "Writing your pitch…" })).toBeDisabled();
      await settle(10_000); // nothing is typed before the response arrives
      expect(live()).toHaveValue("");
      await resolve();
      const chunks = text.match(/\s*\S+\s*/g)!;
      const delay = Math.max(12, Math.min(60, 4000 / chunks.length));
      await settle(delay - 1);
      expect(live()).toHaveValue("");
      await settle(1);
      expect(live()).toHaveValue(chunks[0]);
      await settle(delay);
      expect(live()).toHaveValue(chunks[0] + chunks[1]);
      expect(live()).toHaveAttribute("readonly");
      expect(screen.getByRole("button", { name: "Writing your pitch…" })).toBeDisabled();
      await settle(delay * chunks.length);
      expect(screen.queryByPlaceholderText("MAVLIT is writing your pitch…")).not.toBeInTheDocument();
      const editor = screen.getByRole("textbox", { name: "Pitch email draft" });
      expect(editor).toHaveValue(text);
      expect(editor).not.toHaveAttribute("readonly");
      expect(screen.getByText("Suggested contact: Lauren — lauren@brand.test")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Generate again" })).toBeEnabled();
      queryClient.clear();
    });

    it("keeps the whole effect within about four seconds, pacing long pitches at 12 ms per word", async () => {
      const text = words(1000);
      const { queryClient, settle, resolve } = await start(text);
      await resolve();
      await settle(12 * 1000 + 12);
      expect(screen.getByRole("textbox", { name: "Pitch email draft" })).toHaveValue(text);
      queryClient.clear();
    });

    it("shows the whole text at once when the box is clicked during typing", async () => {
      const text = words(40);
      const { queryClient, settle, resolve } = await start(text);
      await resolve();
      await settle(300);
      expect((live() as HTMLTextAreaElement).value.length).toBeGreaterThan(0);
      expect((live() as HTMLTextAreaElement).value.length).toBeLessThan(text.length);
      await act(async () => { fireEvent.click(live()); });
      await settle(0);
      expect(screen.getByRole("textbox", { name: "Pitch email draft" })).toHaveValue(text);
      expect(screen.getByRole("textbox", { name: "Pitch email draft" })).not.toHaveAttribute("readonly");
      queryClient.clear();
    });

    it("confirms before replacing unsaved edits when generating again", async () => {
      const { queryClient, post, settle, resolve } = await start("Hi Lauren, final email.");
      await resolve();
      await settle(2000);
      const editor = screen.getByRole("textbox", { name: "Pitch email draft" });
      fireEvent.change(editor, { target: { value: "Unsaved corrections" } });
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      fireEvent.click(screen.getByRole("button", { name: "Generate again" }));
      expect(confirm).toHaveBeenCalledOnce();
      expect(editor).toHaveValue("Unsaved corrections");
      expect(post).toHaveBeenCalledOnce();
      queryClient.clear();
    });

    it.each(["Brand not found", "Generation failed upstream"])("hides the draft box and shows the detail on an error response: %s", async (message) => {
      const queryClient = mountMatches();
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
      let fail!: (cause: Error) => void;
      onPost("/pitches", () => new Promise<ApiPitch>((_resolve, reject) => { fail = reject; }));
      fireEvent.click(screen.getByRole("button", { name: /Launch Brand/ }));
      fireEvent.change(screen.getByPlaceholderText(/gear since I was 16/), { target: { value: pitch.story } });
      await chooseContentPosts();
      fireEvent.click(screen.getByRole("button", { name: "Generate pitch email draft" }));
      expect(screen.getByPlaceholderText("MAVLIT is writing your pitch…")).toHaveValue("");
      await act(async () => fail(new ApiRequestError(message, 404)));
      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(screen.queryByRole("textbox", { name: "Pitch email draft" })).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText("MAVLIT is writing your pitch…")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Generate pitch email draft" })).toBeEnabled();
      queryClient.clear();
    });
  });
});
