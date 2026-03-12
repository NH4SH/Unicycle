"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function UvaOnlyGate({ prefilledEmail }: { prefilledEmail?: string }) {
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [reason, setReason] = useState("I want to buy/sell with my campus community.");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason })
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
      <Card className="w-full max-w-xl overflow-hidden border-white bg-white">
        <div className="h-2 w-full bg-gradient-to-r from-uva-orange to-electric" />
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-black tracking-tight">UVA only for now</h1>
            <p className="text-muted-foreground">
              UniCycle is currently exclusive to UVA students with <b>@virginia.edu</b> or <b>@mail.virginia.edu</b>.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
            We are rolling out to more schools soon. Drop your email and we will notify you when your campus opens.
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-electric/20 bg-electric/10 p-4 text-sm font-medium text-electric">
              You are in. We&apos;ll send launch updates and early access invites.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                required
                type="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-label="Email"
              />
              <Textarea
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-label="Reason"
                placeholder="What would you use UniCycle for?"
              />
              <Button disabled={loading} className="w-full" type="submit">
                {loading ? "Submitting..." : "Join Waitlist"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
