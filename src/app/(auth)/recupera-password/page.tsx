import { copy } from "@/lib/copy/it";
import { AuthCard } from "@/features/auth/auth-card";
import { RecoverPasswordForm } from "@/features/auth/recover-password-form";

export default function RecoverPasswordPage() {
  return (
    <AuthCard
      title={copy.auth.recover.title}
      description={copy.auth.recover.description}
    >
      <RecoverPasswordForm />
    </AuthCard>
  );
}
