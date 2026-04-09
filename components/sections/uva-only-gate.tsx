"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function UvaOnlyGate({ prefilledEmail }: { prefilledEmail?: string }) {
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [reason, setReason] = useState("I want to buy and sell style finds with people at my school.");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), reason: reason.trim() })
      });

      if (!response.ok) {
        throw new Error("Failed to join waitlist");
      }

      setSubmitted(true);
      toast.success("You are on the waitlist.");
    } catch {
      toast.error("Could not submit waitlist request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container flex min-h-[72vh] items-center justify-center py-8">
      <Card className="surface-panel-strong w-full max-w-2xl overflow-hidden">
        <CardContent className="space-y-7 p-8">
          <div className="space-y-3">
            <p className="editorial-eyebrow">HoosFinds</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">UVA only for now.</h1>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
              HoosFinds is currently exclusive to UVA students with <b>@virginia.edu</b> or <b>@mail.virginia.edu</b> so the marketplace stays local, trustworthy, and Grounds-native.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-background/70 p-4 text-sm leading-7 text-muted-foreground">
            We&apos;re starting with UVA first and expanding carefully. Drop your email below if you want to hear when your school opens next.
          </div>

          <div className="rounded-[1.5rem] border border-uva-blue/15 bg-uva-blue/6 p-4 text-sm leading-7 text-muted-foreground dark:border-white/16 dark:bg-white/[0.08]">
            Local thrift or vintage shop?{" "}
            <Link href="/verified-seller/apply" className="font-semibold text-foreground transition hover:text-uva-orange">
              Apply as a Verified Shop
            </Link>{" "}
            instead of joining the student waitlist.
          </div>

          {submitted ? (
            <div className="rounded-[1.5rem] border border-uva-blue/15 bg-uva-blue/6 p-5 text-sm leading-7 text-uva-blue dark:border-white/16 dark:bg-white/[0.08] dark:text-white/92">
              You&apos;re in. We&apos;ll send launch updates and early access invites when your school is ready.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="waitlist-email" className="text-sm font-semibold text-foreground">
                  School email
                </Label>
                <Input
                  id="waitlist-email"
                  required
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-describedby="waitlist-email-help"
                />
                <p id="waitlist-email-help" className="text-xs leading-6 text-muted-foreground">
                  We&apos;ll only use this for launch updates and early access invites.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="waitlist-reason" className="text-sm font-semibold text-foreground">
                  What would you want HoosFinds for?
                </Label>
                <Textarea
                  id="waitlist-reason"
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  aria-describedby="waitlist-reason-help"
                  placeholder="Vintage jackets, better Grounds fits, dorm cleanout finds, local student resale..."
                />
                <p id="waitlist-reason-help" className="text-xs leading-6 text-muted-foreground">
                  A short note helps us prioritize the next schools and categories to open.
                </p>
              </div>
              <Button disabled={loading} className="w-full" type="submit">
                {loading ? "Submitting..." : "Join the waitlist"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
