import Link from "next/link";
import { ArrowLeft, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CheckoutCancelPageProps = {
  searchParams?: {
    listingId?: string;
  };
};

export default function CheckoutCancelPage({ searchParams }: CheckoutCancelPageProps) {
  const returnHref = searchParams?.listingId ? `/listing/${searchParams.listingId}` : "/market";

  return (
    <div className="container py-10">
      <Card className="mx-auto max-w-2xl overflow-hidden border-white bg-white">
        <CardContent className="space-y-6 p-8">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-white via-secondary to-electric/10 p-5">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-electric/10 blur-3xl" />
            <div className="relative space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="blue" className="w-fit">Checkout canceled</Badge>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-soft">
                  <WalletCards className="h-3.5 w-3.5 text-electric" />
                  Stripe
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="font-display text-4xl font-black tracking-tight">No charge was made.</h1>
                <p className="max-w-xl text-muted-foreground">
                  Your Stripe checkout was canceled before payment completed. You can head back to the listing and try again anytime.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={returnHref}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Return to listing
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/market">Keep browsing</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
