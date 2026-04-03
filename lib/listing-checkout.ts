import { ListingModerationStatus, ListingStatus, OrderStatus, Prisma } from "@prisma/client";

import { calculateCheckoutPricing, type CheckoutPricingBreakdown } from "@/lib/checkout-pricing";
import { prisma } from "@/lib/prisma";
import { publicUserSummarySelect, toPublicUserSummary, type PublicUserSummary } from "@/lib/public-user";
import { getSellerPayoutState, type SellerPayoutState } from "@/lib/seller-payouts";

export const CHECKOUT_HOLD_DURATION_MINUTES = 30;
export const CHECKOUT_HOLD_DURATION_MS = CHECKOUT_HOLD_DURATION_MINUTES * 60 * 1000;

export type CheckoutAvailabilityIssue =
  | "listing_not_found"
  | "listing_inactive"
  | "already_paid"
  | "checkout_in_progress"
  | "own_listing"
  | "seller_payouts_incomplete"
  | "seller_payouts_reconnect_required";

export type CheckoutReviewListing = {
  id: string;
  title: string;
  description: string;
  images: string[];
  priceCents: number;
  status: ListingStatus;
  seller: PublicUserSummary;
};

export type CheckoutReviewData = {
  listing: CheckoutReviewListing | null;
  pricing: CheckoutPricingBreakdown | null;
  payoutState: SellerPayoutState | null;
  issue: CheckoutAvailabilityIssue | null;
  reusableOrderId: string | null;
  activeCheckoutOrderBuyerId: string | null;
};

const checkoutOrderSelect = {
  id: true,
  buyerId: true,
  status: true,
  stripeCheckoutSessionId: true,
  checkoutExpiresAt: true
} satisfies Prisma.OrderSelect;

const checkoutReservationSelect = {
  id: true,
  buyerId: true,
  orderId: true,
  stripeCheckoutSessionId: true,
  expiresAt: true
} satisfies Prisma.CheckoutReservationSelect;

function hasActiveCheckoutHold(order: Prisma.OrderGetPayload<{ select: typeof checkoutOrderSelect }>) {
  if (order.status !== OrderStatus.CHECKOUT_CREATED) {
    return false;
  }

  return Boolean(order.checkoutExpiresAt && order.checkoutExpiresAt.getTime() > Date.now());
}

function fromJsonArray(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function isActiveReservation(
  reservation: Prisma.CheckoutReservationGetPayload<{ select: typeof checkoutReservationSelect }> | null | undefined
) {
  return Boolean(reservation && reservation.expiresAt.getTime() > Date.now());
}

export type ReserveCheckoutOrderInput = {
  listingId: string;
  buyerId: string;
  sellerId: string;
  pricing: CheckoutPricingBreakdown;
};

export type ReserveCheckoutOrderResult = {
  issue: CheckoutAvailabilityIssue | null;
  orderId: string | null;
  reusableOrderId: string | null;
  reusableSessionId: string | null;
  checkoutExpiresAt: Date | null;
};

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function expireReservationAndOrder(tx: Prisma.TransactionClient, reservationId: string, orderId: string, expiresAt: Date) {
  await tx.checkoutReservation.deleteMany({
    where: {
      id: reservationId
    }
  });

  await tx.order.updateMany({
    where: {
      id: orderId,
      status: OrderStatus.CHECKOUT_CREATED
    },
    data: {
      status: OrderStatus.EXPIRED,
      checkoutExpiresAt: expiresAt
    }
  });
}

export async function reserveCheckoutOrder(input: ReserveCheckoutOrderInput): Promise<ReserveCheckoutOrderResult> {
  const expiresAt = new Date(Date.now() + CHECKOUT_HOLD_DURATION_MS);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const listing = await tx.listing.findUnique({
          where: { id: input.listingId },
          select: {
            id: true,
            sellerId: true,
            status: true,
            moderationStatus: true,
            orders: {
              where: {
                status: {
                  in: [OrderStatus.PAID, OrderStatus.REFUND_PENDING]
                }
              },
              select: {
                id: true
              },
              take: 1
            },
            checkoutReservation: {
              select: checkoutReservationSelect
            }
          }
        });

        if (!listing) {
          return {
            issue: "listing_not_found",
            orderId: null,
            reusableOrderId: null,
            reusableSessionId: null,
            checkoutExpiresAt: null
          };
        }

        if (
          listing.status !== ListingStatus.ACTIVE ||
          listing.moderationStatus !== ListingModerationStatus.VISIBLE
        ) {
          return {
            issue: "listing_inactive",
            orderId: null,
            reusableOrderId: null,
            reusableSessionId: null,
            checkoutExpiresAt: null
          };
        }

        if (listing.sellerId === input.buyerId) {
          return {
            issue: "own_listing",
            orderId: null,
            reusableOrderId: null,
            reusableSessionId: null,
            checkoutExpiresAt: null
          };
        }

        if (listing.orders.length > 0) {
          return {
            issue: "already_paid",
            orderId: null,
            reusableOrderId: null,
            reusableSessionId: null,
            checkoutExpiresAt: null
          };
        }

        let activeReservation = listing.checkoutReservation;
        if (activeReservation && activeReservation.expiresAt.getTime() <= Date.now()) {
          await expireReservationAndOrder(tx, activeReservation.id, activeReservation.orderId, activeReservation.expiresAt);
          activeReservation = null;
        }

        if (activeReservation) {
          if (activeReservation.buyerId === input.buyerId) {
            return {
              issue: null,
              orderId: null,
              reusableOrderId: activeReservation.orderId,
              reusableSessionId: activeReservation.stripeCheckoutSessionId ?? null,
              checkoutExpiresAt: activeReservation.expiresAt
            };
          }

          return {
            issue: "checkout_in_progress",
            orderId: null,
            reusableOrderId: null,
            reusableSessionId: null,
            checkoutExpiresAt: activeReservation.expiresAt
          };
        }

        const order = await tx.order.create({
          data: {
            listingId: input.listingId,
            buyerId: input.buyerId,
            sellerId: input.sellerId,
            amountCents: input.pricing.listingPriceCents,
            buyerPercentFeeCents: input.pricing.buyerPercentFeeCents,
            buyerFlatFeeCents: input.pricing.buyerFlatFeeCents,
            buyerFeeTotalCents: input.pricing.buyerFeeTotalCents,
            taxAmountCents: input.pricing.taxAmountCents,
            taxRateBps: input.pricing.taxRateBps,
            buyerTotalCents: input.pricing.buyerTotalCents,
            sellerFeeCents: input.pricing.sellerFeeCents,
            stripeFeeCents: input.pricing.stripeFeeCents,
            perOrderFeeCents: input.pricing.perOrderFeeCents,
            sellerPayoutCents: input.pricing.sellerPayoutCents,
            applicationFeeCents: input.pricing.applicationFeeCents,
            checkoutExpiresAt: expiresAt
          }
        });

        await tx.checkoutReservation.create({
          data: {
            listingId: input.listingId,
            buyerId: input.buyerId,
            orderId: order.id,
            expiresAt
          }
        });

        return {
          issue: null,
          orderId: order.id,
          reusableOrderId: null,
          reusableSessionId: null,
          checkoutExpiresAt: expiresAt
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        issue: "checkout_in_progress",
        orderId: null,
        reusableOrderId: null,
        reusableSessionId: null,
        checkoutExpiresAt: null
      };
    }

    throw error;
  }
}

export async function releaseCheckoutOrderHold(orderId: string, nextStatus: OrderStatus) {
  await prisma.$transaction(async (tx) => {
    await tx.checkoutReservation.deleteMany({
      where: {
        orderId
      }
    });

    await tx.order.updateMany({
      where: {
        id: orderId,
        status: OrderStatus.CHECKOUT_CREATED
      },
      data: {
        status: nextStatus
      }
    });
  });
}

export async function attachCheckoutSessionToOrder(params: {
  orderId: string;
  checkoutSessionId: string;
  checkoutExpiresAt: Date;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: params.orderId },
      data: {
        stripeCheckoutSessionId: params.checkoutSessionId,
        checkoutExpiresAt: params.checkoutExpiresAt
      }
    });

    await tx.checkoutReservation.updateMany({
      where: {
        orderId: params.orderId
      },
      data: {
        stripeCheckoutSessionId: params.checkoutSessionId,
        expiresAt: params.checkoutExpiresAt
      }
    });
  });
}

export async function getCheckoutReviewData(listingId: string, viewerId?: string): Promise<CheckoutReviewData> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      description: true,
      images: true,
      priceCents: true,
      status: true,
      moderationStatus: true,
      sellerId: true,
      seller: {
        select: publicUserSummarySelect
      },
      orders: {
        where: {
          status: {
            in: [OrderStatus.CHECKOUT_CREATED, OrderStatus.PAID, OrderStatus.REFUND_PENDING]
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        select: checkoutOrderSelect
      },
      checkoutReservation: {
        select: checkoutReservationSelect
      }
    }
  });

  if (!listing) {
    return {
      listing: null,
      pricing: null,
      payoutState: null,
      issue: "listing_not_found",
      reusableOrderId: null,
      activeCheckoutOrderBuyerId: null
    };
  }

  const pricing = calculateCheckoutPricing(listing.priceCents);
  const publicListing: CheckoutReviewListing = {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    images: fromJsonArray(listing.images),
    priceCents: listing.priceCents,
    status: listing.status,
    seller: toPublicUserSummary(listing.seller)
  };

  const paidOrder = listing.orders.find(
    (order) => order.status === OrderStatus.PAID || order.status === OrderStatus.REFUND_PENDING
  );
  if (
    paidOrder ||
    listing.status !== ListingStatus.ACTIVE ||
    listing.moderationStatus !== ListingModerationStatus.VISIBLE
  ) {
    return {
      listing: publicListing,
      pricing,
      payoutState: null,
      issue: paidOrder ? "already_paid" : "listing_inactive",
      reusableOrderId: null,
      activeCheckoutOrderBuyerId: null
    };
  }

  if (viewerId && listing.sellerId === viewerId) {
    return {
      listing: publicListing,
      pricing,
      payoutState: null,
      issue: "own_listing",
      reusableOrderId: null,
      activeCheckoutOrderBuyerId: null
    };
  }

  const activeReservation = isActiveReservation(listing.checkoutReservation) ? listing.checkoutReservation : null;
  const activeCheckoutOrder = listing.orders.find(hasActiveCheckoutHold) ?? null;
  const activeHoldBuyerId = activeReservation?.buyerId ?? activeCheckoutOrder?.buyerId ?? null;

  if (activeHoldBuyerId && activeHoldBuyerId !== viewerId) {
    return {
      listing: publicListing,
      pricing,
      payoutState: null,
      issue: "checkout_in_progress",
      reusableOrderId: null,
      activeCheckoutOrderBuyerId: activeHoldBuyerId
    };
  }

  const payoutState = await getSellerPayoutState(listing.sellerId);
  const reusableOrderId =
    activeReservation && activeReservation.buyerId === viewerId
      ? activeReservation.orderId
      : activeCheckoutOrder && activeCheckoutOrder.buyerId === viewerId
        ? activeCheckoutOrder.id
        : null;
  if (!payoutState.connectedAccount || !payoutState.readyToReceivePayments) {
    return {
      listing: publicListing,
      pricing,
      payoutState,
      issue: payoutState.status === "requires_reconnect" ? "seller_payouts_reconnect_required" : "seller_payouts_incomplete",
      reusableOrderId,
      activeCheckoutOrderBuyerId: activeHoldBuyerId
    };
  }

  return {
    listing: publicListing,
    pricing,
    payoutState,
    issue: null,
    reusableOrderId,
    activeCheckoutOrderBuyerId: activeHoldBuyerId
  };
}
