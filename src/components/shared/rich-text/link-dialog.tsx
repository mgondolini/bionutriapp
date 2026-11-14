"use client";

import { Link2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/it";
import { normalizeLinkHref } from "@/lib/domain/client-notes/links";

const t = copy.clientNotes.linkDialog;

export type LinkDraft = { text: string; href: string };

/**
 * "Inserisci link" / "Modifica link" (A14b, A14c): testo e indirizzo. Senza
 * protocollo si aggiunge https:// e lo si dice sotto il campo; javascript:,
 * data: e gli altri schemi sono rifiutati. In modifica c'è anche "Rimuovi
 * link". Il contenuto si monta a ogni apertura (stato iniziale dal link).
 */
export function LinkDialog({
  open,
  onOpenChange,
  initial,
  editing,
  onApply,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: LinkDraft;
  editing: boolean;
  onApply: (link: LinkDraft) => void;
  onRemove: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        {open ? (
          <LinkForm
            initial={initial}
            editing={editing}
            onCancel={() => onOpenChange(false)}
            onApply={onApply}
            onRemove={onRemove}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LinkForm({
  initial,
  editing,
  onCancel,
  onApply,
  onRemove,
}: {
  initial: LinkDraft;
  editing: boolean;
  onCancel: () => void;
  onApply: (link: LinkDraft) => void;
  onRemove: () => void;
}) {
  const ids = useId();
  const [text, setText] = useState(initial.text);
  const [href, setHref] = useState(initial.href);
  const [touched, setTouched] = useState(false);
  const normalized = normalizeLinkHref(href);
  const invalid = touched && href.trim() !== "" && !normalized;
  const showSavedAs =
    normalized !== null && normalized !== href.trim() && !invalid;

  const apply = () => {
    setTouched(true);
    if (!normalized) return;
    onApply({ text: text.trim() || normalized, href: normalized });
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        // la form del dialog del video sta intorno: non va inviata
        event.stopPropagation();
        apply();
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-admin-hover">
            <Link2 aria-hidden="true" strokeWidth={1.8} className="size-4" />
          </span>
          {editing ? t.editTitle : t.addTitle}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {copy.admin.videos.videoForm.noteHint}
        </DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor={`${ids}-text`}>{t.text}</FieldLabel>
        <Input
          id={`${ids}-text`}
          value={text}
          autoComplete="off"
          maxLength={200}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor={`${ids}-href`}>{t.href}</FieldLabel>
        <Input
          id={`${ids}-href`}
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          value={href}
          placeholder={t.hrefPlaceholder}
          onChange={(event) => setHref(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={invalid || undefined}
          aria-describedby={`${ids}-href-hint`}
        />
        {invalid ? (
          <FieldError id={`${ids}-href-hint`}>{t.invalid}</FieldError>
        ) : (
          <FieldDescription id={`${ids}-href-hint`} aria-live="polite">
            {showSavedAs ? t.savedAs(normalized) : null}
          </FieldDescription>
        )}
      </Field>
      <DialogFooter className="gap-2 sm:justify-between">
        {editing ? (
          <Button
            type="button"
            variant="neutral"
            onClick={onRemove}
            className="sm:mr-auto"
          >
            {t.remove}
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button type="submit" variant="action">
            {t.apply}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
