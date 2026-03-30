import { NextResponse } from "next/server";

import { calculateApplicationFeeAmount, getConnectedAccountStatusFromStripe } from "@/lib/connect";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripeClient, isStripeConnectConfigured } from "@/lib/stripe";
import { connectCheckoutSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ message: "Sign in with your UVA email before starting checkout." }, { status: 401 });
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
  const parsed = connectCheckoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid checkout payload.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const product = await prisma.connectProduct.findUnique({
    where: { id: parsed.data.productId },
    include: {
      connectedAccount: true,
      owner: true
    }
  });

  if (!product || !product.active) {
    return NextResponse.json({ message: "That storefront product is no longer available." }, { status: 404 });
  }

  if (product.ownerUserId === session.user.id) {
    return NextResponse.json({ message: "You cannot purchase your own storefront product." }, { status: 400 });
  }

  const liveAccountStatus = await getConnectedAccountStatusFromStripe(product.connectedAccount.stripeAccountId).catch(
    () => null
  );

  if (!liveAccountStatus?.readyToReceivePayments) {
    return NextResponse.json(
      {
        message:
          "This seller still needs to finish Stripe onboarding before the sample storefront can route funds to them."
      },
      { status: 409 }
    );
  }

  const applicationFeeAmount = Math.min(product.priceCents - 1, calculateApplicationFeeAmount(product.priceCents));
  const origin = new URL(request.url).origin;
  const stripeClient = getStripeClient();

  try {
    // Hosted Checkout keeps the sample simple. The destination charge sends the
    // net funds to the connected account while the application fee stays on the
    // platform account.
    const checkoutSession = await stripeClient.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
      client_reference_id: product.id,
      success_url: `${origin}/connect-demo/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/connect-demo/cancel?productId=${product.id}`,
      payment_method_types: ["card"],
      metadata: {
        connectProductId: product.id,
        sellerId: product.ownerUserId,
        buyerId: session.user.id,
        connectedAccountId: product.connectedAccount.stripeAccountId
      },
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1
        }
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: product.connectedAccount.stripeAccountId
        }
      }
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Stripe could not start the Connect checkout session."
      },
      { status: 500 }
    );
  }
}
