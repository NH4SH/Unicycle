import "server-only";

import { HandoffStatus, ListingStatus, OrderStatus, TransactionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { createTrustEvent } from "@/lib/trust-signals";
import { type TrustEventTypeValue } from "@/lib/trust-types";

type RefundListingStrategy = "cancel" | "preserve";

type RefundOrderPaymentInput = {
  orderId: string;
  initiatedByUserId?: string;
  reason: string;
  note?: string;
  listingStrategy?: RefundListingStrategy;
  trustEventType?: TrustEventTypeValue;
  trustUserId?: string;
};

export async function refundOrderPayment(input: RefundOrderPaymentInput) {
  const order = await prisma.order.findUnique({
    where: {
      id: input.orderId
    },
    include: {
      transaction: true,
      listing: true
    }
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.status === OrderStatus.REFUNDED || order.stripeRefundId) {
    return {
      alreadyRefunded: true as const,
      order
    };
  }

  if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.REFUND_PENDING) {
    throw new Error("Only paid orders can be refunded.");
  }

  if (!order.stripePaymentIntentId) {
    throw new Error("This paid order is missing its Stripe payment intent.");
  }

  let claimedForRefund = false;
  if (order.status === OrderStatus.PAID) {
    const claim = await prisma.order.updateMany({
      where: {
        id: order.id,
        status: OrderStatus.PAID,
        stripeRefundId: null
      },
      data: {
        status: OrderStatus.REFUND_PENDING,
        refundReason: input.reason,
        refundRequestedById: input.initiatedByUserId ?? null,
        refundFailureReason: null
      }
    });

    if (claim.count === 0) {
      const refreshed = await prisma.order.findUnique({
        where: { id: order.id }
      });

      if (refreshed?.status === OrderStatus.REFUNDED || refreshed?.stripeRefundId) {
        return {
          alreadyRefunded: true as const,
          order: refreshed
        };
      }

      throw new Error("A refund is already being processed for this order.");
    }

    claimedForRefund = true;
  }

  try {
    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      metadata: {
        orderId: order.id,
        listingId: order.listingId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        reason: input.reason
      }
    });

    await prisma.$transaction(async (tx) => {
      await tx.checkoutReservation.deleteMany({
        where: {
          orderId: order.id
        }
      });

      await tx.order.update({
        where: {
          id: order.id
        },
        data: {
          status: OrderStatus.REFUNDED,
          stripeRefundId: refund.id,
          refundedAt: new Date(),
          refundReason: input.reason,
          refundRequestedById: input.initiatedByUserId ?? order.refundRequestedById ?? null,
          refundFailureReason: null
        }
      });

      if (order.transaction) {
        await tx.transaction.update({
          where: {
            id: order.transaction.id
          },
          data: {
            status: TransactionStatus.CANCELLED,
            handoffStatus: HandoffStatus.CANCELLED
          }
        });
      }

      if (input.listingStrategy !== "preserve") {
        await tx.listing.update({
          where: {
            id: order.listingId
          },
          data: {
            status: ListingStatus.CANCELLED,
            soldToUserId: null
          }
        });
      }
    });

    if (input.trustEventType) {
      try {
        await createTrustEvent({
          userId: input.trustUserId ?? order.sellerId,
          type: input.trustEventType,
          description: input.note ?? input.reason,
          orderId: order.id,
          transactionId: order.transaction?.id,
          listingId: order.listingId,
          metadata: {
            refundId: refund.id,
            reason: input.reason,
            initiatedByUserId: input.initiatedByUserId ?? null,
            listingStrategy: input.listingStrategy ?? "cancel"
          }
        });
      } catch (trustEventError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[order-refunds] refund succeeded but trust event logging failed", trustEventError);
        }
      }
    }

    return {
      alreadyRefunded: false as const,
      refundId: refund.id
    };
  } catch (error) {
    if (claimedForRefund) {
      await prisma.order.updateMany({
        where: {
          id: order.id,
          status: OrderStatus.REFUND_PENDING,
          stripeRefundId: null
        },
        data: {
          status: OrderStatus.PAID,
          refundFailureReason: error instanceof Error ? error.message : "Refund could not be created."
        }
      });
    }

    throw error;
  }
}
