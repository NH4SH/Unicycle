import { ListingStatus, OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeCheckoutEnabled } from "@/lib/stripe";
import { checkoutSessionSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeCheckoutEnabled()) {
    return NextResponse.json({ message: "Stripe checkout is not configured." }, { status: 503 });
  }

  const payload = await request.json();
  const parsed = checkoutSessionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid checkout payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listingId },
    include: {
      orders: {
        where: {
          status: OrderStatus.PAID
        }
      }
    }
  });

  if (!listing) {
    return NextResponse.json({ message: "Listing not found" }, { status: 404 });
  }

  if (listing.status !== ListingStatus.ACTIVE || listing.orders.length > 0) {
    return NextResponse.json({ message: "This item is no longer available for checkout." }, { status: 409 });
  }

  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ message: "You cannot checkout your own listing." }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      listingId: listing.id,
      buyerId: session.user.id,
      sellerId: listing.sellerId,
      amountCents: listing.priceCents
    }
  });

  const origin = new URL(request.url).origin;
  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: order.id,
    customer_email: session.user.email,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel?listingId=${listing.id}`,
    payment_method_types: ["card"],
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: {
      orderId: order.id,
      listingId: listing.id,
      buyerId: session.user.id,
      sellerId: listing.sellerId
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: listing.priceCents,
          product_data: {
            name: listing.title,
            description: listing.description.slice(0, 160)
          }
        }
      }
    ]
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      stripeCheckoutSessionId: checkoutSession.id
    }
  });

  return NextResponse.json({ url: checkoutSession.url, orderId: order.id });
}
