import Link from "next/link";
import { ArrowRight, ShieldCheck, Store, WalletCards } from "lucide-react";

import { ConnectDemoClient } from "@/components/connect/connect-demo-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth";
import {
  CONNECT_APPLICATION_FEE_BPS,
  getConnectSellerState,
  getConnectStorefrontProducts,
  getConnectUserOrders
} from "@/lib/connect";
import {
  isStripeConnectConfigured,
  isStripeConnectWebhookConfigured,
  isStripeWebhookConfigured
} from "@/lib/stripe";

type ConnectDemoPageProps = {
  searchParams?: {
    accountId?: string;
    refresh?: string;
  };
};

export default async function ConnectDemoPage({ searchParams }: ConnectDemoPageProps) {
  const session = await getAuthSession();
  const [sellerState, products, orderActivity] = await Promise.all([
    getConnectSellerState(session?.user.id),
    getConnectStorefrontProducts(session?.user.id),
    getConnectUserOrders(session?.user.id)
  ]);

  const connectConfigured = isStripeConnectConfigured();
  const paymentSetup = {
    stripeSecretReady: isStripeConnectConfigured(),
    checkoutWebhookReady: isStripeWebhookConfigured(),
    connectStatusWebhookReady: isStripeConnectWebhookConfigured()
  };

  return (
    <div className="container space-y-10 py-8 md:space-y-12 md:py-10">
      <section className="grid gap-8 border-b border-border/80 pb-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Stripe Connect sample</Badge>
            <Badge variant="orange">Destination charges</Badge>
            <Badge variant="blue">Platform fee {CONNECT_APPLICATION_FEE_BPS / 100}%</Badge>
          </div>
          <div className="space-y-3">
            <p className="editorial-eyebrow">Seller payouts for fellow Hoos</p>
            <h1 className="max-w-4xl font-display text-4xl font-extrabold tracking-[-0.04em] md:text-6xl md:leading-[0.95]">
              Onboard sellers, publish products, and route payouts through a clean Connect storefront.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              This sample keeps the platform in charge of pricing and fee collection while sellers onboard with Stripe,
              list products from the HoosFinds dashboard, and get paid through destination charges.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="#seller-tools">Open seller tools</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#storefront">
                View storefront
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="soft-panel p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-uva-orange/10 text-uva-orange">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="editorial-eyebrow">Onboarding</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Live Stripe recipient status is fetched directly from the API every time the page renders.
            </p>
          </div>
          <div className="soft-panel p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-uva-blue/10 text-uva-blue">
              <Store className="h-5 w-5" />
            </div>
            <p className="editorial-eyebrow">Products</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Products are created on the platform account and mapped back to each connected seller.
            </p>
          </div>
          <div className="soft-panel p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-uva-orange/10 text-uva-orange">
              <WalletCards className="h-5 w-5" />
            </div>
            <p className="editorial-eyebrow">Checkout</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Customers buy through hosted Checkout while the platform keeps an application fee on each payment.
            </p>
          </div>
        </div>
      </section>

      <ConnectDemoClient
        connectConfigured={connectConfigured}
        sellerState={sellerState}
        products={products}
        paymentSetup={paymentSetup}
        orderActivity={orderActivity}
        viewer={
          session?.user
            ? {
                id: session.user.id,
                name: session.user.name ?? null,
                email: session.user.email ?? null,
                username: session.user.username ?? null
              }
            : null
        }
        returnedAccountId={searchParams?.accountId ?? null}
        refreshRequested={searchParams?.refresh === "1"}
      />
    </div>
  );
}
