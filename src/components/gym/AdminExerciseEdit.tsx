import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseForm } from "@/components/gym/ExerciseForm";
import { useIsAdmin } from "@/lib/roles";
import { useLanguage } from "@/lib/i18n";
import type { Exercise } from "@/lib/gym";

/** Pencil that opens the shared exercise editor; rendered for admins only (writes are enforced by the database). */
export function AdminExerciseEdit({ exercise }: { exercise: Exercise | null | undefined }) {
  const { isAdmin } = useIsAdmin();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  if (!isAdmin || !exercise) return null;
  return (
    <>
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={t("exerciseForm.editExercise")} title={t("exerciseForm.editExercise")} onClick={(e) => { e.stopPropagation(); setOpen(true); }}><Pencil className="size-4" /></Button>
      {open && <ExerciseForm open exercise={exercise} all={[]} onClose={() => setOpen(false)} />}
    </>
  );
}
