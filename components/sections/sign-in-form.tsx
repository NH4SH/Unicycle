"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const allowedDomains = ["virginia.edu", "mail.virginia.edu"];

function isAllowedEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@").at(1);
  return Boolean(domain && allowedDomains.includes(domain));
}

type SignInFormProps = {
  callbackUrl: string;
  enableDevBypass: boolean;
  requireBypassCode: boolean;
};

export function SignInForm({ callbackUrl, enableDevBypass, requireBypassCode }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedTo, setSubmittedTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(normalizedEmail)) {
      router.push(`/auth/uva-only?email=${encodeURIComponent(normalizedEmail)}`);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await signIn("email", {
      email: normalizedEmail,
      callbackUrl,
      redirect: false
    });

    setLoading(false);

    if (response?.error) {
      setError("Could not send your sign-in link. Check your email settings and try again.");
      return;
    }

    setSubmittedTo(normalizedEmail);
  }

  async function handleDevBypass() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(normalizedEmail)) {
      router.push(`/auth/uva-only?email=${encodeURIComponent(normalizedEmail)}`);
      return;
    }

    if (requireBypassCode && !accessCode.trim()) {
      setError("Enter the team access code to use the testing bypass.");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await signIn("auth-bypass", {
      email: normalizedEmail,
      accessCode,
      callbackUrl,
      redirect: false
    });

    setLoading(false);

    if (response?.error || !response?.ok) {
      setError(
        requireBypassCode
          ? "Testing bypass failed. Double-check the team code and try again."
          : "Development bypass failed. Check the env flag and try again."
      );
      return;
    }

    router.push(response.url || callbackUrl);
    router.refresh();
  }

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      <Card className="w-full max-w-md border-white bg-white/95">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-center">
            <h1 className="font-display text-3xl font-black">Join UniCycle</h1>
            <p className="text-sm text-muted-foreground">
              Enter your UVA email and we&apos;ll send a one-time sign-in link.
            </p>
          </div>

          {submittedTo ? (
            <div className="space-y-3 rounded-3xl border border-electric/20 bg-electric/10 p-5 text-center">
              <p className="font-semibold text-electric">Check your inbox</p>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <span className="font-semibold text-foreground">{submittedTo}</span>.
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@virginia.edu"
                aria-label="UVA email address"
                required
              />
              {enableDevBypass && requireBypassCode ? (
                <Input
                  type="password"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="Team access code"
                  aria-label="Team access code"
                />
              ) : null}
              {error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading ? "Sending link..." : "Email me a sign-in link"}
              </Button>
              {enableDevBypass ? (
                <Button className="w-full" size="lg" type="button" variant="secondary" onClick={handleDevBypass} disabled={loading}>
                  {loading ? "Signing in..." : requireBypassCode ? "Team test sign-in" : "Dev bypass sign-in"}
                </Button>
              ) : null}
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground">
            UVA domains only: <span className="font-semibold">@virginia.edu</span> and
            <span className="font-semibold"> @mail.virginia.edu</span>.
          </p>
          {enableDevBypass ? (
            <p className="text-center text-xs text-uva-orange">
              {requireBypassCode
                ? "Testing bypass is enabled for your team. It skips email delivery but still requires a UVA email and the private team code."
                : "Dev bypass is enabled locally. This skips email delivery but still requires a UVA email format."}
            </p>
          ) : null}
          <p className="text-center text-xs text-muted-foreground">
            Need details first?{" "}
            <Link href="/safety" className="font-semibold text-electric">
              Read Safety Rules
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
