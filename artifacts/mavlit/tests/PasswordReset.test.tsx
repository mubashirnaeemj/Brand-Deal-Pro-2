import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Login from "@/pages/Login";
import { ApiRequestError } from "@/lib/api";

const login = vi.fn();
const get = vi.fn();
const post = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, login }) }));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api")>()), api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));

const open = (path: string) => window.history.replaceState(null, "", path);
beforeEach(() => { login.mockReset(); get.mockReset(); post.mockReset(); });
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

describe("sign-in page", () => {
  it("has a 'Forgot your password?' line above the waiting-list line, linking to the reset page", () => {
    render(<Login />);
    const link = screen.getByTestId("link-forgot-password");
    expect(link).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByText(/Forgot your password\?/)).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\?/)).toBeInTheDocument();
    expect(link.compareDocumentPosition(screen.getByTestId("link-waiting-room")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("forgot password page", () => {
  it("asks for the email, sends it and confirms where the link went", async () => {
    post.mockResolvedValue({ status: "ok" });
    render(<ForgotPassword />);
    expect(screen.getByTestId("button-send-reset")).toBeDisabled();
    fireEvent.change(screen.getByTestId("input-forgot-email"), { target: { value: "  alex@example.com " } });
    fireEvent.click(screen.getByTestId("button-send-reset"));
    await waitFor(() => expect(screen.getByTestId("forgot-sent")).toHaveTextContent("alex@example.com"));
    expect(post).toHaveBeenCalledWith("/auth/forgot-password", { email: "alex@example.com" });
    expect(screen.getByTestId("forgot-sent")).toHaveTextContent("We've sent a link to reset your password");
    expect(screen.queryByTestId("forgot-not-registered")).not.toBeInTheDocument();
    expect(screen.getByTestId("link-back-to-signin")).toHaveAttribute("href", "/signin");
  });

  it("tells the visitor an unregistered email is not registered, offers the waiting list and lets them correct it", async () => {
    post.mockResolvedValue({ status: "not_registered" });
    render(<ForgotPassword />);
    fireEvent.change(screen.getByTestId("input-forgot-email"), { target: { value: "stranger@example.com" } });
    fireEvent.click(screen.getByTestId("button-send-reset"));
    const notice = await screen.findByTestId("forgot-not-registered");
    expect(notice).toHaveTextContent("This email isn't registered with MAVLIT");
    expect(screen.getByTestId("link-waiting-room")).toHaveAttribute("href", "https://mavlit.com/#early-access");
    expect(screen.queryByTestId("forgot-sent")).not.toBeInTheDocument();          // no "we sent a link" claim
    expect(screen.getByTestId("input-forgot-email")).toBeEnabled();                // the form stays so the address can be fixed
    post.mockResolvedValue({ status: "ok" });
    fireEvent.change(screen.getByTestId("input-forgot-email"), { target: { value: "right@example.com" } });
    fireEvent.click(screen.getByTestId("button-send-reset"));
    await waitFor(() => expect(screen.getByTestId("forgot-sent")).toHaveTextContent("right@example.com"));
    expect(screen.queryByTestId("forgot-not-registered")).not.toBeInTheDocument();
  });

  it.each([["inactive", "deactivated"], ["limited", "already sent several"], ["invalid_email", "valid email"]])(
    "shows a message for the %s answer", async (status, words) => {
      post.mockResolvedValue({ status });
      render(<ForgotPassword />);
      fireEvent.change(screen.getByTestId("input-forgot-email"), { target: { value: "a@b.co" } });
      fireEvent.click(screen.getByTestId("button-send-reset"));
      expect(await screen.findByRole("alert")).toHaveTextContent(words);
      expect(screen.queryByTestId("forgot-sent")).not.toBeInTheDocument();
    });

  it("shows the server's message when too many requests were made", async () => {
    post.mockRejectedValue(new ApiRequestError("Too many requests. Please try again later.", 429));
    render(<ForgotPassword />);
    fireEvent.change(screen.getByTestId("input-forgot-email"), { target: { value: "a@b.co" } });
    fireEvent.click(screen.getByTestId("button-send-reset"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
  });
});

describe("reset password page", () => {
  it("shows the account email (not editable), checks the passwords, saves and signs in", async () => {
    open("/reset-password?token=RT1");
    get.mockResolvedValue({ status: "valid", email: "Alex@example.com" });
    post.mockResolvedValue({ status: "ok", email: "Alex@example.com" });
    render(<ResetPassword />);
    const email = await screen.findByTestId("input-reset-email");
    expect(email).toHaveValue("Alex@example.com");
    expect(email).toBeDisabled();
    expect(get).toHaveBeenCalledWith("/auth/password-reset/RT1");

    fireEvent.change(screen.getByTestId("input-reset-password"), { target: { value: "abc" } });
    fireEvent.change(screen.getByTestId("input-reset-confirm"), { target: { value: "abc" } });
    fireEvent.click(screen.getByTestId("button-reset-password"));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 6 characters");
    fireEvent.change(screen.getByTestId("input-reset-password"), { target: { value: "new password" } });
    fireEvent.click(screen.getByTestId("button-reset-password"));
    expect(await screen.findByRole("alert")).toHaveTextContent("do not match");
    expect(post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId("input-reset-confirm"), { target: { value: "new password" } });
    fireEvent.click(screen.getByTestId("button-reset-password"));
    await waitFor(() => expect(login).toHaveBeenCalledWith("Alex@example.com", "new password"));
    expect(post).toHaveBeenCalledWith("/auth/password-reset", { token: "RT1", password: "new password" });
  });

  it.each(["used", "expired", "invalid"] as const)("a %s link says so and offers a new one", async (status) => {
    open("/reset-password?token=RT1");
    get.mockResolvedValue({ status, email: null });
    render(<ResetPassword />);
    expect(await screen.findByTestId("reset-dead")).toHaveTextContent("This link can't be used");
    expect(screen.getByTestId("link-ask-new-reset")).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByTestId("input-reset-password")).not.toBeInTheDocument();
  });

  it("a link without a token cannot be used", async () => {
    open("/reset-password");
    render(<ResetPassword />);
    expect(await screen.findByTestId("reset-dead")).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it("a link used up between opening and saving shows the same message", async () => {
    open("/reset-password?token=RT1");
    get.mockResolvedValue({ status: "valid", email: "Alex@example.com" });
    post.mockRejectedValue(new ApiRequestError("This link can no longer be used.", 410));
    render(<ResetPassword />);
    await screen.findByTestId("input-reset-password");
    fireEvent.change(screen.getByTestId("input-reset-password"), { target: { value: "new password" } });
    fireEvent.change(screen.getByTestId("input-reset-confirm"), { target: { value: "new password" } });
    fireEvent.click(screen.getByTestId("button-reset-password"));
    expect(await screen.findByTestId("reset-dead")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
});
