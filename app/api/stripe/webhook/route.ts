import { ListingStatus, OrderStatus, TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { getStripe, isStripeWebhookConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json({ message: "Stripe webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ message: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch {
    return NextResponse.json({ message: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId || session.client_reference_id;

    if (orderId && session.payment_status === "paid") {
      // Canonical checkout now runs entirely through marketplace listings, so
      // the webhook only updates Order, Transaction, and Listing records.
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId }
        });

        if (!order) {
          return;
        }

        const paidOrder =
          order.status === OrderStatus.PAID
            ? order
            : await tx.order.update({
                where: { id: order.id },
                data: {
                  status: OrderStatus.PAID,
                  stripeCheckoutSessionId: session.id,
                  checkoutExpiresAt: null,
                  stripePaymentIntentId:
                    typeof session.payment_intent === "string" ? session.payment_intent : order.stripePaymentIntentId
                }
              });

        const existingTransaction = await tx.transaction.findUnique({
          where: {
            orderId: paidOrder.id
          }
        });

        if (!existingTransaction) {
          await tx.transaction.create({
            data: {
              listingId: paidOrder.listingId,
              sellerId: paidOrder.sellerId,
              buyerId: paidOrder.buyerId,
              orderId: paidOrder.id,
              status: TransactionStatus.PENDING_CONFIRMATION,
              agreedPriceCents: paidOrder.amountCents,
              sellerMarkedSoldAt: new Date()
            }
          });
        }

        const listing = await tx.listing.findUnique({
          where: {
            id: order.listingId
          },
          select: {
            status: true
          }
        });

        if (listing?.status === ListingStatus.ACTIVE) {
          await tx.listing.update({
            where: { id: paidOrder.listingId },
            data: {
              status: ListingStatus.PENDING_CONFIRMATION,
              soldToUserId: paidOrder.buyerId
            }
          });
        }
      });
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId || session.client_reference_id;

    if (orderId) {
      await prisma.order.updateMany({
        where: {
          id: orderId,
          status: OrderStatus.CHECKOUT_CREATED
        },
        data: {
          status: OrderStatus.EXPIRED,
          stripeCheckoutSessionId: session.id,
          checkoutExpiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined
        }
      });
    }
  }

  return NextResponse.json({ received: true });
}
