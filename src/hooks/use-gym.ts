import { useSyncExternalStore } from "react";
import { getSelectedGym, setSelectedGym, subscribeGym } from "@/lib/gym";

export function useSelectedGym() {
  const id = useSyncExternalStore(subscribeGym, getSelectedGym, () => null);
  return [id, setSelectedGym] as const;
}
