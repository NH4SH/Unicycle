import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripeClient, isStripeConnectConfigured } from "@/lib/stripe";
import { connectProductSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Sign in before creating a Connect storefront product." }, { status: 401 });
  }

  if (!isStripeConnectConfigured()) {
    return NextResponse.json(
      {
        message:
          'Stripe Connect is not configured yet. Add STRIPE_SECRET_KEY to ".env" locally and to your deploy environment before trying again.'
      },
      { status: 503 }
    );
  }

  const payload = await request.json();
  const parsed = connectProductSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid product payload.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId: session.user.id }
  });

  if (!connectedAccount) {
    return NextResponse.json(
      { message: "Create your connected account before adding products to the storefront." },
      { status: 404 }
    );
  }

  const stripeClient = getStripeClient();

  try {
    const product = await stripeClient.products.create({
      name: parsed.data.name,
      description: parsed.data.description || undefined,
      images: parsed.data.imageUrl ? [parsed.data.imageUrl] : undefined,
      metadata: {
        connectedAccountId: connectedAccount.stripeAccountId,
        ownerUserId: session.user.id
      },
      default_price_data: {
        unit_amount: parsed.data.priceInCents,
        currency: parsed.data.currency
      }
    });

    const stripePriceId =
      typeof product.default_price === "string" ? product.default_price : product.default_price?.id || null;

    if (!stripePriceId) {
      return NextResponse.json(
        {
          message:
            "Stripe created the product but did not return a default price. Check the request parameters and try again."
        },
        { status: 500 }
      );
    }

    const createdProduct = await prisma.connectProduct.create({
      data: {
        ownerUserId: session.user.id,
        connectedAccountId: connectedAccount.id,
        stripeProductId: product.id,
        stripePriceId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        imageUrl: parsed.data.imageUrl || null,
        priceCents: parsed.data.priceInCents,
        currency: parsed.data.currency
      }
    });

    return NextResponse.json({
      id: createdProduct.id,
      stripeProductId: createdProduct.stripeProductId,
      stripePriceId: createdProduct.stripePriceId
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Stripe could not create the storefront product."
      },
      { status: 500 }
    );
  }
}
