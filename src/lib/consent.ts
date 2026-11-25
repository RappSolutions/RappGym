/** Bump to re-prompt every user for the data/privacy terms. */
export const CURRENT_TERMS_VERSION = 1;

/** True when the user's highest accepted version is older than the current terms. */
export function needsConsent(acceptedVersions: readonly number[], current = CURRENT_TERMS_VERSION): boolean {
  return Math.max(0, ...acceptedVersions) < current;
}
