import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Navbar from "@/components/Navbar";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

beforeEach(() => window.history.replaceState(null, "", "/dashboard"));

describe("Navbar: no Usage button", () => {
  it.each([["admin"], ["user"]] as const)("is not shown to a %s (admins open /admin directly)", async (role) => {
    installProfileApi(creatorProfile({ role, onboarding_completed: true }));
    renderProfile(<Navbar />);
    await screen.findByTestId("nav-link-dashboard");
    expect(screen.getByTestId("nav-link-profile")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-link-usage")).toBeNull();
  });
});
