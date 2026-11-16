import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Exercise } from "./gym";
import { Button } from "@/components/ui/button";

export type Language = "sv" | "en";
const LanguageContext = createContext<{ language: Language; setLanguage: (v: Language) => void }>({ language: "sv", setLanguage: () => {} });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("sv");
  useEffect(() => { if (localStorage.getItem("gym-language") === "en") setLanguageState("en"); }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = (v: Language) => { localStorage.setItem("gym-language", v); setLanguageState(v); };
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  return { ...context, t: (sv: string, en: string) => context.language === "en" ? en : sv, localize: (ex: Exercise) => localizeExercise(ex, context.language) };
}
export function localizeExercise(ex: Exercise, language: Language): Exercise {
  if (language === "sv" || !ex.translations || typeof ex.translations !== "object" || Array.isArray(ex.translations)) return ex;
  const translation = ex.translations[language];
  if (!translation || typeof translation !== "object" || Array.isArray(translation)) return ex;
  const result = { ...ex };
  for (const key of ["name", "equipment", "variant", "muscles", "instructions", "dose", "focus"] as const) {
    const value = translation[key];
    if (typeof value === "string" && value) result[key] = value;
  }
  return result;
}
export function LanguagePicker({ flagsOnly = false }: { flagsOnly?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  if (flagsOnly) return <div className="flex shrink-0 gap-1" role="group" aria-label={t("Språk", "Language")}>{(["sv", "en"] as const).map((value) => <Button key={value} type="button" variant={language === value ? "secondary" : "ghost"} size="icon" aria-label={value === "sv" ? "Svenska" : "English"} title={value === "sv" ? "Svenska" : "English"} aria-pressed={language === value} onClick={() => setLanguage(value)} className="size-11 text-2xl">{value === "sv" ? "🇸🇪" : "🇬🇧"}</Button>)}</div>;
  return <select aria-label={t("Språk", "Language")} value={language} onChange={(e) => setLanguage(e.target.value === "en" ? "en" : "sv")} className="h-10 rounded-md border bg-background px-2 text-sm"><option value="sv">Svenska</option><option value="en">English</option></select>;
}