/** Self-reported effort per completed set (RIR-based). Stored in log_entries.effort; NULL = not recorded. */
export const EFFORT_LEVELS = [1, 2, 3, 4, 5] as const;
export type Effort = (typeof EFFORT_LEVELS)[number];
export const DEFAULT_EFFORT: Effort = 3;
export function isEffort(v: unknown): v is Effort {
  return typeof v === "number" && (EFFORT_LEVELS as readonly number[]).includes(v);
}

/** Maps a horizontal pointer position over the band to the nearest integer zone 1–5. */
export function effortAtPosition(x: number, left: number, width: number): Effort {
  if (!(width > 0)) return DEFAULT_EFFORT;
  const zone = Math.ceil(((x - left) / width) * 5);
  return Math.min(5, Math.max(1, zone)) as Effort;
}

/** One theme index per set (seed only), so all five levels of a set come from the same theme. */
export function effortPhraseIndex(seed: string, effort: Effort, phraseCount: number): number {
  if (!Number.isInteger(phraseCount) || phraseCount < 1) return 0;
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % phraseCount;
}

export function effortPhrase(seed: string, effort: Effort, phrases: readonly string[], fallback: string): string {
  if (!phrases.length) return fallback;
  return phrases[effortPhraseIndex(seed, effort, phrases.length)] ?? fallback;
}
