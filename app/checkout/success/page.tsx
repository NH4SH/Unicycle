import Link from "next/link";
import { CheckCircle2, Clock3, Sparkles, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeCheckoutEnabled } from "@/lib/stripe";
import { formatCurrencyFromCents } from "@/lib/utils";

type CheckoutSuccessPageProps = {
  searchParams?: {
    session_id?: string;
  };
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const sessionId = searchParams?.session_id;
  if (!sessionId || !isStripeCheckoutEnabled()) {
    return (
      <div className="container py-10">
        <Card className="mx-auto max-w-2xl overflow-hidden border-border bg-card">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="blue" className="mx-auto w-fit">Stripe checkout</Badge>
            <h1 className="font-display text-4xl font-black tracking-tight">No checkout session found.</h1>
            <Button asChild>
              <Link href="/market">Back to browse</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ stripeCheckoutSessionId: sessionId }, { id: checkoutSession.client_reference_id || "" }]
    },
    include: {
      listing: true
    }
  });

  const paymentComplete = checkoutSession.payment_status === "paid";
  const reviewedTotalCents = order?.buyerTotalCents || order?.amountCents || 0;

  return (
    <div className="container py-10">
      <Card className="mx-auto max-w-2xl overflow-hidden border-border bg-card">
        <CardContent className="space-y-6 p-8">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-card via-electric/5 to-uva-orange/10 p-5">
            <div className="absolute left-0 top-0 h-24 w-24 rounded-full bg-electric/15 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-24 w-24 rounded-full bg-uva-orange/15 blur-3xl" />
            <div className="relative space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant={paymentComplete ? "orange" : "blue"} className="w-fit">
                  {paymentComplete ? "Payment confirmed" : "Payment processing"}
                </Badge>
                <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/92 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80 shadow-soft dark:border-white/12 dark:bg-white/[0.08] dark:text-white/88">
                  <Sparkles className="h-3.5 w-3.5 text-uva-orange" />
                  Stripe
                </div>
              </div>
              <div className="space-y-3">
                <div className="inline-flex rounded-full bg-card/90 p-3 shadow-soft">
                  {paymentComplete ? (
                    <CheckCircle2 className="h-8 w-8 text-uva-orange" />
                  ) : (
                    <Clock3 className="h-8 w-8 text-electric" />
                  )}
                </div>
                <h1 className="font-display text-4xl font-black tracking-tight">
                  {paymentComplete ? "Checkout complete." : "We’re finishing your payment."}
                </h1>
                <p className="max-w-xl text-muted-foreground">
                  {paymentComplete
                    ? "Stripe accepted your payment. HoosFinds recorded the order, routed the seller payout underneath the listing, and moved the sale into buyer confirmation so you can confirm receipt after pickup."
                    : "Stripe is still finalizing the payment state. Refresh in a moment if this page stays in processing."}
                </p>
              </div>
            </div>
          </div>

          {order?.listing ? (
            <div className="grid gap-4 rounded-3xl border border-border bg-secondary/40 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Order</p>
                <p className="font-display text-2xl font-black">{order.listing.title}</p>
                <p className="text-sm text-muted-foreground">Paid securely with Stripe and tracked inside HoosFinds.</p>
                <div className="grid gap-1 text-sm text-muted-foreground sm:max-w-md">
                  <div className="flex items-center justify-between gap-4">
                    <span>Item price</span>
                    <span>{formatCurrencyFromCents(order.amountCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>HoosFinds fee</span>
                    <span>
                      {formatCurrencyFromCents(order.buyerFeeTotalCents || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Sales tax</span>
                    <span>{formatCurrencyFromCents(order.taxAmountCents || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-card px-4 py-3 text-right shadow-soft">
                <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70 dark:text-white/72">
                  <WalletCards className="h-3.5 w-3.5 text-electric" />
                  Total
                </div>
                <p className="font-display text-2xl font-black text-uva-blue dark:text-white">
                  {formatCurrencyFromCents(reviewedTotalCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {order?.listingId ? (
              <Button asChild>
                <Link href={`/listing/${order.listingId}`}>View listing</Link>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link href="/purchases">View purchases</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/messages">Open messages</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
