"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/types/action-result";

const t = copy.admin.videos.reorder;

type Item = { id: string; name: string };

export type SortableHandle = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
};

/**
 * Ordine di un livello (cartelle, sottocartelle di una cartella o video di
 * una cartella): solo trascinamento, con il mouse, il dito o la tastiera
 * (spazio sulla maniglia, frecce, spazio). L'ordine cambia subito sullo
 * schermo e si salva per intero; se il salvataggio non riesce torna quello
 * di prima.
 */
export function SortableList<T extends Item>({
  items,
  save,
  label,
  className,
  renderItem,
}: {
  items: T[];
  save: (ids: string[]) => Promise<ActionResult>;
  /** Nome accessibile dell'elenco. */
  label: string;
  className?: string;
  renderItem: (item: T, handle: ReactNode) => ReactNode;
}) {
  const [order, setOrder] = useState<string[] | null>(null);
  const [, startTransition] = useTransition();
  const id = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // l'ordine locale vale finché il server non restituisce lo stesso elenco
  const serverIds = items.map((item) => item.id);
  const ids =
    order &&
    order.length === serverIds.length &&
    order.every((value) => serverIds.includes(value))
      ? order
      : serverIds;
  const byId = new Map(items.map((item) => [item.id, item]));
  const sorted = ids.flatMap((value) => byId.get(value) ?? []);

  const nameOf = (value: string | number) =>
    byId.get(String(value))?.name ?? "";
  const positionOf = (value: string | number) => ids.indexOf(String(value)) + 1;

  const commit = (next: string[]) => {
    const previous = ids;
    setOrder(next);
    startTransition(async () => {
      const result = await save(next);
      if (redirectIfSignedOut(result)) return;
      if (result.ok) return;
      setOrder(previous);
      toast.error(result.error || t.failed);
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    commit(
      arrayMove(
        ids,
        ids.indexOf(String(active.id)),
        ids.indexOf(String(over.id)),
      ),
    );
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => t.picked(nameOf(active.id)),
    onDragOver: ({ active, over }) =>
      over ? t.moved(nameOf(active.id), positionOf(over.id), ids.length) : "",
    onDragEnd: ({ active, over }) =>
      over ? t.dropped(nameOf(active.id), positionOf(over.id), ids.length) : "",
    onDragCancel: ({ active }) => t.cancelled(nameOf(active.id)),
  };

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{ announcements }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul aria-label={label} className={className}>
          {sorted.map((item) => (
            <SortableRow key={item.id} item={item} renderItem={renderItem} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow<T extends Item>({
  item,
  renderItem,
}: {
  item: T;
  renderItem: (item: T, handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={t.handle(item.name)}
      className="flex h-11 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-admin-field outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-80 shadow-lg")}
    >
      {renderItem(item, handle)}
    </li>
  );
}
