/** Bump to re-prompt every user for the data/privacy terms. */
export const CURRENT_TERMS_VERSION = 1;

export type ConsentRow = { terms_version: number; consented_at: string };
export type ConsentPrompt = "first" | "update" | null;

/** Highest accepted version, 0 when none. */
export function maxAcceptedVersion(acceptedVersions: readonly number[]): number {
  return Math.max(0, ...acceptedVersions);
}

/** True when the user's highest accepted version is older than the current terms. */
export function needsConsent(acceptedVersions: readonly number[], current = CURRENT_TERMS_VERSION): boolean {
  return maxAcceptedVersion(acceptedVersions) < current;
}

/** Which blocking prompt to show: first-time, updated terms, or none. */
export function consentPrompt(acceptedVersions: readonly number[], current = CURRENT_TERMS_VERSION): ConsentPrompt {
  const max = maxAcceptedVersion(acceptedVersions);
  if (max >= current) return null;
  return max === 0 ? "first" : "update";
}

/** Latest accepted row, used to show version and ISO date. */
export function latestConsent(rows: readonly ConsentRow[]): ConsentRow | null {
  return rows.reduce<ConsentRow | null>((best, r) => (!best || r.terms_version > best.terms_version ? r : best), null);
}
