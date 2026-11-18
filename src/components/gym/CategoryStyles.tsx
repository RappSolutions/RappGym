import { useQuery } from "@tanstack/react-query";
import { exerciseCategoriesQuery } from "@/lib/gym";
import { hexCategoryCss } from "@/lib/category-color";

/** Injects theme variables for categories whose colour is a free hex value from the database. */
export function CategoryStyles() {
  const { data = [] } = useQuery(exerciseCategoriesQuery);
  const css = hexCategoryCss(data.map((c) => c.color_token));
  return css ? <style>{css}</style> : null;
}
