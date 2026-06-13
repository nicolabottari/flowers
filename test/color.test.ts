import { describe, expect, it } from "vitest";
import { oklch } from "../src/shared/color";

describe("oklch", () => {
  it("maps the extremes to pure white and black", () => {
    expect(oklch(1, 0, 0)).toBe("#ffffff");
    expect(oklch(0, 0, 0)).toBe("#000000");
  });

  it("always returns a valid hex color, even out of gamut", () => {
    expect(oklch(0.7, 0.4, 145)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
