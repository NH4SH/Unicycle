import Link from "next/link";
import { CheckCircle2, Clock3, Sparkles, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeCheckoutEnabled } from "@/lib/stripe";

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
        <Card className="mx-auto max-w-2xl overflow-hidden border-white bg-white">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="blue" className="mx-auto w-fit">Stripe checkout</Badge>
            <h1 className="font-display text-4xl font-black tracking-tight">No checkout session found.</h1>
            <Button asChild>
              <Link href="/market">Back to market</Link>
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

  return (
    <div className="container py-10">
      <Card className="mx-auto max-w-2xl overflow-hidden border-white bg-white">
        <CardContent className="space-y-6 p-8">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-white via-electric/5 to-uva-orange/10 p-5">
            <div className="absolute left-0 top-0 h-24 w-24 rounded-full bg-electric/15 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-24 w-24 rounded-full bg-uva-orange/15 blur-3xl" />
            <div className="relative space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant={paymentComplete ? "orange" : "blue"} className="w-fit">
                  {paymentComplete ? "Payment confirmed" : "Payment processing"}
                </Badge>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-soft">
                  <Sparkles className="h-3.5 w-3.5 text-uva-orange" />
                  Stripe
                </div>
              </div>
              <div className="space-y-3">
                <div className="inline-flex rounded-full bg-white/90 p-3 shadow-soft">
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
                    ? "Stripe accepted your payment. UniCycle has recorded the order and marked the item as sold."
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
                <p className="text-sm text-muted-foreground">Paid securely with Stripe and tracked inside UniCycle.</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-soft">
                <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <WalletCards className="h-3.5 w-3.5 text-electric" />
                  Total
                </div>
                <p className="font-display text-2xl font-black text-uva-blue">${(order.amountCents / 100).toFixed(2)}</p>
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
              <Link href="/messages">Open messages</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
