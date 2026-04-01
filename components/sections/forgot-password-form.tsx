"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthEmailPreview } from "@/components/sections/auth-email-preview";
import { AuthShell } from "@/components/sections/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const allowedDomains = ["virginia.edu", "mail.virginia.edu"];

function isAllowedEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@").at(1);
  return Boolean(domain && allowedDomains.includes(domain));
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(normalizedEmail)) {
      router.push(`/auth/uva-only?email=${encodeURIComponent(normalizedEmail)}`);
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewUrl(null);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail
      })
    });

    const data = (await response.json().catch(() => null)) as { message?: string; redirectTo?: string; previewUrl?: string | null } | null;
    setLoading(false);

    if (!response.ok) {
      if (response.status === 403 && data?.redirectTo) {
        router.push(data.redirectTo);
        return;
      }

      setError(data?.message || "Could not start password reset right now.");
      return;
    }

    setSubmitted(true);
    setPreviewUrl(data?.previewUrl || null);
  }

  return (
    <AuthShell
      title="Reset your password."
      description="Enter your UVA email and we'll send a secure link to reset your HoosFinds password."
    >
      {submitted ? (
        <div className="space-y-4">
          <div className="rounded-[1.7rem] border border-uva-blue/15 bg-uva-blue/6 p-5 text-center dark:border-white/16 dark:bg-white/[0.08]">
            <p className="font-display text-2xl font-bold text-uva-blue dark:text-white">Check your inbox</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              If an account exists for that UVA email, we sent password reset instructions.
            </p>
          </div>
          <AuthEmailPreview previewUrl={previewUrl} />
          <Button asChild className="w-full">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="text-sm font-semibold text-foreground">
              UVA email
            </Label>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@virginia.edu"
              autoComplete="email"
              required
            />
          </div>

          {error ? (
            <div className="rounded-[1.15rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Sending reset link..." : "Send reset link"}
          </Button>
        </form>
      )}

      <div className="space-y-2 text-center text-xs leading-6 text-muted-foreground">
        <p>
          Remembered it?{" "}
          <Link href="/sign-in" className="font-semibold text-foreground transition hover:text-uva-orange">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
