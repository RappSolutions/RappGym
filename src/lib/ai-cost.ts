/** Approximate AI Gateway price per 1M tokens (USD) and SEK conversion; the gateway bills in credits, so this is an estimate. */
export const AI_PRICE_USD_PER_MTOKEN = { input: 1.25, output: 10 } as const;
export const SEK_PER_USD = 10.5;

export function aiCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens * AI_PRICE_USD_PER_MTOKEN.input + outputTokens * AI_PRICE_USD_PER_MTOKEN.output) / 1_000_000;
}

export const DEFAULT_USAGE = { summary: { input: 4000, output: 1500 }, plan: { input: 4500, output: 3500 } } as const;

/** Estimate from earlier runs of the same mode (average), falling back to defaults when there is no history. */
export function estimateUsage(mode: "summary" | "plan", past: readonly { mode: string; inputTokens: number | null; outputTokens: number | null }[]) {
  const runs = past.filter((p) => p.mode === mode && p.inputTokens != null && p.outputTokens != null);
  if (!runs.length) return { ...DEFAULT_USAGE[mode] };
  const avg = (f: (p: (typeof runs)[number]) => number) => Math.round(runs.reduce((n, p) => n + f(p), 0) / runs.length);
  return { input: avg((p) => p.inputTokens ?? 0), output: avg((p) => p.outputTokens ?? 0) };
}

/** "0,09 kr · 2 640 tokens" style text, Swedish or English number formatting. */
export function formatAiCost(inputTokens: number, outputTokens: number, language: "sv" | "en", approx = false) {
  const locale = language === "sv" ? "sv-SE" : "en-GB";
  const sek = aiCostUsd(inputTokens, outputTokens) * SEK_PER_USD;
  const kr = sek.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tokens = (inputTokens + outputTokens).toLocaleString(locale);
  return `${approx ? "~" : ""}${kr} kr · ${approx ? "~" : ""}${tokens} tokens`;
}
