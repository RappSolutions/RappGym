import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
/** Optional when running offline; the sandbox run explicitly provides these public credentials. */
describe.skipIf(!url || !key)("live anonymous access boundaries", () => {
  let shared: ReturnType<typeof createClient<Database>> | undefined;
  function client() {
    if (shared) return shared;
    if (!url || !key) throw new Error("Missing public test configuration");
    shared = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    return shared;
  }
  it("public catalogue has unique exercises and no owner or personal fields", async () => {
    const r = await client().rpc("public_exercise_catalogue");
    expect(r.error === null).toBe(true);
    const rows = r.data ?? [];
    expect(rows.length > 0).toBe(true);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.every((r) => !("user_id" in r) && !("email" in r) && !("translations" in r))).toBe(
      true,
    );
  });
  it("anonymous callers cannot read private training logs", async () => {
    const r = await client().from("log_entries").select("id").limit(1);
    expect(r.error !== null || (r.data?.length ?? 0) === 0).toBe(true);
  });
  it("anonymous callers cannot grant paid access", async () => {
    const r = await client().rpc("set_manual_membership", {
      _user_id: "123e4567-e89b-42d3-a456-426614174000",
      _starts_on: "2026-11-01",
      _ends_on: "2026-11-30",
      _stripe_reference: "test-denied",
    });
    expect(r.error !== null).toBe(true);
  });
  it("anonymous callers cannot erase an account", async () => {
    const r = await client().rpc("erase_account_data", {
      _user_id: "123e4567-e89b-42d3-a456-426614174000",
    });
    expect(r.error !== null).toBe(true);
  });
});
