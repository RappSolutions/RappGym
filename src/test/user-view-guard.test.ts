import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { assertUserViewWritable } from "@/lib/user-view-guard";

function client(data: boolean | null, error: { message: string } | null = null) {
  return { rpc: vi.fn().mockResolvedValue({ data, error }) } as unknown as SupabaseClient<Database>;
}

describe("server user-view guard", () => {
  it("blocks side effects while inspecting", async () => {
    await expect(assertUserViewWritable(client(true))).rejects.toThrow();
  });
  it("permits ordinary owner operations", async () => {
    await expect(assertUserViewWritable(client(false))).resolves.toBeUndefined();
  });
  it("fails closed if the database cannot validate the view", async () => {
    await expect(assertUserViewWritable(client(null, { message: "unavailable" }))).rejects.toThrow("unavailable");
  });
});