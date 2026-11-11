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
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import { moveId } from "@/lib/videos/library";
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
 * una cartella): trascinamento con il mouse, il dito o la tastiera (spazio
 * sulla maniglia, frecce, spazio) e in più i pulsanti Su/Giù. L'ordine cambia
 * subito sullo schermo e si salva per intero; se il salvataggio non riesce
 * torna quello di prima.
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
  renderItem: (item: T, controls: ReactNode, handle: ReactNode) => ReactNode;
}) {
  const [order, setOrder] = useState<string[] | null>(null);
  const [status, setStatus] = useState("");
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

  const move = (value: string, direction: "up" | "down") => {
    const next = moveId(ids, value, direction);
    if (next.join() === ids.join()) return;
    commit(next);
    // i pulsanti non passano da dnd-kit: l'annuncio lo fa la regione qui sotto
    setStatus(t.moved(nameOf(value), next.indexOf(value) + 1, next.length));
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
          {sorted.map((item, index) => (
            <SortableRow
              key={item.id}
              item={item}
              first={index === 0}
              last={index === sorted.length - 1}
              onMove={move}
              renderItem={renderItem}
            />
          ))}
        </ul>
      </SortableContext>
      <p role="status" className="sr-only">
        {status}
      </p>
    </DndContext>
  );
}

function SortableRow<T extends Item>({
  item,
  first,
  last,
  onMove,
  renderItem,
}: {
  item: T;
  first: boolean;
  last: boolean;
  onMove: (id: string, direction: "up" | "down") => void;
  renderItem: (item: T, controls: ReactNode, handle: ReactNode) => ReactNode;
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

  const controls = (
    <span className="flex shrink-0 gap-1">
      <ArrowButton
        label={t.up(item.name)}
        disabled={first}
        onClick={() => onMove(item.id, "up")}
      >
        <ArrowUp aria-hidden="true" />
      </ArrowButton>
      <ArrowButton
        label={t.down(item.name)}
        disabled={last}
        onClick={() => onMove(item.id, "down")}
      >
        <ArrowDown aria-hidden="true" />
      </ArrowButton>
    </span>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-80 shadow-lg")}
    >
      {renderItem(item, controls, handle)}
    </li>
  );
}

/**
 * Su/Giù: al limite dell'elenco restano focalizzabili (`aria-disabled`),
 * come le frecce della paginazione, così il focus non si perde.
 */
function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className="text-admin-muted hover:bg-admin-hover aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent"
    >
      {children}
    </Button>
  );
}
