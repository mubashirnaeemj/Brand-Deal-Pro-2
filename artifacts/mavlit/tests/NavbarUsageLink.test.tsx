import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Navbar from "@/components/Navbar";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

beforeEach(() => window.history.replaceState(null, "", "/dashboard"));

describe("Navbar: the Usage link", () => {
  it("is shown to an admin", async () => {
    installProfileApi(creatorProfile({ role: "admin", onboarding_completed: true }));
    renderProfile(<Navbar />);
    expect(await screen.findByTestId("nav-link-usage")).toHaveAttribute("href", "/usage-cost");
  });

  it.each([["user"], [undefined]] as const)("is not shown when the role is %s", async (role) => {
    installProfileApi(creatorProfile({ role, onboarding_completed: true }));
    renderProfile(<Navbar />);
    await screen.findByTestId("nav-link-dashboard");
    await waitFor(() => expect(screen.getByTestId("nav-link-profile")).toBeInTheDocument());
    expect(screen.queryByTestId("nav-link-usage")).toBeNull();
  });
});
