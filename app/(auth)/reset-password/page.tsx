import Link from "next/link";

import { AuthShell } from "@/components/sections/auth-shell";
import { ResetPasswordForm } from "@/components/sections/reset-password-form";
import { Button } from "@/components/ui/button";

type ResetPasswordPageProps = {
  searchParams?: {
    email?: string;
    token?: string;
  };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const email = searchParams?.email?.trim();
  const token = searchParams?.token?.trim();

  if (!email || !token) {
    return (
      <AuthShell
        title="That reset link is incomplete."
        description="Request a fresh password reset email and use the newest link from your UVA inbox."
      >
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request reset email</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return <ResetPasswordForm email={email} token={token} />;
}
