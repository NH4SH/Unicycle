import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-url";
import {
  attachCheckoutSessionToOrder,
  getCheckoutReviewData,
  releaseCheckoutOrderHold,
  reserveCheckoutOrder
} from "@/lib/listing-checkout";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeCheckoutEnabled } from "@/lib/stripe";
import { checkoutSessionSchema } from "@/lib/validators";

function getIssueMessage(issue: string) {
  return issue === "listing_inactive" || issue === "already_paid"
    ? "This item is no longer available for checkout."
    : issue === "own_listing"
      ? "You cannot checkout your own listing."
      : issue === "checkout_in_progress"
        ? "Another secure checkout is already in progress for this item. Please try again in a few minutes."
        : issue === "seller_payouts_reconnect_required"
          ? "This seller needs to reconnect payouts before HoosFinds can process checkout."
          : issue === "seller_payouts_incomplete"
            ? "This seller still needs to finish payout setup before HoosFinds can process checkout."
            : "This checkout is no longer available.";
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const buyerId = session.user.id;
  const buyerEmail = session.user.email;

  if (!session.user.canBuy) {
    return NextResponse.json({ message: "Buying on HoosFinds stays exclusive to UVA students." }, { status: 403 });
  }

  try {
    await assertUserCanAccessMarketplace(buyerId);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot use checkout right now." },
      { status: 403 }
    );
  }

  if (!isStripeCheckoutEnabled()) {
    return NextResponse.json({ message: "Stripe checkout is not configured." }, { status: 503 });
  }

  const payload = await request.json();
  const parsed = checkoutSessionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid checkout payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const review = await getCheckoutReviewData(parsed.data.listingId, buyerId);
  if (!review.listing || !review.pricing) {
    return NextResponse.json({ message: "Listing not found" }, { status: 404 });
  }

  if (review.issue) {
    const issueMessage =
      review.issue === "listing_inactive" || review.issue === "already_paid"
        ? "This item is no longer available for checkout."
        : review.issue === "own_listing"
          ? "You cannot checkout your own listing."
          : review.issue === "checkout_in_progress"
            ? "Another secure checkout is already in progress for this item. Please try again in a few minutes."
            : review.issue === "seller_payouts_reconnect_required"
              ? "This seller needs to reconnect payouts before HoosFinds can process checkout."
              : "This seller still needs to finish payout setup before HoosFinds can process checkout.";

    return NextResponse.json({ message: issueMessage }, { status: review.issue === "own_listing" ? 400 : 409 });
  }

  const stripe = getStripe();
  const listing = review.listing;
  const pricing = review.pricing;
  const sellerPayoutState = review.payoutState!;

  async function reserveOrder() {
    return reserveCheckoutOrder({
      listingId: listing.id,
      buyerId,
      sellerId: listing.seller.id,
      pricing
    });
  }

  let reservation = await reserveOrder();
  if (reservation.issue) {
    return NextResponse.json(
      { message: getIssueMessage(reservation.issue) },
      { status: reservation.issue === "own_listing" ? 400 : 409 }
    );
  }

  if (reservation.reusableOrderId) {
    const reusableOrder = await prisma.order.findUnique({
      where: { id: reservation.reusableOrderId }
    });

    if (
      reusableOrder?.stripeCheckoutSessionId &&
      reusableOrder.checkoutExpiresAt &&
      reusableOrder.checkoutExpiresAt.getTime() > Date.now()
    ) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(reusableOrder.stripeCheckoutSessionId);
        if (existingSession.status === "open" && existingSession.url) {
          return NextResponse.json({ url: existingSession.url, orderId: reusableOrder.id });
        }

        await releaseCheckoutOrderHold(reusableOrder.id, OrderStatus.EXPIRED);
      } catch {
        await releaseCheckoutOrderHold(reusableOrder.id, OrderStatus.FAILED);
      }
    } else if (reusableOrder) {
      await releaseCheckoutOrderHold(reusableOrder.id, OrderStatus.FAILED);
    }

    reservation = await reserveOrder();
    if (reservation.issue || !reservation.orderId) {
      return NextResponse.json(
        { message: getIssueMessage(reservation.issue ?? "checkout_in_progress") },
        { status: reservation.issue === "own_listing" ? 400 : 409 }
      );
    }
  }

  if (!reservation.orderId || !reservation.checkoutExpiresAt) {
    return NextResponse.json({ message: "Could not reserve checkout for this listing." }, { status: 409 });
  }

  const origin = getAppOrigin(request);
  const expiresAt = Math.floor(reservation.checkoutExpiresAt.getTime() / 1000);

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: reservation.orderId,
      customer_email: buyerEmail,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?listingId=${listing.id}`,
      payment_method_types: ["card"],
      expires_at: expiresAt,
      metadata: {
        orderId: reservation.orderId,
        listingId: listing.id,
        buyerId,
        sellerId: listing.seller.id,
        connectedAccountId: sellerPayoutState.connectedAccount!.stripeAccountId,
        listingPriceCents: String(pricing.listingPriceCents),
        buyerPercentFeeCents: String(pricing.buyerPercentFeeCents),
        buyerFlatFeeCents: String(pricing.buyerFlatFeeCents),
        buyerFeeTotalCents: String(pricing.buyerFeeTotalCents),
        taxAmountCents: String(pricing.taxAmountCents),
        buyerTotalCents: String(pricing.buyerTotalCents),
        sellerFeeCents: String(pricing.sellerFeeCents),
        stripeFeeCents: String(pricing.stripeFeeCents),
        perOrderFeeCents: String(pricing.perOrderFeeCents),
        sellerPayoutCents: String(pricing.sellerPayoutCents),
        applicationFeeCents: String(pricing.applicationFeeCents)
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pricing.listingPriceCents,
            product_data: {
              name: listing.title,
              description: listing.description.slice(0, 160)
            }
          }
        },
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pricing.buyerFeeTotalCents,
            product_data: {
              name: "HoosFinds fee"
            }
          }
        },
        ...(pricing.taxAmountCents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: pricing.taxAmountCents,
                  product_data: {
                    name: "Sales tax"
                  }
                }
              }
            ]
          : [])
      ],
      payment_intent_data: {
        application_fee_amount: pricing.applicationFeeCents,
        transfer_data: {
          destination: sellerPayoutState.connectedAccount!.stripeAccountId
        }
      }
    });

    await attachCheckoutSessionToOrder({
      orderId: reservation.orderId,
      checkoutSessionId: checkoutSession.id,
      checkoutExpiresAt: new Date(expiresAt * 1000)
    });

    return NextResponse.json({ url: checkoutSession.url, orderId: reservation.orderId });
  } catch (error) {
    await releaseCheckoutOrderHold(reservation.orderId, OrderStatus.FAILED);

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not start Stripe checkout."
      },
      { status: 500 }
    );
  }
}
