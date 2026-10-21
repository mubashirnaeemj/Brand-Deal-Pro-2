import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileSettings from "@/pages/ProfileSettings";
import * as creatorPosts from "@/lib/creatorPosts";
import { creatorProfile } from "./fixtures/creatorProfile";
import { fixturePost, installProfileApi } from "./fixtures/profileApi";
import { renderProfile } from "./renderProfile";

let fixture: ReturnType<typeof installProfileApi>;
afterEach(() => { cleanup(); fixture?.assertIsolated(); vi.restoreAllMocks(); });

const posts = (count: number) => Array.from({ length: count }, (_, index) => fixturePost(count - index));

async function mount(initialPosts = posts(14)) {
  fixture = installProfileApi(creatorProfile());
  fixture.setPosts(initialPosts);
  const rendered = renderProfile(<ProfileSettings />);
  await screen.findByTestId("profile-wizard");
  while (screen.queryByRole("button", { name: "Continue" })) fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByTestId("input-brand-preferences");
  return rendered;
}
const openDialog = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "View your recent Instagram posts" }));
  return screen.findByRole("dialog");
};
const deleteButtons = () => screen.getAllByRole("button", { name: /^Delete / });
const rows = () => screen.getAllByTestId("post-row");

describe("recent Instagram posts on the profile page", () => {
  it("does not show the card to a creator without posts", async () => {
    await mount([]);
    await waitFor(() => expect(fixture.requests.some((r) => r.path.endsWith("/creator-profile/me/posts"))).toBe(true));
    expect(screen.queryByTestId("recent-posts-card")).not.toBeInTheDocument();
    expect(screen.queryByText("Your recent Instagram posts")).not.toBeInTheDocument();
  });

  it("shows the card above the Save button and a blurred modal with the post details", async () => {
    await mount(posts(10));
    const card = await screen.findByTestId("recent-posts-card");
    expect(card.compareDocumentPosition(screen.getByTestId("button-save")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card).toHaveTextContent("Mark the ones that were paid partnerships, remove posts you don't want to use, or add a post by its link.");
    const dialog = await openDialog();
    expect(screen.getByTestId("posts-overlay").style.backdropFilter).toBe("blur(6px)");
    expect(document.body).toHaveAttribute("data-scroll-locked");
    expect(within(dialog).getByText("Your recent Instagram posts")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("You have 10 posts. At least 10 posts stay on your profile, so nothing can be deleted until you add more.");
    const first = rows()[0];
    expect(within(first).getByRole("link")).toHaveAttribute("href", "https://www.instagram.com/p/POST10/");
    expect(within(first).getByRole("link")).toHaveAttribute("target", "_blank");
    expect(first).toHaveTextContent("Caption 10");
    expect(first).toHaveTextContent("Likes 1,234 · Comments 56 · Views 78,000");
    for (const button of deleteButtons()) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "At least 10 posts have to stay");
    }
  });

  it("shows (no caption) and a dash for missing numbers", async () => {
    await mount([fixturePost(1, { caption_preview: null, likes_count: null, views_count: null }), ...posts(10).slice(1)]);
    await openDialog();
    const row = rows().find((r) => r.textContent?.includes("POST1/"))!;
    expect(row).toHaveTextContent("(no caption)");
    expect(row).toHaveTextContent("Likes – · Comments 56 · Views –");
  });

  it("shows when each post was published in the viewer's time zone, or a dash when unknown", async () => {
    const expected = new Date("2026-10-20T15:04:00.000Z").toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    await mount([
      fixturePost(1, { timestamp: "2026-10-20T15:04:00.000Z" }),
      fixturePost(2, { timestamp: null }),
      fixturePost(3, { timestamp: "not a date" }),
      ...posts(10).slice(3),
    ]);
    await openDialog();
    const [first, second, third] = rows();
    expect(within(first).getByTestId("post-posted-at")).toHaveTextContent(`Posted ${expected}`);
    // between the caption and the numbers
    expect(first.textContent).toMatch(/Caption 1Posted .+Likes 1,234/);
    expect(within(second).getByTestId("post-posted-at")).toHaveTextContent("Posted –");
    expect(within(third).getByTestId("post-posted-at")).toHaveTextContent("Posted –");
    expect(document.body).not.toHaveTextContent("Invalid Date");
  });

  it("closes with the × button, Escape and a click on the overlay", async () => {
    const user = userEvent.setup();
    await mount();
    await openDialog();
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openDialog();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openDialog();
    await user.click(screen.getByTestId("posts-overlay"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
  });

  it("saves the paid partnership toggle immediately and keeps it after reopening and reloading", async () => {
    const user = userEvent.setup();
    const rendered = await mount(posts(10));
    await openDialog();
    const toggle = within(rows()[0]).getByRole("switch");
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    await waitFor(() => expect(fixture.requests.at(-1)).toMatchObject({
      method: "PATCH", path: "/api/mavlit/creator-profile/me/posts/10", body: { is_partnership_post: true },
    }));
    expect(toggle).toBeChecked();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openDialog();
    expect(within(rows()[0]).getByRole("switch")).toBeChecked();
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await screen.findByTestId("profile-wizard");
    while (screen.queryByRole("button", { name: "Continue" })) fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await openDialog();
    expect(within(rows()[0]).getByRole("switch")).toBeChecked();
  });

  it("puts the switch back and shows the error when the toggle call fails", async () => {
    const user = userEvent.setup();
    await mount(posts(10));
    vi.spyOn(creatorPosts, "setPostPartnership").mockRejectedValue(new Error("Instagram is not answering."));
    await openDialog();
    const toggle = within(rows()[0]).getByRole("switch");
    await user.click(toggle);
    expect(await screen.findByRole("alert")).toHaveTextContent("Instagram is not answering.");
    expect(toggle).not.toBeChecked();
  });

  it("deletes down to 10 posts after confirmation, then disables every Delete button", async () => {
    const user = userEvent.setup();
    await mount(posts(14));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const dialog = await openDialog();
    expect(dialog).toHaveTextContent("You have 14 posts. A post can be deleted while more than 10 remain.");
    for (const button of deleteButtons()) expect(button).toBeEnabled();
    await user.click(deleteButtons()[0]);
    expect(confirm).toHaveBeenCalledWith("Delete this post from your profile?");
    expect(fixture.requests.some((r) => r.method === "DELETE")).toBe(false);
    confirm.mockReturnValue(true);
    for (let remaining = 13; remaining >= 10; remaining--) {
      await user.click(deleteButtons()[0]);
      await waitFor(() => expect(rows()).toHaveLength(remaining));
    }
    expect(fixture.requests.filter((r) => r.method === "DELETE")).toHaveLength(4);
    for (const button of deleteButtons()) expect(button).toBeDisabled();
    expect(dialog).toHaveTextContent("You have 10 posts. At least 10 posts stay on your profile");
  });

  it("shows the server's message when a delete is refused", async () => {
    const user = userEvent.setup();
    await mount(posts(14));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(creatorPosts, "deleteCreatorPost").mockRejectedValue(new Error("At least 10 posts have to stay."));
    await openDialog();
    await user.click(deleteButtons()[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("At least 10 posts have to stay.");
    expect(rows()).toHaveLength(14);
  });

  it("adds a post: progress text, the new post at the top, no duplicate, and server errors", async () => {
    const user = userEvent.setup();
    await mount(posts(10));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const real = creatorPosts.addCreatorPost;
    vi.spyOn(creatorPosts, "addCreatorPost").mockImplementation(async (url) => { await gate; return real(url); });
    await openDialog();
    const input = screen.getByPlaceholderText("https://www.instagram.com/p/…");
    await user.click(screen.getByRole("button", { name: "Add post" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Paste the link of an Instagram post.");
    expect(fixture.requests.some((r) => r.method === "POST")).toBe(false);
    await user.type(input, "https://www.instagram.com/p/NEWPOST/{Enter}");
    expect(screen.getByRole("button", { name: "Reading the post…" })).toBeDisabled();
    expect(screen.getByText("MAVLIT is reading this post. This can take up to a minute.")).toBeInTheDocument();
    await act(async () => { release(); });
    expect(await screen.findByText("Post added.")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(rows()).toHaveLength(11);
    expect(within(rows()[0]).getByRole("link")).toHaveAttribute("href", "https://www.instagram.com/p/NEWPOST/");
    expect(screen.getByRole("button", { name: "Add post" })).toBeEnabled();
    await user.type(input, "https://www.instagram.com/p/NEWPOST/{Enter}");
    await screen.findByText("Post added.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Add post" })).toBeEnabled());
    expect(rows()).toHaveLength(11);
    await user.type(input, "https://example.com{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("That is not an Instagram post link.");
    expect(rows()).toHaveLength(11);
  });
});

describe("searching the recent posts by caption", () => {
  const longCaption = `${"Behind the scenes of my studio setup. ".repeat(4)}Finally unboxing the Zephyr pedal`;
  const captioned = (count: number) => posts(count).map((post) => {
    if (post.id === 3) return { ...post, caption_preview: longCaption.slice(0, 40), full_caption: longCaption };
    if (post.id === 5 || post.id === 7) return { ...post, caption_preview: `Guitar day ${post.id}`, full_caption: `Guitar day ${post.id}` };
    return post;
  });
  const searchFor = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), `${text}{Enter}`);
  };
  const lastQuery = () => fixture.requests.filter((r) => r.method === "GET" && r.path.endsWith("/posts")).at(-1)?.search;

  it("lists only the matching posts and counts them in the note, ignoring case", async () => {
    const user = userEvent.setup();
    await mount(captioned(12));
    const dialog = await openDialog();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    await searchFor(user, "GUITAR");
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(lastQuery()).toBe("?q=GUITAR");
    expect(dialog).toHaveTextContent("2 of your posts match your search. You have 12 posts. A post can be deleted while more than 10 remain.");
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("searches while typing, after a short pause and without pressing Search", async () => {
    const user = userEvent.setup();
    await mount(captioned(12));
    await openDialog();
    await user.type(screen.getByRole("searchbox"), "guitar");
    await waitFor(() => expect(rows()).toHaveLength(2));
    // One request for the finished word, not one per keystroke.
    const queries = fixture.requests.filter((r) => r.method === "GET" && r.search.startsWith("?q=")).map((r) => r.search);
    expect(queries).toEqual(["?q=guitar"]);
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox"));
    await waitFor(() => expect(rows()).toHaveLength(12));
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("does not search for text typed and abandoned by closing, and starts empty when reopened", async () => {
    const user = userEvent.setup();
    await mount(captioned(12));
    await openDialog();
    await user.type(screen.getByRole("searchbox"), "guit");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openDialog();
    expect(screen.getByRole("searchbox")).toHaveValue("");
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(fixture.requests.some((r) => r.search.startsWith("?q="))).toBe(false);
    expect(rows()).toHaveLength(12);
  });

  it("finds a word at the end of a long caption through the API, not by filtering the preview", async () => {
    const user = userEvent.setup();
    await mount(captioned(12));
    await openDialog();
    expect(screen.queryByText(/Zephyr/)).not.toBeInTheDocument();
    await searchFor(user, "zephyr pedal");
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toHaveTextContent("POST3/");
    expect(lastQuery()).toBe("?q=zephyr%20pedal");
  });

  it("shows a no-match message, and Clear brings back all posts with an empty search", async () => {
    const user = userEvent.setup();
    await mount(captioned(12));
    const dialog = await openDialog();
    await searchFor(user, "nothing here");
    expect(await screen.findByTestId("posts-no-match")).toHaveTextContent('No post caption contains "nothing here".');
    expect(screen.queryAllByTestId("post-row")).toHaveLength(0);
    expect(screen.getByTestId("recent-posts-card")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(rows()).toHaveLength(12));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    expect(dialog).not.toHaveTextContent("match your search");
  });

  it("treats a blank search as showing every post and starts empty when reopened", async () => {
    const user = userEvent.setup();
    await mount(captioned(12));
    await openDialog();
    await searchFor(user, "guitar");
    await waitFor(() => expect(rows()).toHaveLength(2));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openDialog();
    expect(screen.getByRole("searchbox")).toHaveValue("");
    await waitFor(() => expect(rows()).toHaveLength(12));
    await searchFor(user, "guitar");
    await waitFor(() => expect(rows()).toHaveLength(2));
    await searchFor(user, "   ");
    await waitFor(() => expect(rows()).toHaveLength(12));
    expect(lastQuery()).toBe("");
  });

  it("keeps Delete enabled by the total: 12 posts with 2 matches, but not 10 posts", async () => {
    const user = userEvent.setup();
    const rendered = await mount(captioned(12));
    await openDialog();
    await searchFor(user, "guitar");
    await waitFor(() => expect(rows()).toHaveLength(2));
    for (const button of deleteButtons()) expect(button).toBeEnabled();
    rendered.unmount();
    cleanup();
    await mount(captioned(10));
    await openDialog();
    await searchFor(user, "guitar");
    await waitFor(() => expect(rows()).toHaveLength(2));
    for (const button of deleteButtons()) expect(button).toBeDisabled();
  });

  it("keeps the search active after toggling, deleting and adding a post", async () => {
    const user = userEvent.setup();
    await mount(captioned(12));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const dialog = await openDialog();
    await searchFor(user, "guitar");
    await waitFor(() => expect(rows()).toHaveLength(2));
    await user.click(within(rows()[0]).getByRole("switch"));
    await waitFor(() => expect(fixture.requests.at(-1)?.method).toBe("PATCH"));
    expect(rows()).toHaveLength(2);
    await user.click(deleteButtons()[0]);
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(lastQuery()).toBe("?q=guitar");
    expect(dialog).toHaveTextContent("1 of your posts match your search. You have 11 posts.");
    await user.type(screen.getByPlaceholderText("https://www.instagram.com/p/…"), "https://www.instagram.com/p/OTHER/{Enter}");
    await screen.findByText("Post added.");
    expect(lastQuery()).toBe("?q=guitar");
    expect(rows()).toHaveLength(1);
    expect(dialog).toHaveTextContent("1 of your posts match your search. You have 12 posts.");
  });
});
