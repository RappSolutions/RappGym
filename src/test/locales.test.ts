import { describe, expect, it } from "vitest";
import sv from "@/locales/sv.json";
import en from "@/locales/en.json";
import { i18n } from "@/lib/i18n-core";

const flat = (o: object, p = ""): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v ? flat(v, `${p}${k}.`) : [`${p}${k}`]));

describe("locale resources", () => {
  it("English has exactly the same keys as Swedish", () => {
    expect(flat(en).sort()).toEqual(flat(sv).sort());
  });
  it("interpolates and resolves per language", () => {
    expect(i18n.getFixedT("sv")("nav.tabs.workout")).toBe("Pass");
    expect(i18n.getFixedT("en")("nav.tabs.workout")).toBe("Workouts");
  });
});
