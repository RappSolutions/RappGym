import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { i18n, supportedLanguages, type Language } from "./i18n-core";
import type { Exercise } from "./gym";
import type { Json } from "@/integrations/supabase/types";
import { translated } from "./exercise-refs";
import { Button } from "@/components/ui/button";
import { ChevronDown, Languages } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import swedishFlag from "@/assets/flags/sweden.svg.asset.json";
import britishFlag from "@/assets/flags/united-kingdom.svg.asset.json";

export type { Language } from "./i18n-core";
const LanguageContext = createContext<{ language: Language; setLanguage: (v: Language) => void }>({ language: "sv", setLanguage: () => {} });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("sv");
  useEffect(() => { const stored = localStorage.getItem("gym-language"); const match = supportedLanguages.find((l) => l === stored); if (match) setLanguageState(match); }, []);
  useEffect(() => { document.documentElement.lang = language; void i18n.changeLanguage(language); }, [language]);
  const setLanguage = (v: Language) => { localStorage.setItem("gym-language", v); setLanguageState(v); };
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  const t = i18n.getFixedT(context.language);
  return { ...context, t, localize: (ex: Exercise) => localizeExercise(ex, context.language), refName: (row: { name: string; translations?: Json }) => refName(row, context.language) };
}
/** Base fields are English; every other language is read from translations[language]. */
export function localizeExercise(ex: Exercise, language: Language): Exercise {
  return {
    ...ex,
    name: translated(ex.translations, language, "name", ex.name),
    instructions: translated(ex.translations, language, "instructions", ex.instructions),
    category: translated(ex.category_translations, language, "name", ex.category),
    equipment: translated(ex.equipment_translations, language, "name", ex.equipment),
  };
}
/** Localized name of a category or equipment row. */
export function refName(row: { name: string; translations?: Json }, language: Language): string {
  return translated(row.translations, language, "name", row.name);
}
/** Native language names and flag assets; add one entry per supported language. */
const languageMeta: Record<Language, { name: string; flag: string }> = {
  sv: { name: "Svenska", flag: swedishFlag.url },
  en: { name: "English", flag: britishFlag.url },
};
function Flag({ value }: { value: Language }) {
  return <img src={languageMeta[value].flag} alt="" aria-hidden="true" width={24} height={16} className="h-4 w-6 shrink-0 rounded-[2px] object-fill" />;
}
function LanguageItems() {
  const { language, setLanguage } = useLanguage();
  return <DropdownMenuRadioGroup value={language} onValueChange={(v) => { const m = supportedLanguages.find((l) => l === v); if (m) setLanguage(m); }}>{supportedLanguages.map((l) => <DropdownMenuRadioItem key={l} value={l} className="h-11 gap-2"><Flag value={l} />{languageMeta[l].name}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup>;
}
/** Standalone language dropdown (scales to any number of languages). */
export function LanguagePicker() {
  const { language, t } = useLanguage();
  return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" aria-label={t("i18n.language")} className="h-10 shrink-0 gap-2 px-2"><Flag value={language} /><span className="text-sm">{languageMeta[language].name}</span><ChevronDown className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><LanguageItems /></DropdownMenuContent></DropdownMenu>;
}
/** Language submenu row for use inside another DropdownMenu. */
export function LanguageMenuSub() {
  const { language, t } = useLanguage();
  return <DropdownMenuSub><DropdownMenuSubTrigger className="h-12 gap-2"><Languages className="size-4" /><span className="flex-1">{t("i18n.language")}</span><Flag value={language} /><span className="text-xs text-muted-foreground">{languageMeta[language].name}</span></DropdownMenuSubTrigger><DropdownMenuSubContent><LanguageItems /></DropdownMenuSubContent></DropdownMenuSub>;
}
