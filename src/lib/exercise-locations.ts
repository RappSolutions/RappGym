import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Equipment/station present at a location (gym_equipment row). */
export type GymEquipment = { gym_id: string; equipment_id: string; max_load_kg?: number | null };

export const gymEquipmentQuery = queryOptions({
  queryKey: ["gym-equipment"],
  queryFn: async () => {
    const { data, error } = await supabase.from("gym_equipment").select("gym_id,equipment_id,max_load_kg");
    if (error) throw error;
    return data as GymEquipment[];
  },
});

export function equipmentAt(links: GymEquipment[], gymId: string): Set<string> {
  return new Set(links.filter((l) => l.gym_id === gymId).map((l) => l.equipment_id));
}

/** Exercises available at a location: no equipment required, or the location has it. No location means every exercise. */
export function exercisesAtLocation<T extends { equipment_id: string | null }>(exercises: T[], links: GymEquipment[], gymId: string | null): T[] {
  if (!gymId) return exercises;
  const have = equipmentAt(links, gymId);
  return exercises.filter((e) => !e.equipment_id || have.has(e.equipment_id));
}
