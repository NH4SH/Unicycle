import Link from "next/link";

import { AuthShell } from "@/components/sections/auth-shell";
import { ResendVerificationForm } from "@/components/sections/resend-verification-form";
import { Button } from "@/components/ui/button";
import { consumeEmailVerificationToken } from "@/lib/auth-tokens";
import { findUserByNormalizedEmail } from "@/lib/auth-users";
import { normalizeUvaEmail } from "@/lib/domain";

type VerifyEmailPageProps = {
  searchParams?: {
    email?: string;
    token?: string;
  };
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const email = searchParams?.email?.trim();
  const token = searchParams?.token?.trim();

  if (email && token) {
    const normalizedEmail = normalizeUvaEmail(email);
    const result = await consumeEmailVerificationToken(normalizedEmail, token);

    if (result.ok) {
      return (
        <AuthShell
          title="Your email is verified."
          description="You're ready to sign in with your UVA email and password."
        >
          <Button asChild className="w-full">
            <Link href="/sign-in">Go to sign in</Link>
          </Button>
        </AuthShell>
      );
    }

    const existingUser = await findUserByNormalizedEmail(normalizedEmail);
    if (existingUser?.emailVerified) {
      return (
        <AuthShell
          title="This email is already verified."
          description="You can head straight back to HoosFinds and sign in normally."
        >
          <Button asChild className="w-full">
            <Link href="/sign-in">Go to sign in</Link>
          </Button>
        </AuthShell>
      );
    }

    return (
      <AuthShell
        title={result.reason === "expired" ? "That verification link expired." : "That verification link is invalid."}
        description="Request a fresh verification email below and use the newest link from your UVA inbox."
      >
        <ResendVerificationForm prefilledEmail={normalizedEmail} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verify your UVA email."
      description="Need another verification link? Enter your UVA email and we'll send a fresh one."
    >
      <ResendVerificationForm prefilledEmail={email} />
    </AuthShell>
  );
}
