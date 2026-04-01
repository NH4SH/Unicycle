"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthEmailPreview } from "@/components/sections/auth-email-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResendVerificationForm({ prefilledEmail }: { prefilledEmail?: string }) {
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    setLoading(true);
    setError(null);
    setPreviewUrl(null);

    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail
      })
    });

    const data = (await response.json().catch(() => null)) as { message?: string; redirectTo?: string; previewUrl?: string | null } | null;
    setLoading(false);

    if (!response.ok) {
      setError(data?.message || "Could not resend verification right now.");
      return;
    }

    setSubmitted(true);
    setPreviewUrl(data?.previewUrl || null);
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.7rem] border border-uva-blue/15 bg-uva-blue/6 p-5 text-center dark:border-white/16 dark:bg-white/[0.08]">
          <p className="font-display text-2xl font-bold text-uva-blue dark:text-white">Check your inbox</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
            If that HoosFinds account still needs verification, we sent a fresh link.
          </p>
        </div>
        <AuthEmailPreview previewUrl={previewUrl} />
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="resend-verification-email" className="text-sm font-semibold text-foreground">
          UVA or verified shop email
        </Label>
        <Input
          id="resend-verification-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@virginia.edu or shop@example.com"
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
        {loading ? "Sending link..." : "Resend verification email"}
      </Button>

      <p className="text-center text-xs leading-6 text-muted-foreground">
        Already verified?{" "}
        <Link href="/sign-in" className="font-semibold text-foreground transition hover:text-uva-orange">
          Sign in
        </Link>
      </p>
    </form>
  );
}
