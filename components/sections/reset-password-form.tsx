"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/sections/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetPasswordFormProps = {
  email: string;
  token: string;
};

export function ResetPasswordForm({ email, token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        token,
        password,
        confirmPassword
      })
    });

    const data = (await response.json().catch(() => null)) as { message?: string; redirectTo?: string } | null;
    setLoading(false);

    if (!response.ok) {
      if (response.status === 403 && data?.redirectTo) {
        router.push(data.redirectTo);
        return;
      }

      setError(data?.message || "Could not reset your password right now.");
      return;
    }

    setSuccess(true);
  }

  return (
    <AuthShell
      title="Set a new password."
      description="Choose a new password for your HoosFinds account and then sign back in."
    >
      {success ? (
        <div className="space-y-4">
          <div className="rounded-[1.7rem] border border-uva-blue/15 bg-uva-blue/6 p-5 text-center dark:border-white/16 dark:bg-white/[0.08]">
            <p className="font-display text-2xl font-bold text-uva-blue dark:text-white">Password updated</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Your password is ready. Sign in with your email and the new password.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-sm font-semibold text-foreground">
              Email
            </Label>
            <Input id="reset-email" type="email" value={email} readOnly disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password" className="text-sm font-semibold text-foreground">
              New password
            </Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters, with a number"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm" className="text-sm font-semibold text-foreground">
              Confirm password
            </Label>
            <Input
              id="reset-confirm"
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
            {loading ? "Updating password..." : "Update password"}
          </Button>
        </form>
      )}

      <div className="space-y-2 text-center text-xs leading-6 text-muted-foreground">
        <p>
          Need a fresh link?{" "}
          <Link href="/forgot-password" className="font-semibold text-foreground transition hover:text-uva-orange">
            Request another reset email
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
