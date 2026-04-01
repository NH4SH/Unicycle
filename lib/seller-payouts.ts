import { ListingStatus, OrderStatus, TransactionStatus } from "@prisma/client";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { publicUserSummarySelect } from "@/lib/public-user";
import { getStripeClient, isStripeConnectConfigured } from "@/lib/stripe";

// Canonical marketplace sales use the Listing model. Stripe Connect only powers
// seller payouts underneath that flow, so platform-fee math now lives here.
export const SELLER_PAYOUT_APPLICATION_FEE_BPS = 1000;

export type ConnectedAccountSnapshot = {
  stripeAccountId: string;
  displayName: string | null;
  contactEmail: string | null;
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string | null;
  transferCapabilityStatus: string | null;
};

export type SellerPayoutState = {
  connectedAccount: {
    id: string;
    stripeAccountId: string;
    createdAt: string;
  } | null;
  stripeStatus: ConnectedAccountSnapshot | null;
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  actionRequired: boolean;
  statusLabel: string;
  headline: string;
  detail: string;
  ctaLabel: string;
};

export type SellerPayoutSaleSummary = {
  orderId: string;
  listingId: string;
  listingTitle: string;
  amountCents: number;
  applicationFeeCents: number;
  createdAt: string;
  orderStatus: OrderStatus;
  handoffStatus: TransactionStatus | null;
  buyer: {
    name: string | null;
    username: string;
  };
};

export type SellerPayoutDashboardData = {
  payoutState: SellerPayoutState;
  stats: {
    liveListings: number;
    pendingHandoffs: number;
    completedSales: number;
    grossSalesCents: number;
  };
  recentSales: SellerPayoutSaleSummary[];
};

function summarizeRecipientAccount(account: Stripe.V2.Core.Account): ConnectedAccountSnapshot {
  const transferCapabilityStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ?? null;
  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status ?? null;
  const readyToReceivePayments = transferCapabilityStatus === "active";
  const onboardingComplete = requirementsStatus !== "currently_due" && requirementsStatus !== "past_due";

  return {
    stripeAccountId: account.id,
    displayName: account.display_name ?? null,
    contactEmail: account.contact_email ?? null,
    readyToReceivePayments,
    onboardingComplete,
    requirementsStatus,
    transferCapabilityStatus
  };
}

export function calculateApplicationFeeAmount(amountCents: number) {
  return Math.max(50, Math.round((amountCents * SELLER_PAYOUT_APPLICATION_FEE_BPS) / 10_000));
}

export async function getConnectedAccountStatusFromStripe(stripeAccountId: string) {
  const stripeClient = getStripeClient();
  const account = await stripeClient.v2.core.accounts.retrieve(stripeAccountId, {
    include: ["configuration.recipient", "requirements"]
  });

  return summarizeRecipientAccount(account);
}

export async function getSellerPayoutState(userId?: string): Promise<SellerPayoutState> {
  if (!userId) {
    return {
      connectedAccount: null,
      stripeStatus: null,
      readyToReceivePayments: false,
      onboardingComplete: false,
      actionRequired: true,
      statusLabel: "Connect payouts",
      headline: "Connect payouts before you sell",
      detail: "Before your listing can go live, connect where you want HoosFinds to send your earnings.",
      ctaLabel: "Connect Stripe payouts"
    };
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId }
  });

  if (!connectedAccount) {
    return {
      connectedAccount: null,
      stripeStatus: null,
      readyToReceivePayments: false,
      onboardingComplete: false,
      actionRequired: true,
      statusLabel: "Connect payouts",
      headline: "Connect payouts before you sell",
      detail: "Before your listing can go live, connect where you want HoosFinds to send your earnings.",
      ctaLabel: "Connect Stripe payouts"
    };
  }

  if (!isStripeConnectConfigured()) {
    return {
      connectedAccount: {
        id: connectedAccount.id,
        stripeAccountId: connectedAccount.stripeAccountId,
        createdAt: connectedAccount.createdAt.toISOString()
      },
      stripeStatus: null,
      readyToReceivePayments: false,
      onboardingComplete: false,
      actionRequired: true,
      statusLabel: "Payouts unavailable",
      headline: "Payout setup is temporarily unavailable",
      detail: "HoosFinds cannot confirm payout readiness until Stripe is configured for this environment.",
      ctaLabel: "Try again later"
    };
  }

  const stripeStatus = await getConnectedAccountStatusFromStripe(connectedAccount.stripeAccountId).catch(() => null);

  if (!stripeStatus) {
    return {
      connectedAccount: {
        id: connectedAccount.id,
        stripeAccountId: connectedAccount.stripeAccountId,
        createdAt: connectedAccount.createdAt.toISOString()
      },
      stripeStatus: null,
      readyToReceivePayments: false,
      onboardingComplete: false,
      actionRequired: true,
      statusLabel: "Finish setup",
      headline: "Finish setup to get paid",
      detail: "We could not confirm your payout status right now. Open Stripe again and finish setup before publishing listings.",
      ctaLabel: "Finish setup"
    };
  }

  if (stripeStatus.readyToReceivePayments) {
    return {
      connectedAccount: {
        id: connectedAccount.id,
        stripeAccountId: connectedAccount.stripeAccountId,
        createdAt: connectedAccount.createdAt.toISOString()
      },
      stripeStatus,
      readyToReceivePayments: true,
      onboardingComplete: stripeStatus.onboardingComplete,
      actionRequired: false,
      statusLabel: "Payouts enabled",
      headline: "You're ready to sell",
      detail: "HoosFinds can route listing payments to your connected payout account automatically.",
      ctaLabel: "Create listing"
    };
  }

  return {
    connectedAccount: {
      id: connectedAccount.id,
      stripeAccountId: connectedAccount.stripeAccountId,
      createdAt: connectedAccount.createdAt.toISOString()
    },
    stripeStatus,
    readyToReceivePayments: false,
    onboardingComplete: stripeStatus.onboardingComplete,
    actionRequired: true,
    statusLabel: "Finish setup",
    headline: "Finish setup to get paid",
    detail: "Stripe still needs a few details before HoosFinds can send your earnings after a sale.",
    ctaLabel: "Finish setup"
  };
}

export async function getSellerPayoutDashboardData(userId?: string): Promise<SellerPayoutDashboardData> {
  const payoutState = await getSellerPayoutState(userId);

  if (!userId) {
    return {
      payoutState,
      stats: {
        liveListings: 0,
        pendingHandoffs: 0,
        completedSales: 0,
        grossSalesCents: 0
      },
      recentSales: []
    };
  }

  const [liveListings, pendingHandoffs, completedSales, grossSales, recentSales] = await Promise.all([
    prisma.listing.count({
      where: {
        sellerId: userId,
        status: ListingStatus.ACTIVE
      }
    }),
    prisma.transaction.count({
      where: {
        sellerId: userId,
        status: TransactionStatus.PENDING_CONFIRMATION
      }
    }),
    prisma.transaction.count({
      where: {
        sellerId: userId,
        status: TransactionStatus.COMPLETED
      }
    }),
    prisma.order.aggregate({
      where: {
        sellerId: userId,
        status: OrderStatus.PAID
      },
      _sum: {
        amountCents: true
      }
    }),
    prisma.order.findMany({
      where: {
        sellerId: userId,
        status: OrderStatus.PAID
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 6,
      include: {
        listing: {
          select: {
            id: true,
            title: true
          }
        },
        buyer: {
          select: publicUserSummarySelect
        },
        transaction: {
          select: {
            status: true
          }
        }
      }
    })
  ]);

  return {
    payoutState,
    stats: {
      liveListings,
      pendingHandoffs,
      completedSales,
      grossSalesCents: grossSales._sum.amountCents ?? 0
    },
    recentSales: recentSales.map((order) => ({
      orderId: order.id,
      listingId: order.listingId,
      listingTitle: order.listing.title,
      amountCents: order.amountCents,
      applicationFeeCents: calculateApplicationFeeAmount(order.amountCents),
      createdAt: order.createdAt.toISOString(),
      orderStatus: order.status,
      handoffStatus: order.transaction?.status ?? null,
      buyer: {
        name: order.buyer.name,
        username: order.buyer.username
      }
    }))
  };
}
