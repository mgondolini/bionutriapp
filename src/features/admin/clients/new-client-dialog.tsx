"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  CLIENT_CREATION_MODES,
  INITIAL_STAGE_BY_ORIGIN,
  ORIGIN_BY_CREATION_MODE,
  type ClientCreationMode,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import { createClientAction } from "@/server/actions/clients.actions";
import {
  createClientSchema,
  type CreateClientFormValues,
} from "@/server/validation/clients.schema";

const t = copy.admin.clients.create;

const EMPTY: CreateClientFormValues = {
  mode: "new",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  birthDate: "",
};

type TextField = Exclude<keyof CreateClientFormValues, "mode">;

const FIELDS: Record<
  ClientCreationMode,
  { name: TextField; label: string; type?: string; autoComplete?: string }[]
> = {
  new: [
    { name: "firstName", label: t.firstName, autoComplete: "off" },
    { name: "phone", label: t.phone, type: "tel", autoComplete: "off" },
  ],
  full: [
    { name: "firstName", label: t.firstName, autoComplete: "off" },
    { name: "lastName", label: t.lastName, autoComplete: "off" },
    { name: "phone", label: t.phone, type: "tel", autoComplete: "off" },
    { name: "email", label: t.email, type: "email", autoComplete: "off" },
    { name: "birthDate", label: t.birthDate, type: "date" },
  ],
};

/** Creazione di un cliente (A-04, schermata A2) nelle due modalità. */
export function NewClientDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateClientFormValues>({
    // Lo schema accetta il form "piatto" e sceglie la variante con `mode`;
    // raw: si inviano alla Server Action i valori digitati, che li rivalida.
    resolver: zodResolver(createClientSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<CreateClientFormValues>,
    defaultValues: EMPTY,
  });
  const mode = useWatch({ control: form.control, name: "mode" });
  const initialStage = INITIAL_STAGE_BY_ORIGIN[ORIGIN_BY_CREATION_MODE[mode]];

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset(EMPTY);
      setError(null);
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await createClientAction(values);
      if (result.ok) {
        toast.success(
          t.created(
            [values.firstName, values.lastName].filter(Boolean).join(" "),
          ),
        );
        changeOpen(false);
        return;
      }
      setError(result.error);
      for (const [field, messages] of Object.entries(
        result.fieldErrors ?? {},
      )) {
        if (messages?.[0])
          form.setError(field as TextField, { message: messages[0] });
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlus aria-hidden="true" />
        {copy.admin.clients.actions.newClient}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <Controller
            name="mode"
            control={form.control}
            render={({ field }) => (
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">{t.modeLabel}</legend>
                {CLIENT_CREATION_MODES.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      field.value === option
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted",
                    )}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <input
                        type="radio"
                        name={field.name}
                        value={option}
                        checked={field.value === option}
                        onChange={() => {
                          field.onChange(option);
                          form.clearErrors();
                        }}
                        className="size-4 accent-(--primary)"
                      />
                      {t.modes[option].label}
                    </span>
                    <span className="text-muted-foreground">
                      {t.modes[option].description}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
          />

          <FieldGroup>
            {error ? <FormMessage>{error}</FormMessage> : null}
            {FIELDS[mode].map(({ name, label, type, autoComplete }) => (
              <Controller
                key={`${mode}-${name}`}
                name={name}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`new-client-${name}`}>
                      {label}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`new-client-${name}`}
                      type={type ?? "text"}
                      autoComplete={autoComplete}
                      placeholder={
                        name === "phone" ? t.phonePlaceholder : undefined
                      }
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            ))}
          </FieldGroup>

          <div className="flex flex-col gap-2 rounded-xl bg-muted p-3 text-sm">
            <span className="font-medium">{t.initialState}</span>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="to_invite" />
              <StatusBadge status={initialStage} />
            </div>
            <span className="text-muted-foreground">{t.initialStateHint}</span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => changeOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t.submitting : t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
