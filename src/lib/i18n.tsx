import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { i18n, type Language } from "./i18n-core";
import type { Exercise } from "./gym";
import { Button } from "@/components/ui/button";
import swedishFlag from "@/assets/flags/sweden.svg.asset.json";
import britishFlag from "@/assets/flags/united-kingdom.svg.asset.json";

export type { Language } from "./i18n-core";
const LanguageContext = createContext<{ language: Language; setLanguage: (v: Language) => void }>({ language: "sv", setLanguage: () => {} });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("sv");
  useEffect(() => { if (localStorage.getItem("gym-language") === "en") setLanguageState("en"); }, []);
  useEffect(() => { document.documentElement.lang = language; void i18n.changeLanguage(language); }, [language]);
  const setLanguage = (v: Language) => { localStorage.setItem("gym-language", v); setLanguageState(v); };
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  const t = i18n.getFixedT(context.language);
  return { ...context, t, localize: (ex: Exercise) => localizeExercise(ex, context.language) };
}
export function localizeExercise(ex: Exercise, language: Language): Exercise {
  if (language === "sv" || !ex.translations || typeof ex.translations !== "object" || Array.isArray(ex.translations)) return ex;
  const translation = ex.translations[language];
  if (!translation || typeof translation !== "object" || Array.isArray(translation)) return ex;
  const result = { ...ex };
  for (const key of ["name", "instructions"] as const) {
    const value = translation[key];
    if (typeof value === "string" && value) result[key] = value;
  }
  return result;
}
export function LanguagePicker({ flagsOnly = false }: { flagsOnly?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  if (flagsOnly) return <div className="flex shrink-0 gap-1" role="group" aria-label={t("i18n.language")}>{(["sv", "en"] as const).map((value) => <Button key={value} type="button" variant={language === value ? "secondary" : "ghost"} size="icon" aria-label={value === "sv" ? "Svenska" : "English"} title={value === "sv" ? "Svenska" : "English"} aria-pressed={language === value} onClick={() => setLanguage(value)} className="size-11"><img src={value === "sv" ? swedishFlag.url : britishFlag.url} alt="" aria-hidden="true" width={28} height={20} className="h-5 w-7 object-fill" /></Button>)}</div>;
  return <select aria-label={t("i18n.language")} value={language} onChange={(e) => setLanguage(e.target.value === "en" ? "en" : "sv")} className="h-10 rounded-md border bg-background px-2 text-sm"><option value="sv">Svenska</option><option value="en">English</option></select>;
}