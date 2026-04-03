import "server-only";

import { ListingStatus, OrderStatus, TransactionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const NEW_ACCOUNT_WINDOW_MS = 72 * 60 * 60 * 1000;
const NEW_ACCOUNT_LISTING_LIMIT = 3;
const EXPENSIVE_LISTING_THRESHOLD_CENTS = 50_000;
const NEW_ACCOUNT_EXPENSIVE_LISTING_LIMIT = 1;

export type ListingMutationProtection =
  | {
      blocked: false;
      code: null;
      message: null;
    }
  | {
      blocked: true;
      code: "checkout_reserved" | "paid_order_exists" | "transaction_locked";
      message: string;
    };

function isActiveReservation(expiresAt: Date | null | undefined) {
  return Boolean(expiresAt && expiresAt.getTime() > Date.now());
}

export async function getListingMutationProtection(listingId: string): Promise<ListingMutationProtection> {
  const listing = await prisma.listing.findUnique({
    where: {
      id: listingId
    },
    select: {
      checkoutReservation: {
        select: {
          expiresAt: true
        }
      },
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
      transactions: {
        where: {
          status: {
            in: [TransactionStatus.PENDING_CONFIRMATION, TransactionStatus.ISSUE_REPORTED, TransactionStatus.COMPLETED]
          }
        },
        select: {
          id: true,
          status: true
        },
        take: 1
      }
    }
  });

  if (!listing) {
    return {
      blocked: false,
      code: null,
      message: null
    };
  }

  if (isActiveReservation(listing.checkoutReservation?.expiresAt)) {
    return {
      blocked: true,
      code: "checkout_reserved",
      message: "This listing is locked because a buyer is currently in secure checkout. Wait for the checkout hold to expire before changing or deleting it."
    };
  }

  if (listing.orders.length > 0) {
    return {
      blocked: true,
      code: "paid_order_exists",
      message: "This listing is locked because payment has already been captured or a refund is still being processed."
    };
  }

  if (listing.transactions.length > 0) {
    const transaction = listing.transactions[0];
    return {
      blocked: true,
      code: "transaction_locked",
      message:
        transaction.status === TransactionStatus.ISSUE_REPORTED
          ? "This listing is locked because the sale is under review after a reported issue."
          : transaction.status === TransactionStatus.COMPLETED
            ? "This listing is locked because the sale has already been completed."
            : "This listing is locked because the handoff is still in progress."
    };
  }

  return {
    blocked: false,
    code: null,
    message: null
  };
}

export async function assertSellerCanPublishListing(params: {
  userId: string;
  priceCents: number;
  listingIdToExclude?: string;
}) {
  const user = await prisma.user.findUnique({
    where: {
      id: params.userId
    },
    select: {
      emailVerified: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new Error("Seller account not found.");
  }

  if (!user.emailVerified) {
    throw new Error("Verify your UVA email before publishing listings on HoosFinds.");
  }

  const accountAgeMs = Date.now() - user.createdAt.getTime();
  if (accountAgeMs >= NEW_ACCOUNT_WINDOW_MS) {
    return;
  }

  const recentListingsWhere = {
    sellerId: params.userId,
    ...(params.listingIdToExclude
      ? {
          id: {
            not: params.listingIdToExclude
          }
        }
      : {})
  };

  const [listingCount, expensiveActiveListings] = await Promise.all([
    prisma.listing.count({
      where: recentListingsWhere
    }),
    prisma.listing.count({
      where: {
        ...recentListingsWhere,
        priceCents: {
          gte: EXPENSIVE_LISTING_THRESHOLD_CENTS
        },
        status: ListingStatus.ACTIVE
      }
    })
  ]);

  if (listingCount >= NEW_ACCOUNT_LISTING_LIMIT) {
    throw new Error(
      "New seller accounts can only publish a few listings at first. Keep things tight for a day or two, then list more."
    );
  }

  if (params.priceCents >= EXPENSIVE_LISTING_THRESHOLD_CENTS && expensiveActiveListings >= NEW_ACCOUNT_EXPENSIVE_LISTING_LIMIT) {
    throw new Error(
      "Brand-new seller accounts cannot publish multiple high-value listings at once. Let your first listing settle before posting another expensive item."
    );
  }
}
