import { describe, expect, it } from "vitest";
import { authProviders } from "@/lib/auth-providers";

describe("allowed authentication methods", () => {
  it("allows only existing Google and Microsoft accounts, not email/password", () => {
    expect([...authProviders]).toEqual(["google", "microsoft"]);
  });
});