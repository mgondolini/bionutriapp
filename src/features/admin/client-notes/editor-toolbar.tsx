"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  ALargeSmall,
  Bold,
  ChevronDown,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

const t = copy.clientNotes.toolbar;

type BlockStyle = keyof typeof t.styles;
const BLOCK_STYLES: BlockStyle[] = ["h2", "h3", "paragraph"];

type Size = "desktop" | "phone" | "bubble";

const SIZE_CLASS: Record<Size, string> = {
  desktop: "size-10",
  phone: "size-11",
  bubble: "size-9",
};

/** Stato dei pulsanti: si ricalcola solo quando cambia davvero. */
function useToolbarState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      highlight: current.isActive("highlight"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      block: (current.isActive("heading", { level: 2 })
        ? "h2"
        : current.isActive("heading", { level: 3 })
          ? "h3"
          : "paragraph") as BlockStyle,
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });
}

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  active,
  disabled,
  size,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  /** undefined = pulsante senza stato (annulla, ripeti). */
  active?: boolean;
  disabled?: boolean;
  size: Size;
  onClick: () => void;
}) {
  const dark = size === "bubble";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      // il clic non toglie la selezione dal testo
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[10px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-40",
        SIZE_CLASS[size],
        active
          ? "bg-mint text-foreground"
          : dark
            ? "text-white hover:bg-white/15"
            : "text-foreground hover:bg-card",
      )}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.8}
        className={size === "phone" ? "size-[22px]" : "size-5"}
      />
    </button>
  );
}

function Separator({ dark }: { dark?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mx-1 h-6 w-px shrink-0",
        dark ? "bg-admin-muted" : "bg-admin-line",
      )}
    />
  );
}

function setBlock(editor: Editor, style: BlockStyle) {
  const chain = editor.chain().focus();
  if (style === "paragraph") chain.setParagraph().run();
  else chain.setHeading({ level: style === "h2" ? 2 : 3 }).run();
}

/** Stile del paragrafo: menu a tendina (desktop) o pulsante "Aa" (telefono). */
function BlockStyleMenu({
  editor,
  current,
  phone,
}: {
  editor: Editor;
  current: BlockStyle;
  phone?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.paragraphStyle(t.styles[current])}
        onMouseDown={(event) => event.preventDefault()}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center rounded-[10px] text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          phone
            ? "size-11 justify-center hover:bg-card aria-expanded:bg-card"
            : "h-10 w-[156px] justify-between border border-line-strong bg-card pr-3 pl-3.5 text-[13.5px] font-semibold",
        )}
      >
        {phone ? (
          <ALargeSmall
            aria-hidden="true"
            strokeWidth={1.8}
            className="size-[22px]"
          />
        ) : (
          <>
            {t.styles[current]}
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.8}
              className="size-4"
            />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={phone ? "top" : "bottom"}
        className="w-48"
      >
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => setBlock(editor, value as BlockStyle)}
        >
          {BLOCK_STYLES.map((style) => (
            <DropdownMenuRadioItem
              key={style}
              value={style}
              className={cn(
                "min-h-11",
                style === "h2" && "text-lg font-bold",
                style === "h3" && "text-base font-bold",
              )}
            >
              {t.styles[style]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Barra degli strumenti: fissa sopra il testo su desktop (pulsanti 40 px),
 * ancorata sopra la tastiera sul telefono (44 px, stile con "Aa").
 */
export function EditorToolbar({
  editor,
  phone,
  className,
}: {
  editor: Editor;
  phone?: boolean;
  className?: string;
}) {
  const state = useToolbarState(editor);
  const size: Size = phone ? "phone" : "desktop";
  const chain = () => editor.chain().focus();
  return (
    <div
      role="toolbar"
      aria-label={t.label}
      aria-orientation="horizontal"
      className={cn(
        "flex items-center bg-admin-hover",
        phone
          ? "justify-between border-t border-admin-line px-2 py-1.5"
          : "gap-1.5 border-y border-admin-line px-5 py-2",
        className,
      )}
    >
      <BlockStyleMenu editor={editor} current={state.block} phone={phone} />
      {phone ? null : <Separator />}
      <ToolButton
        icon={Bold}
        label={t.bold}
        shortcut="Ctrl+B"
        active={state.bold}
        size={size}
        onClick={() => chain().toggleBold().run()}
      />
      <ToolButton
        icon={Italic}
        label={t.italic}
        shortcut="Ctrl+I"
        active={state.italic}
        size={size}
        onClick={() => chain().toggleItalic().run()}
      />
      <ToolButton
        icon={Highlighter}
        label={t.highlight}
        shortcut="Ctrl+Shift+H"
        active={state.highlight}
        size={size}
        onClick={() => chain().toggleHighlight().run()}
      />
      {phone ? null : <Separator />}
      <ToolButton
        icon={List}
        label={t.bulletList}
        active={state.bulletList}
        size={size}
        onClick={() => chain().toggleBulletList().run()}
      />
      <ToolButton
        icon={ListOrdered}
        label={t.orderedList}
        active={state.orderedList}
        size={size}
        onClick={() => chain().toggleOrderedList().run()}
      />
      {phone ? null : <span aria-hidden="true" className="flex-1" />}
      <ToolButton
        icon={Undo2}
        label={t.undo}
        shortcut="Ctrl+Z"
        disabled={!state.canUndo}
        size={size}
        onClick={() => chain().undo().run()}
      />
      <ToolButton
        icon={Redo2}
        label={t.redo}
        shortcut="Ctrl+Y"
        disabled={!state.canRedo}
        size={size}
        onClick={() => chain().redo().run()}
      />
    </div>
  );
}

/** Barra flottante alla selezione (solo desktop): grassetto, corsivo, evidenziatore, elenco. */
export function BubbleToolbar({ editor }: { editor: Editor }) {
  const state = useToolbarState(editor);
  const chain = () => editor.chain().focus();
  return (
    <div
      role="toolbar"
      aria-label={t.quickLabel}
      className="flex items-center gap-0.5 rounded-[14px] bg-foreground p-1"
    >
      <ToolButton
        icon={Bold}
        label={t.bold}
        active={state.bold}
        size="bubble"
        onClick={() => chain().toggleBold().run()}
      />
      <ToolButton
        icon={Italic}
        label={t.italic}
        active={state.italic}
        size="bubble"
        onClick={() => chain().toggleItalic().run()}
      />
      <ToolButton
        icon={Highlighter}
        label={t.highlight}
        active={state.highlight}
        size="bubble"
        onClick={() => chain().toggleHighlight().run()}
      />
      <Separator dark />
      <ToolButton
        icon={List}
        label={t.bulletList}
        active={state.bulletList}
        size="bubble"
        onClick={() => chain().toggleBulletList().run()}
      />
    </div>
  );
}
