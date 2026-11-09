"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, UserPlus } from "lucide-react";
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
import { CREATION_STAGES } from "@/lib/constants/domain";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import { createClientAction } from "@/server/actions/clients.actions";
import {
  createClientSchema,
  type CreateClientFormValues,
} from "@/server/validation/clients.schema";

import { WhatsAppInviteButton } from "./whatsapp-invite-button";

const t = copy.admin.clients.create;

const EMPTY: CreateClientFormValues = {
  stage: "in_progress",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  birthDate: "",
};

type TextField = Exclude<keyof CreateClientFormValues, "stage">;

const FIELDS: {
  name: TextField;
  label: string;
  type?: string;
  autoComplete?: string;
}[] = [
  { name: "firstName", label: t.firstName, autoComplete: "off" },
  { name: "lastName", label: t.lastName, autoComplete: "off" },
  { name: "phone", label: t.phone, type: "tel", autoComplete: "off" },
  { name: "email", label: t.email, type: "email", autoComplete: "off" },
  { name: "birthDate", label: t.birthDate, type: "date" },
];

/** Cliente appena creato: il pannello resta aperto per l'invito WhatsApp. */
type Created = { id: string; name: string };

/**
 * Creazione di un cliente (A-04, schermata A2): dati completi e fase iniziale
 * (In percorso o Onboarding). Dopo la creazione il pannello mostra subito
 * "Invia invito su WhatsApp", così il cliente riceve il link per la password.
 */
export function NewClientDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateClientFormValues>({
    // raw: si inviano alla Server Action i valori digitati, che li rivalida.
    resolver: zodResolver(createClientSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<CreateClientFormValues>,
    defaultValues: EMPTY,
  });
  const stage = useWatch({ control: form.control, name: "stage" });

  const reset = () => {
    form.reset(EMPTY);
    setError(null);
    setCreated(null);
  };

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await createClientAction(values);
      if (redirectIfSignedOut(result)) return;
      if (result.ok) {
        const name = [values.firstName, values.lastName]
          .filter(Boolean)
          .join(" ");
        toast.success(t.created(name));
        setCreated({ id: result.data.id, name });
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
      <DialogContent className="sm:max-w-[660px]">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3 rounded-xl bg-primary-tint p-4 text-sm">
              <CircleCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-primary-ink"
              />
              <div className="flex flex-col gap-1">
                <p role="status" className="font-semibold">
                  {t.createdTitle(created.name)}
                </p>
                <p className="text-muted-foreground">{t.createdHint}</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={reset}>
                {t.addAnother}
              </Button>
              <WhatsAppInviteButton
                clientId={created.id}
                name={created.name}
                label={copy.admin.clients.profile.invite.send}
              />
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <Controller
              name="stage"
              control={form.control}
              render={({ field }) => (
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="mb-2 text-sm font-semibold">
                    {t.stageLabel}
                  </legend>
                  {CREATION_STAGES.map((option) => (
                    <label
                      key={option}
                      className={cn(
                        "flex cursor-pointer flex-col gap-0.5 rounded-xl border border-line-strong bg-card p-4 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                        field.value === option
                          ? "border-primary ring-3 ring-mint"
                          : "hover:bg-muted",
                      )}
                    >
                      <span className="flex items-center gap-3 text-[15px] font-bold">
                        <input
                          type="radio"
                          name={field.name}
                          value={option}
                          checked={field.value === option}
                          onChange={() => field.onChange(option)}
                          className="size-[22px] shrink-0 accent-(--primary)"
                        />
                        {t.stages[option].label}
                      </span>
                      <span className="pl-[34px] text-[13px] text-muted-foreground">
                        {t.stages[option].description}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
            />

            {error ? <FormMessage>{error}</FormMessage> : null}
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(({ name, label, type, autoComplete }) => (
                <Controller
                  key={name}
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

            <div className="flex flex-col gap-2 rounded-xl bg-info p-4 text-sm text-info-foreground">
              <span className="font-semibold">{t.initialState}</span>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="to_invite" />
                <StatusBadge status={stage} />
              </div>
              <span>{t.initialStateHint}</span>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
