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
