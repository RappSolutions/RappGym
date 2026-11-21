import { afterEach, describe, expect, it, vi } from "vitest";
import { sendSupportEmail, supportEmailPayload, type SupportEmail } from "./support-email.server";

const message: SupportEmail = {
  id: "support-test", kind: "feedback", message: "Feedback <not html>",
  senderEmail: "member@example.org", senderName: "Member",
  diagnostics: { userId: "owner", completedSets: 12 },
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("support mail", () => {
  it("always sends to gym@rappsol.com from the verified RappGym address", () => {
    const payload = supportEmailPayload(message);
    expect(payload.Recipients.To).toEqual(["gym@rappsol.com"]);
    expect(payload.Content.From).toBe("RappGym <gym@rappsol.com>");
  });
  it("uses the account email as Reply-To, not From", () => {
    expect(supportEmailPayload(message).Content.ReplyTo).toBe("member@example.org");
  });
  it("includes original message and account diagnostics as plain text", () => {
    const part = supportEmailPayload(message).Content.Body[0];
    expect(part?.ContentType).toBe("PlainText");
    expect(part?.Content).toContain("Feedback <not html>");
    expect(part?.Content).toContain("completedSets: 12");
    expect(part?.Content).toContain("Message ID: support-test");
  });
  it("rejects header injection in the reply address", () => {
    expect(() => supportEmailPayload({ ...message, senderEmail: "member@example.org\r\nBcc: other@example.org" })).toThrow();
  });
  it("reports provider acceptance", async () => {
    vi.stubEnv("ELASTIC_EMAIL_API_KEY", "test-only");
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await sendSupportEmail(message)).toBe(true);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.elasticemail.com/v4/emails/transactional");
  });
  it("does not report provider rejection as sent", async () => {
    vi.stubEnv("ELASTIC_EMAIL_API_KEY", "test-only");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 403 })));
    expect(await sendSupportEmail(message)).toBe(false);
  });
  it("handles network failure without losing the stored-message result", async () => {
    vi.stubEnv("ELASTIC_EMAIL_API_KEY", "test-only");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await sendSupportEmail(message)).toBe(false);
  });
});