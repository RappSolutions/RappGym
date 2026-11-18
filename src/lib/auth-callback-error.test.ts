import { describe, expect, it } from "vitest";
import { parseAuthCallbackError } from "./auth-callback-error";

describe("parseAuthCallbackError", () => {
  it("treats a disabled user's vendor failure as rejected", () => {
    const e = parseAuthCallbackError("#error=server_error&error_description=failed+to+sign+in+with+vendor&state=x", "");
    expect(e).toEqual({ kind: "rejected", description: "failed to sign in with vendor" });
  });
  it("reads errors from the query string too", () => {
    expect(parseAuthCallbackError("", "?error=invalid_request")?.kind).toBe("other");
  });
  it("returns null without error params", () => {
    expect(parseAuthCallbackError("#access_token=abc", "")).toBeNull();
  });
});
