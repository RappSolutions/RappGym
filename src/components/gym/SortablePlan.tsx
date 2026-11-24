import { DndContext, PointerSensor, TouchSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { PHASES, type Phase } from "@/lib/circuit";
import { headerKey, orderedRows, placementFromFlat } from "@/lib/workout-edit";
import { useLanguage } from "@/lib/i18n";
import type { PlannedRow } from "@/lib/gym";

function Item({ id, header, disabled, children }: { id: string; header?: boolean; disabled?: boolean; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: { draggable: !!(header || disabled), droppable: !!disabled } });
  const { t } = useLanguage();
  const handle = header || disabled ? null : (
    <button type="button" {...attributes} {...listeners} aria-label={t("common.dragToMove")} className="flex size-8 shrink-0 touch-none cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"><GripVertical className="size-4" /></button>
  );
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "relative z-10 opacity-80 shadow-md" : undefined}>{children(handle)}</div>;
}

/** Shared drag-and-drop plan list: drag a row by its handle; dropping under a phase header moves it to that phase. */
export function SortablePlan({ rows, disabled, onPlace, renderHeader, renderRow }: {
  rows: PlannedRow[];
  disabled?: boolean;
  onPlace: (u: ReturnType<typeof placementFromFlat>) => void;
  renderHeader: (p: Phase, empty: boolean) => ReactNode;
  renderRow: (row: PlannedRow, handle: ReactNode) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // Optimistic order: show the dropped position at once and keep it until fresh rows arrive (no snap-back).
  const [pending, setPending] = useState<PlannedRow[] | null>(null);
  useEffect(() => setPending(null), [rows]);
  const ordered = orderedRows(pending ?? rows);
  const showHeaders = !disabled || new Set(ordered.map((r) => r.phase ?? "main")).size > 1;
  const flat = PHASES.flatMap((p) => [headerKey(p), ...ordered.filter((r) => (r.phase ?? "main") === p).map((r) => r.id)]);
  const byId = new Map(ordered.map((r) => [r.id, r]));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    let to = flat.indexOf(String(over.id));
    const from = flat.indexOf(String(active.id));
    // Dropping on a header always lands directly under it (that phase), also when dragging upwards.
    if (String(over.id).startsWith("h:") && from > to) to += 1;
    if (to === 0) to = 1; // never above the first header
    const next = arrayMove(flat, from, to);
    const u = placementFromFlat(next, rows);
    if (!u.length) return;
    const byRow = new Map(u.map((x) => [x.id, x]));
    setPending(rows.map((r) => { const x = byRow.get(r.id); return x ? { ...r, ...x } : r; }));
    onPlace(u);
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={flat} strategy={verticalListSortingStrategy}>
        {flat.map((k) => {
          if (k.startsWith("h:")) {
            const p = k.slice(2) as Phase;
            const empty = !ordered.some((r) => (r.phase ?? "main") === p);
            if (!showHeaders || (disabled && empty)) return <Item key={k} id={k} header>{() => null}</Item>;
            return <Item key={k} id={k} header>{() => renderHeader(p, empty)}</Item>;
          }
          const row = byId.get(k)!;
          return <Item key={k} id={k} disabled={!!disabled}>{(h) => renderRow(row, h)}</Item>;
        })}
      </SortableContext>
    </DndContext>
  );
}
