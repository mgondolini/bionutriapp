"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/it";

const t = copy.activation;

/**
 * Password con pulsante mostra/nascondi; i requisiti sono descritti da
 * `describedBy`. Usata da attivazione e cambio password (cliente e staff).
 */
export function PasswordInput<T extends FieldValues>({
  field,
  id,
  invalid,
  describedBy,
  autoComplete = "new-password",
  placeholder = t.passwordPlaceholder,
  disabled,
}: {
  field: ControllerRenderProps<T>;
  id: string;
  invalid: boolean;
  describedBy?: string;
  autoComplete?: "new-password" | "current-password";
  placeholder?: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...field}
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="pr-12"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? t.hidePassword : t.showPassword}
        aria-pressed={visible}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  );
}
