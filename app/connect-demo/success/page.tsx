import Link from "next/link";
import { CheckCircle2, Sparkles, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getStripeClient, isStripeConnectConfigured } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";

type ConnectSuccessPageProps = {
  searchParams?: {
    session_id?: string;
  };
};

export default async function ConnectSuccessPage({ searchParams }: ConnectSuccessPageProps) {
  const sessionId = searchParams?.session_id;

  if (!sessionId || !isStripeConnectConfigured()) {
    return (
      <div className="container py-10">
        <Card className="mx-auto max-w-2xl overflow-hidden border-white bg-white">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="blue" className="mx-auto w-fit">Stripe Connect</Badge>
            <h1 className="font-display text-4xl font-black tracking-tight">No Connect checkout session found.</h1>
            <Button asChild>
              <Link href="/connect-demo">Back to the storefront</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stripeClient = getStripeClient();
  const checkoutSession = await stripeClient.checkout.sessions.retrieve(sessionId);
  const productId = checkoutSession.metadata?.connectProductId || checkoutSession.client_reference_id || "";
  const product = productId
    ? await prisma.connectProduct.findUnique({
        where: { id: productId },
        include: {
          owner: true,
          connectedAccount: true
        }
      })
    : null;

  return (
    <div className="container py-10">
      <Card className="mx-auto max-w-3xl overflow-hidden border-white bg-white">
        <CardContent className="space-y-6 p-8">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-white via-uva-blue/5 to-uva-orange/10 p-6">
            <div className="absolute left-0 top-0 h-24 w-24 rounded-full bg-uva-blue/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-24 w-24 rounded-full bg-uva-orange/10 blur-3xl" />
            <div className="relative space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="orange" className="w-fit">Destination charge complete</Badge>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-soft">
                  <Sparkles className="h-3.5 w-3.5 text-uva-orange" />
                  Stripe Connect
                </div>
              </div>
              <div className="space-y-3">
                <div className="inline-flex rounded-full bg-white/90 p-3 shadow-soft">
                  <CheckCircle2 className="h-8 w-8 text-uva-orange" />
                </div>
                <h1 className="font-display text-4xl font-black tracking-tight">Payment routed successfully.</h1>
                <p className="max-w-2xl text-muted-foreground">
                  The customer paid through Stripe Checkout, the application fee stayed with HoosFinds, and the remaining
                  funds were routed to the seller&apos;s connected account.
                </p>
              </div>
            </div>
          </div>

          {product ? (
            <div className="grid gap-4 rounded-3xl border border-border bg-secondary/40 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Purchased product</p>
                <p className="font-display text-2xl font-black">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Seller: {product.owner.name || product.owner.username} · Connected account {product.connectedAccount.stripeAccountId}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-soft">
                <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <WalletCards className="h-3.5 w-3.5 text-uva-blue" />
                  Total
                </div>
                <p className="font-display text-2xl font-black text-uva-blue">{formatCurrency(product.priceCents / 100)}</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/connect-demo">Back to storefront</Link>
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
