import i18next from "i18next";
import sv from "@/locales/sv.json";
import en from "@/locales/en.json";

export const resources = { sv: { translation: sv }, en: { translation: en } } as const;
export const supportedLanguages = ["sv", "en"] as const;
export type Language = (typeof supportedLanguages)[number];

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof sv };
  }
}

/** Single app-wide i18next instance; Swedish is source and fallback language. */
export const i18n = i18next.createInstance();
void i18n.init({
  resources,
  lng: "sv",
  fallbackLng: "sv",
  supportedLngs: [...supportedLanguages],
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});
