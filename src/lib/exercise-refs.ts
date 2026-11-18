import type { Tables } from "@/integrations/supabase/types";

export type ExerciseCategory = Tables<"exercise_categories">;
export type ExerciseEquipment = Tables<"exercise_equipment">;

/** Exercise read with its category/equipment joined through the real FKs. */
export const EXERCISE_SELECT = "*, cat:exercise_categories(name,code_prefix,color_token,sort_order), eq:exercise_equipment(name)";

type Joined = Tables<"exercises"> & {
  cat?: Pick<ExerciseCategory, "name" | "code_prefix" | "color_token" | "sort_order"> | null;
  eq?: Pick<ExerciseEquipment, "name"> | null;
};
export type ExerciseRow = Tables<"exercises"> & { category_token: string; category_sort: number };

/** Category and equipment names come from the FK rows; the old text columns are deprecated. */
export function normalizeExercise(row: Joined): ExerciseRow {
  const { cat, eq, ...rest } = row;
  return {
    ...rest,
    category: cat?.name ?? "",
    equipment: eq?.name ?? "",
    category_token: cat?.color_token ?? "cat-1",
    category_sort: cat?.sort_order ?? 9999,
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
