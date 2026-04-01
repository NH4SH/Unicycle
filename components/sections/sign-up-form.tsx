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

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedTo, setSubmittedTo] = useState<string | null>(null);
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

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        username,
        email: normalizedEmail,
        password,
        confirmPassword
      })
    });

    const data = (await response.json().catch(() => null)) as { message?: string; redirectTo?: string; previewUrl?: string | null } | null;
    setLoading(false);

    if (!response.ok) {
      if (response.status === 403 && data?.redirectTo) {
        router.push(data.redirectTo);
        return;
      }

      setError(data?.message || "Could not create your account right now.");
      return;
    }

    setSubmittedTo(normalizedEmail);
    setPreviewUrl(data?.previewUrl || null);
  }

  return (
    <AuthShell
      title="Create your HoosFinds account."
      description="Student accounts are UVA-only. Pick the name and handle you want buyers to recognize, verify your inbox once, and then sign in normally after that."
    >
      {submittedTo ? (
        <div className="space-y-4">
          <div className="rounded-[1.7rem] border border-uva-blue/15 bg-uva-blue/6 p-5 text-center dark:border-white/16 dark:bg-white/[0.08]">
            <p className="font-display text-2xl font-bold text-uva-blue dark:text-white">Check your inbox</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              We sent a verification link to <span className="font-semibold text-foreground">{submittedTo}</span>.
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
            <Label htmlFor="sign-up-name" className="text-sm font-semibold text-foreground">
              Display name
            </Label>
            <Input
              id="sign-up-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="How you want your profile to appear"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-username" className="text-sm font-semibold text-foreground">
              Username (optional)
            </Label>
            <Input
              id="sign-up-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="noel-sierra"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs leading-6 text-muted-foreground">
              We’ll use this for your public profile URL. Leave it blank and HoosFinds will generate a clean handle from your name.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-email" className="text-sm font-semibold text-foreground">
              UVA email
            </Label>
            <Input
              id="sign-up-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@virginia.edu"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-password" className="text-sm font-semibold text-foreground">
              Password
            </Label>
            <Input
              id="sign-up-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters, with a number"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-confirm" className="text-sm font-semibold text-foreground">
              Confirm password
            </Label>
            <Input
              id="sign-up-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
            />
          </div>

          {error ? (
            <div className="rounded-[1.15rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      )}

      <div className="space-y-2 text-center text-xs leading-6 text-muted-foreground">
        <p>
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-foreground transition hover:text-uva-orange">
            Sign in
          </Link>
        </p>
        <p>
          Used HoosFinds before the password update?{" "}
          <Link href="/forgot-password" className="font-semibold text-foreground transition hover:text-uva-orange">
            Set your password
          </Link>
        </p>
        <p>
          Local shop or resale partner?{" "}
          <Link href="/verified-seller/apply" className="font-semibold text-foreground transition hover:text-uva-orange">
            Apply to become a Verified Shop
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
