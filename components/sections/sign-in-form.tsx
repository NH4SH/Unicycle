"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <Card className="w-full max-w-xl border-border/80 bg-white/86">
        <CardContent className="space-y-7 p-8">
          <div className="space-y-3 text-center">
            <p className="editorial-eyebrow">HoosFinds</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">Join the stylish resale layer of UVA.</h1>
            <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">
              Use your UVA email and we&apos;ll send a one-time sign-in link so you can browse, save, message, and list finds on Grounds.
            </p>
          </div>

          {submittedTo ? (
            <div className="rounded-[1.7rem] border border-uva-blue/15 bg-uva-blue/6 p-5 text-center">
              <p className="font-display text-2xl font-bold text-uva-blue">Check your inbox</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                We sent a sign-in link to <span className="font-semibold text-foreground">{submittedTo}</span>.
              </p>
            </div>
          ) : (
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
                  aria-describedby="sign-in-email-help"
                  required
                />
                <p id="sign-in-email-help" className="text-xs leading-6 text-muted-foreground">
                  Use your <span className="font-medium text-foreground">@virginia.edu</span> or{" "}
                  <span className="font-medium text-foreground">@mail.virginia.edu</span> address.
                </p>
              </div>
              {enableDevBypass && requireBypassCode ? (
                <div className="space-y-2">
                  <Label htmlFor="team-access-code" className="text-sm font-semibold text-foreground">
                    Team access code
                  </Label>
                  <Input
                    id="team-access-code"
                    type="password"
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value)}
                    placeholder="Private team code"
                    aria-describedby="team-access-code-help"
                  />
                  <p id="team-access-code-help" className="text-xs leading-6 text-muted-foreground">
                    This hosted testing shortcut is only for your team while email delivery is still being finalized.
                  </p>
                </div>
              ) : null}
              {error ? (
                <div className="rounded-[1.15rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

          <div className="space-y-2 text-center text-xs leading-6 text-muted-foreground">
            <p>
              UVA domains only: <span className="font-semibold text-foreground">@virginia.edu</span> and
              <span className="font-semibold text-foreground"> @mail.virginia.edu</span>.
            </p>
            {enableDevBypass ? (
              <p className="text-uva-orange">
                {requireBypassCode
                  ? "Testing bypass is enabled for your team. It still requires a UVA email and the private code."
                  : "Dev bypass is enabled locally. It skips email delivery but still requires a UVA email format."}
              </p>
            ) : null}
            <p>
              Want the meetup basics first?{" "}
              <Link href="/safety" className="font-semibold text-uva-blue">
                Read safety guidance
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
