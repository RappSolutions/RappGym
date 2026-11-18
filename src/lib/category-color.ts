/** Category colours: legacy palette tokens (cat-N, themed in styles.css) or free hex colours stored in the database. */
export const HEX_COLOR = /^#[0-9a-f]{6}$/;
export const isHexColor = (token: string) => HEX_COLOR.test(token);

/** Relative luminance (WCAG) of a #rrggbb colour. */
export function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

/** Light fills get dark text on top and a darkened ink/chart colour so text stays legible on white. */
export function hexThemeVars(hex: string) {
  const light = luminance(hex) > 0.4;
  const ink = light ? `color-mix(in oklab, ${hex} 55%, black)` : hex;
  return { fill: hex, ink, on: light ? "var(--foreground)" : "var(--primary-foreground)", chart: ink };
}

/** CSS rules for every hex category, keyed by the same data-category attribute the palette tokens use. */
export function hexCategoryCss(tokens: readonly string[]): string {
  return [...new Set(tokens.filter(isHexColor))].map((hex) => {
    const v = hexThemeVars(hex);
    return `.category-theme[data-category="${hex}"]{--category-fill:${v.fill};--category-ink:${v.ink};--category-on:${v.on};--category-chart:${v.chart};}`;
  }).join("\n");
}

/** Approximate hex of legacy tokens so the colour picker opens on the current colour. */
export const LEGACY_TOKEN_HEX: Record<string, string> = {
  "cat-1": "#0063ff", "cat-2": "#3cc3d6", "cat-3": "#ffff00", "cat-4": "#e8453c", "cat-5": "#0042ad", "cat-6": "#d957b5", "cat-7": "#3fb67a",
};
export const tokenToHex = (token: string) => (isHexColor(token) ? token : LEGACY_TOKEN_HEX[token] ?? "#0063ff");
