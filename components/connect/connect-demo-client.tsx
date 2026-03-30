"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Store,
  WalletCards
} from "lucide-react";
import { toast } from "sonner";

import type { ConnectSellerState, ConnectStorefrontProduct } from "@/lib/connect";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80";

type Viewer = {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
};

type ConnectDemoClientProps = {
  connectConfigured: boolean;
  sellerState: ConnectSellerState;
  products: ConnectStorefrontProduct[];
  viewer: Viewer | null;
  returnedAccountId: string | null;
  refreshRequested: boolean;
};

function getStatusBadge(snapshot: ConnectSellerState["stripeStatus"]) {
  if (!snapshot) {
    return { label: "Not onboarded yet", variant: "outline" as const };
  }

  if (snapshot.readyToReceivePayments) {
    return { label: "Ready to receive payouts", variant: "orange" as const };
  }

  if (snapshot.onboardingComplete) {
    return { label: "Pending capability activation", variant: "blue" as const };
  }

  return { label: "More onboarding details needed", variant: "outline" as const };
}

export function ConnectDemoClient({
  connectConfigured,
  sellerState,
  products,
  viewer,
  returnedAccountId,
  refreshRequested
}: ConnectDemoClientProps) {
  const router = useRouter();
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [startingOnboarding, setStartingOnboarding] = useState(false);
  const [checkoutProductId, setCheckoutProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: "Vintage UVA quarter-zip",
    description: "Clean campus layer with easy game day energy and a quick Newcomb pickup.",
    price: "68",
    imageUrl: FALLBACK_PRODUCT_IMAGE
  });

  const sellerStatus = useMemo(() => getStatusBadge(sellerState.stripeStatus), [sellerState.stripeStatus]);

  async function createConnectedAccount() {
    if (!viewer) {
      router.push("/sign-in?callbackUrl=%2Fconnect-demo");
      return;
    }

    if (!connectConfigured) {
      toast.error("Stripe Connect is not configured yet. Add STRIPE_SECRET_KEY first.");
      return;
    }

    setCreatingAccount(true);

    try {
      // This calls the sample API route, which creates a V2 recipient account
      // and stores only the user-to-account mapping in Prisma.
      const response = await fetch("/api/connect/account", {
        method: "POST"
      });

      const data = (await response.json().catch(() => null)) as { message?: string; created?: boolean } | null;

      if (!response.ok) {
        toast.error(data?.message || "Could not create the connected account.");
        return;
      }

      toast.success(data?.created ? "Connected account created." : "Connected account already exists.");
      router.refresh();
    } finally {
      setCreatingAccount(false);
    }
  }

  async function startOnboarding() {
    if (!viewer) {
      router.push("/sign-in?callbackUrl=%2Fconnect-demo");
      return;
    }

    setStartingOnboarding(true);

    try {
      // The onboarding route creates a fresh Stripe Account Link so sellers can
      // always continue or re-enter hosted onboarding with a single click.
      const response = await fetch("/api/connect/account/onboarding", {
        method: "POST"
      });
      const data = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;

      if (!response.ok || !data?.url) {
        toast.error(data?.message || "Could not start Stripe onboarding.");
        return;
      }

      window.location.href = data.url;
    } finally {
      setStartingOnboarding(false);
    }
  }

  async function createStoreProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!viewer) {
      router.push("/sign-in?callbackUrl=%2Fconnect-demo");
      return;
    }

    const priceInDollars = Number(productForm.price);
    const priceInCents = Math.round(priceInDollars * 100);
    if (!Number.isFinite(priceInCents) || priceInCents < 100) {
      toast.error("Enter a price of at least $1.00.");
      return;
    }

    setCreatingProduct(true);

    try {
      const response = await fetch("/api/connect/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description,
          imageUrl: productForm.imageUrl,
          priceInCents,
          currency: "usd"
        })
      });

      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        toast.error(data?.message || "Could not create the storefront product.");
        return;
      }

      toast.success("Product created on the platform account.");
      setProductForm((current) => ({
        ...current,
        name: "",
        description: "",
        price: "",
        imageUrl: current.imageUrl
      }));
      router.refresh();
    } finally {
      setCreatingProduct(false);
    }
  }

  async function startCheckout(productId: string) {
    if (!viewer) {
      router.push("/sign-in?callbackUrl=%2Fconnect-demo");
      return;
    }

    setCheckoutProductId(productId);

    try {
      // Hosted Checkout keeps the customer purchase flow simple. The API route
      // builds the destination charge and sends back the Checkout URL.
      const response = await fetch("/api/connect/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });

      const data = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;

      if (!response.ok || !data?.url) {
        toast.error(data?.message || "Could not start Stripe Checkout.");
        return;
      }

      window.location.href = data.url;
    } finally {
      setCheckoutProductId(null);
    }
  }

  return (
    <div className="space-y-10">
      {!connectConfigured ? (
        <Card className="overflow-hidden border-uva-orange/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(229,114,0,0.08))]">
          <CardContent className="space-y-4 p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="orange">Config needed</Badge>
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-uva-orange" />
                Add your Stripe keys before testing the Connect sample end to end.
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="surface-subtle p-4">
                <p className="editorial-eyebrow">Required env vars</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Add <code>STRIPE_SECRET_KEY</code> for API requests and <code>STRIPE_CONNECT_WEBHOOK_SECRET</code>{" "}
                  for thin connected-account events.
                </p>
              </div>
              <div className="surface-subtle p-4">
                <p className="editorial-eyebrow">Thin webhook route</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  The sample listens on <code>/api/connect/webhook</code> for recipient requirement and capability
                  updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(returnedAccountId || refreshRequested) && sellerState.connectedAccount ? (
        <div className="flex flex-wrap gap-2">
          {returnedAccountId ? <Badge variant="orange">Returned from Stripe onboarding</Badge> : null}
          {refreshRequested ? <Badge variant="blue">Stripe requested a fresh onboarding link</Badge> : null}
        </div>
      ) : null}

      <section id="seller-tools" className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr] xl:items-start">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="surface-panel-strong overflow-hidden p-6 md:p-7"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="editorial-eyebrow">Seller tools</p>
                <h2 className="font-display text-3xl font-extrabold tracking-tight">Collect payments with Stripe Connect</h2>
                <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                  Create your connected account once, onboard in Stripe, then add platform-level products that route payouts
                  back to you.
                </p>
              </div>
              <Badge variant={sellerStatus.variant}>{sellerStatus.label}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="surface-subtle p-4">
                <p className="editorial-eyebrow">Connected account</p>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {sellerState.connectedAccount ? sellerState.connectedAccount.stripeAccountId : "Not created yet"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  We only store the Stripe account ID locally. Readiness and requirements always come from Stripe live.
                </p>
              </div>
              <div className="surface-subtle p-4">
                <p className="editorial-eyebrow">Recipient capability</p>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {sellerState.stripeStatus?.transferCapabilityStatus || "Waiting on Stripe"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This is the exact capability that determines whether destination charges can transfer funds out.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="surface-subtle p-4">
                <p className="editorial-eyebrow">Requirements summary</p>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {sellerState.stripeStatus?.requirementsStatus || "No requirements returned yet"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  If this says <span className="font-medium text-foreground">currently_due</span> or{" "}
                  <span className="font-medium text-foreground">past_due</span>, Stripe still needs more seller details.
                </p>
              </div>
              <div className="surface-subtle p-4">
                <p className="editorial-eyebrow">What this demo proves</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  HoosFinds can onboard sellers, create platform-owned products, and charge customers while routing payouts
                  to connected accounts with an application fee.
                </p>
              </div>
            </div>

            {viewer ? (
              <div className="flex flex-wrap gap-3">
                {!sellerState.connectedAccount ? (
                  <Button onClick={createConnectedAccount} disabled={creatingAccount || !connectConfigured}>
                    {creatingAccount ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Store className="mr-1.5 h-4 w-4" />}
                    {creatingAccount ? "Creating account..." : "Create connected account"}
                  </Button>
                ) : (
                  <Button onClick={startOnboarding} disabled={startingOnboarding || !connectConfigured}>
                    {startingOnboarding ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                    )}
                    {startingOnboarding ? "Opening Stripe..." : "Onboard to collect payments"}
                  </Button>
                )}
                <Button asChild variant="secondary">
                  <Link href="#storefront">
                    See customer storefront
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="surface-subtle flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Sign in to test the seller flow</p>
                  <p className="text-sm text-muted-foreground">Use a UVA email so the demo can create the Stripe account mapping.</p>
                </div>
                <Button asChild>
                  <Link href="/sign-in?callbackUrl=%2Fconnect-demo">Sign in</Link>
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
          onSubmit={createStoreProduct}
          className="surface-panel-strong overflow-hidden p-6 md:p-7"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="editorial-eyebrow">Product creation</p>
              <h2 className="font-display text-3xl font-extrabold tracking-tight">Create a platform product for the storefront</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                This form creates the Stripe product on the platform account, stores the default price ID, and records the
                connected-account mapping in Prisma for later destination charges.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-foreground">
                Product name
                <Input
                  value={productForm.name}
                  onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Game day varsity jacket"
                  disabled={!viewer || !sellerState.connectedAccount || creatingProduct}
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-foreground">
                Price in USD
                <Input
                  value={productForm.price}
                  onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                  inputMode="decimal"
                  placeholder="68"
                  disabled={!viewer || !sellerState.connectedAccount || creatingProduct}
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Description
              <Textarea
                value={productForm.description}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Vintage-feel campus layer with a clean fit and easy pickup near Newcomb."
                disabled={!viewer || !sellerState.connectedAccount || creatingProduct}
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Image URL
              <Input
                value={productForm.imageUrl}
                onChange={(event) => setProductForm((current) => ({ ...current, imageUrl: event.target.value }))}
                placeholder="https://example.com/product.jpg"
                disabled={!viewer || !sellerState.connectedAccount || creatingProduct}
              />
            </label>

            <div className="surface-subtle flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Before you publish</p>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  You can create sample products as soon as the connected account exists. The buy button stays blocked until
                  Stripe says the recipient account can receive transfers.
                </p>
              </div>
              <Badge variant="outline">Platform-owned products</Badge>
            </div>

            <Button type="submit" disabled={!viewer || !sellerState.connectedAccount || creatingProduct} className="w-full sm:w-auto">
              {creatingProduct ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Store className="mr-1.5 h-4 w-4" />}
              {creatingProduct ? "Creating product..." : "Create sample product"}
            </Button>
          </div>
        </motion.form>
      </section>

      <section id="storefront" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="editorial-eyebrow">Customer storefront</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Products from every connected seller</h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Each card below is a platform product tied to a connected account. Customers check out through Stripe, and the
              platform fee is collected automatically on the destination charge.
            </p>
          </div>
          <div className="surface-pill px-4 py-2 text-sm">{products.length} live demo product{products.length === 1 ? "" : "s"}</div>
        </div>

        {products.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const productReady = Boolean(product.status?.readyToReceivePayments);
              const isCheckingOut = checkoutProductId === product.id;

              return (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 250, damping: 22 }}
                  className="surface-panel-strong overflow-hidden"
                >
                  <div className="relative aspect-[4/4.8] overflow-hidden">
                    <Image
                      src={product.imageUrl || FALLBACK_PRODUCT_IMAGE}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-white/80 bg-white/88 backdrop-blur">Platform product</Badge>
                      <Badge variant={productReady ? "orange" : "blue"} className="bg-white/88 text-foreground backdrop-blur">
                        {productReady ? "Seller ready" : "Needs onboarding"}
                      </Badge>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="font-display text-2xl font-extrabold leading-tight">{product.name}</p>
                      <p className="mt-2 text-sm text-white/85">{formatCurrency(product.priceCents / 100)}</p>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={product.seller.image ?? undefined} alt={product.seller.name ?? product.seller.username} />
                        <AvatarFallback>{product.seller.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{product.seller.name || product.seller.username}</p>
                        <p className="text-xs text-muted-foreground">@{product.seller.username}</p>
                      </div>
                    </div>

                    <p className="text-sm leading-7 text-muted-foreground">
                      {product.description || "A sample Connect storefront product for testing hosted checkout and seller payouts."}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="surface-subtle p-3">
                        <p className="editorial-eyebrow">Connected account</p>
                        <p className="mt-2 text-xs leading-6 text-muted-foreground">{product.connectedAccount.stripeAccountId}</p>
                      </div>
                      <div className="surface-subtle p-3">
                        <p className="editorial-eyebrow">Transfer readiness</p>
                        <p className="mt-2 text-xs leading-6 text-muted-foreground">
                          {product.status?.transferCapabilityStatus || "Waiting on Stripe"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {product.isOwnedByViewer ? <Badge variant="outline">Your product</Badge> : null}
                      {product.status?.requirementsStatus ? <Badge variant="blue">{product.status.requirementsStatus}</Badge> : null}
                      <Badge variant="outline">Destination charge</Badge>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => startCheckout(product.id)}
                      disabled={isCheckingOut || product.isOwnedByViewer || !productReady || !connectConfigured}
                    >
                      {isCheckingOut ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : product.isOwnedByViewer ? (
                        <ShieldCheck className="mr-1.5 h-4 w-4" />
                      ) : (
                        <WalletCards className="mr-1.5 h-4 w-4" />
                      )}
                      {product.isOwnedByViewer
                        ? "Unavailable on your own product"
                        : !productReady
                          ? "Seller onboarding incomplete"
                          : isCheckingOut
                            ? "Redirecting to Stripe..."
                            : "Buy with Stripe Checkout"}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="surface-panel-dashed border-dashed bg-transparent shadow-none">
            <CardContent className="space-y-4 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-uva-blue/10 text-uva-blue">
                <Store className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-2xl font-extrabold tracking-tight">No Connect products yet</h3>
                <p className="mx-auto max-w-xl text-sm leading-7 text-muted-foreground">
                  Create a connected account, finish Stripe onboarding, and publish a sample product to see the hosted
                  storefront and destination-charge checkout in action.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
