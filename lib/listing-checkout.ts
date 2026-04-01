import { ListingStatus, OrderStatus, type Prisma } from "@prisma/client";

import { calculateCheckoutPricing, type CheckoutPricingBreakdown } from "@/lib/checkout-pricing";
import { prisma } from "@/lib/prisma";
import { publicUserSummarySelect, toPublicUserSummary, type PublicUserSummary } from "@/lib/public-user";
import { getSellerPayoutState, type SellerPayoutState } from "@/lib/seller-payouts";

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
      sellerId: true,
      seller: {
        select: publicUserSummarySelect
      },
      orders: {
        where: {
          status: {
            in: [OrderStatus.CHECKOUT_CREATED, OrderStatus.PAID]
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        select: checkoutOrderSelect
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

  const paidOrder = listing.orders.find((order) => order.status === OrderStatus.PAID);
  if (paidOrder || listing.status !== ListingStatus.ACTIVE) {
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

  const activeCheckoutOrder = listing.orders.find(hasActiveCheckoutHold) ?? null;
  if (activeCheckoutOrder && activeCheckoutOrder.buyerId !== viewerId) {
    return {
      listing: publicListing,
      pricing,
      payoutState: null,
      issue: "checkout_in_progress",
      reusableOrderId: null,
      activeCheckoutOrderBuyerId: activeCheckoutOrder.buyerId
    };
  }

  const payoutState = await getSellerPayoutState(listing.sellerId);
  const reusableOrderId = activeCheckoutOrder && activeCheckoutOrder.buyerId === viewerId ? activeCheckoutOrder.id : null;
  if (!payoutState.connectedAccount || !payoutState.readyToReceivePayments) {
    return {
      listing: publicListing,
      pricing,
      payoutState,
      issue: payoutState.status === "requires_reconnect" ? "seller_payouts_reconnect_required" : "seller_payouts_incomplete",
      reusableOrderId,
      activeCheckoutOrderBuyerId: activeCheckoutOrder?.buyerId ?? null
    };
  }

  return {
    listing: publicListing,
    pricing,
    payoutState,
    issue: null,
    reusableOrderId,
    activeCheckoutOrderBuyerId: activeCheckoutOrder?.buyerId ?? null
  };
}
