import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BrandSocialLinks from "@/components/BrandSocialLinks";

describe("brand socials in the contact panel", () => {
  it("shows a logo link for each page that is known, opening in a new tab, and never the address as text", () => {
    const { container } = render(<BrandSocialLinks brandName="Alpha Audio"
      links={{ instagram: "https://www.instagram.com/alphaaudio", facebook: null, youtube: "https://www.youtube.com/@alphaaudio" }} />);
    expect(screen.getByText("Brand socials")).toBeInTheDocument();
    const instagram = screen.getByTestId("link-social-instagram");
    expect(instagram).toHaveAttribute("href", "https://www.instagram.com/alphaaudio");
    expect(instagram).toHaveAttribute("target", "_blank");
    expect(instagram).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(instagram).toHaveAccessibleName("Alpha Audio on Instagram");
    expect(instagram.querySelector("svg")).not.toBeNull();   // a logo, not a text link
    expect(screen.getByTestId("link-social-youtube")).toHaveAttribute("href", "https://www.youtube.com/@alphaaudio");
    expect(screen.queryByTestId("link-social-facebook")).not.toBeInTheDocument();   // not found: not shown
    expect(container).not.toHaveTextContent("instagram.com");
  });

  it.each([undefined, null, {}, { instagram: null, facebook: "", youtube: null }])("renders nothing when no page is known (%j)", (links) => {
    const { container } = render(<BrandSocialLinks links={links as never} />);
    expect(container).toBeEmptyDOMElement();
  });
});
