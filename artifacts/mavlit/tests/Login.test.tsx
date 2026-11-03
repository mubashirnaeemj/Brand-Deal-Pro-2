import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Login from "@/pages/Login";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ login: vi.fn() }) }));

describe("sign-in page", () => {
  it("sends creators without an account to the waiting list form on mavlit.com", () => {
    render(<Login />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\?/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Join the waiting list/ });
    expect(link).toHaveAttribute("href", "https://mavlit.com/#early-access");
    // A different site from this app (app.mavlit.com), so it is an ordinary link, not an in-app route.
    expect(link).not.toHaveAttribute("target", "_blank");
  });
});
