import { describe, expect, it } from "vitest";
import { hexCategoryCss, hexThemeVars, tokenToHex } from "@/lib/category-color";

describe("category colours", () => {
  it("gives light fills dark text", () => expect(hexThemeVars("#ffff00").on).toBe("var(--foreground)"));
  it("gives dark fills light text", () => expect(hexThemeVars("#0042ad").on).toBe("var(--primary-foreground)"));
  it("emits rules only for hex tokens", () => {
    const css = hexCategoryCss(["cat-1", "#112233", "#112233"]);
    expect(css.match(/data-category/g)).toHaveLength(1);
    expect(css).toContain('[data-category="#112233"]');
  });
  it("maps legacy tokens to a picker colour", () => expect(tokenToHex("cat-1")).toBe("#0063ff"));
});
