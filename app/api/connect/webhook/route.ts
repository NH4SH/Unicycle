import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getConnectedAccountStatusFromStripe } from "@/lib/connect";
import {
  getStripeClient,
  getStripeConnectWebhookSecret,
  isStripeConnectWebhookConfigured
} from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConnectWebhookConfigured()) {
    return NextResponse.json(
      {
        message:
          'Stripe Connect webhooks are not configured yet. Add STRIPE_CONNECT_WEBHOOK_SECRET before testing thin connected-account events.'
      },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ message: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();
  const stripeClient = getStripeClient();

  let eventNotification: Stripe.V2.Core.EventNotification;

  try {
    // Stripe's current SDK exposes parseEventNotification for thin events. It
    // validates the signature and returns an EventNotification helper that can
    // fetch the full event payload on demand.
    eventNotification = stripeClient.parseEventNotification(body, signature, getStripeConnectWebhookSecret());
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid Stripe Connect webhook signature."
      },
      { status: 400 }
    );
  }

  // fetchEvent() is the SDK-friendly version of retrieving the full event after
  // parsing a thin notification. That keeps our handler aligned with Stripe's
  // thin-event flow while still giving us the real event type to branch on.
  const event = await eventNotification.fetchEvent();

  switch (event.type) {
    case "v2.core.account[requirements].updated": {
      const latestStatus = await getConnectedAccountStatusFromStripe(event.related_object.id);

      // We intentionally do not persist onboarding status. The UI
      // always asks Stripe for the latest status directly. This handler exists
      // so requirement changes are acknowledged and ready for future alerts.
      return NextResponse.json({
        received: true,
        type: event.type,
        stripeAccountId: event.related_object.id,
        requirementsStatus: latestStatus.requirementsStatus,
        readyToReceivePayments: latestStatus.readyToReceivePayments
      });
    }
    case "v2.core.account[configuration.recipient].capability_status_updated": {
      const latestStatus = await getConnectedAccountStatusFromStripe(event.related_object.id);

      return NextResponse.json({
        received: true,
        type: event.type,
        stripeAccountId: event.related_object.id,
        transferCapabilityStatus: latestStatus.transferCapabilityStatus,
        readyToReceivePayments: latestStatus.readyToReceivePayments
      });
    }
    default:
      return NextResponse.json({ received: true, type: event.type, ignored: true });
  }
}
