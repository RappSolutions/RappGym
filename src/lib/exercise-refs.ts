import type { Json, Tables } from "@/integrations/supabase/types";

export type ExerciseCategory = Tables<"exercise_categories">;
export type ExerciseEquipment = Tables<"exercise_equipment">;

/** Exercise read with its category/equipment joined through the real FKs. */
export const EXERCISE_SELECT = "*, cat:exercise_categories(name,code_prefix,color_token,sort_order,translations), eq:exercise_equipment(name,translations)";

type Joined = Tables<"exercises"> & {
  cat?: Pick<ExerciseCategory, "name" | "code_prefix" | "color_token" | "sort_order" | "translations"> | null;
  eq?: Pick<ExerciseEquipment, "name" | "translations"> | null;
};
export type ExerciseRow = Tables<"exercises"> & { category: string; equipment: string; category_token: string; category_sort: number; category_translations: Json; equipment_translations: Json };

/** Category and equipment names come from the FK rows; base names are English, other languages live in translations. */
export function normalizeExercise(row: Joined): ExerciseRow {
  const { cat, eq, ...rest } = row;
  return {
    ...rest,
    category: cat?.name ?? "",
    equipment: eq?.name ?? "",
    category_token: cat?.color_token ?? "cat-1",
    category_sort: cat?.sort_order ?? 9999,
    category_translations: cat?.translations ?? {},
    equipment_translations: eq?.translations ?? {},
  };
}

/** Next free code for a category prefix, e.g. PU1..PU10 -> PU11; prefixes are read from the database. */
export function nextExerciseCode(prefix: string, codes: readonly string[]): string {
  const p = prefix.trim().toUpperCase();
  const re = new RegExp(`^${p.replace(/[^A-Z]/g, "")}(\\d+)$`);
  let max = 0;
  for (const c of codes) {
    const m = re.exec(c.toUpperCase());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${p}${max + 1}`;
}

export const CATEGORY_COLOR_TOKENS = ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6", "cat-7"] as const;

/** Next free number within a category (max + 1); the prefix itself always comes from the category. */
export function nextCodeNumber(categoryId: string, exercises: readonly { id: string; category_id: string; code_number: number }[], exceptId?: string): number {
  return exercises.reduce((m, e) => (e.category_id === categoryId && e.id !== exceptId ? Math.max(m, e.code_number) : m), 0) + 1;
}

/** Localized field from a translations jsonb ({ "sv": { "name": ... } }); falls back to the English base value. */
export function translated(translations: Json | null | undefined, language: string, key: string, base: string): string {
  if (!translations || typeof translations !== "object" || Array.isArray(translations)) return base;
  const tr = translations[language];
  if (!tr || typeof tr !== "object" || Array.isArray(tr)) return base;
  const v = tr[key];
  return typeof v === "string" && v ? v : base;
}
