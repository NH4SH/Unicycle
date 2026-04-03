import { ListingModerationStatus, ListingStatus, OrderStatus, Prisma, TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { refundOrderPayment } from "@/lib/order-refunds";
import { notifyListingSold } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getStripe, getStripeWebhookSecret, isStripeWebhookConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

const WEBHOOK_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;

type ClaimedWebhookEvent =
  | {
      shouldProcess: false;
      duplicate: true;
    }
  | {
      shouldProcess: true;
      duplicate: false;
    };

type StripeWebhookEventRecord = {
  stripeEventId: string;
  processedAt: Date | null;
  processingStartedAt: Date | null;
};

type StripeWebhookEventClient = {
  create: (args: unknown) => Promise<unknown>;
  findUnique: (args: unknown) => Promise<StripeWebhookEventRecord | null>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
};

type WebhookResponse = {
  received: true;
  duplicate?: boolean;
  type?: string;
  ignored?: boolean;
  orphanedRefunded?: boolean;
  action?: string;
  expired?: boolean;
};

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getPaymentIntentId(value: string | Stripe.PaymentIntent | null): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

function getCheckoutSessionOrderId(session: Stripe.Checkout.Session) {
  return session.client_reference_id || session.metadata?.orderId || null;
}

function getCheckoutSessionReason(session: Stripe.Checkout.Session) {
  return `Checkout session ${session.id} no longer matched a live HoosFinds listing state.`;
}

function getStripeWebhookEventClient() {
  // The webhook event model exists in the schema, but some environments can lag
  // on generated Prisma types. Keep webhook idempotency intact without coupling
  // unrelated product work to a broader client-regeneration fix.
  return (prisma as typeof prisma & {
    stripeWebhookEvent: StripeWebhookEventClient;
  }).stripeWebhookEvent;
}

async function claimWebhookEvent(event: Stripe.Event): Promise<ClaimedWebhookEvent> {
  const now = new Date();
  const payload = toPrismaJson(event);
  const stripeWebhookEventClient = getStripeWebhookEventClient();

  try {
    await stripeWebhookEventClient.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload,
        processingStartedAt: now
      }
    });

    return {
      shouldProcess: true,
      duplicate: false
    };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  const existing = await stripeWebhookEventClient.findUnique({
    where: {
      stripeEventId: event.id
    }
  });

  if (!existing) {
    throw new Error("Stripe webhook event claim failed.");
  }

  if (existing.processedAt) {
    return {
      shouldProcess: false,
      duplicate: true
    };
  }

  const staleThreshold = new Date(Date.now() - WEBHOOK_PROCESSING_TIMEOUT_MS);
  const claimed = await stripeWebhookEventClient.updateMany({
    where: {
      stripeEventId: event.id,
      processedAt: null,
      OR: [
        {
          processingStartedAt: null
        },
        {
          processingStartedAt: {
            lt: staleThreshold
          }
        }
      ]
    },
    data: {
      eventType: event.type,
      payload,
      processingStartedAt: now,
      lastError: null
    }
  });

  if (claimed.count === 0) {
    return {
      shouldProcess: false,
      duplicate: true
    };
  }

  return {
    shouldProcess: true,
    duplicate: false
  };
}

async function markWebhookEventProcessed(eventId: string) {
  await getStripeWebhookEventClient().updateMany({
    where: {
      stripeEventId: eventId
    },
    data: {
      processedAt: new Date(),
      processingStartedAt: null,
      lastError: null
    }
  });
}

async function markWebhookEventFailed(eventId: string, error: unknown) {
  await getStripeWebhookEventClient().updateMany({
    where: {
      stripeEventId: eventId
    },
    data: {
      processingStartedAt: null,
      lastError: error instanceof Error ? error.message.slice(0, 1000) : "Stripe webhook processing failed."
    }
  });
}

async function refundOrphanedCheckoutSession(session: Stripe.Checkout.Session, reason: string) {
  const paymentIntentId = getPaymentIntentId(session.payment_intent);
  if (!paymentIntentId) {
    return;
  }

  const stripe = getStripe();
  await stripe.refunds.create({
    payment_intent: paymentIntentId,
    metadata: {
      checkoutSessionId: session.id,
      orderId: getCheckoutSessionOrderId(session) ?? "",
      reason
    }
  });
}

async function findOrderForSession(session: Stripe.Checkout.Session) {
  const orderId = getCheckoutSessionOrderId(session);
  if (orderId) {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId
      }
    });

    if (order) {
      return order;
    }
  }

  return prisma.order.findUnique({
    where: {
      stripeCheckoutSessionId: session.id
    }
  });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<WebhookResponse> {
  if (session.mode !== "payment" || session.payment_status !== "paid") {
    return {
      received: true,
      type: "checkout.session.completed",
      ignored: true
    };
  }

  const paymentIntentId = getPaymentIntentId(session.payment_intent);
  const order = await findOrderForSession(session);

  if (!order) {
    await refundOrphanedCheckoutSession(
      session,
      "HoosFinds no longer had a matching order record when Stripe reported the payment."
    );

    return {
      received: true,
      type: "checkout.session.completed",
      orphanedRefunded: true
    };
  }

  const now = new Date();
  const reconciliation = await prisma.$transaction(
    async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: {
          id: order.id
        },
        include: {
          listing: true,
          transaction: true
        }
      });

      if (!currentOrder) {
        return {
          action: "orphaned_refund" as const
        };
      }

      if (currentOrder.status === OrderStatus.REFUND_PENDING) {
        return {
          action: "refund_pending" as const
        };
      }

      if (currentOrder.status === OrderStatus.REFUNDED || currentOrder.stripeRefundId) {
        return {
          action: "already_refunded" as const
        };
      }

      const conflictingOrder = await tx.order.findFirst({
        where: {
          listingId: currentOrder.listingId,
          id: {
            not: currentOrder.id
          },
          status: {
            in: [OrderStatus.PAID, OrderStatus.REFUND_PENDING]
          }
        },
        select: {
          id: true
        }
      });

      const conflictingTransaction = await tx.transaction.findFirst({
        where: {
          listingId: currentOrder.listingId,
          orderId: {
            not: currentOrder.id
          },
          status: {
            in: [TransactionStatus.PENDING_CONFIRMATION, TransactionStatus.ISSUE_REPORTED, TransactionStatus.COMPLETED]
          }
        },
        select: {
          id: true
        }
      });

      let refundReason: string | null = null;
      if (conflictingOrder || conflictingTransaction) {
        refundReason = getCheckoutSessionReason(session);
      } else if (currentOrder.transaction?.status === TransactionStatus.CANCELLED) {
        refundReason = "This sale was already cancelled inside HoosFinds before Stripe finished reconciliation.";
      } else if (currentOrder.listing.moderationStatus !== ListingModerationStatus.VISIBLE) {
        refundReason = "This listing was hidden or removed before the payment could be finalized.";
      } else if (currentOrder.listing.status === ListingStatus.CANCELLED) {
        refundReason = "This listing was cancelled before the payment could be finalized.";
      } else if (
        currentOrder.listing.status !== ListingStatus.ACTIVE &&
        currentOrder.listing.soldToUserId &&
        currentOrder.listing.soldToUserId !== currentOrder.buyerId
      ) {
        refundReason = getCheckoutSessionReason(session);
      }

      await tx.checkoutReservation.deleteMany({
        where: {
          orderId: currentOrder.id
        }
      });

      await tx.order.update({
        where: {
          id: currentOrder.id
        },
        data: {
          status: OrderStatus.PAID,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId ?? currentOrder.stripePaymentIntentId,
          checkoutExpiresAt: null,
          paidAt: currentOrder.paidAt ?? now,
          refundFailureReason: null
        }
      });

      if (refundReason) {
        return {
          action: "refund" as const,
          refundReason,
          orderId: currentOrder.id
        };
      }

      let transaction = currentOrder.transaction;
      if (!transaction) {
        const conversation = await tx.conversation.findFirst({
          where: {
            listingId: currentOrder.listingId,
            buyerId: currentOrder.buyerId,
            sellerId: currentOrder.sellerId
          },
          select: {
            id: true
          }
        });

        transaction = await tx.transaction.create({
          data: {
            listingId: currentOrder.listingId,
            sellerId: currentOrder.sellerId,
            buyerId: currentOrder.buyerId,
            conversationId: conversation?.id ?? null,
            orderId: currentOrder.id,
            status: TransactionStatus.PENDING_CONFIRMATION,
            agreedPriceCents: currentOrder.amountCents
          }
        });
      }

      if (currentOrder.listing.status === ListingStatus.ACTIVE) {
        await tx.listing.update({
          where: {
            id: currentOrder.listingId
          },
          data: {
            status: ListingStatus.PENDING_CONFIRMATION,
            soldToUserId: currentOrder.buyerId
          }
        });
      }

      return {
        action: "processed" as const,
        orderId: currentOrder.id,
        transactionId: transaction.id
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );

  if (reconciliation.action === "refund" && reconciliation.orderId) {
    await refundOrderPayment({
      orderId: reconciliation.orderId,
      reason: reconciliation.refundReason,
      note: reconciliation.refundReason,
      listingStrategy: "preserve"
    });
  } else if (reconciliation.action === "orphaned_refund") {
    await refundOrphanedCheckoutSession(
      session,
      "HoosFinds lost the matching order during webhook reconciliation, so the payment was refunded."
    );
  } else if (reconciliation.action === "processed" && reconciliation.orderId) {
    try {
      await notifyListingSold(reconciliation.orderId);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[stripe/webhook] sale notification failed", error);
      }
    }
  }

  return {
    received: true,
    type: "checkout.session.completed",
    action: reconciliation.action
  };
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<WebhookResponse> {
  const order = await findOrderForSession(session);
  if (!order) {
    return {
      received: true,
      type: "checkout.session.expired",
      ignored: true
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.checkoutReservation.deleteMany({
      where: {
        orderId: order.id
      }
    });

    await tx.order.updateMany({
      where: {
        id: order.id,
        status: OrderStatus.CHECKOUT_CREATED
      },
      data: {
        status: OrderStatus.EXPIRED,
        checkoutExpiresAt: new Date()
      }
    });
  });

  return {
    received: true,
    type: "checkout.session.expired",
    expired: true
  };
}

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json(
      {
        message: "Stripe checkout webhooks are not configured."
      },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ message: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Invalid Stripe webhook signature."
      },
      { status: 400 }
    );
  }

  const claim = await claimWebhookEvent(event);
  if (!claim.shouldProcess) {
    return NextResponse.json({
      received: true,
      duplicate: claim.duplicate,
      type: event.type
    });
  }

  try {
    let response: WebhookResponse | null = null;

    switch (event.type) {
      case "checkout.session.completed":
        response = await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
        response = await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        response = {
          received: true,
          type: event.type,
          ignored: true
        };
        break;
    }

    await markWebhookEventProcessed(event.id);
    return NextResponse.json(response);
  } catch (error) {
    await markWebhookEventFailed(event.id, error);

    if (process.env.NODE_ENV !== "production") {
      console.error("[stripe/webhook]", error);
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Stripe webhook processing failed."
      },
      { status: 500 }
    );
  }
}
