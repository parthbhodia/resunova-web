"use client";
/**
 * Drag-to-reorder for canvas blocks.
 *
 * Mirrors the pattern AnalyzeLiveResumeBody already uses for bullet rows
 * (dnd-kit, PointerSensor with an activation distance, KeyboardSensor for
 * a11y) so the two canvases behave identically under the hand.
 *
 * The drag handle is the `::` button already present in the block's hover
 * menu — it is not a separate affordance. `CanvasBlock` renders it, and this
 * passes dnd-kit's listeners down so the existing button becomes the handle.
 *
 * An activation distance matters more here than usual: every block also
 * contains contenteditable text, so a drag that armed on pointer-down would
 * steal every click meant to place a caret.
 */
import type { ReactNode } from "react";
import {
  DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CanvasBlock, type CanvasAction } from "./CanvasPrimitives";

export function CanvasSortableGroup({
  ids, onReorder, children,
}: {
  ids: string[];
  onReorder: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    // 5px before a drag arms, so clicking into text still places a caret.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onReorder(from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/**
 * A CanvasBlock that can be dragged. `dragActionKey` names the action in the
 * hover menu that should become the handle — the caller keeps ownership of
 * what the menu contains.
 */
export function SortableCanvasBlock({
  id, actions, dragActionKey = "drag", children,
}: {
  id: string;
  actions: CanvasAction[];
  dragActionKey?: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const wired = actions.map((a) =>
    a.key === dragActionKey ? { ...a, dragHandleProps: { ...attributes, ...listeners } } : a);

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "relative",
        transform: transform
          ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
          : undefined,
        transition,
        zIndex: isDragging ? 30 : undefined,
        opacity: isDragging ? 0.85 : undefined,
      }}
    >
      <CanvasBlock actions={wired}>{children}</CanvasBlock>
    </div>
  );
}
