import { describe, expect, it } from "vitest";
import { exerciseYoutubeFallback, instructionParts, youtubePreview } from "./exercise-links";

describe("instruction links", () => {
  it("links the supplied YouTube URL without changing any original text", () => {
    const text = "Se https://youtu.be/kyVvupthHCs?si=Hz0NBrBwG0NU1lGl.\nTräna lugnt.";
    const parts = instructionParts(text);
    expect(parts.map((part) => part.text).join("")).toBe(text);
    expect(parts.find((part) => part.href)?.href).toBe("https://youtu.be/kyVvupthHCs?si=Hz0NBrBwG0NU1lGl");
  });
  it("links multiple web URLs, preserving balanced parentheses and surrounding punctuation", () => {
    const text = "(https://example.org/video). https://example.org/wiki/Exercise_(sport)!";
    expect(instructionParts(text).filter((part) => part.href).map((part) => part.href)).toEqual(["https://example.org/video", "https://example.org/wiki/Exercise_(sport)"]);
    expect(instructionParts(text).map((part) => part.text).join("")).toBe(text);
  });
  it("does not link executable schemes, malformed URLs or embedded credentials", () => {
    for (const text of ["javascript:alert(1)", "data:text/html,test", "https://", "https://user:pass@example.org"]) {
      expect(instructionParts(text).some((part) => part.href)).toBe(false);
    }
  });
});

describe("YouTube fallback", () => {
  it.each([
    "https://youtu.be/kyVvupthHCs?si=Hz0NBrBwG0NU1lGl",
    "https://www.youtube.com/watch?v=kyVvupthHCs&t=3",
    "https://m.youtube.com/shorts/kyVvupthHCs",
    "https://www.youtube-nocookie.com/embed/kyVvupthHCs",
    "https://youtube.com/live/kyVvupthHCs",
  ])("derives the video thumbnail for %s", (href) => {
    expect(youtubePreview(`Se ${href}`)).toEqual({ href, image: "https://img.youtube.com/vi/kyVvupthHCs/hqdefault.jpg" });
  });
  it("rejects lookalike hosts and invalid video IDs", () => {
    for (const href of ["https://youtube.com.evil.org/watch?v=kyVvupthHCs", "https://notyoutube.com/watch?v=kyVvupthHCs", "https://youtu.be/invalid", "https://youtube.com/watch"]) expect(youtubePreview(href)).toBeNull();
  });
  it("only shows a fallback when no saved images exist and never mutates them", () => {
    const images = ["storage:owner/exercise.jpg"];
    expect(exerciseYoutubeFallback(images, "https://youtu.be/kyVvupthHCs")).toBeNull();
    expect(images).toEqual(["storage:owner/exercise.jpg"]);
    expect(exerciseYoutubeFallback([], "https://youtu.be/kyVvupthHCs")?.image).toBe("https://img.youtube.com/vi/kyVvupthHCs/hqdefault.jpg");
    expect(exerciseYoutubeFallback([], "Inga länkar")).toBeNull();
  });
});