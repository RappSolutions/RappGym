export function filterExerciseChoices<T extends { code: string; name: string; category: string }>(exercises: readonly T[], search: string, category: string | null): T[] {
  const query = search.trim().toLocaleLowerCase();
  return exercises.filter((exercise) => (category === null || exercise.category === category) && `${exercise.code} ${exercise.name}`.toLocaleLowerCase().includes(query));
}

export type ExerciseGrouping = "category" | "equipment";

type GroupableExercise = {
  category_id: string;
  equipment_id: string | null;
  category_sort: number;
};

/** Group only supplied location-filtered exercises, using FK identity rather than translated names. */
export function groupExerciseChoices<T extends GroupableExercise>(
  exercises: readonly T[],
  by: ExerciseGrouping,
  label: (exercise: T, by: ExerciseGrouping) => string,
  language: string,
): { id: string; label: string; exercises: T[] }[] {
  const groups = new Map<string, { id: string; label: string; exercises: T[]; sort: number }>();
  for (const exercise of exercises) {
    const id = by === "category" ? `category:${exercise.category_id}` : `equipment:${exercise.equipment_id ?? "none"}`;
    const group = groups.get(id);
    if (group) group.exercises.push(exercise);
    else groups.set(id, { id, label: label(exercise, by), exercises: [exercise], sort: exercise.category_sort });
  }
  return [...groups.values()].sort((a, b) =>
    (by === "category" ? a.sort - b.sort : 0) || a.label.localeCompare(b.label, language),
  );
}