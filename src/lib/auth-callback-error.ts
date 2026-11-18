export type AuthCallbackError = { kind: "rejected" | "cancelled" | "other"; description: string };

/** Parses OAuth error params from a redirect URL hash or query string. Returns null when none. */
export function parseAuthCallbackError(hash: string, search: string): AuthCallbackError | null {
  for (const raw of [hash, search]) {
    const params = new URLSearchParams(raw.replace(/^[#?]/, ""));
    const code = params.get("error");
    if (!code) continue;
    const description = params.get("error_description") ?? code;
    const d = description.toLowerCase();
    if (code === "access_denied" && /cancel|denied by user|user denied/.test(d)) return { kind: "cancelled", description };
    if (code === "server_error" || code === "access_denied" || /banned|vendor|disabled/.test(d)) return { kind: "rejected", description };
    return { kind: "other", description };
  }
  return null;
}
