import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Store } from "lucide-react";

import { VerifiedShopBadge } from "@/components/shared/verified-shop-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { VERIFIED_SHOP_LABEL } from "@/lib/verified-shop";

export default async function VerifiedSellerEntryPage() {
  const session = await getAuthSession();

  if (session?.user?.sellerKind === "VERIFIED_SHOP" && session.user.verifiedShopApprovedAt) {
    redirect("/verified-seller/portal");
  }

  return (
    <div className="container space-y-8 py-8 md:py-10">
      <section className="grid gap-6 border-b border-border/80 pb-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <VerifiedShopBadge label={`HoosFinds ${VERIFIED_SHOP_LABEL}`} />
            <Badge variant="outline">UVA-only buyers</Badge>
          </div>
          <div className="space-y-2">
            <p className="editorial-eyebrow">Verified seller portal</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
              A dedicated path for trusted local resale partners.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              HoosFinds keeps buying exclusive to UVA students. Approved local thrift and vintage partners can sell through the same listing-based marketplace, with a cleaner business portal for payouts, inventory, and review status.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/sign-in?mode=verified-shop&callbackUrl=%2Fverified-seller%2Fportal">
                Sign in to portal
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/verified-seller/apply">Apply as a Verified Shop</Link>
            </Button>
          </div>
        </div>

        <Card className="surface-panel-strong">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-uva-blue/[0.08] text-uva-blue dark:bg-white/[0.08] dark:text-white">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold tracking-tight">How it works</p>
                <p className="text-sm text-muted-foreground">Simple on the seller side. Reviewed on ours.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.3rem] border border-border bg-background/70 px-4 py-4">
                <p className="editorial-eyebrow">1</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Apply</p>
                <p className="mt-1 text-sm text-muted-foreground">Tell HoosFinds about your shop, neighborhood, and point of view.</p>
              </div>
              <div className="rounded-[1.3rem] border border-border bg-background/70 px-4 py-4">
                <p className="editorial-eyebrow">2</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Reviewed manually</p>
                <p className="mt-1 text-sm text-muted-foreground">We approve trusted local partners before they can list.</p>
              </div>
              <div className="rounded-[1.3rem] border border-border bg-background/70 px-4 py-4">
                <p className="editorial-eyebrow">3</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Sell through HoosFinds</p>
                <p className="mt-1 text-sm text-muted-foreground">Approved shops use the same listings, checkout, and payout flow as everyone else.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
