"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";

import { AuthShell } from "@/components/sections/auth-shell";
import { AUTH_ERROR_CODES } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const allowedDomains = ["virginia.edu", "mail.virginia.edu"];

function isAllowedEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@").at(1);
  return Boolean(domain && allowedDomains.includes(domain));
}

function getErrorMessage(errorCode?: string | null) {
  switch (errorCode) {
    case AUTH_ERROR_CODES.USER_NOT_FOUND:
      return "We couldn't find a HoosFinds account for that UVA email.";
    case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
      return "That password didn't match our records.";
    case AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED:
      return "Verify your UVA email before signing in.";
    case AUTH_ERROR_CODES.PASSWORD_NOT_SET:
      return "This account still needs a password. Use forgot password to set one.";
    case AUTH_ERROR_CODES.DISALLOWED_DOMAIN:
      return "HoosFinds is UVA-only right now.";
    default:
      return "Could not sign you in right now. Please try again.";
  }
}

type SignInFormProps = {
  callbackUrl: string;
  enableDevBypass: boolean;
};

export function SignInForm({ callbackUrl, enableDevBypass }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const verificationHref = useMemo(
    () => `/verify-email${email.trim() ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ""}`,
    [email]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(normalizedEmail)) {
      router.push(`/auth/uva-only?email=${encodeURIComponent(normalizedEmail)}`);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    const response = await signIn("credentials", {
      email: normalizedEmail,
      password,
      callbackUrl,
      redirect: false
    });

    setLoading(false);

    if (response?.error) {
      if (response.error === AUTH_ERROR_CODES.DISALLOWED_DOMAIN) {
        router.push(`/auth/uva-only?email=${encodeURIComponent(normalizedEmail)}`);
        return;
      }

      setErrorCode(response.error);
      setError(getErrorMessage(response.error));
      return;
    }

    router.push(response?.url || callbackUrl);
    router.refresh();
  }

  async function handleDevBypass() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(normalizedEmail)) {
      router.push(`/auth/uva-only?email=${encodeURIComponent(normalizedEmail)}`);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    const response = await signIn("auth-bypass", {
      email: normalizedEmail,
      callbackUrl,
      redirect: false
    });

    setLoading(false);

    if (response?.error || !response?.ok) {
      setError("Development bypass failed. Check the env flag and try again.");
      return;
    }

    router.push(response.url || callbackUrl);
    router.refresh();
  }

  return (
    <AuthShell
      title="Welcome back to HoosFinds."
      description="Sign in with your UVA email and password to browse, message, buy, and sell on Grounds."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="sign-in-email" className="text-sm font-semibold text-foreground">
            UVA email
          </Label>
          <Input
            id="sign-in-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@virginia.edu"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="sign-in-password" className="text-sm font-semibold text-foreground">
              Password
            </Label>
            <Link href="/forgot-password" className="text-xs font-semibold text-foreground/80 transition hover:text-uva-orange">
              Forgot password?
            </Link>
          </div>
          <Input
            id="sign-in-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </div>

        {error ? (
          <div className="space-y-3 rounded-[1.15rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p>{error}</p>
            {errorCode === AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED ? (
              <Link href={verificationHref} className="font-semibold underline underline-offset-4">
                Resend verification email
              </Link>
            ) : null}
            {errorCode === AUTH_ERROR_CODES.PASSWORD_NOT_SET ? (
              <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
                Set your password
              </Link>
            ) : null}
          </div>
        ) : null}

        <Button className="w-full" size="lg" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        {enableDevBypass ? (
          <Button className="w-full" size="lg" type="button" variant="secondary" onClick={handleDevBypass} disabled={loading}>
            {loading ? "Signing in..." : "Dev bypass sign-in"}
          </Button>
        ) : null}
      </form>

      <div className="space-y-2 text-center text-xs leading-6 text-muted-foreground">
        <p>
          New to HoosFinds?{" "}
          <Link href="/sign-up" className="font-semibold text-foreground transition hover:text-uva-orange">
            Create your account
          </Link>
        </p>
        {enableDevBypass ? <p className="text-uva-orange">Dev bypass is enabled locally. It still requires a UVA email format.</p> : null}
      </div>
    </AuthShell>
  );
}
