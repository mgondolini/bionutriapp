import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Riquadro comune delle pagine di autenticazione. */
export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-bold">{title}</h1>
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
