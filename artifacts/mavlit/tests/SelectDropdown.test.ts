import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// vitest runs from the app folder (artifacts/mavlit)
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("the dropdown list (Select)", () => {
  it("has a background: bg-popover needs the popover colour in the theme, or the list is transparent", () => {
    const css = read("src/index.css");
    expect(css).toMatch(/--color-popover:\s*hsl\(var\(--popover\)\)/);
    expect(css).toMatch(/--color-popover-foreground:\s*hsl\(var\(--popover-foreground\)\)/);
    expect(css).toMatch(/--popover:\s*[\d.]+ [\d.]+% [\d.]+%/);   // and the colour itself is defined
  });

  it("limits its height to the room on screen and scrolls, with its CSS variables written in a form Tailwind understands", () => {
    const select = read("src/components/ui/select.tsx");
    expect(select).toContain("max-h-[var(--radix-select-content-available-height)]");
    expect(select).toContain("overflow-y-auto");
    expect(select).not.toMatch(/\[--radix-select/);   // a bare [--var] is not a CSS variable in Tailwind 4
  });

  it("opens above a dialog", () => {
    expect(read("src/components/ui/select.tsx")).toContain("z-[100]");
    expect(read("src/components/ui/dialog.tsx")).toMatch(/z-50/);
  });
});
