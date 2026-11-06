import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SetPassword from "@/pages/SetPassword";
import { ApiRequestError } from "@/lib/api";

const login = vi.fn();
const auth: { user: unknown } = { user: null };
const get = vi.fn();
const post = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: auth.user, login }) }));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api")>()), api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));

const open = (search = "?token=TOKEN123") => window.history.replaceState(null, "", `/set-password${search}`);
beforeEach(() => { login.mockReset(); get.mockReset(); post.mockReset(); auth.user = null; });
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

describe("early-access set-password page", () => {
  it("shows the invited email, not editable, and creates the account then signs in with the chosen password", async () => {
    open();
    get.mockResolvedValue({ status: "valid", email: "new@example.test" });
    post.mockResolvedValue({ status: "ok", email: "new@example.test" });
    render(<SetPassword />);
    const email = await screen.findByTestId("input-invite-email");
    expect(email).toHaveValue("new@example.test");
    expect(email).toBeDisabled();
    expect(email).toHaveAttribute("readonly");
    expect(get).toHaveBeenCalledWith("/auth/invite/TOKEN123");

    fireEvent.change(screen.getByTestId("input-invite-password"), { target: { value: "short" } });
    fireEvent.change(screen.getByTestId("input-invite-confirm"), { target: { value: "short" } });
    fireEvent.click(screen.getByTestId("button-set-password"));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 12 characters");
    expect(post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId("input-invite-password"), { target: { value: "a long enough password" } });
    fireEvent.change(screen.getByTestId("input-invite-confirm"), { target: { value: "a different password!" } });
    fireEvent.click(screen.getByTestId("button-set-password"));
    expect(await screen.findByRole("alert")).toHaveTextContent("do not match");
    expect(post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId("input-invite-confirm"), { target: { value: "a long enough password" } });
    fireEvent.click(screen.getByTestId("button-set-password"));
    await waitFor(() => expect(login).toHaveBeenCalledWith("new@example.test", "a long enough password"));
    expect(post).toHaveBeenCalledWith("/auth/invite/accept", { token: "TOKEN123", password: "a long enough password" });
  });

  it.each(["used", "expired", "invalid"] as const)("sends a %s link to the app", async (status) => {
    open();
    get.mockResolvedValue({ status, email: null });
    render(<SetPassword />);
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(screen.queryByTestId("input-invite-password")).not.toBeInTheDocument();
  });

  it("sends a link without a token to the app", async () => {
    open("");
    render(<SetPassword />);
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(get).not.toHaveBeenCalled();
  });

  it("opens the password page for a usable link even when another account is signed in", async () => {
    open();
    auth.user = { id: 1, email: "someone-else@example.test" };
    get.mockResolvedValue({ status: "valid", email: "new@example.test" });
    post.mockResolvedValue({ status: "ok", email: "new@example.test" });
    render(<SetPassword />);
    expect(await screen.findByTestId("input-invite-email")).toHaveValue("new@example.test");
    expect(screen.getByTestId("text-signed-in-notice")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/set-password");
    fireEvent.change(screen.getByTestId("input-invite-password"), { target: { value: "a long enough password" } });
    fireEvent.change(screen.getByTestId("input-invite-confirm"), { target: { value: "a long enough password" } });
    fireEvent.click(screen.getByTestId("button-set-password"));
    await waitFor(() => expect(login).toHaveBeenCalledWith("new@example.test", "a long enough password"));   // the new account replaces the old session
  });

  it("sends a signed-in visitor with a used link to the app", async () => {
    open();
    auth.user = { id: 1 };
    get.mockResolvedValue({ status: "used", email: null });
    render(<SetPassword />);
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(screen.queryByTestId("input-invite-password")).not.toBeInTheDocument();
  });

  it("leaves for the app when the link was used up between opening and saving", async () => {
    open();
    get.mockResolvedValue({ status: "valid", email: "new@example.test" });
    post.mockRejectedValue(new ApiRequestError("This link can no longer be used.", 410));
    render(<SetPassword />);
    await screen.findByTestId("input-invite-password");
    fireEvent.change(screen.getByTestId("input-invite-password"), { target: { value: "a long enough password" } });
    fireEvent.change(screen.getByTestId("input-invite-confirm"), { target: { value: "a long enough password" } });
    await act(async () => { fireEvent.click(screen.getByTestId("button-set-password")); });
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(login).not.toHaveBeenCalled();
  });
});
