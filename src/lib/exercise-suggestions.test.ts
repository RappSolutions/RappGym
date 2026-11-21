import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { exerciseSuggestionSchema } from "./exercise-suggestions";
import { supportEmailPayload } from "./support-email.server";

const suggestion = { name: "Ny roddvariant", category_id: null, equipment_id: null, instructions: "Dra handtaget mot bålen med kontrollerad rörelse.", source_url: "" };
describe("exercise suggestions", () => {
  it("accepts a named exercise with instructions and optional lookup fields", () => {
    expect(exerciseSuggestionSchema.parse(suggestion)).toEqual(suggestion);
  });
  it("requires a name and instructions", () => {
    expect(exerciseSuggestionSchema.safeParse({ ...suggestion, name: " " }).success).toBe(false);
    expect(exerciseSuggestionSchema.safeParse({ ...suggestion, instructions: " " }).success).toBe(false);
  });
  it("stores category and equipment references as UUIDs, not labels", () => {
    expect(exerciseSuggestionSchema.safeParse({ ...suggestion, category_id: "Överkropp" }).success).toBe(false);
    expect(exerciseSuggestionSchema.safeParse({ ...suggestion, equipment_id: "Hantel" }).success).toBe(false);
  });
  it("allows only web URLs", () => {
    expect(exerciseSuggestionSchema.safeParse({ ...suggestion, source_url: "https://example.org/exercise" }).success).toBe(true);
    expect(exerciseSuggestionSchema.safeParse({ ...suggestion, source_url: "javascript:alert(1)" }).success).toBe(false);
    expect(exerciseSuggestionSchema.safeParse({ ...suggestion, source_url: "ftp://example.org/exercise" }).success).toBe(false);
  });
  it("sends exercise suggestions to gym@rappsol.com with the account as Reply-To", () => {
    const mail = supportEmailPayload({ id: "suggestion", kind: "exercise-suggestion", message: suggestion.instructions, senderEmail: "member@example.org", senderName: "Member", diagnostics: { userId: "owner" } });
    expect(mail.Recipients.To).toEqual(["gym@rappsol.com"]);
    expect(mail.Content.ReplyTo).toBe("member@example.org");
    expect(mail.Content.Subject).toBe("[RappGym exercise-suggestion] Member");
  });
});