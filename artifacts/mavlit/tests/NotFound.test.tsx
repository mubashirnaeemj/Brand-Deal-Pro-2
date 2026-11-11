import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "@/pages/not-found";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

describe("404 page", () => {
  it("uses the MAVLIT look and plain wording, with a way back", async () => {
    installProfileApi(creatorProfile({ role: "user", onboarding_completed: true }));
    const { container } = renderProfile(<NotFound />);
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.queryByText(/Did you forget to add the page to the router/)).toBeNull();   // the old developer message is gone
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
    const page = container.firstElementChild as HTMLElement;
    expect(page.className).toContain("bg-background");                                       // the app's dark theme, not the old light grey
    expect(container.innerHTML).not.toContain("bg-gray-50");
    expect(container.innerHTML).not.toContain("text-gray-900");
  });
});
