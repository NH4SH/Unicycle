import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SellWizard } from "@/components/sell/sell-wizard";

export default function SellPage() {
  return (
    <div className="container space-y-6 py-8 md:space-y-8 md:py-10">
      <div className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Sell on HoosFinds</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Turn the piece you&apos;re done with into someone else&apos;s next fit.</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            HoosFinds is built for clothing first, but dorm cleanout gems, tech, textbooks, and other local finds still belong here too.
          </p>
        </div>
        <div className="rounded-full border border-border bg-card/75 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground shadow-soft">
          Pickup on Grounds
        </div>
      </div>
      <div className="surface-subtle flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Need to set up seller payouts?</p>
          <p className="text-sm text-muted-foreground">
            Open the seller payments workspace to onboard with Stripe and publish payout-ready storefront products.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/payments">Open seller payments</Link>
        </Button>
      </div>
      <SellWizard />
    </div>
  );
}
