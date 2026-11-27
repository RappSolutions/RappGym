import { describe, expect, it } from "vitest";
import { avatarSource } from "@/lib/avatar";

describe("avatarSource", () => {
  it("prefers uploaded picture over provider picture", () => {
    expect(avatarSource({ custom_avatar: 5, avatar_url: "https://x/y" })).toEqual({ custom: 5 });
  });
  it("falls back to provider picture, then initials", () => {
    expect(avatarSource({ picture: "https://p" })).toEqual({ url: "https://p" });
    expect(avatarSource({ custom_avatar: null, avatar_url: "javascript:1" })).toBeNull();
  });
});
