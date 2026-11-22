import { afterEach, describe, expect, it, vi } from "vitest";
import { exerciseNameUrl, preserveExerciseLink } from "./exercise-title";
import { fetchExerciseTitle, publicAddress, titleFromHtml } from "./exercise-title.server";

afterEach(() => vi.unstubAllGlobals());
describe("exercise URL names", () => {
  it("accepts whole HTTP(S) URLs, not ordinary names or unsafe schemes", () => {
    expect(exerciseNameUrl(" https://youtu.be/dQw4w9WgXcQ ")).toBe("https://youtu.be/dQw4w9WgXcQ");
    for (const text of ["Chest press", "See https://example.com", "javascript:alert(1)", "https://user:pass@example.com"]) expect(exerciseNameUrl(text)).toBeNull();
  });
  it("preserves existing instructions and appends a link once", () => {
    const url = "https://youtu.be/dQw4w9WgXcQ";
    expect(preserveExerciseLink("Slowly", url)).toBe(`Slowly\n${url}`);
    expect(preserveExerciseLink(`Slowly\n${url}`, url)).toBe(`Slowly\n${url}`);
  });
  it("uses decoded Open Graph title before page title", () => {
    expect(titleFromHtml('<title>Website</title><meta content="Press &amp; lift" property="og:title">')).toBe("Press & lift");
    expect(titleFromHtml("<title> Chest\npress </title>")).toBe("Chest press");
    expect(titleFromHtml("<p>No title</p>")).toBeNull();
  });
  it("blocks private, loopback, reserved and mapped private addresses", () => {
    for (const address of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "192.168.1.1", "100.64.0.1", "::1", "fc00::1", "::ffff:127.0.0.1", "2001:db8::1"]) expect(publicAddress(address)).toBe(false);
    expect(publicAddress("93.184.216.34")).toBe(true);
  });
  it("fetches a YouTube title through the fixed oEmbed endpoint", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ title: "Chest Press" }));
    vi.stubGlobal("fetch", request);
    expect(await fetchExerciseTitle("https://youtu.be/dQw4w9WgXcQ")).toBe("Chest Press");
    expect(request.mock.calls[0]?.[0]).toContain("https://www.youtube.com/oembed?");
  });
  it("fetches generic page titles after checking DNS", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string) => input.startsWith("https://cloudflare-dns.com/")
      ? Response.json({ Status: 0, Answer: [{ type: 1, data: "93.184.216.34" }] })
      : new Response('<meta property="og:title" content="Low Row">', { headers: { "content-type": "text/html" } })));
    expect(await fetchExerciseTitle("https://example.com/exercise")).toBe("Low Row");
  });
  it("never follows a redirect to an internal destination", async () => {
    const request = vi.fn(async (input: string) => input.startsWith("https://cloudflare-dns.com/")
      ? Response.json({ Status: 0, Answer: [{ type: 1, data: "93.184.216.34" }] })
      : new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }));
    vi.stubGlobal("fetch", request);
    expect(await fetchExerciseTitle("https://example.com")).toBeNull();
    expect(request.mock.calls.some(([url]) => url.startsWith("http://169.254"))).toBe(false);
  });
  it("returns a recoverable failure without inventing a name", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await fetchExerciseTitle("https://youtu.be/dQw4w9WgXcQ")).toBeNull();
  });
});
import { withExerciseDescription } from "./exercise-title";
import { descriptionFromHtml } from "./exercise-title.server";
describe("exercise description", () => {
  it("prepends once and keeps existing text", () => {
    const once = withExerciseDescription("Egen not", "Video: Kanal\nBeskrivning");
    expect(once).toBe("Video: Kanal\nBeskrivning\n\nEgen not");
    expect(withExerciseDescription(once, "Video: Kanal\nBeskrivning")).toBe(once);
  });
  it("reads meta description", () => {
    expect(descriptionFromHtml('<meta name="description" content="Knäböj &amp; teknik">')).toBe("Knäböj & teknik");
  });
});
