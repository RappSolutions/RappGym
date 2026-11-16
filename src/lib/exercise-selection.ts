export function filterExerciseChoices<T extends { code: string; name: string; category: string }>(exercises: readonly T[], search: string, category: string | null): T[] {
  const query = search.trim().toLocaleLowerCase();
  return exercises.filter((exercise) => (category === null || exercise.category === category) && `${exercise.code} ${exercise.name}`.toLocaleLowerCase().includes(query));
}