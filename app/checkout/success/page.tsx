import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";

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
        <Card className="mx-auto max-w-2xl border-white bg-white">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="blue" className="mx-auto w-fit">Checkout</Badge>
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
      <Card className="mx-auto max-w-2xl border-white bg-white">
        <CardContent className="space-y-6 p-8">
          <Badge variant={paymentComplete ? "orange" : "blue"} className="w-fit">
            {paymentComplete ? "Payment confirmed" : "Payment processing"}
          </Badge>
          <div className="space-y-3">
            <div className="inline-flex rounded-full bg-secondary p-3">
              {paymentComplete ? (
                <CheckCircle2 className="h-8 w-8 text-uva-orange" />
              ) : (
                <Clock3 className="h-8 w-8 text-electric" />
              )}
            </div>
            <h1 className="font-display text-4xl font-black tracking-tight">
              {paymentComplete ? "You’re checked out." : "We’re finishing your payment."}
            </h1>
            <p className="max-w-xl text-muted-foreground">
              {paymentComplete
                ? "Stripe accepted your payment. UniCycle has recorded the order and marked the item as sold."
                : "Stripe is still finalizing the payment state. Refresh in a moment if this page stays in processing."}
            </p>
          </div>

          {order?.listing ? (
            <div className="rounded-3xl border border-border bg-secondary/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Order</p>
              <p className="mt-2 font-display text-2xl font-black">{order.listing.title}</p>
              <p className="text-sm text-muted-foreground">${(order.amountCents / 100).toFixed(2)} paid via Stripe</p>
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
